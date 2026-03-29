using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using VerdeCrop.Application.DTOs;
using VerdeCrop.Application.Interfaces;
using VerdeCrop.Domain.Entities;

namespace VerdeCrop.Application.Services
{
    // ── Auth Service ──────────────────────────────────────────────────────────
    public class AuthService : IAuthService
    {
        private readonly IUnitOfWork _uow;
        private readonly IJwtService _jwt;
        private readonly IOtpService _otpSvc;
        private readonly IEmailService _email;
        private readonly ISmsService _sms;
        private readonly Microsoft.Extensions.Configuration.IConfiguration _config;

        public AuthService(IUnitOfWork uow, IJwtService jwt, IOtpService otpSvc,
            IEmailService email, ISmsService sms,
            Microsoft.Extensions.Configuration.IConfiguration config)
        {
            _uow = uow; _jwt = jwt; _otpSvc = otpSvc;
            _email = email; _sms = sms; _config = config;
        }

        public async Task<bool> SendOtpAsync(SendOtpRequest req)
        {
            var otp = await _otpSvc.GenerateOtpAsync(req.Identifier, req.Purpose);

            var isDev = _config["Environment"] == "Development"
                        || _config["ASPNETCORE_ENVIRONMENT"] == "Development";
            if (isDev)
            {
                Console.WriteLine($"[DEV] OTP for {req.Identifier}: {otp}");
                return true;
            }

            var isEmail = req.Identifier.Contains('@');
            if (isEmail)
                await _email.SendOtpEmailAsync(req.Identifier, otp, req.Purpose);
            else
                await _sms.SendOtpSmsAsync(req.Identifier, otp);
            return true;
        }

        public async Task<AuthResponse?> VerifyOtpAsync(VerifyOtpRequest req)
        {
            var valid = await _otpSvc.ValidateOtpAsync(req.Identifier, req.Code, "login");
            if (!valid) return null;

            var isEmail = req.Identifier.Contains('@');
            User? user = isEmail
                ? await _uow.Users.FirstOrDefaultAsync(u => u.Email == req.Identifier)
                : await _uow.Users.FirstOrDefaultAsync(u => u.Phone == req.Identifier);

            if (user == null)
            {
                user = new User
                {
                    Name = req.Name ?? req.Identifier,
                    Email = isEmail ? req.Identifier : null,
                    Phone = isEmail ? null : req.Identifier,
                    IsEmailVerified = isEmail,
                    IsPhoneVerified = !isEmail,
                    Role = "user"
                };
                await _uow.Users.AddAsync(user);
                var cart = new Cart { User = user };
                await _uow.Carts.AddAsync(cart);
                await _uow.SaveChangesAsync();
            }

            return await BuildAuthResponseAsync(user);
        }

        public async Task<AuthResponse?> RefreshTokenAsync(string refreshToken)
        {
            var token = await _uow.RefreshTokens.FirstOrDefaultAsync(t => t.Token == refreshToken && !t.IsRevoked);
            if (token == null || token.ExpiresAt < DateTime.UtcNow) return null;
            var user = await _uow.Users.GetByIdAsync(token.UserId);
            if (user == null || !user.IsActive) return null;

            token.IsRevoked = true;
            await _uow.RefreshTokens.UpdateAsync(token);
            return await BuildAuthResponseAsync(user);
        }

        public async Task<bool> LogoutAsync(string refreshToken)
        {
            var token = await _uow.RefreshTokens.FirstOrDefaultAsync(t => t.Token == refreshToken);
            if (token == null) return false;
            token.IsRevoked = true;
            await _uow.RefreshTokens.UpdateAsync(token);
            await _uow.SaveChangesAsync();
            return true;
        }

        private async Task<AuthResponse> BuildAuthResponseAsync(User user)
        {
            var accessToken = _jwt.GenerateAccessToken(user);
            var refreshTokenStr = _jwt.GenerateRefreshToken();
            var rt = new RefreshToken
            {
                UserId = user.Id,
                Token = refreshTokenStr,
                ExpiresAt = DateTime.UtcNow.AddDays(7)
            };
            await _uow.RefreshTokens.AddAsync(rt);
            await _uow.SaveChangesAsync();
            return new AuthResponse(accessToken, refreshTokenStr, ToUserDto(user));
        }

