using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using Razorpay.Api;
using SendGrid;
using SendGrid.Helpers.Mail;
using StackExchange.Redis;
using Twilio;
using Twilio.Rest.Api.V2010.Account;
using VerdeCrop.Application.DTOs;
using VerdeCrop.Application.Interfaces;
using VerdeCrop.Domain.Entities;
using VerdeCrop.Infrastructure.Repositories;
using Azure.Storage.Blobs;
using FirebaseAdmin.Messaging;
using Microsoft.EntityFrameworkCore;

namespace VerdeCrop.Infrastructure.Services
{
    // ── JWT Service ───────────────────────────────────────────────────────────
    public class JwtService : IJwtService
    {
        private readonly IConfiguration _config;
        public JwtService(IConfiguration config) { _config = config; }

        public string GenerateAccessToken(User user)
        {
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_config["Jwt:SecretKey"]!));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
            var claims = new[]
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Name, user.Name),
                new Claim(ClaimTypes.Role, user.Role),
                new Claim(ClaimTypes.Email, user.Email ?? ""),
            };
            var token = new JwtSecurityToken(
                issuer: _config["Jwt:Issuer"],
                audience: _config["Jwt:Audience"],
                claims: claims,
                expires: DateTime.UtcNow.AddMinutes(int.Parse(_config["Jwt:AccessTokenExpiryMinutes"] ?? "60")),
                signingCredentials: creds);
            return new JwtSecurityTokenHandler().WriteToken(token);
        }

        public string GenerateRefreshToken()
        {
            var bytes = new byte[64];
            using var rng = RandomNumberGenerator.Create();
            rng.GetBytes(bytes);
            return Convert.ToBase64String(bytes);
        }

        public int? ValidateAccessToken(string token)
        {
            try
            {
                var handler = new JwtSecurityTokenHandler();
                var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_config["Jwt:SecretKey"]!));
                var result = handler.ValidateToken(token, new TokenValidationParameters
                {
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = key,
                    ValidateIssuer = true,
                    ValidIssuer = _config["Jwt:Issuer"],
                    ValidateAudience = true,
                    ValidAudience = _config["Jwt:Audience"],
                    ClockSkew = TimeSpan.Zero
                }, out _);
                var idClaim = result.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                return idClaim != null ? int.Parse(idClaim) : null;
            }
            catch { return null; }
        }
    }

    // ── OTP Service ───────────────────────────────────────────────────────────
    public class OtpService : IOtpService
    {
        private readonly IUnitOfWork _uow;
        private readonly ICacheService _cache;
        private readonly IConfiguration _config;

        public OtpService(IUnitOfWork uow, ICacheService cache, IConfiguration config)
        {
            _uow = uow; _cache = cache; _config = config;
        }

        public async Task<string> GenerateOtpAsync(string identifier, string purpose)
        {
            var isDev = _config["Environment"] == "Development";
            var code = isDev ? "123456" : new Random().Next(100000, 999999).ToString();

            var existing = await _uow.OtpCodes.FirstOrDefaultAsync(
                o => o.Identifier == identifier && o.Purpose == purpose && !o.IsUsed);
            if (existing != null)
            {
                existing.IsUsed = true;
                await _uow.OtpCodes.UpdateAsync(existing);
            }

            await _uow.OtpCodes.AddAsync(new OtpCode
            {
                Identifier = identifier,
                Code = code,
                Purpose = purpose,
                ExpiresAt = DateTime.UtcNow.AddMinutes(10)
            });
            await _uow.SaveChangesAsync();
            return code;
        }

        public async Task<bool> ValidateOtpAsync(string identifier, string code, string purpose)
        {
            var otp = await _uow.OtpCodes.FirstOrDefaultAsync(
                o => o.Identifier == identifier && o.Code == code && o.Purpose == purpose
                     && !o.IsUsed && o.ExpiresAt > DateTime.UtcNow);
            if (otp == null) return false;
            otp.IsUsed = true;
            await _uow.OtpCodes.UpdateAsync(otp);
            await _uow.SaveChangesAsync();
            return true;
        }
    }

    // ── Email Service (SendGrid) ──────────────────────────────────────────────
    public class EmailService : IEmailService
    {
        private readonly IConfiguration _config;
        private bool IsDev => _config["Environment"] == "Development"
                              || _config["ASPNETCORE_ENVIRONMENT"] == "Development";

        public EmailService(IConfiguration config) { _config = config; }

        public async Task SendOtpEmailAsync(string email, string otp, string purpose)
        {
            if (IsDev)
            {
                Console.WriteLine($"[DEV EMAIL] To: {email} | OTP: {otp} | Purpose: {purpose}");
                return;
            }
            var apiKey = _config["SendGrid:ApiKey"];
            if (string.IsNullOrWhiteSpace(apiKey) || apiKey.StartsWith("SG.your"))
            {
                Console.WriteLine($"[WARN] SendGrid API key not configured. OTP for {email}: {otp}");
                return;
            }
            var client = new SendGridClient(apiKey);
            var msg = MailHelper.CreateSingleEmail(
                new EmailAddress("noreply@verdecrop.com", "VerdeCrop"),
                new EmailAddress(email),
                $"Your VerdeCrop OTP - {otp}",
                $"Your OTP is: {otp}. Valid for 10 minutes.",
                $"<h2>VerdeCrop</h2><p>Your OTP is: <strong>{otp}</strong></p><p>Valid for 10 minutes.</p>");
            await client.SendEmailAsync(msg);
        }

        public async Task SendOrderConfirmationAsync(string email, string orderNumber, decimal amount)
        {
            if (IsDev) { Console.WriteLine($"[DEV EMAIL] Order confirmed: {orderNumber}"); return; }
            var apiKey = _config["SendGrid:ApiKey"];
            if (string.IsNullOrWhiteSpace(apiKey) || apiKey.StartsWith("SG.your")) return;
            var client = new SendGridClient(apiKey);
            var msg = MailHelper.CreateSingleEmail(
                new EmailAddress("noreply@verdecrop.com", "VerdeCrop"),
                new EmailAddress(email),
                $"Order Confirmed - {orderNumber}",
                $"Your order {orderNumber} has been confirmed. Total: Rs.{amount}",
                $"<h2>Order Confirmed!</h2><p>Order: <strong>{orderNumber}</strong></p><p>Amount: <strong>Rs.{amount}</strong></p>");
            await client.SendEmailAsync(msg);
        }
    }

    // ── SMS Service (Twilio) ──────────────────────────────────────────────────
    public class SmsService : ISmsService
    {
        private readonly IConfiguration _config;
        private bool IsDev => _config["Environment"] == "Development"
                              || _config["ASPNETCORE_ENVIRONMENT"] == "Development";

        public SmsService(IConfiguration config)
        {
            _config = config;
            // Only initialise Twilio if keys are configured
            var sid = config["Twilio:AccountSid"];
            var token = config["Twilio:AuthToken"];
            if (!string.IsNullOrWhiteSpace(sid) && !sid.StartsWith("AC"))
                return; // placeholder key — skip init
            if (!string.IsNullOrWhiteSpace(sid) && !string.IsNullOrWhiteSpace(token))
                TwilioClient.Init(sid, token);
        }

        public async Task SendOtpSmsAsync(string phone, string otp)
        {
            if (IsDev)
            {
                Console.WriteLine($"[DEV SMS] To: {phone} | OTP: {otp}");
                return;
            }
            var sid = _config["Twilio:AccountSid"];
            var from = _config["Twilio:FromNumber"];
            if (string.IsNullOrWhiteSpace(sid) || sid.StartsWith("AC") == false)
            {
                Console.WriteLine($"[WARN] Twilio not configured. OTP for {phone}: {otp}");
                return;
            }
            await MessageResource.CreateAsync(
                body: $"VerdeCrop OTP: {otp}. Valid for 10 min. Do not share.",
                from: new Twilio.Types.PhoneNumber(from),
                to: new Twilio.Types.PhoneNumber(phone));
        }
    }

    // ── Redis Cache Service ───────────────────────────────────────────────────
    public class RedisCacheService : ICacheService
    {
        private readonly IDistributedCache _cache;
        private readonly IConnectionMultiplexer _redis;

        public RedisCacheService(IDistributedCache cache, IConnectionMultiplexer redis)
        {
            _cache = cache; _redis = redis;
        }

        public async Task<T?> GetAsync<T>(string key)
        {
            var json = await _cache.GetStringAsync(key);
            return json == null ? default : JsonSerializer.Deserialize<T>(json);
        }

        public async Task SetAsync<T>(string key, T value, TimeSpan? expiry = null)
        {
            var options = new DistributedCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = expiry ?? TimeSpan.FromMinutes(5)
            };
            await _cache.SetStringAsync(key, JsonSerializer.Serialize(value), options);
        }

        public async Task DeleteAsync(string key) => await _cache.RemoveAsync(key);

        public async Task DeleteByPrefixAsync(string prefix)
        {
            var db = _redis.GetDatabase();
            var server = _redis.GetServer(_redis.GetEndPoints().First());
            var keys = server.Keys(pattern: $"{prefix}*").ToArray();
            if (keys.Length > 0) await db.KeyDeleteAsync(keys);
        }
    }

    // ── Azure Blob Storage ────────────────────────────────────────────────────
    public class AzureBlobStorageService : IStorageService
    {
        private readonly BlobServiceClient _client;
        private readonly string _containerName;

        public AzureBlobStorageService(IConfiguration config)
        {
            //_client = new BlobServiceClient(config["Azure:BlobStorage:ConnectionString"]);
            //_containerName = config["Azure:BlobStorage:ContainerName"] ?? "verdecrop";
        }

        public async Task<string> UploadAsync(Stream fileStream, string fileName, string folder)
        {
            var container = _client.GetBlobContainerClient(_containerName);
            await container.CreateIfNotExistsAsync();
            var blobName = $"{folder}/{Guid.NewGuid()}-{fileName}";
            var blob = container.GetBlobClient(blobName);
            await blob.UploadAsync(fileStream, overwrite: true);
            return blob.Uri.ToString();
        }

        public async Task DeleteAsync(string url)
        {
            var uri = new Uri(url);
            var blobName = uri.AbsolutePath.TrimStart('/').Replace($"{_containerName}/", "");
            var container = _client.GetBlobContainerClient(_containerName);
            await container.GetBlobClient(blobName).DeleteIfExistsAsync();
        }
    }

    // ── Razorpay Payment Service ──────────────────────────────────────────────
    public class PaymentService : IPaymentService
    {
        private readonly IUnitOfWork _uow;
        private readonly IConfiguration _config;

        public PaymentService(IUnitOfWork uow, IConfiguration config) { _uow = uow; _config = config; }

        public async Task<RazorpayOrderResponse?> CreateRazorpayOrderAsync(int orderId)
        {
            var order = await _uow.Orders.GetByIdAsync(orderId);
            if (order == null) return null;

            var client = new RazorpayClient(_config["Razorpay:KeyId"], _config["Razorpay:KeySecret"]);
            var options = new Dictionary<string, object>
            {
                ["amount"] = (int)(order.TotalAmount * 100),
                ["currency"] = "INR",
                ["receipt"] = order.OrderNumber
            };
            var razorpayOrder = client.Order.Create(options);
            var rpOrderId = razorpayOrder["id"].ToString()!;

            await _uow.Payments.AddAsync(new Domain.Entities.Payment
            {
                OrderId = orderId,
                Provider = "razorpay",
                ProviderOrderId = rpOrderId,
                Amount = order.TotalAmount,
                Status = "pending"
            });
            await _uow.SaveChangesAsync();

            return new RazorpayOrderResponse(rpOrderId, order.TotalAmount, "INR", _config["Razorpay:KeyId"]!);
        }

        public async Task<bool> VerifyRazorpayPaymentAsync(VerifyRazorpayRequest req)
        {
            var generated = GenerateRazorpaySignature(req.RazorpayOrderId, req.RazorpayPaymentId);
            if (generated != req.RazorpaySignature) return false;

            var payment = await _uow.Payments.FirstOrDefaultAsync(
                p => p.ProviderOrderId == req.RazorpayOrderId && p.OrderId == req.OrderId);
            if (payment == null) return false;

            payment.ProviderPaymentId = req.RazorpayPaymentId;
            payment.ProviderSignature = req.RazorpaySignature;
            payment.Status = "success";
            await _uow.Payments.UpdateAsync(payment);

            var order = await _uow.Orders.GetByIdAsync(req.OrderId);
            if (order != null) { order.PaymentStatus = "paid"; order.Status = "confirmed"; }
            await _uow.SaveChangesAsync();
            return true;
        }

        public async Task<StripeIntentResponse?> CreateStripeIntentAsync(int orderId)
        {
            var order = await _uow.Orders.GetByIdAsync(orderId);
            if (order == null) return null;

            Stripe.StripeConfiguration.ApiKey = _config["Stripe:SecretKey"];
            var svc = new Stripe.PaymentIntentService();
            var intent = await svc.CreateAsync(new Stripe.PaymentIntentCreateOptions
            {
                Amount = (long)(order.TotalAmount * 100),
                Currency = "inr",
                Metadata = new Dictionary<string, string> { ["orderId"] = orderId.ToString() }
            });

            await _uow.Payments.AddAsync(new  Domain.Entities.Payment
            {
                OrderId = orderId,
                Provider = "stripe",
                ProviderPaymentId = intent.Id,
                Amount = order.TotalAmount,
                Status = "pending"
            });
            await _uow.SaveChangesAsync();
            return new StripeIntentResponse(intent.ClientSecret!, intent.Id);
        }

        public Task<bool> HandleStripeWebhookAsync(string payload, string signature) => Task.FromResult(true);

        private string GenerateRazorpaySignature(string orderId, string paymentId)
        {
            var key = _config["Razorpay:KeySecret"]!;
            var message = $"{orderId}|{paymentId}";
            using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(key));
            return BitConverter.ToString(hmac.ComputeHash(Encoding.UTF8.GetBytes(message))).Replace("-", "").ToLower();
        }
    }

    // ── Notification Service ──────────────────────────────────────────────────
    public class NotificationService : INotificationService
    {
        private readonly IUnitOfWork _uow;
        private readonly IFirebaseService _firebase;

        public NotificationService(IUnitOfWork uow, IFirebaseService firebase) { _uow = uow; _firebase = firebase; }

        public async Task<List<NotificationDto>> GetUserNotificationsAsync(int userId)
        {
            var notifs = await _uow.Notifications.Query()
                .Where(n => n.UserId == userId)
                .OrderByDescending(n => n.CreatedAt)
                .Take(50).ToListAsync();
            return notifs.Select(ToDto).ToList();
        }

        public async Task<bool> MarkAsReadAsync(int notificationId, int userId)
        {
            var n = await _uow.Notifications.FirstOrDefaultAsync(n => n.Id == notificationId && n.UserId == userId);
            if (n == null) return false;
            n.IsRead = true;
            await _uow.Notifications.UpdateAsync(n);
            await _uow.SaveChangesAsync();
            return true;
        }

        public async Task<bool> MarkAllAsReadAsync(int userId)
        {
            var notifs = await _uow.Notifications.GetAllAsync(n => n.UserId == userId && !n.IsRead);
            foreach (var n in notifs) { n.IsRead = true; await _uow.Notifications.UpdateAsync(n); }
            await _uow.SaveChangesAsync();
            return true;
        }

        public async Task<bool> DeleteAsync(int notificationId, int userId)
        {
            var n = await _uow.Notifications.FirstOrDefaultAsync(n => n.Id == notificationId && n.UserId == userId);
            if (n == null) return false;
            await _uow.Notifications.DeleteAsync(n);
            await _uow.SaveChangesAsync();
            return true;
        }

        public async Task SendAsync(int userId, string title, string body, string type = "system", string? actionUrl = null)
        {
            var notif = new Domain.Entities.Notification { UserId = userId, Title = title, Body = body, Type = type, ActionUrl = actionUrl };
            await _uow.Notifications.AddAsync(notif);
            await _uow.SaveChangesAsync();

            var user = await _uow.Users.GetByIdAsync(userId);
            if (user?.FcmToken != null)
                await _firebase.SendToTokenAsync(user.FcmToken, title, body);
        }

        public async Task SendToAllAsync(string title, string body, string type = "announce")
        {
            var users = await _uow.Users.GetAllAsync(u => u.IsActive);
            foreach (var u in users)
            {
                await _uow.Notifications.AddAsync(new Domain.Entities.Notification { UserId = u.Id, Title = title, Body = body, Type = type });
            }
            await _uow.SaveChangesAsync();
            await _firebase.SendToTopicAsync("all_users", title, body);
        }

        private static NotificationDto ToDto(Domain.Entities.Notification n) => new(n.Id, n.Title, n.Body, n.Type, n.ActionUrl, n.IsRead, n.CreatedAt);
    }

    // ── Firebase Service ──────────────────────────────────────────────────────
    public class FirebaseService : IFirebaseService
    {
        public async Task SendToTokenAsync(string token, string title, string body, Dictionary<string, string>? data = null)
        {
            try
            {
                await FirebaseMessaging.DefaultInstance.SendAsync(new Message
                {
                    Token = token,
                    Notification = new FirebaseAdmin.Messaging.Notification { Title = title, Body = body },
                    Data = data
                });
            }
            catch { /* log and swallow */ }
        }

        public async Task SendToTopicAsync(string topic, string title, string body)
        {
            try
            {
                await FirebaseMessaging.DefaultInstance.SendAsync(new Message
                {
                    Topic = topic,
                    Notification = new FirebaseAdmin.Messaging.Notification { Title = title, Body = body }
                });
            }
            catch { /* log and swallow */ }
        }
    }
}