using Microsoft.EntityFrameworkCore;
using ŽVPAIS_API.Data;

namespace ŽVPAIS_API.Services
{
    // ===============================
    //  SECTION: Service Interface
    // ===============================
    public interface IGaussianPlumeService
    {
        Task<List<WasteTypeListItemDto>> GetWasteTypesAsync();
        Task<DispersionResultDto> CalculateAsync(DispersionRequestDto request);
        Task<EventDispersionResultDto> CalculateFromEventAsync(int eventId, WindParamsDto wind);
    }

    // ===============================
    //  SECTION: Service Implementation
    // ===============================
    public class GaussianPlumeService : IGaussianPlumeService
    {
        private readonly AppDbContext _context;

        public GaussianPlumeService(AppDbContext context)
        {
            _context = context;
        }

        // --- Public API Methods -------------------------------------------------

        /// <summary>Returns all waste types ordered by EWC code for the dispersion form selector.</summary>
        public async Task<List<WasteTypeListItemDto>> GetWasteTypesAsync()
        {
            return await _context.WasteTypes
                .OrderBy(w => w.EwcCode)
                .Select(w => new WasteTypeListItemDto
                {
                    Id = w.Id,
                    EwcCode = w.EwcCode,
                    Description = w.Description,
                    IsHazardous = w.IsHazardous,
                    IsCombustible = w.IsCombustible
                })
                .ToListAsync();
        }

        /// <summary>
        /// Calculates ground-level dispersion for a manually specified waste type and mass.
        /// Emission rate Q (g/s) is derived from the waste type's morphology fractions
        /// and compound-specific emission factors (EF) for each combustion category.
        /// </summary>
        public async Task<DispersionResultDto> CalculateAsync(DispersionRequestDto req)
        {
            // --- Step 1: Load waste type and all emission compounds from DB ---
            var wasteType = await _context.WasteTypes.FindAsync(req.WasteTypeId)
                ?? throw new ArgumentException($"WasteType {req.WasteTypeId} not found");

            var compounds = await _context.EmissionCompounds.ToListAsync();

            // --- Step 2: Prepare basic parameters ---
            // Morphology: dictionary mapping combustion category (e.g., "wood", "plastic") to percentage (0-100)
            var morphology = wasteType.Morphology;
            double durationS = Math.Max(req.FireDurationHours * 3600.0, 1.0); // fire duration in seconds
            double u = Math.Max(req.WindSpeedMs, 0.5); // wind speed (m/s), guard against division by zero

            var results = new List<CompoundDispersionDto>();

            // --- Step 3: For each compound, compute total emission rate Q (g/s) ---
            foreach (var compound in compounds)
            {
                var ef = compound.Ef; // Dictionary: category -> kg of this compound emitted per tonne burned
                double Q = 0;

                // Sum over all combustion categories present in this waste type
                foreach (var (category, morphPct) in morphology)
                {
                    // Check if this compound has an emission factor for the category and category has positive fraction
                    if (ef.TryGetValue(category, out double efVal) && efVal > 0 && morphPct > 0)
                    {
                        // Mass of waste burned in this category (tonnes)
                        double massInCategory = req.TotalMassTonnes * (morphPct / 100.0);
                        // Emission rate: mass * EF (kg/t) * 1000 g/kg / duration (s) = g/s
                        Q += massInCategory * efVal * 1000.0 / durationS;
                    }
                }

                if (Q < 1e-12) continue; // negligible emission, skip to next compound

                // --- Step 4: Compute concentration grid for this compound ---
                results.Add(new CompoundDispersionDto
                {
                    CompoundId = compound.Id,
                    CompoundName = compound.Name,
                    BaseRate = compound.BaseRate,
                    EmissionRateGs = Q,
                    GridPoints = ComputeGrid(Q, u, req.StabilityClass, req.SourceHeightM)
                });
            }

            // Sort compounds by emission rate (highest first) for display priority
            results.Sort((a, b) => b.EmissionRateGs.CompareTo(a.EmissionRateGs));

            return new DispersionResultDto
            {
                FireLat = req.FireLat,
                FireLon = req.FireLon,
                WindDirectionDeg = req.WindDirectionDeg,
                WindSpeedMs = u,
                StabilityClass = req.StabilityClass,
                Compounds = results
            };
        }