        private static UserDto ToUserDto(User u) => new(u.Id, u.Name, u.Email, u.Phone, u.Role, u.AvatarUrl, u.IsActive);
    }

    // ── Product Service ───────────────────────────────────────────────────────
    public class ProductService : IProductService
    {
        private readonly IUnitOfWork _uow;
        private readonly ICacheService _cache;
        private readonly IStorageService _storage;

        public ProductService(IUnitOfWork uow, ICacheService cache, IStorageService storage)
        {
            _uow = uow; _cache = cache; _storage = storage;
        }

        public async Task<PagedResult<ProductListDto>> GetAllAsync(ProductQueryParams q)
        {
            var query = _uow.Products.Query()
                .Include(p => p.Category)
                .Include(p => p.Farmer).ThenInclude(f => f.User)
                .Where(p => p.IsActive);

            if (!string.IsNullOrWhiteSpace(q.Search))
                query = query.Where(p => p.Name.Contains(q.Search) || (p.Description != null && p.Description.Contains(q.Search)));
            if (q.CategoryId.HasValue) query = query.Where(p => p.CategoryId == q.CategoryId);
            if (q.FarmerId.HasValue) query = query.Where(p => p.FarmerId == q.FarmerId);
            if (q.MinPrice.HasValue) query = query.Where(p => p.Price >= q.MinPrice);
            if (q.MaxPrice.HasValue) query = query.Where(p => p.Price <= q.MaxPrice);
            if (q.IsOrganic.HasValue) query = query.Where(p => p.IsOrganic == q.IsOrganic);
            if (q.IsFeatured.HasValue) query = query.Where(p => p.IsFeatured == q.IsFeatured);
            if (q.InStock == true) query = query.Where(p => p.StockQuantity > 0);

            query = q.SortBy switch
            {
                "price_asc" => query.OrderBy(p => p.Price),
                "price_desc" => query.OrderByDescending(p => p.Price),
                "rating" => query.OrderByDescending(p => p.Rating),
                "popular" => query.OrderByDescending(p => p.ReviewCount),
                _ => query.OrderByDescending(p => p.CreatedAt)
            };

            var total = await query.CountAsync();
            var items = await query.Skip((q.Page - 1) * q.PageSize).Take(q.PageSize).ToListAsync();

            return new PagedResult<ProductListDto>(
                items.Select(ToListDto).ToList(),
                total, q.Page, q.PageSize,
                (int)Math.Ceiling((double)total / q.PageSize));
        }

        public async Task<ProductDetailDto?> GetByIdAsync(int id)
        {
            var p = await _uow.Products.Query()
                .Include(x => x.Category)
                .Include(x => x.Farmer).ThenInclude(f => f.User)
                .Include(x => x.Reviews).ThenInclude(r => r.User)
                .FirstOrDefaultAsync(x => x.Id == id && x.IsActive);
            return p == null ? null : ToDetailDto(p);
        }

        public async Task<ProductDetailDto?> GetBySlugAsync(string slug)
        {
            var p = await _uow.Products.Query()
                .Include(x => x.Category)
                .Include(x => x.Farmer).ThenInclude(f => f.User)
                .Include(x => x.Reviews).ThenInclude(r => r.User)
                .FirstOrDefaultAsync(x => x.Slug == slug && x.IsActive);
            return p == null ? null : ToDetailDto(p);
        }

        public async Task<List<ProductListDto>> GetFeaturedAsync(int count = 8)
        {
            var result = await _uow.Products.Query()
                .Include(p => p.Category)
                .Include(p => p.Farmer).ThenInclude(f => f.User)
                .Where(p => p.IsActive && p.IsFeatured)
                .OrderByDescending(p => p.Rating)
                .Take(count)
                .ToListAsync();
            return result.Select(ToListDto).ToList();
        }

