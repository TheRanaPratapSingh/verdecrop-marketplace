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
    /// Development-only auth controller that bypasses ALL external services.
    /// OTP is always 123456. Removed on Release build.
    /// </summary>
    [ApiController]
    [Route("api/auth")]
    public class DevAuthController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly IJwtService _jwt;
        private readonly IConfiguration _config;

        public DevAuthController(AppDbContext db, IJwtService jwt, IConfiguration config)
        {
            _db = db; _jwt = jwt; _config = config;
        }

        // POST /api/auth/send-otp
        [HttpPost("send-otp")]
        public async Task<IActionResult> SendOtp([FromBody] SendOtpRequest req)
        {
            // Invalidate any existing OTP
            var old = await _db.OtpCodes
                .Where(o => o.Identifier == req.Identifier && !o.IsUsed)
                .ToListAsync();
            old.ForEach(o => o.IsUsed = true);

            // Store new OTP (always 123456 in dev)
            _db.OtpCodes.Add(new OtpCode
            {
                Identifier = req.Identifier,
                Code = "123456",
                Purpose = req.Purpose,
                ExpiresAt = DateTime.UtcNow.AddMinutes(10),
                IsUsed = false,
                CreatedAt = DateTime.UtcNow
            });
            await _db.SaveChangesAsync();

            Console.WriteLine($"[DEV] OTP for {req.Identifier} = 123456");
            return Ok(new { success = true, message = "OTP sent (dev: use 123456)", data = true });
        }

        // POST /api/auth/verify-otp
        [HttpPost("verify-otp")]
        public async Task<IActionResult> VerifyOtp([FromBody] VerifyOtpRequest req)
        {
            if (req.Code != "123456")
                return Unauthorized(new { success = false, message = "Invalid OTP (dev: use 123456)" });

            var isEmail = req.Identifier.Contains('@');

            // Find or create user
            User? user;
            if (isEmail)
                user = await _db.Users.FirstOrDefaultAsync(u => u.Email == req.Identifier && !u.IsDeleted);
            else
                user = await _db.Users.FirstOrDefaultAsync(u => u.Phone == req.Identifier && !u.IsDeleted);

            if (user == null)
            {
                user = new User
                {
                    Name = req.Name ?? req.Identifier.Split('@')[0],
                    Email = isEmail ? req.Identifier : null,
                    Phone = isEmail ? null : req.Identifier,
                    IsEmailVerified = isEmail,
                    IsPhoneVerified = !isEmail,
                    Role = "user",
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow
                };
                _db.Users.Add(user);
                await _db.SaveChangesAsync();

                _db.Carts.Add(new Cart { UserId = user.Id, CreatedAt = DateTime.UtcNow });
                await _db.SaveChangesAsync();
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