        /// <summary>
        /// Calculates dispersion for an existing event by aggregating combustible material masses
        /// from all linked event objects, grouped by emission category (e.g., "wood", "plastic").
        /// </summary>
        public async Task<EventDispersionResultDto> CalculateFromEventAsync(int eventId, WindParamsDto wind)
        {
            // --- Step 1: Load event with all nested objects and materials ---
            var eventObj = await _context.Events
                .Include(e => e.EventObjects)
                    .ThenInclude(eo => eo.Object)
                        .ThenInclude(o => o.ObjectMaterials)
                            .ThenInclude(om => om.Material)
                .FirstOrDefaultAsync(e => e.IdEvent == eventId)
                ?? throw new ArgumentException($"Event {eventId} not found");

            // --- Step 2: Build category-to-total-mass dictionary and collect per-material metadata ---
            var categoryMass = new Dictionary<string, double>();      // emission category -> total mass (t)
            var materialRows = new List<MaterialCategoryDto>();       // detailed list of materials and their categories
            var uncategorized = new List<string>();                   // materials with no EmissionCategory
            var zeroQty = new List<string>();                         // materials with zero quantity

            foreach (var eo in eventObj.EventObjects)
            {
                var obj = eo.Object;
                foreach (var om in obj.ObjectMaterials ?? [])
                {
                    if (om.Material == null) continue;

                    // Resolve quantity (mass, volume, or percentage-based)
                    double qty = ResolveQuantity(om, obj);
                    if (qty <= 0)
                    {
                        zeroQty.Add(om.Material.Name);
                        continue;
                    }

                    var cat = om.Material.EmissionCategory?.ToLowerInvariant();
                    materialRows.Add(new MaterialCategoryDto
                    {
                        MaterialName = om.Material.Name,
                        EmissionCategory = cat,
                        MassTonnes = qty
                    });

                    if (!string.IsNullOrEmpty(cat))
                        categoryMass[cat] = categoryMass.GetValueOrDefault(cat) + qty;
                    else
                        uncategorized.Add(om.Material.Name);
                }
            }

            double totalMass = materialRows.Sum(m => m.MassTonnes);

            // If no categories with mass, return early – can't compute dispersion
            if (categoryMass.Count == 0)
                return new EventDispersionResultDto
                {
                    TotalMassTonnes = totalMass,
                    Materials = materialRows,
                    UncategorizedMaterials = uncategorized,
                    ZeroQuantityMaterials = zeroQty,
                    Dispersion = new DispersionResultDto
                    {
                        FireLat = wind.FireLat,
                        FireLon = wind.FireLon,
                        WindDirectionDeg = wind.WindDirectionDeg,
                        WindSpeedMs = wind.WindSpeedMs,
                        StabilityClass = wind.StabilityClass
                    }
                };

            // --- Step 3: Retrieve emission compounds and compute emission rates per compound ---
            var compounds = await _context.EmissionCompounds.ToListAsync();
            double durationS = Math.Max(wind.FireDurationHours * 3600.0, 1.0);
            double u = Math.Max(wind.WindSpeedMs, 0.5);

            var results = new List<CompoundDispersionDto>();
            foreach (var compound in compounds)
            {
                var ef = compound.Ef;
                double Q = 0;
                // Sum over all combustion categories present in the event
                foreach (var (cat, mass) in categoryMass)
                    if (ef.TryGetValue(cat, out double efVal) && efVal > 0)
                        Q += mass * efVal * 1000.0 / durationS;

                if (Q < 1e-12) continue;

                results.Add(new CompoundDispersionDto
                {
                    CompoundId = compound.Id,
                    CompoundName = compound.Name,
                    BaseRate = compound.BaseRate,
                    EmissionRateGs = Q,
                    GridPoints = ComputeGrid(Q, u, wind.StabilityClass, wind.SourceHeightM)
                });
            }
            results.Sort((a, b) => b.EmissionRateGs.CompareTo(a.EmissionRateGs));

            // --- Step 4: Return complete result with material metadata and dispersion grid ---
            return new EventDispersionResultDto
            {
                TotalMassTonnes = totalMass,
                Materials = materialRows,
                UncategorizedMaterials = uncategorized,
                ZeroQuantityMaterials = zeroQty,
                Dispersion = new DispersionResultDto
                {
                    FireLat = wind.FireLat,
                    FireLon = wind.FireLon,
                    WindDirectionDeg = wind.WindDirectionDeg,
                    WindSpeedMs = u,
                    StabilityClass = wind.StabilityClass,
                    Compounds = results
                }
            };
        }

        // --- Private Helper Methods (Quantity Resolution, Dispersion Model) -----

        /// <summary>
        /// Resolves the quantity (mass in tonnes) from an ObjectMaterial record.
        /// Priority: Mass > Volume > Percentage (of object's total mass or volume).
        /// Note: Volume is assumed to be in m³; conversion to tonnes is not done here (caller must handle).
        /// </summary>
        private static double ResolveQuantity(ŽVPAIS_API.Models.ObjectMaterial om, ŽVPAIS_API.Models.EnvironmentObject obj)
        {
            if (om.Mass.HasValue) return om.Mass.Value;
            if (om.Volume.HasValue) return om.Volume.Value;
            if (om.Percentage.HasValue)
            {
                double total = obj.TotalMass ?? obj.TotalVolume ?? 0;
                return om.Percentage.Value / 100.0 * total;
            }
            return 0;
        }