        public async Task<List<ProductListDto>> GetByFarmerAsync(int farmerId)
        {
            var products = await _uow.Products.Query()
                .Include(p => p.Category)
                .Include(p => p.Farmer).ThenInclude(f => f.User)
                .Where(p => p.FarmerId == farmerId)
                .OrderByDescending(p => p.CreatedAt)
                .ToListAsync();
            return products.Select(ToListDto).ToList();
        }

        // ── FIX: Now saves Description, ImageUrl, ImageUrls, IsFeatured ──────
        public async Task<ProductDetailDto?> CreateAsync(int farmerId, CreateProductRequest req)
        {
            if (farmerId <= 0) return null;
            return await CreateInternalAsync(farmerId, req);
        }

        // ── FIX: Was completely missing — referenced in controller ────────────
        public async Task<ProductDetailDto?> CreateAdminAsync(int adminUserId, CreateProductRequest req, int farmerId)
        {
            if (farmerId <= 0) return null;
            var farmer = await _uow.FarmerProfiles.GetByIdAsync(farmerId);
            if (farmer == null) return null;
            return await CreateInternalAsync(farmerId, req);
        }

        private async Task<ProductDetailDto?> CreateInternalAsync(int farmerId, CreateProductRequest req)
        {
            var slug = GenerateSlug(req.Name);

            var product = new Product
            {
                Name = req.Name,
                Slug = slug,
                Description = req.Description,                        // ✅ FIXED
                CategoryId = req.CategoryId,
                FarmerId = farmerId,
                Price = req.Price,
                OriginalPrice = req.OriginalPrice,
                Unit = req.Unit,
                MinOrderQty = req.MinOrderQty,
                StockQuantity = req.StockQuantity,
                IsOrganic = req.IsOrganic,
                IsFeatured = req.IsFeatured ?? false,                // ✅ FIXED
                ImageUrl = req.ImageUrl,                           // ✅ FIXED
                ImageUrls = req.ImageUrls ?? new List<string>(),    // ✅ FIXED
            };

            // If primary ImageUrl not provided but list has items, use first
            if (string.IsNullOrEmpty(product.ImageUrl) && product.ImageUrls.Count > 0)
                product.ImageUrl = product.ImageUrls[0];

            await _uow.Products.AddAsync(product);
            await _uow.SaveChangesAsync();
            await _cache.DeleteAsync("featured_products");
            return await GetByIdAsync(product.Id);
        }

        // ── FIX: Now saves CategoryId, ImageUrl, ImageUrls on update ─────────
        public async Task<ProductDetailDto?> UpdateAsync(int productId, int farmerId, UpdateProductRequest req)
        {
            var product = await _uow.Products.GetByIdAsync(productId);

            // farmerId == 0 means admin — can update any product
            if (product == null || (farmerId > 0 && product.FarmerId != farmerId))
                return null;

            if (req.Name != null) product.Name = req.Name;
            if (req.Description != null) product.Description = req.Description;
            if (req.CategoryId.HasValue) product.CategoryId = req.CategoryId.Value;  // ✅ FIXED
            if (req.Price.HasValue) product.Price = req.Price.Value;
            if (req.OriginalPrice.HasValue) product.OriginalPrice = req.OriginalPrice;
            if (req.Unit != null) product.Unit = req.Unit;
            if (req.MinOrderQty.HasValue) product.MinOrderQty = req.MinOrderQty.Value;
            if (req.StockQuantity.HasValue) product.StockQuantity = req.StockQuantity.Value;
            if (req.IsOrganic.HasValue) product.IsOrganic = req.IsOrganic.Value;
            if (req.IsFeatured.HasValue) product.IsFeatured = req.IsFeatured.Value;
            if (req.IsActive.HasValue) product.IsActive = req.IsActive.Value;

            // ✅ FIXED: Image updates were completely missing
            if (!string.IsNullOrEmpty(req.ImageUrl))
            {
                product.ImageUrl = req.ImageUrl;
                if (!product.ImageUrls.Contains(req.ImageUrl))
                    product.ImageUrls.Add(req.ImageUrl);
            }
            if (req.ImageUrls != null && req.ImageUrls.Count > 0)
            {
                product.ImageUrls = req.ImageUrls;
                if (string.IsNullOrEmpty(product.ImageUrl))
                    product.ImageUrl = req.ImageUrls[0];
            }

            product.UpdatedAt = DateTime.UtcNow;
            await _uow.Products.UpdateAsync(product);
            await _uow.SaveChangesAsync();
            await _cache.DeleteAsync("featured_products");
            return await GetByIdAsync(product.Id);
        }

