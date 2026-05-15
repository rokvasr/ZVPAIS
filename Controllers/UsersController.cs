using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ŽVPAIS_API.Data;

namespace ŽVPAIS_API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "Specialist")]
    public class UsersController : ControllerBase
    {
        private readonly AppDbContext _context;

        public UsersController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<UserResponseDto>>> GetUsers()
        {
            var users = await _context.Users
                .Include(u => u.Specialist)
                .Select(u => new UserResponseDto
                {
                    IdUser = u.IdUser,
                    Email = u.Email,
                    CreatedAt = u.CreatedAt,
                    SpecialistName = u.Specialist != null ? u.Specialist.Name : null,
                    FieldOfExpertise = u.Specialist != null ? u.Specialist.FieldOfExpertise : null
                })
                .ToListAsync();

            return Ok(users);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<UserResponseDto>> GetUser(int id)
        {
            var user = await _context.Users
                .Include(u => u.Specialist)
                .FirstOrDefaultAsync(u => u.IdUser == id);

            if (user == null)
                return NotFound();

            return Ok(new UserResponseDto
            {
                IdUser = user.IdUser,
                Email = user.Email,
                CreatedAt = user.CreatedAt,
                SpecialistName = user.Specialist?.Name,
                FieldOfExpertise = user.Specialist?.FieldOfExpertise
            });
        }

    }
}
