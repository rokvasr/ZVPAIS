using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using ŽVPAIS_API.Data;
using ŽVPAIS_API.Models;

namespace ŽVPAIS_API.Controllers
{
    [Route("api/auth")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IConfiguration _config;

        public AuthController(AppDbContext context, IConfiguration config)
        {
            _context = context;
            _config = config;
        }

        [HttpGet("registration-status")]
        public IActionResult RegistrationStatus()
        {
            var enabled = _config.GetValue<bool>("RegistrationEnabled", true);
            return Ok(new { enabled });
        }

        [HttpPost("register")]
        public async Task<ActionResult<AuthResponseDto>> Register(RegisterDto dto)
        {
            if (!_config.GetValue<bool>("RegistrationEnabled", true))
                return StatusCode(403, "Registracija šiuo metu uždaryta.");

            if (await _context.Users.AnyAsync(u => u.Email == dto.Email))
                return BadRequest("El. paštas jau naudojamas.");

            if (dto.IsSpecialist && string.IsNullOrWhiteSpace(dto.Name))
                return BadRequest("Specialisto vardas yra privalomas.");

            var user = new User
            {
                Email = dto.Email,
                Password = HashPassword(dto.Password),
                CreatedAt = DateTime.UtcNow
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            if (dto.IsSpecialist)
            {
                var specialist = new Specialist
                {
                    IdUser = user.IdUser,
                    Name = dto.Name!,
                    FieldOfExpertise = dto.FieldOfExpertise ?? string.Empty
                };
                _context.Specialists.Add(specialist);
                await _context.SaveChangesAsync();
            }

            var role = dto.IsSpecialist ? "Specialist" : "User";
            return Ok(new AuthResponseDto
            {
                Token = GenerateToken(user, role),
                Email = user.Email,
                Role = role,
                UserId = user.IdUser
            });
        }

        [HttpPost("login")]
        public async Task<ActionResult<AuthResponseDto>> Login(LoginDto dto)
        {
            var user = await _context.Users
                .Include(u => u.Specialist)
                .FirstOrDefaultAsync(u => u.Email == dto.Email);

            if (user == null || !VerifyPassword(dto.Password, user.Password))
                return Unauthorized("Neteisingas el. paštas arba slaptažodis.");

            var role = user.Specialist != null ? "Specialist" : "User";
            return Ok(new AuthResponseDto
            {
                Token = GenerateToken(user, role),
                Email = user.Email,
                Role = role,
                UserId = user.IdUser
            });
        }

        private string GenerateToken(User user, string role)
        {
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_config["Jwt:Key"]!));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
            var expires = DateTime.UtcNow.AddHours(
                _config.GetValue<int>("Jwt:ExpiresInHours", 24));

            var claims = new[]
            {
                new Claim(JwtRegisteredClaimNames.Sub, user.IdUser.ToString()),
                new Claim(JwtRegisteredClaimNames.Email, user.Email),
                new Claim(ClaimTypes.Role, role),
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
            };

            var token = new JwtSecurityToken(
                issuer: _config["Jwt:Issuer"],
                audience: _config["Jwt:Audience"],
                claims: claims,
                expires: expires,
                signingCredentials: creds);

            return new JwtSecurityTokenHandler().WriteToken(token);
        }

        private static string HashPassword(string password)
        {
            var salt = RandomNumberGenerator.GetBytes(16);
            var hash = Rfc2898DeriveBytes.Pbkdf2(
                password, salt, 100_000, HashAlgorithmName.SHA256, 32);
            return $"{Convert.ToBase64String(salt)}:{Convert.ToBase64String(hash)}";
        }

        private static bool VerifyPassword(string password, string stored)
        {
            var parts = stored.Split(':');
            if (parts.Length != 2) return false;
            var salt = Convert.FromBase64String(parts[0]);
            var expected = Convert.FromBase64String(parts[1]);
            var actual = Rfc2898DeriveBytes.Pbkdf2(
                password, salt, 100_000, HashAlgorithmName.SHA256, 32);
            return CryptographicOperations.FixedTimeEquals(actual, expected);
        }
    }
}