        public async Task<bool> DeleteAsync(int productId, int farmerId)
        {
            var product = await _uow.Products.GetByIdAsync(productId);
            if (product == null || (farmerId > 0 && product.FarmerId != farmerId)) return false;
            product.IsActive = false;
            product.UpdatedAt = DateTime.UtcNow;
            await _uow.Products.UpdateAsync(product);
            await _uow.SaveChangesAsync();
            return true;
        }

        public async Task<string?> UploadImageAsync(int productId, Stream fileStream, string fileName)
        {
            var product = await _uow.Products.GetByIdAsync(productId);
            if (product == null) return null;

            var url = await _storage.UploadAsync(fileStream, fileName, "products");

            if (string.IsNullOrEmpty(product.ImageUrl))
                product.ImageUrl = url;

            if (!product.ImageUrls.Contains(url))
                product.ImageUrls.Add(url);

            product.UpdatedAt = DateTime.UtcNow;
            await _uow.Products.UpdateAsync(product);
            await _uow.SaveChangesAsync();
            return url;
        }

        // ── Helpers ───────────────────────────────────────────────────────────
        private static string GenerateSlug(string name)
        {
            var slug = name.ToLower()
                .Replace(" ", "-")
                .Replace("/", "-")
                .Replace("&", "and")
                .Replace("'", "")
                .Replace(",", "");
            return slug + "-" + Guid.NewGuid().ToString("N")[..6];
        }

        private static ProductListDto ToListDto(Product p) => new(
            p.Id, p.Name, p.Slug,
            p.CategoryId, p.Category?.Name ?? "",
            p.FarmerId, p.Farmer?.FarmName ?? "",
            p.Price, p.OriginalPrice, p.Unit, p.StockQuantity,
            p.ImageUrl, p.IsOrganic, p.IsFeatured,
            p.Rating, p.ReviewCount, p.IsActive);

        private static ProductDetailDto ToDetailDto(Product p) => new(
            p.Id, p.Name, p.Slug, p.Description,
            p.CategoryId, p.Category?.Name ?? "",
            p.FarmerId, p.Farmer?.FarmName ?? "", p.Farmer?.Location ?? "",
            p.Price, p.OriginalPrice, p.Unit, p.MinOrderQty, p.StockQuantity,
            p.ImageUrl, p.ImageUrls, p.IsOrganic, p.IsFeatured,
            p.Rating, p.ReviewCount, p.IsActive,
            p.Reviews?.Select(r => new ReviewDto(
                r.Id, r.UserId, r.User?.Name ?? "", r.User?.AvatarUrl,
                r.Rating, r.Comment, r.IsVerifiedPurchase, r.CreatedAt
            )).ToList() ?? new());
    }

    // ── Order Service ─────────────────────────────────────────────────────────
    public class OrderService : IOrderService
    {
        private readonly IUnitOfWork _uow;
        private readonly INotificationService _notifications;

        public OrderService(IUnitOfWork uow, INotificationService notifications)
        {
            _uow = uow; _notifications = notifications;
        }

