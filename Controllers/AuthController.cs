using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Net.Mail;
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
            // The signing key is loaded from config (set via Azure App Settings in production).
            // HMAC-SHA256 is a symmetric algorithm — the same key signs and verifies tokens.
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_config["Jwt:Key"]!));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
            var expires = DateTime.UtcNow.AddHours(
                _config.GetValue<int>("Jwt:ExpiresInHours", 24));

            // Claims are the payload embedded inside the JWT.
            // Sub = user ID, Role = "User" or "Specialist" (used by [Authorize(Roles=...)]),
            // Jti = unique token ID (allows future token revocation if a blocklist is added).
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

            // WriteToken serialises the token as a base64url-encoded string: header.payload.signature
            return new JwtSecurityTokenHandler().WriteToken(token);
        }

        [HttpPost("forgot-password")]
        public async Task<IActionResult> ForgotPassword(ForgotPasswordDto dto)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == dto.Email);

            // Always return 200 — do not reveal whether the email is registered
            if (user == null)
                return Ok();

            var tempPassword = GenerateTempPassword();
            user.Password = HashPassword(tempPassword);
            await _context.SaveChangesAsync();

            var smtpHost = _config["Smtp:Host"]!;
            var smtpUser = _config["Smtp:User"]!;
            var smtpPass = _config["Smtp:Password"]!;

#pragma warning disable CS0618
            using var client = new SmtpClient(smtpHost, 587)
            {
                Credentials = new NetworkCredential(smtpUser, smtpPass),
                EnableSsl = true
            };
#pragma warning restore CS0618

            var mail = new MailMessage
            {
                From = new MailAddress(smtpUser, "ZVPAIS sistema"),
                Subject = "Laikinas slaptazodis / Temporary password",
                Body = $"Jusu laikinas slaptazodis: {tempPassword}\n\nPrisijunge prie sistemos rekomenduojame ji pakeisti.",
                IsBodyHtml = false
            };
            mail.To.Add(user.Email);

            await client.SendMailAsync(mail);

            return Ok();
        }

        private static string GenerateTempPassword()
        {
            // Build a password that always satisfies NFR5: 8+ chars, uppercase, digit, special char
            const string lower = "abcdefghijkmnpqrstuvwxyz";
            const string upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
            const string digits = "23456789";
            const string special = "!@#$%";
            const string all = lower + upper + digits + special;

            var bytes = RandomNumberGenerator.GetBytes(12);
            var chars = new char[12];
            chars[0] = upper[bytes[0] % upper.Length];
            chars[1] = digits[bytes[1] % digits.Length];
            chars[2] = special[bytes[2] % special.Length];
            chars[3] = lower[bytes[3] % lower.Length];
            for (int i = 4; i < 12; i++)
                chars[i] = all[bytes[i] % all.Length];

            // Fisher-Yates shuffle
            var rng = RandomNumberGenerator.GetBytes(12);
            for (int i = 11; i > 0; i--)
            {
                int j = rng[i] % (i + 1);
                (chars[i], chars[j]) = (chars[j], chars[i]);
            }
            return new string(chars);
        }

        private static string HashPassword(string password)
        {
            // Generate a cryptographically random 16-byte salt.
            // A unique salt per user prevents rainbow-table and pre-computation attacks.
            var salt = RandomNumberGenerator.GetBytes(16);

            // PBKDF2 (Password-Based Key Derivation Function 2) with SHA-256:
            // 100 000 iterations make brute-force attacks computationally expensive.
            // Output is 32 bytes (256 bits). The result is stored as "base64(salt):base64(hash)".
            var hash = Rfc2898DeriveBytes.Pbkdf2(
                password, salt, 100_000, HashAlgorithmName.SHA256, 32);
            return $"{Convert.ToBase64String(salt)}:{Convert.ToBase64String(hash)}";
        }

        private static bool VerifyPassword(string password, string stored)
        {
            // Stored format: "base64(salt):base64(hash)" — split on the colon separator.
            var parts = stored.Split(':');
            if (parts.Length != 2) return false;
            var salt = Convert.FromBase64String(parts[0]);
            var expected = Convert.FromBase64String(parts[1]);

            // Re-derive the hash using the stored salt and the candidate password.
            var actual = Rfc2898DeriveBytes.Pbkdf2(
                password, salt, 100_000, HashAlgorithmName.SHA256, 32);

            // FixedTimeEquals compares the two byte arrays in constant time.
            // A normal == comparison short-circuits on the first mismatch, which leaks timing
            // information that an attacker can use to guess passwords byte by byte.
            return CryptographicOperations.FixedTimeEquals(actual, expected);
        }
    }
}
