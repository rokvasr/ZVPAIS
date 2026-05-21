using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ŽVPAIS_API.Data;
using ŽVPAIS_API.Models;
using ŽVPAIS_API.Services;

namespace ŽVPAIS_API.Controllers
{
    [Route("api/calculation")]
    [ApiController]
    [Authorize]
    public class CalculationController : ControllerBase
    {
        private readonly IDamageCalculationService _calculationService;
        private readonly AppDbContext _context;

        public CalculationController(IDamageCalculationService calculationService, AppDbContext context)
        {
            _calculationService = calculationService;
            _context = context;
        }

        // GET api/calculation/event/{eventId}
        // Returns the full per-object, per-material damage breakdown for an event.
        [HttpGet("event/{eventId}")]
        public async Task<ActionResult<EventDamageBreakdownDto>> GetBreakdown(int eventId)
        {
            var exists = await _context.Events.AnyAsync(e => e.IdEvent == eventId);
            if (!exists) return NotFound();

            var breakdown = await _calculationService.CalculateBreakdownForEvent(eventId);
            return Ok(breakdown);
        }

        // POST api/calculation/event/{eventId}/recalculate
        // Runs the formula, updates the existing DamageEvaluation record (or inserts one if absent), returns the breakdown.
        [HttpPost("event/{eventId}/recalculate")]
        [Authorize(Roles = "Specialist")]
        public async Task<ActionResult<EventDamageBreakdownDto>> Recalculate(int eventId)
        {
            var exists = await _context.Events.AnyAsync(e => e.IdEvent == eventId);
            if (!exists) return NotFound();

            var breakdown = await _calculationService.CalculateBreakdownForEvent(eventId);

            var existing = await _context.DamageEvaluations
                .Where(d => d.EventId == eventId)
                .OrderByDescending(d => d.CreatedAt)
                .FirstOrDefaultAsync();

            if (existing != null)
            {
                existing.Data = DateTime.UtcNow;
                existing.ZalosDydis = (double)breakdown.TotalDamage;
                existing.PiniginisDydis = (double)breakdown.TotalDamage;
            }
            else
            {
                _context.DamageEvaluations.Add(new DamageEvaluation
                {
                    EventId = eventId,
                    Data = DateTime.UtcNow,
                    ZalosDydis = (double)breakdown.TotalDamage,
                    PiniginisDydis = (double)breakdown.TotalDamage,
                    Notes = string.Empty
                });
            }
            await _context.SaveChangesAsync();

            return Ok(breakdown);
        }

        // GET api/calculation/indexing-coefficients
        // Lists all stored I_n coefficients (latest first).
        [HttpGet("indexing-coefficients")]
        public async Task<ActionResult<List<IndexingCoefficientDto>>> GetCoefficients()
        {
            var list = await _context.IndexingCoefficients
                .OrderByDescending(c => c.Year)
                .ThenByDescending(c => c.Quarter)
                .Select(c => new IndexingCoefficientDto
                {
                    IdIndexingCoefficient = c.IdIndexingCoefficient,
                    Year = c.Year,
                    Quarter = c.Quarter,
                    Coefficient = c.Coefficient,
                    CreatedAt = c.CreatedAt
                })
                .ToListAsync();

            return Ok(list);
        }

        // POST api/calculation/indexing-coefficients
        [HttpPost("indexing-coefficients")]
        [Authorize(Roles = "Specialist")]
        public async Task<ActionResult<IndexingCoefficientDto>> AddCoefficient(IndexingCoefficientCreateDto dto)
        {
            if (dto.Quarter < 1 || dto.Quarter > 4)
                return BadRequest("Quarter must be 1–4.");
            if (dto.Coefficient <= 0)
                return BadRequest("Coefficient must be positive.");

            var entry = new IndexingCoefficient
            {
                Year = dto.Year,
                Quarter = dto.Quarter,
                Coefficient = dto.Coefficient,
                CreatedAt = DateTime.UtcNow
            };

            _context.IndexingCoefficients.Add(entry);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetCoefficients), new IndexingCoefficientDto
            {
                IdIndexingCoefficient = entry.IdIndexingCoefficient,
                Year = entry.Year,
                Quarter = entry.Quarter,
                Coefficient = entry.Coefficient,
                CreatedAt = entry.CreatedAt
            });
        }

        // PUT api/calculation/indexing-coefficients/{id}
        [HttpPut("indexing-coefficients/{id}")]
        [Authorize(Roles = "Specialist")]
        public async Task<ActionResult<IndexingCoefficientDto>> UpdateCoefficient(int id, IndexingCoefficientCreateDto dto)
        {
            if (dto.Quarter < 1 || dto.Quarter > 4)
                return BadRequest("Quarter must be 1–4.");
            if (dto.Coefficient <= 0)
                return BadRequest("Coefficient must be positive.");

            var entry = await _context.IndexingCoefficients.FindAsync(id);
            if (entry == null) return NotFound();

            entry.Year = dto.Year;
            entry.Quarter = dto.Quarter;
            entry.Coefficient = dto.Coefficient;
            await _context.SaveChangesAsync();

            return Ok(new IndexingCoefficientDto
            {
                IdIndexingCoefficient = entry.IdIndexingCoefficient,
                Year = entry.Year,
                Quarter = entry.Quarter,
                Coefficient = entry.Coefficient,
                CreatedAt = entry.CreatedAt
            });
        }

        // DELETE api/calculation/indexing-coefficients/{id}
        [HttpDelete("indexing-coefficients/{id}")]
        [Authorize(Roles = "Specialist")]
        public async Task<IActionResult> DeleteCoefficient(int id)
        {
            var entry = await _context.IndexingCoefficients.FindAsync(id);
            if (entry == null) return NotFound();
            _context.IndexingCoefficients.Remove(entry);
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}