        public async Task<OrderDetailDto?> PlaceOrderAsync(int userId, PlaceOrderRequest req)
        {
            var cart = await _uow.Carts.Query()
                .Include(c => c.Items).ThenInclude(i => i.Product)
                .FirstOrDefaultAsync(c => c.UserId == userId);

            if (cart == null || !cart.Items.Any()) return null;

            var address = await _uow.Addresses.FirstOrDefaultAsync(a => a.Id == req.AddressId && a.UserId == userId);
            if (address == null) return null;

            foreach (var item in cart.Items)
                if (item.Product.StockQuantity < item.Quantity) return null;

            decimal subtotal = cart.Items.Sum(i => i.Product.Price * i.Quantity);
            decimal delivery = subtotal >= 500 ? 0 : 49;
            decimal discount = 0;

            if (!string.IsNullOrEmpty(req.CouponCode))
            {
                var coupon = await _uow.Coupons.FirstOrDefaultAsync(c =>
                    c.Code == req.CouponCode && c.IsActive
                    && (c.ExpiryDate == null || c.ExpiryDate > DateTime.UtcNow)
                    && (c.UsageLimit == null || c.UsedCount < c.UsageLimit)
                    && subtotal >= c.MinOrderAmount);
                if (coupon != null)
                {
                    discount = coupon.DiscountType == "Percentage"
                        ? Math.Min(subtotal * coupon.DiscountValue / 100, coupon.MaxDiscountAmount ?? decimal.MaxValue)
                        : coupon.DiscountValue;
                    coupon.UsedCount++;
                    await _uow.Coupons.UpdateAsync(coupon);
                }
            }

            decimal tax = Math.Round((subtotal - discount) * 0.05m, 2);
            decimal total = subtotal + delivery - discount + tax;

            var order = new Order
            {
                OrderNumber = "VC" + DateTime.UtcNow.ToString("yyyyMMdd") + new Random().Next(1000, 9999),
                UserId = userId,
                AddressId = req.AddressId,
                PaymentMethod = req.PaymentMethod,
                PaymentStatus = "pending",
                Subtotal = subtotal,
                DeliveryCharge = delivery,
                DiscountAmount = discount,
                TaxAmount = tax,
                TotalAmount = total,
                CouponCode = req.CouponCode,
                Notes = req.Notes,
                EstimatedDelivery = DateTime.UtcNow.AddDays(3),
                Items = cart.Items.Select(i => new OrderItem
                {
                    ProductId = i.ProductId,
                    ProductName = i.Product.Name,
                    Quantity = i.Quantity,
                    Unit = i.Product.Unit,
                    UnitPrice = i.Product.Price,
                    TotalPrice = i.Product.Price * i.Quantity
                }).ToList()
            };

            await _uow.Orders.AddAsync(order);

            foreach (var item in cart.Items)
            {
                item.Product.StockQuantity -= (int)item.Quantity;
                await _uow.Products.UpdateAsync(item.Product);
                await _uow.CartItems.DeleteAsync(item);
            }

            await _uow.SaveChangesAsync();
            await _notifications.SendAsync(userId, "Order Placed! 🎉",
                $"Order #{order.OrderNumber} confirmed. Expected delivery in 3 days.", "order");

            return await GetByIdAsync(order.Id, userId, "user");
        }

        public async Task<PagedResult<OrderListDto>> GetUserOrdersAsync(int userId, int page, int pageSize)
        {
            var query = _uow.Orders.Query()
                .Include(o => o.Items)
                .Where(o => o.UserId == userId)
                .OrderByDescending(o => o.CreatedAt);

            var total = await query.CountAsync();
            var items = await query.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();

            return new PagedResult<OrderListDto>(items.Select(ToListDto).ToList(), total, page, pageSize,
                (int)Math.Ceiling((double)total / pageSize));
        }

        public async Task<OrderDetailDto?> GetByIdAsync(int orderId, int userId, string role)
        {
            var query = _uow.Orders.Query()
                .Include(o => o.Address)
                .Include(o => o.Items).ThenInclude(i => i.Product)
                .Include(o => o.StatusHistory);

            var order = role == "admin"
                ? await query.FirstOrDefaultAsync(o => o.Id == orderId)
                : await query.FirstOrDefaultAsync(o => o.Id == orderId && o.UserId == userId);

            return order == null ? null : ToDetailDto(order);
        }

