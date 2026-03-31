#if DEBUG
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using VerdeCrop.Application.DTOs;
using VerdeCrop.Application.Interfaces;
using VerdeCrop.Domain.Entities;
using VerdeCrop.Infrastructure.Data;

namespace VerdeCrop.API.Controllers
{
    /// <summary>
    /// Development-only auth controller that still uses the real OTP/email services.
    /// Removed on Release build.
    /// </summary>
    [ApiController]
    [Route("api/auth")]
    public class DevAuthController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly IJwtService _jwt;
        private readonly IConfiguration _config;
        private readonly IOtpService _otp;
        private readonly IEmailService _email;
        private readonly ISmsService _sms;

        public DevAuthController(AppDbContext db, IJwtService jwt, IConfiguration config, IOtpService otp, IEmailService email, ISmsService sms)
        {
            _db = db; _jwt = jwt; _config = config; _otp = otp; _email = email; _sms = sms;
        }

        // POST /api/auth/send-otp
        [HttpPost("send-otp")]
        public async Task<IActionResult> SendOtp([FromBody] SendOtpRequest req)
        {
            // Delegate to OTP service which handles throttling and storage. In dev the generated OTP will be
            // printed to console by the service consumer if desired.
            try
            {
                var code = await _otp.GenerateOtpAsync(req.Identifier, req.Purpose);
                if (req.Identifier.Contains('@'))
                    await _email.SendOtpEmailAsync(req.Identifier, code, req.Purpose);
                else
                    await _sms.SendOtpSmsAsync(req.Identifier, code);

                return Ok(new { success = true, message = "OTP sent successfully", data = true });
            }
            catch (Exception ex)
            {
                return StatusCode(429, new { success = false, message = ex.Message });
            }
        }

        // POST /api/auth/verify-otp
        [HttpPost("verify-otp")]
        public async Task<IActionResult> VerifyOtp([FromBody] VerifyOtpRequest req)
        {
            var valid = await ValidateLoginOrRegisterOtpAsync(req.Identifier, req.Code);
            if (!valid) return Unauthorized(new { success = false, message = "Invalid or expired OTP" });

            var normalizedEmail = string.IsNullOrWhiteSpace(req.Email) ? (req.Identifier.Contains('@') ? req.Identifier : null) : req.Email.Trim();
            var normalizedPhone = string.IsNullOrWhiteSpace(req.Phone) ? (!req.Identifier.Contains('@') ? req.Identifier : null) : req.Phone.Trim();

            User? user = null;
            if (!string.IsNullOrWhiteSpace(normalizedEmail))
                user = await _db.Users.FirstOrDefaultAsync(u => u.Email == normalizedEmail && !u.IsDeleted);
            if (user == null && !string.IsNullOrWhiteSpace(normalizedPhone))
                user = await _db.Users.FirstOrDefaultAsync(u => u.Phone == normalizedPhone && !u.IsDeleted);
            if (user == null)
                user = await _db.Users.FirstOrDefaultAsync(u => (u.Email == req.Identifier || u.Phone == req.Identifier) && !u.IsDeleted);

            if (user == null)
            {
                user = new User
                {
                    Name = req.Name ?? normalizedEmail ?? normalizedPhone ?? req.Identifier,
                    Email = normalizedEmail,
                    Phone = normalizedPhone,
                    IsEmailVerified = !string.IsNullOrWhiteSpace(normalizedEmail),
                    IsPhoneVerified = !string.IsNullOrWhiteSpace(normalizedPhone),
                    Role = "user",
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow
                };
                _db.Users.Add(user);
                await _db.SaveChangesAsync();

                _db.Carts.Add(new Cart { UserId = user.Id, CreatedAt = DateTime.UtcNow });
                await _db.SaveChangesAsync();

                await SendRegistrationSuccessEmailAsync(user, !string.IsNullOrWhiteSpace(user.Email));
            }
            else
            {
                var updated = false;
                var hasFarmerProfile = await _db.FarmerProfiles.AnyAsync(f => f.UserId == user.Id);
                var expectedRole = hasFarmerProfile ? "farmer" : user.Role;
                if (!string.Equals(user.Role, expectedRole, StringComparison.OrdinalIgnoreCase))
                {
                    user.Role = expectedRole;
                    updated = true;
                }
                if (!string.IsNullOrWhiteSpace(req.Name) && user.Name != req.Name)
                {
                    user.Name = req.Name;
                    updated = true;
                }
                if (string.IsNullOrWhiteSpace(user.Email) && !string.IsNullOrWhiteSpace(normalizedEmail))
                {
                    user.Email = normalizedEmail;
                    user.IsEmailVerified = true;
                    updated = true;
                }
                if (string.IsNullOrWhiteSpace(user.Phone) && !string.IsNullOrWhiteSpace(normalizedPhone))
                {
                    user.Phone = normalizedPhone;
                    user.IsPhoneVerified = true;
                    updated = true;
                }
                if (updated)
                    await _db.SaveChangesAsync();

                await SendLoginWelcomeEmailAsync(user);
            }

            var accessToken = _jwt.GenerateAccessToken(user);
            var refreshToken = _jwt.GenerateRefreshToken();

            _db.RefreshTokens.Add(new RefreshToken
            {
                UserId = user.Id,
                Token = refreshToken,
                ExpiresAt = DateTime.UtcNow.AddDays(7),
                IsRevoked = false,
                CreatedAt = DateTime.UtcNow
            });
            await _db.SaveChangesAsync();

            var userDto = new UserDto(user.Id, user.Name, user.Email, user.Phone,
                user.Role, user.AvatarUrl, user.IsActive);

            return Ok(new { success = true, data = new { accessToken, refreshToken, user = userDto } });
        }

