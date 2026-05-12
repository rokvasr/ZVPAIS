using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ŽVPAIS_API.Data;
using ŽVPAIS_API.Models;
using ŽVPAIS_API.Services;

namespace ŽVPAIS_API.Controllers
{
    [Route("api/reports")]
    [ApiController]
    [Authorize]
    public class ReportController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IDamageCalculationService _calcService;

        public ReportController(AppDbContext context, IDamageCalculationService calcService)
        {
            _context = context;
            _calcService = calcService;
        }

        [HttpGet]
        public async Task<ActionResult<List<ReportResponseDto>>> GetAll()
        {
            var reports = await _context.DamageEvaluations
                .Include(r => r.Event)
                .OrderByDescending(r => r.Data)
                .ToListAsync();
            return Ok(reports.Select(MapToDto).ToList());
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<ReportResponseDto>> GetById(int id)
        {
            var report = await _context.DamageEvaluations
                .Include(r => r.Event)
                .FirstOrDefaultAsync(r => r.IdDamageEvaluation == id);
            if (report == null) return NotFound();
            return Ok(MapToDto(report));
        }

        [HttpGet("event/{eventId}")]
        public async Task<ActionResult<List<ReportResponseDto>>> GetByEvent(int eventId)
        {
            var reports = await _context.DamageEvaluations
                .Include(r => r.Event)
                .Where(r => r.EventId == eventId)
                .OrderByDescending(r => r.Data)
                .ToListAsync();
            return Ok(reports.Select(MapToDto).ToList());
        }

        [HttpPost]
        [Authorize(Roles = "Specialist")]
        public async Task<ActionResult<ReportResponseDto>> Create(ReportCreateDto dto)
        {
            var eventExists = await _context.Events.AnyAsync(e => e.IdEvent == dto.EventId);
            if (!eventExists) return BadRequest("Įvykis nerastas.");

            var report = new DamageEvaluation
            {
                EventId = dto.EventId,
                Data = dto.Data == default ? DateTime.UtcNow : dto.Data,
                ZalosDydis = dto.ZalosDydis,
                PiniginisDydis = dto.PiniginisDydis,
                Notes = dto.Notes,
                CreatedAt = DateTime.UtcNow
            };
            _context.DamageEvaluations.Add(report);
            await _context.SaveChangesAsync();

            await _context.Entry(report).Reference(r => r.Event).LoadAsync();
            return CreatedAtAction(nameof(GetById), new { id = report.IdDamageEvaluation }, MapToDto(report));
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "Specialist")]
        public async Task<ActionResult<ReportResponseDto>> Update(int id, ReportCreateDto dto)
        {
            var report = await _context.DamageEvaluations
                .Include(r => r.Event)
                .FirstOrDefaultAsync(r => r.IdDamageEvaluation == id);
            if (report == null) return NotFound();

            if (dto.Data != default) report.Data = dto.Data;
            report.ZalosDydis = dto.ZalosDydis;
            report.PiniginisDydis = dto.PiniginisDydis;
            report.Notes = dto.Notes;
            await _context.SaveChangesAsync();

            await _context.Entry(report).Reference(r => r.Event).LoadAsync();
            return Ok(MapToDto(report));
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "Specialist")]
        public async Task<IActionResult> Delete(int id)
        {
            var report = await _context.DamageEvaluations.FindAsync(id);
            if (report == null) return NotFound();
            _context.DamageEvaluations.Remove(report);
            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpPost("event/{eventId}/pdf")]
        public async Task<IActionResult> GeneratePdf(int eventId, [FromBody] PdfRequestDto dto)
        {
            var ev = await _context.Events.FindAsync(eventId);
            if (ev == null) return NotFound();

            var report = await _context.DamageEvaluations
                .Where(r => r.EventId == eventId)
                .OrderByDescending(r => r.CreatedAt)
                .FirstOrDefaultAsync();

            var breakdown = await _calcService.CalculateBreakdownForEvent(eventId);

            byte[]? mapImageBytes = null;
            if (!string.IsNullOrEmpty(dto?.MapImageBase64))
            {
                var b64 = dto.MapImageBase64;
                if (b64.Contains(',')) b64 = b64[(b64.IndexOf(',') + 1)..];
                mapImageBytes = Convert.FromBase64String(b64);
            }

            byte[]? dispersionImageBytes = null;
            if (!string.IsNullOrEmpty(dto?.DispersionImageBase64))
            {
                var b64 = dto.DispersionImageBase64;
                if (b64.Contains(',')) b64 = b64[(b64.IndexOf(',') + 1)..];
                dispersionImageBytes = Convert.FromBase64String(b64);
            }

            var pdfBytes = PdfGenerator.Generate(ev, report, breakdown, mapImageBytes, dispersionImageBytes);
            return File(pdfBytes, "application/pdf", $"ataskaita-ivykis-{eventId}.pdf");
        }

        private static ReportResponseDto MapToDto(DamageEvaluation r) => new()
        {
            IdDamageEvaluation = r.IdDamageEvaluation,
            Data = r.Data,
            ZalosDydis = r.ZalosDydis,
            PiniginisDydis = r.PiniginisDydis,
            EventId = r.EventId,
            EventType = r.Event?.EventType,
            EventDate = r.Event?.EventDate ?? default,
            EventLocation = r.Event?.Location,
            EventStatus = r.Event?.Status,
            Notes = r.Notes,
            CreatedAt = r.CreatedAt
        };
    }
}