        public async Task<bool> UpdateStatusAsync(int orderId, string status, string? note, int updatedBy)
        {
            var order = await _uow.Orders.GetByIdAsync(orderId);
            if (order == null) return false;
            order.Status = status;
            if (status == "delivered") { order.DeliveredAt = DateTime.UtcNow; order.PaymentStatus = "paid"; }
            await _uow.Orders.UpdateAsync(order);
            await _uow.OrderStatusHistories.AddAsync(new OrderStatusHistory
            {
                OrderId = orderId,
                Status = status,
                Note = note,
                UpdatedByUserId = updatedBy
            });
            await _uow.SaveChangesAsync();
            await _notifications.SendAsync(order.UserId, "Order Update",
                $"Your order #{order.OrderNumber} is now {status}.", "order");
            return true;
        }

        public async Task<bool> CancelAsync(int orderId, int userId)
        {
            var order = await _uow.Orders.GetByIdAsync(orderId);
            if (order == null || order.UserId != userId) return false;
            if (order.Status is "shipped" or "delivered") return false;
            return await UpdateStatusAsync(orderId, "cancelled", "Cancelled by user", userId);
        }

        public async Task<CouponResponseDto?> ApplyCouponAsync(ApplyCouponRequest req)
        {
            var coupon = await _uow.Coupons.FirstOrDefaultAsync(c =>
                c.Code == req.Code && c.IsActive
                && (c.ExpiryDate == null || c.ExpiryDate > DateTime.UtcNow)
                && (c.UsageLimit == null || c.UsedCount < c.UsageLimit)
                && req.OrderAmount >= c.MinOrderAmount);
            if (coupon == null) return null;

            var discount = coupon.DiscountType == "Percentage"
                ? Math.Min(req.OrderAmount * coupon.DiscountValue / 100, coupon.MaxDiscountAmount ?? decimal.MaxValue)
                : coupon.DiscountValue;

            return new CouponResponseDto(coupon.Code, coupon.DiscountType, coupon.DiscountValue,
                Math.Round(discount, 2), Math.Round(req.OrderAmount - discount, 2));
        }

        public async Task<PagedResult<OrderListDto>> GetAllAsync(int page, int pageSize, string? status)
        {
            var query = _uow.Orders.Query().Include(o => o.Items).AsQueryable();
            if (!string.IsNullOrEmpty(status)) query = query.Where(o => o.Status == status);
            query = query.OrderByDescending(o => o.CreatedAt);
            var total = await query.CountAsync();
            var items = await query.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();
            return new PagedResult<OrderListDto>(items.Select(ToListDto).ToList(), total, page, pageSize,
                (int)Math.Ceiling((double)total / pageSize));
        }

        private static OrderListDto ToListDto(Order o) => new(
            o.Id, o.OrderNumber, o.Status, o.PaymentStatus, o.TotalAmount,
            o.Items?.Count ?? 0, o.CreatedAt, o.EstimatedDelivery?.ToString("dd MMM yyyy"));

        private static OrderDetailDto ToDetailDto(Order o) => new(
            o.Id, o.OrderNumber, o.Status, o.PaymentStatus, o.PaymentMethod,
            o.Subtotal, o.DeliveryCharge, o.DiscountAmount, o.TaxAmount, o.TotalAmount,
            o.CouponCode, o.Notes, o.CreatedAt, o.EstimatedDelivery, o.DeliveredAt,
            new AddressDto(o.Address.Id, o.Address.Label, o.Address.FullName, o.Address.Phone,
                o.Address.Street, o.Address.City, o.Address.State, o.Address.PinCode, o.Address.IsDefault),
            o.Items?.Select(i => new OrderItemDto(
                i.Id, i.ProductId, i.ProductName, i.Product?.ImageUrl,
                i.Quantity, i.Unit, i.UnitPrice, i.TotalPrice)).ToList() ?? new(),
            o.StatusHistory?.OrderBy(h => h.CreatedAt)
                .Select(h => new OrderStatusHistoryDto(h.Id, h.Status, h.Note, h.CreatedAt)).ToList() ?? new());
    }
}