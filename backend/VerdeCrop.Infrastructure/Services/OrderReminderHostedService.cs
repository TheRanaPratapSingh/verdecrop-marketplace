using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using VerdeCrop.Application.Interfaces;
using VerdeCrop.Domain.Entities;
using VerdeCrop.Infrastructure.Data;

namespace VerdeCrop.Infrastructure.Services
{
    public class OrderReminderHostedService : BackgroundService
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<OrderReminderHostedService> _logger;
        private readonly IConfiguration _config;

        public OrderReminderHostedService(
            IServiceScopeFactory scopeFactory,
            ILogger<OrderReminderHostedService> logger,
            IConfiguration config)
        {
            _scopeFactory = scopeFactory;
            _logger = logger;
            _config = config;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await ProcessPendingOrderRemindersAsync(stoppingToken);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed processing order reminders");
                }

                await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken);
            }
        }

        private async Task ProcessPendingOrderRemindersAsync(CancellationToken stoppingToken)
        {
            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var email = scope.ServiceProvider.GetRequiredService<IEmailService>();
            var cache = scope.ServiceProvider.GetRequiredService<ICacheService>();

            var threshold = DateTime.UtcNow.AddMinutes(-15);
            var orders = await db.Orders
                .Include(o => o.User)
                .Include(o => o.Address)
                .Include(o => o.Items)
                    .ThenInclude(i => i.Product)
                        .ThenInclude(p => p.Farmer)
                            .ThenInclude(f => f.User)
                .Where(o => o.Status == "pending" && o.CreatedAt <= threshold)
                .ToListAsync(stoppingToken);

            foreach (var order in orders)
            {
                var cacheKey = GetReminderCacheKey(order.Id);
                var lastReminderAt = await cache.GetAsync<DateTime?>(cacheKey);
                if (lastReminderAt.HasValue && DateTime.UtcNow - lastReminderAt.Value < TimeSpan.FromMinutes(10))
                    continue;

                await SendAdminReminderEmailsAsync(db, email, order, stoppingToken);
                await SendSellerReminderEmailsAsync(email, order, stoppingToken);
                await cache.SetAsync(cacheKey, DateTime.UtcNow, TimeSpan.FromDays(1));
            }
        }

        private async Task SendAdminReminderEmailsAsync(AppDbContext db, IEmailService email, Order order, CancellationToken stoppingToken)
        {
            var adminEmails = await db.Users
                .Where(u => u.Role == "admin" && u.IsActive && u.Email != null)
                .Select(u => u.Email!)
                .Distinct()
                .ToListAsync(stoppingToken);

            if (adminEmails.Count == 0) return;

            var html = BuildOrderEmailHtml(
                order,
                order.Items.ToList(),
                "Order Action Reminder ⏰",
                "No action has been taken on this order for 15 minutes. Please review and update the order status.",
                "REMINDER",
                true,
                GetActionLink(order.Id, true),
                "Review Order");

            foreach (var adminEmail in adminEmails)
                await email.SendEmailAsync(adminEmail, $"Order Action Reminder - {order.OrderNumber}", html);
        }

        private async Task SendSellerReminderEmailsAsync(IEmailService email, Order order, CancellationToken stoppingToken)
        {
            var sellerGroups = order.Items
                .Where(i => i.Product?.Farmer?.User?.Email != null)
                .GroupBy(i => new
                {
                    SellerEmail = i.Product!.Farmer!.User!.Email!,
                    SellerName = i.Product.Farmer.User.Name,
                    FarmName = i.Product.Farmer.FarmName
                })
                .ToList();

            foreach (var group in sellerGroups)
            {
                if (stoppingToken.IsCancellationRequested) break;

                var sellerInfo = $"<div style='margin:20px 0;padding:18px;border:1px solid #dce5f0;border-radius:14px;background:#f8fbff'><div style='font-size:12px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:#4b6788;margin-bottom:10px'>Seller Details</div><div style='color:#17324d;font-size:14px;line-height:1.8'><div><strong>Seller:</strong> {group.Key.SellerName}</div><div><strong>Farm:</strong> {group.Key.FarmName}</div><div><strong>Customer:</strong> {order.User?.Name ?? "N/A"}</div><div><strong>Customer Phone:</strong> {order.User?.Phone ?? "N/A"}</div></div></div>";
                var html = BuildOrderEmailHtml(
                    order,
                    group.ToList(),
                    "Seller Order Reminder ⏰",
                    "This order is still pending. Please review your items and take action as soon as possible.",
                    "REMINDER",
                    false,
                    GetActionLink(order.Id, false),
                    "Open Order",
                    sellerInfo);

                await email.SendEmailAsync(group.Key.SellerEmail, $"Seller Order Reminder - {order.OrderNumber}", html);
            }
        }

        private string GetActionLink(int orderId, bool isAdmin)
        {
            var baseUrl = (_config["App:FrontendBaseUrl"] ?? _config["Frontend:BaseUrl"] ?? "http://localhost:3000").TrimEnd('/');
            return isAdmin ? $"{baseUrl}/admin/orders" : $"{baseUrl}/orders/{orderId}";
        }

        private static string GetReminderCacheKey(int orderId) => $"order:reminder:last:{orderId}";

        private static string BuildOrderEmailHtml(
            Order order,
            List<OrderItem> items,
            string heading,
            string intro,
            string badge,
            bool includeCustomerBlock,
            string? actionLink,
            string? actionLabel,
            string? extraBlock = null)
        {
            var itemsHtml = string.Join("", items.Select(i =>
                $"<tr><td style='padding:10px 0;border-bottom:1px solid #edf2f7;color:#17324d'>{i.ProductName}</td><td style='padding:10px 0;border-bottom:1px solid #edf2f7;color:#6b7d93;text-align:center'>{i.Quantity} {i.Unit}</td><td style='padding:10px 0;border-bottom:1px solid #edf2f7;color:#6b7d93;text-align:right'>₹{i.UnitPrice:F2}</td><td style='padding:10px 0;border-bottom:1px solid #edf2f7;color:#17324d;text-align:right;font-weight:700'>₹{i.TotalPrice:F2}</td></tr>"));

            var addressText = string.Join(", ", new[]
            {
                order.Address?.Label,
                order.Address?.FullName,
                order.Address?.Phone,
                order.Address?.Street,
                order.Address?.City,
                order.Address?.State,
                order.Address?.PinCode
            }.Where(x => !string.IsNullOrWhiteSpace(x))!);

            var notesHtml = string.IsNullOrWhiteSpace(order.Notes)
                ? string.Empty
                : $"<div style='margin-top:14px;color:#6b7d93;font-size:14px;line-height:1.6'><strong style='color:#17324d'>Notes:</strong> {order.Notes}</div>";

            var couponHtml = string.IsNullOrWhiteSpace(order.CouponCode)
                ? string.Empty
                : $"<div style='display:flex;justify-content:space-between;padding:8px 0;color:#6b7d93'><span>Coupon</span><strong style='color:#17324d'>{order.CouponCode}</strong></div>";

            var customerBlock = includeCustomerBlock && order.User != null
                ? $"<div style='margin:20px 0;padding:18px;border:1px solid #dce5f0;border-radius:14px;background:#f8fbff'><div style='font-size:12px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:#4b6788;margin-bottom:10px'>Customer Details</div><div style='color:#17324d;font-size:14px;line-height:1.8'><div><strong>Name:</strong> {order.User.Name}</div><div><strong>Email:</strong> {order.User.Email ?? "N/A"}</div><div><strong>Phone:</strong> {order.User.Phone ?? "N/A"}</div></div></div>"
                : string.Empty;

            var actionBlock = string.IsNullOrWhiteSpace(actionLink) || string.IsNullOrWhiteSpace(actionLabel)
                ? string.Empty
                : $"<div style='margin:20px 0;padding:18px;border:1px solid #dce5f0;border-radius:14px;background:#f8fbff;text-align:center'><a href='{actionLink}' style='display:inline-block;background:#1f4c7a;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:700'>{actionLabel}</a></div>";

            return $@"<!doctype html>
<html>
  <body style='margin:0;padding:0;background:#eef3fb;font-family:Arial,Helvetica,sans-serif;color:#17324d'>
    <div style='padding:32px 12px'>
      <div style='max-width:720px;margin:0 auto;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 10px 30px rgba(13,42,74,.08)'>
        <div style='background:linear-gradient(135deg,#112f52,#1f4c7a);padding:22px 28px;color:#ffffff;position:relative'>
          <div style='font-size:28px;font-weight:800'>Graamo</div>
          <div style='position:absolute;right:28px;top:22px;background:#13c296;color:#ffffff;font-size:12px;font-weight:700;padding:7px 14px;border-radius:999px'>{badge}</div>
        </div>
        <div style='padding:32px 28px'>
          <h1 style='margin:0 0 10px;font-size:30px;color:#17324d'>{heading}</h1>
          <p style='margin:0 0 16px;color:#6b7d93;font-size:15px;line-height:1.7'>{intro}</p>
          <div style='display:inline-block;margin:12px 0 24px;background:#f7f9fc;border:1px solid #dce5f0;border-radius:14px;padding:16px 18px'>
            <div style='color:#9aabc0;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.1px;margin-bottom:6px'>Order Reference</div>
            <div style='color:#23466e;font-size:28px;font-weight:800;letter-spacing:2px'>{order.OrderNumber}</div>
          </div>
          {customerBlock}
          {extraBlock ?? string.Empty}
          {actionBlock}
          <div style='margin:20px 0;padding:18px;border:1px solid #dce5f0;border-radius:16px;background:#fafcff'>
            <div style='font-size:12px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:#4b6788;margin-bottom:14px'>Order Summary</div>
            <div style='display:flex;justify-content:space-between;padding:8px 0;color:#6b7d93'><span>Order Date</span><strong style='color:#17324d'>{order.CreatedAt:dd MMM yyyy hh:mm tt}</strong></div>
            <div style='display:flex;justify-content:space-between;padding:8px 0;color:#6b7d93'><span>Payment Method</span><strong style='color:#17324d'>{order.PaymentMethod}</strong></div>
            <div style='display:flex;justify-content:space-between;padding:8px 0;color:#6b7d93'><span>Payment Status</span><strong style='color:#17324d'>{order.PaymentStatus}</strong></div>
            <div style='display:flex;justify-content:space-between;padding:8px 0;color:#6b7d93'><span>Order Status</span><strong style='color:#17324d'>{order.Status}</strong></div>
            <div style='display:flex;justify-content:space-between;padding:8px 0;color:#6b7d93'><span>Estimated Delivery</span><strong style='color:#17324d'>{order.EstimatedDelivery:dd MMM yyyy}</strong></div>
          </div>
          <div style='margin:20px 0;padding:18px;border:1px solid #dce5f0;border-radius:16px;background:#fafcff'>
            <div style='font-size:12px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:#4b6788;margin-bottom:14px'>Delivery Address</div>
            <div style='color:#17324d;font-size:14px;line-height:1.8'>{addressText}</div>
            {notesHtml}
          </div>
          <div style='margin:20px 0;padding:18px;border:1px solid #dce5f0;border-radius:16px;background:#fafcff'>
            <div style='font-size:12px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:#4b6788;margin-bottom:14px'>Items Ordered</div>
            <table style='width:100%;border-collapse:collapse'>
              <thead>
                <tr>
                  <th style='text-align:left;padding-bottom:10px;color:#4b6788;font-size:12px;text-transform:uppercase'>Product</th>
                  <th style='text-align:center;padding-bottom:10px;color:#4b6788;font-size:12px;text-transform:uppercase'>Qty</th>
                  <th style='text-align:right;padding-bottom:10px;color:#4b6788;font-size:12px;text-transform:uppercase'>Unit Price</th>
                  <th style='text-align:right;padding-bottom:10px;color:#4b6788;font-size:12px;text-transform:uppercase'>Total</th>
                </tr>
              </thead>
              <tbody>{itemsHtml}</tbody>
            </table>
          </div>
          <div style='margin:20px 0;padding:18px;border:1px solid #dce5f0;border-radius:16px;background:#fafcff'>
            <div style='font-size:12px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:#4b6788;margin-bottom:14px'>Payment Breakdown</div>
            <div style='display:flex;justify-content:space-between;padding:8px 0;color:#6b7d93'><span>Subtotal</span><strong style='color:#17324d'>₹{order.Subtotal:F2}</strong></div>
            <div style='display:flex;justify-content:space-between;padding:8px 0;color:#6b7d93'><span>Delivery Charge</span><strong style='color:#17324d'>₹{order.DeliveryCharge:F2}</strong></div>
            <div style='display:flex;justify-content:space-between;padding:8px 0;color:#6b7d93'><span>Discount</span><strong style='color:#17324d'>₹{order.DiscountAmount:F2}</strong></div>
            <div style='display:flex;justify-content:space-between;padding:8px 0;color:#6b7d93'><span>Tax</span><strong style='color:#17324d'>₹{order.TaxAmount:F2}</strong></div>
            {couponHtml}
            <div style='display:flex;justify-content:space-between;align-items:center;margin-top:14px;padding-top:14px;border-top:1px solid #dce5f0'>
              <div style='color:#17324d;font-size:20px;font-weight:800'>Total Amount</div>
              <div style='color:#17324d;font-size:28px;font-weight:800'>₹{order.TotalAmount:F2}</div>
            </div>
          </div>
        </div>
        <div style='padding:18px 28px 26px;color:#a0aec0;font-size:12px;text-align:center;border-top:1px solid #edf2f7'>© 2026 Graamo · Order reminder</div>
      </div>
    </div>
  </body>
</html>";
        }
    }
}