        private async Task<bool> ValidateLoginOrRegisterOtpAsync(string identifier, string code)
        {
            if (await _otp.ValidateOtpAsync(identifier, code, "login")) return true;
            return await _otp.ValidateOtpAsync(identifier, code, "register");
        }

        private async Task SendRegistrationSuccessEmailAsync(User user, bool isEmail)
        {
            if (!isEmail || string.IsNullOrWhiteSpace(user.Email)) return;
            try
            {
                await _email.SendWelcomeEmailAsync(user.Email, user.Name);
            }
            catch
            {
            }
        }

        private async Task SendLoginWelcomeEmailAsync(User user)
        {
            if (string.IsNullOrWhiteSpace(user.Email)) return;
            try
            {
                await _email.SendLoginWelcomeEmailAsync(user.Email, user.Name);
            }
            catch
            {
            }
        }

        // POST /api/auth/refresh
        [HttpPost("refresh")]
        public async Task<IActionResult> Refresh([FromBody] RefreshTokenRequest req)
        {
            var token = await _db.RefreshTokens
                .FirstOrDefaultAsync(t => t.Token == req.Token && !t.IsRevoked);
            if (token == null || token.ExpiresAt < DateTime.UtcNow)
                return Unauthorized(new { success = false, message = "Invalid refresh token" });

            var user = await _db.Users.FindAsync(token.UserId);
            if (user == null || !user.IsActive)
                return Unauthorized(new { success = false, message = "User not found" });

            token.IsRevoked = true;
            var newAccess = _jwt.GenerateAccessToken(user);
            var newRefresh = _jwt.GenerateRefreshToken();

            _db.RefreshTokens.Add(new RefreshToken
            {
                UserId = user.Id,
                Token = newRefresh,
                ExpiresAt = DateTime.UtcNow.AddDays(7),
                CreatedAt = DateTime.UtcNow
            });
            await _db.SaveChangesAsync();

            var userDto = new UserDto(user.Id, user.Name, user.Email, user.Phone,
                user.Role, user.AvatarUrl, user.IsActive);

            return Ok(new { success = true, data = new { accessToken = newAccess, refreshToken = newRefresh, user = userDto } });
        }

        // POST /api/auth/logout
        [HttpPost("logout")]
        public async Task<IActionResult> Logout([FromBody] LogoutRequest req)
        {
            var token = await _db.RefreshTokens.FirstOrDefaultAsync(t => t.Token == req.RefreshToken);
            if (token != null) { token.IsRevoked = true; await _db.SaveChangesAsync(); }
            return Ok(new { success = true, data = true });
        }
    }
}
#endif