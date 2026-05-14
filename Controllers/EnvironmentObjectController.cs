using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ŽVPAIS_API.Data;
using ŽVPAIS_API.Models;

namespace ŽVPAIS_API.Controllers
{
    [Route("api/environmentobjects")]
    [ApiController]
    [Authorize]
    public class EnvironmentObjectController : ControllerBase
    {
        private readonly AppDbContext _context;

        public EnvironmentObjectController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<ObjectDto>>> GetObjects()
        {
            var objects = await _context.Objects
                .Include(o => o.ObjectMaterials)
                    .ThenInclude(om => om.Material)
                .ToListAsync();

            return Ok(objects.Select(MapToDto).ToList());
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<ObjectDto>> GetObject(int id)
        {
            var obj = await _context.Objects
                .Include(o => o.ObjectMaterials)
                    .ThenInclude(om => om.Material)
                .FirstOrDefaultAsync(o => o.IdObject == id);
            if (obj == null) return NotFound();

            return Ok(MapToDto(obj));
        }

        private static ObjectDto MapToDto(EnvironmentObject o) => new()
        {
            IdObject = o.IdObject,
            Name = o.Name,
            Description = o.Description,
            TotalMass = o.TotalMass,
            TotalVolume = o.TotalVolume,
            Materials = o.ObjectMaterials?.Select(om => new ObjectMaterialDto
            {
                IdObjectMaterial = om.IdObjectMaterial,
                MaterialId = om.MaterialId,
                MaterialName = om.Material?.Name,
                Percentage = om.Percentage,
                Mass = om.Mass,
                Volume = om.Volume,
                RecoveredQuantity = om.RecoveredQuantity
            }).ToList() ?? []
        };

        [HttpPost]
        public async Task<ActionResult<ObjectDto>> CreateObject(ObjectCreateDto dto)
        {
            var obj = new EnvironmentObject
            {
                Name = dto.Name,
                Description = dto.Description,
                TotalMass = dto.TotalMass,
                TotalVolume = dto.TotalVolume,
                CreatedAt = DateTime.UtcNow
            };

            _context.Objects.Add(obj);
            await _context.SaveChangesAsync();

            var response = new ObjectDto
            {
                IdObject = obj.IdObject,
                Name = obj.Name,
                Description = obj.Description
            };

            return CreatedAtAction(nameof(GetObject), new { id = obj.IdObject }, response);
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "Specialist")]
        public async Task<IActionResult> UpdateObject(int id, ObjectCreateDto dto)
        {
            var obj = await _context.Objects.FindAsync(id);
            if (obj == null) return NotFound();

            obj.Name = dto.Name;
            obj.Description = dto.Description;
            obj.TotalMass = dto.TotalMass;
            obj.TotalVolume = dto.TotalVolume;
            await _context.SaveChangesAsync();

            return NoContent();
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "Specialist")]
        public async Task<IActionResult> DeleteObject(int id)
        {
            var obj = await _context.Objects.FindAsync(id);
            if (obj == null) return NotFound();

            _context.Objects.Remove(obj);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        [HttpGet("{id}/materials")]
        public async Task<ActionResult<List<ObjectMaterialDto>>> GetObjectMaterials(int id)
        {
            var obj = await _context.Objects
                .Include(o => o.ObjectMaterials)
                    .ThenInclude(om => om.Material)
                .FirstOrDefaultAsync(o => o.IdObject == id);
            if (obj == null) return NotFound();

            var materials = obj.ObjectMaterials.Select(om => new ObjectMaterialDto
            {
                IdObjectMaterial = om.IdObjectMaterial,
                MaterialId = om.MaterialId,
                MaterialName = om.Material?.Name,
                Percentage = om.Percentage,
                Mass = om.Mass,
                Volume = om.Volume,
                RecoveredQuantity = om.RecoveredQuantity
            }).ToList();

            return Ok(materials);
        }

        [HttpPost("{id}/materials")]
        [Authorize(Roles = "Specialist")]
        public async Task<IActionResult> AddMaterialToObject(int id, ObjectMaterialCreateDto dto)
        {
            var obj = await _context.Objects.FindAsync(id);
            if (obj == null) return NotFound();

            var material = await _context.Materials.FindAsync(dto.MaterialId);
            if (material == null) return BadRequest("Material not found");

            bool hasQuantity = dto.Mass.HasValue || dto.Volume.HasValue || dto.Percentage.HasValue;
            if (!hasQuantity)
                return BadRequest("Reikia nurodyti masę (t), tūrį (m³) arba procentą.");

            if (dto.Mass.HasValue && dto.Mass.Value <= 0)
                return BadRequest("Masė turi būti teigiama (t).");
            if (dto.Volume.HasValue && dto.Volume.Value <= 0)
                return BadRequest("Tūris turi būti teigiamas (m³).");
            if (dto.Percentage.HasValue && (dto.Percentage.Value <= 0 || dto.Percentage.Value > 100))
                return BadRequest("Procentas turi būti tarp 0 ir 100.");
            if (dto.RecoveredQuantity.HasValue && dto.RecoveredQuantity.Value < 0)
                return BadRequest("Susigrąžintas kiekis negali būti neigiamas.");

            if (dto.RecoveredQuantity.HasValue && dto.Mass.HasValue && dto.RecoveredQuantity.Value > dto.Mass.Value)
                return BadRequest("Susigrąžintas kiekis negali viršyti išmesto kiekio.");

            var objectMaterial = new ObjectMaterial
            {
                ObjectId = id,
                MaterialId = dto.MaterialId,
                Percentage = dto.Percentage,
                Mass = dto.Mass,
                Volume = dto.Volume,
                RecoveredQuantity = dto.RecoveredQuantity
            };
            _context.ObjectMaterials.Add(objectMaterial);
            await _context.SaveChangesAsync();

            return Ok();
        }

        [HttpDelete("{id}/materials/{materialId}")]
        [Authorize(Roles = "Specialist")]
        public async Task<IActionResult> RemoveMaterialFromObject(int id, int materialId)
        {
            var objectMaterial = await _context.ObjectMaterials
                .FirstOrDefaultAsync(om => om.ObjectId == id && om.MaterialId == materialId);
            if (objectMaterial == null) return NotFound();

            _context.ObjectMaterials.Remove(objectMaterial);
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}