        /// <summary>
        /// Generates a grid of concentration points for a given emission rate Q (g/s),
        /// wind speed u (m/s), stability class (A–F), and source height H (m).
        /// Uses pre-defined downwind distances (x) and crosswind offsets (y).
        /// Returns concentration in µg/m³.
        /// </summary>
        private static List<GridPointDto> ComputeGrid(double Q, double u, string cls, double H)
        {
            // Pre-defined downwind distances (metres) – typical for local-scale dispersion assessment
            double[] xValues = [100, 250, 500, 750, 1000, 1500, 2000, 3000, 5000, 7500, 10000, 15000, 20000];
            // Pre-defined crosswind offsets (metres) – symmetric around plume centreline
            double[] yValues = [-3000, -2000, -1500, -1000, -750, -500, -250, 0, 250, 500, 750, 1000, 1500, 2000, 3000];

            var points = new List<GridPointDto>(xValues.Length * yValues.Length);

            foreach (double x in xValues)
            {
                // Dispersion coefficients (sigma_y, sigma_z) depend on downwind distance and stability
                double sigmaY = SigmaY(x, cls);
                double sigmaZ = SigmaZ(x, cls);

                foreach (double y in yValues)
                {
                    // Gaussian plume concentration at (x, y) ground level (z=0)
                    double C = Concentration(Q, u, sigmaY, sigmaZ, y, H);
                    if (C < 1e-9) continue; // below 0.001 µg/m³ – negligible

                    points.Add(new GridPointDto
                    {
                        DownwindM = x,
                        CrosswindM = y,
                        ConcentrationUgM3 = C * 1e6 // convert g/m³ to µg/m³
                    });
                }
            }

            return points;
        }

        /// <summary>
        /// Steady-state Gaussian plume formula with ground reflection at receptor height z=0.
        /// Returns concentration in g/m³.
        /// </summary>
        /// <param name="Q">Emission rate (g/s)</param>
        /// <param name="u">Wind speed at stack height (m/s)</param>
        /// <param name="sigmaY">Horizontal dispersion coefficient (m)</param>
        /// <param name="sigmaZ">Vertical dispersion coefficient (m)</param>
        /// <param name="y">Crosswind distance from plume centreline (m)</param>
        /// <param name="H">Effective source height (stack height + plume rise) (m)</param>
        private static double Concentration(double Q, double u, double sigmaY, double sigmaZ, double y, double H)
        {
            if (sigmaY <= 0 || sigmaZ <= 0) return 0;
            double expY = Math.Exp(-0.5 * (y * y) / (sigmaY * sigmaY));
            double expZ = Math.Exp(-0.5 * (H * H) / (sigmaZ * sigmaZ));
            return Q / (Math.PI * sigmaY * sigmaZ * u) * expY * expZ;
        }

        /// <summary>
        /// Horizontal dispersion coefficient sigma_y (m) using Briggs (1973) open-country parameterisation.
        /// Stability classes A (very unstable) to F (moderately stable).
        /// </summary>
        private static double SigmaY(double x, string cls) => cls.ToUpper() switch
        {
            "A" => 0.22 * x * Math.Pow(1 + 0.0001 * x, -0.5),
            "B" => 0.16 * x * Math.Pow(1 + 0.0001 * x, -0.5),
            "C" => 0.11 * x * Math.Pow(1 + 0.0001 * x, -0.5),
            "D" => 0.08 * x * Math.Pow(1 + 0.0001 * x, -0.5),
            "E" => 0.06 * x * Math.Pow(1 + 0.0001 * x, -0.5),
            "F" => 0.04 * x * Math.Pow(1 + 0.0001 * x, -0.5),
            _ => 0.08 * x * Math.Pow(1 + 0.0001 * x, -0.5)   // default to neutral (D)
        };

        /// <summary>
        /// Vertical dispersion coefficient sigma_z (m). Capped at 5000 m to prevent numerical overflow at long range.
        /// Parameterisation based on Briggs (1973) with modifications for stability classes.
        /// </summary>
        private static double SigmaZ(double x, string cls) => cls.ToUpper() switch
        {
            "A" => Math.Min(0.20 * x, 5000),
            "B" => Math.Min(0.12 * x, 5000),
            "C" => Math.Min(0.08 * x * Math.Pow(1 + 0.0002 * x, -0.5), 5000),
            "D" => Math.Min(0.06 * x * Math.Pow(1 + 0.0015 * x, -0.5), 5000),
            "E" => 0.03 * x / (1 + 0.0003 * x),
            "F" => 0.016 * x / (1 + 0.0003 * x),
            _ => Math.Min(0.06 * x * Math.Pow(1 + 0.0015 * x, -0.5), 5000)
        };
    }
}