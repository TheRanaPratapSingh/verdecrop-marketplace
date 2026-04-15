using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Net;
using System.Net.Mail;
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
            // Always generate a proper 6-digit OTP. Do not use hardcoded dev OTPs here.
            var rng = new Random();
            var code = rng.Next(0, 1000000).ToString("D6");

            // Throttling: max sends per hour
            var maxPerHour = int.TryParse(_config["Otp:MaxPerHour"], out var mph) ? mph : 10;
            var since = DateTime.UtcNow.AddHours(-1);
            var sentCount = await _uow.OtpCodes.Query().CountAsync(o => o.Identifier == identifier && o.Purpose == purpose && o.CreatedAt >= since);
            if (sentCount >= maxPerHour)
                throw new InvalidOperationException("OTP send limit exceeded. Try again later.");

            // Per-minute throttle
            var last = await _uow.OtpCodes.Query().Where(o => o.Identifier == identifier && o.Purpose == purpose)
                .OrderByDescending(o => o.CreatedAt).FirstOrDefaultAsync();
            var minIntervalSeconds = int.TryParse(_config["Otp:MinIntervalSeconds"], out var mis) ? mis : 30;
            if (last != null && (DateTime.UtcNow - last.CreatedAt).TotalSeconds < minIntervalSeconds)
                throw new InvalidOperationException("OTP requested too frequently. Please wait a moment.");

            // Invalidate existing unused otps for this identifier/purpose
            var existing = await _uow.OtpCodes.GetAllAsync(o => o.Identifier == identifier && o.Purpose == purpose && !o.IsUsed);
            foreach (var e in existing) { e.IsUsed = true; await _uow.OtpCodes.UpdateAsync(e); }

            var expiryMinutes = int.TryParse(_config["Otp:ExpiryMinutes"], out var em) ? em : 5;
            await _uow.OtpCodes.AddAsync(new OtpCode
            {
                Identifier = identifier,
                Code = code,
                Purpose = purpose,
                ExpiresAt = DateTime.UtcNow.AddMinutes(expiryMinutes),
                IsUsed = false,
                AttemptCount = 0,
                CreatedAt = DateTime.UtcNow
            });
            await _uow.SaveChangesAsync();
            return code;
        }

        public async Task<bool> ValidateOtpAsync(string identifier, string code, string purpose)
        {
            // Find most recent unused OTP for identifier and purpose
            var otp = await _uow.OtpCodes.Query()
                .Where(o => o.Identifier == identifier && o.Purpose == purpose && !o.IsUsed)
                .OrderByDescending(o => o.CreatedAt).FirstOrDefaultAsync();
            if (otp == null) return false;

            // expired
            if (otp.ExpiresAt <= DateTime.UtcNow) { otp.IsUsed = true; await _uow.OtpCodes.UpdateAsync(otp); await _uow.SaveChangesAsync(); return false; }

            var maxAttempts = int.TryParse(_config["Otp:MaxAttempts"], out var ma) ? ma : 5;
            if (otp.Code == code)
            {
                otp.IsUsed = true;
                await _uow.OtpCodes.UpdateAsync(otp);
                await _uow.SaveChangesAsync();
                return true;
            }

            // wrong code
            otp.AttemptCount += 1;
            if (otp.AttemptCount >= maxAttempts) otp.IsUsed = true;
            await _uow.OtpCodes.UpdateAsync(otp);
            await _uow.SaveChangesAsync();
            return false;
        }
    }

    // ── Email Service ─────────────────────────────────────────────────────────
    public class EmailService : IEmailService
    {
        private readonly IConfiguration _config;

        public EmailService(IConfiguration config) { _config = config; }
        private string TemplatesPath => Path.Combine(AppContext.BaseDirectory, "EmailTemplates");

        private string LoadTemplate(string name)
        {
            var path = Path.Combine(TemplatesPath, name);
            if (!File.Exists(path)) return "";
            return File.ReadAllText(path);
        }

        private string Render(string template, Dictionary<string, string?> data)
        {
            if (string.IsNullOrEmpty(template)) return "";
            foreach (var kv in data)
            {
                template = template.Replace("{{" + kv.Key + "}}", kv.Value ?? "");
            }
            return template;
        }

        public async Task SendEmailAsync(string to, string subject, string htmlBody)
        {
            var smtpHost = _config["Smtp:Host"];
            var smtpUsername = _config["Smtp:Username"];
            var smtpPassword = _config["Smtp:Password"];
            var smtpPort = int.TryParse(_config["Smtp:Port"], out var port) ? port : 587;
            var smtpFromName = _config["Smtp:FromName"] ?? _config["Email:FromName"] ?? "Graamo";
            var fromAddress = _config["Email:FromAddress"] ?? smtpUsername ?? "noreply@graamo.com";
            var enableSsl = !bool.TryParse(_config["Smtp:EnableSsl"], out var ssl) || ssl;

            if (!string.IsNullOrWhiteSpace(smtpHost) && !string.IsNullOrWhiteSpace(smtpUsername) && !string.IsNullOrWhiteSpace(smtpPassword))
            {
                using var message = new MailMessage
                {
                    From = new MailAddress(fromAddress, smtpFromName),
                    Subject = subject,
                    Body = htmlBody,
                    IsBodyHtml = true
                };
                message.To.Add(to);

                using var client = new SmtpClient(smtpHost, smtpPort)
                {
                    EnableSsl = enableSsl,
                    UseDefaultCredentials = false,
                    Credentials = new NetworkCredential(smtpUsername, smtpPassword),
                    DeliveryMethod = SmtpDeliveryMethod.Network
                };

                await client.SendMailAsync(message);
                return;
            }

            var apiKey = _config["SendGrid:ApiKey"];
            if (!string.IsNullOrWhiteSpace(apiKey) && !apiKey.StartsWith("SG.your"))
            {
                var client = new SendGridClient(apiKey);
                var from = new EmailAddress(fromAddress, smtpFromName);
                var msg = MailHelper.CreateSingleEmail(from, new EmailAddress(to), subject, plainTextContent: null, htmlContent: htmlBody);
                await client.SendEmailAsync(msg);
                return;
            }

            throw new InvalidOperationException("No email provider configured. Add SMTP or SendGrid settings.");
        }

        public async Task SendOtpEmailAsync(string email, string otp, string purpose)
        {
            var tpl = LoadTemplate("OtpTemplate.html");
            var body = Render(tpl, new Dictionary<string, string?> {
                { "Otp", otp }, { "Purpose", purpose }, { "AppName", "Graamo" }, { "ValidityMinutes", _config["Otp:ExpiryMinutes"] ?? "5" }
            });
            await SendEmailAsync(email, $"Your Graamo OTP - {otp}", body);
        }

        public async Task SendWelcomeEmailAsync(string email, string name)
        {
            var tpl = LoadTemplate("WelcomeTemplate.html");
            var body = Render(tpl, new Dictionary<string, string?> { { "Name", name }, { "AppName", "Graamo" } });
            await SendEmailAsync(email, $"Welcome to Graamo - Registration Successful, {name}!", body);
        }

        public async Task SendLoginWelcomeEmailAsync(string email, string name)
        {
            var tpl = LoadTemplate("LoginWelcomeTemplate.html");
            var body = Render(tpl, new Dictionary<string, string?> { { "Name", name }, { "AppName", "Graamo" } });
            await SendEmailAsync(email, $"Welcome back to Graamo, {name}!", body);
        }

        public async Task SendOrderConfirmationAsync(string email, string orderNumber, decimal amount)
        {
            var tpl = LoadTemplate("OrderConfirmationTemplate.html");
            var body = Render(tpl, new Dictionary<string, string?> { { "OrderNumber", orderNumber }, { "Amount", amount.ToString("F2") }, { "AppName", "Graamo" } });
            await SendEmailAsync(email, $"Order Confirmed - {orderNumber}", body);
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
                body: $"Graamo OTP: {otp}. Valid for 10 min. Do not share.",
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
    /// <summary>
    /// Production-ready Azure Blob Storage implementation of IStorageService.
    /// - Uploads to "graamo-images" container (configurable via Azure:BlobStorage:ContainerName).
    /// - Generates GUID-based blob names to avoid collisions and PII leakage.
    /// - Sets correct Content-Type so browsers render images directly.
    /// - Returns the full public blob URL stored in the database.
    /// </summary>
    public class AzureBlobStorageService : IStorageService
    {
        private static readonly HashSet<string> _allowedExtensions =
            new(StringComparer.OrdinalIgnoreCase) { ".jpg", ".jpeg", ".png", ".webp" };

        private readonly BlobServiceClient _client;
        private readonly string _containerName;

        public AzureBlobStorageService(IConfiguration config)
        {
            var connStr = config["Azure:BlobStorage:ConnectionString"];
            if (string.IsNullOrWhiteSpace(connStr))
                throw new InvalidOperationException(
                    "Azure:BlobStorage:ConnectionString is not configured. " +
                    "Set it in Azure App Service → Configuration → Application settings.");

            _client = new BlobServiceClient(connStr);
            _containerName = config["Azure:BlobStorage:ContainerName"]
                             ?? "graamo-images";
        }

        public async Task<string> UploadAsync(
            Stream fileStream,
            string fileName,
            string folder,
            string? contentType = null)
        {
            if (fileStream is null || fileStream.Length == 0)
                throw new ArgumentException("File stream is empty.", nameof(fileStream));

            var ext = Path.GetExtension(fileName);
            if (!_allowedExtensions.Contains(ext))
                throw new ArgumentException(
                    $"File extension '{ext}' is not allowed. Accepted: {string.Join(", ", _allowedExtensions)}");

            // e.g. products/3f1a2b4c5d6e7f8a9b0c1d2e3f4a5b6c.jpg
            var blobName = $"{folder.Trim('/')}/{Guid.NewGuid():N}{ext.ToLowerInvariant()}";
            var mimeType = contentType ?? "application/octet-stream";

            var container = _client.GetBlobContainerClient(_containerName);

            // Ensure container exists with public blob access (anonymous read for images)
            await container.CreateIfNotExistsAsync(Azure.Storage.Blobs.Models.PublicAccessType.Blob);

            var blob = container.GetBlobClient(blobName);

            var uploadOptions = new Azure.Storage.Blobs.Models.BlobUploadOptions
            {
                HttpHeaders = new Azure.Storage.Blobs.Models.BlobHttpHeaders
                {
                    ContentType = mimeType,
                    CacheControl = "public, max-age=31536000"   // 1-year browser cache
                }
            };

            await blob.UploadAsync(fileStream, uploadOptions);
            return blob.Uri.ToString();
        }

        public async Task DeleteAsync(string url)
        {
            if (string.IsNullOrWhiteSpace(url)) return;
            try
            {
                var uri = new Uri(url);
                // AbsolutePath: /{containerName}/{folder}/{blobName}
                // Strip the leading "/{containerName}/" prefix to get the blob name
                var blobPath = uri.AbsolutePath
                    .TrimStart('/')
                    .Substring(_containerName.Length)
                    .TrimStart('/');

                var container = _client.GetBlobContainerClient(_containerName);
                await container.GetBlobClient(blobPath).DeleteIfExistsAsync();
            }
            catch { /* best-effort — log externally if needed */ }
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

            var keyId = _config["Razorpay:KeyId"];
            var keySecret = _config["Razorpay:KeySecret"];
            if (string.IsNullOrWhiteSpace(keyId) || string.IsNullOrWhiteSpace(keySecret))
                throw new InvalidOperationException("Razorpay is not configured. Add Razorpay:KeyId and Razorpay:KeySecret or use Cash on Delivery.");

            var client = new RazorpayClient(keyId, keySecret);
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

            return new RazorpayOrderResponse(rpOrderId, order.TotalAmount, "INR", keyId);
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