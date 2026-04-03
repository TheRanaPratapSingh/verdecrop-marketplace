using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using VerdeCrop.Application.DTOs;
using VerdeCrop.Application.Interfaces;
using VerdeCrop.Domain.Entities;

namespace VerdeCrop.Infrastructure.Services
{
    // ── Cart Service ──────────────────────────────────────────────────────────
    public class CartService : ICartService
    {
        private readonly IUnitOfWork _uow;
        public CartService(IUnitOfWork uow) { _uow = uow; }

        public async Task<CartDto?> GetCartAsync(int userId)
        {
            var cart = await GetOrCreateCartAsync(userId);
            return ToDto(cart);
        }

        public async Task<CartDto?> AddItemAsync(int userId, AddToCartRequest req)
        {
            var cart = await GetOrCreateCartAsync(userId);
            var product = await _uow.Products.GetByIdAsync(req.ProductId);
            if (product == null || !product.IsActive) return null;

            var existing = await _uow.CartItems.FirstOrDefaultAsync(
                i => i.CartId == cart.Id && i.ProductId == req.ProductId);
            if (existing != null)
                existing.Quantity += req.Quantity;
            else
                await _uow.CartItems.AddAsync(new CartItem
                {
                    CartId = cart.Id,
                    ProductId = req.ProductId,
                    Quantity = req.Quantity
                });

            await _uow.SaveChangesAsync();
            return await GetCartAsync(userId);
        }

        public async Task<CartDto?> UpdateItemAsync(int userId, int itemId, decimal quantity)
        {
            var cart = await GetOrCreateCartAsync(userId);
            var item = await _uow.CartItems.FirstOrDefaultAsync(i => i.Id == itemId && i.CartId == cart.Id);
            if (item == null) return null;
            if (quantity <= 0)
                await _uow.CartItems.DeleteAsync(item);
            else
                item.Quantity = quantity;
            await _uow.SaveChangesAsync();
            return await GetCartAsync(userId);
        }

        public async Task<bool> RemoveItemAsync(int userId, int itemId)
        {
            var cart = await GetOrCreateCartAsync(userId);
            var item = await _uow.CartItems.FirstOrDefaultAsync(i => i.Id == itemId && i.CartId == cart.Id);
            if (item == null) return false;
            await _uow.CartItems.DeleteAsync(item);
            await _uow.SaveChangesAsync();
            return true;
        }

        public async Task<bool> ClearCartAsync(int userId)
        {
            var cart = await _uow.Carts.FirstOrDefaultAsync(c => c.UserId == userId);
            if (cart == null) return false;
            var items = await _uow.CartItems.GetAllAsync(i => i.CartId == cart.Id);
            foreach (var item in items) await _uow.CartItems.DeleteAsync(item);
            await _uow.SaveChangesAsync();
            return true;
        }

        private async Task<Cart> GetOrCreateCartAsync(int userId)
        {
            var cart = await _uow.Carts.Query()
                .Include(c => c.Items).ThenInclude(i => i.Product)
                .FirstOrDefaultAsync(c => c.UserId == userId);
            if (cart != null) return cart;
            cart = new Cart { UserId = userId };
            await _uow.Carts.AddAsync(cart);
            await _uow.SaveChangesAsync();
            return cart;
        }

        private static CartDto ToDto(Cart cart)
        {
            var items = cart.Items?
                .Where(i => i.Product != null)
                .Select(i => new CartItemDto(
                    i.Id, i.ProductId, i.Product.Name, i.Product.ImageUrl,
                    i.Product.Price, i.Quantity, i.Product.Unit,
                    i.Product.Price * i.Quantity))
                .ToList() ?? new();
            return new CartDto(cart.Id, items, items.Sum(i => i.Total), items.Count);
        }
    }

    // ── Wishlist Service ─────────────────────────────────────────────────────
    public class WishlistService : IWishlistService
    {
        private readonly IUnitOfWork _uow;
        public WishlistService(IUnitOfWork uow) { _uow = uow; }

        public async Task<List<ProductListDto>> GetWishlistAsync(int userId)
        {
            var items = await _uow.WishlistItems.Query()
                .Include(w => w.Product).ThenInclude(p => p.Category)
                .Include(w => w.Product).ThenInclude(p => p.Farmer)
                .Where(w => w.UserId == userId && w.Product.IsActive)
                .Select(w => new ProductListDto(
                    w.Product.Id, w.Product.Name, w.Product.Slug,
                    w.Product.CategoryId, w.Product.Category != null ? w.Product.Category.Name : "",
                    w.Product.FarmerId, w.Product.Farmer != null ? w.Product.Farmer.FarmName : "",
                    w.Product.Price, w.Product.OriginalPrice, w.Product.Unit,
                    w.Product.StockQuantity, w.Product.ImageUrl,
                    w.Product.IsOrganic, w.Product.IsFeatured,
                    w.Product.Rating, w.Product.ReviewCount, w.Product.IsActive))
                .ToListAsync();

            return items;
        }

        public async Task<bool> AddAsync(int userId, int productId)
        {
            var product = await _uow.Products.GetByIdAsync(productId);
            if (product == null || !product.IsActive) return false;

            var exists = await _uow.WishlistItems.ExistsAsync(w => w.UserId == userId && w.ProductId == productId);
            if (exists) return true;

            await _uow.WishlistItems.AddAsync(new WishlistItem
            {
                UserId = userId,
                ProductId = productId
            });
            await _uow.SaveChangesAsync();
            return true;
        }

        public async Task<bool> RemoveAsync(int userId, int productId)
        {
            var item = await _uow.WishlistItems.FirstOrDefaultAsync(w => w.UserId == userId && w.ProductId == productId);
            if (item == null) return false;
            await _uow.WishlistItems.DeleteAsync(item);
            await _uow.SaveChangesAsync();
            return true;
        }
    }

    // ── User Service ──────────────────────────────────────────────────────────
    public class UserService : IUserService
    {
        private readonly IUnitOfWork _uow;
        private readonly IStorageService _storage;
        public UserService(IUnitOfWork uow, IStorageService storage) { _uow = uow; _storage = storage; }

        public async Task<UserDto?> GetByIdAsync(int id)
        {
            var u = await _uow.Users.GetByIdAsync(id);
            return u == null ? null : ToDto(u);
        }

        public async Task<UserDto?> UpdateProfileAsync(int userId, UpdateProfileRequest req)
        {
            var u = await _uow.Users.GetByIdAsync(userId);
            if (u == null) return null;
            u.Name = req.Name; u.Email = req.Email; u.Phone = req.Phone;
            await _uow.Users.UpdateAsync(u);
            await _uow.SaveChangesAsync();
            return ToDto(u);
        }

        public async Task<string?> UploadAvatarAsync(int userId, Stream fileStream, string fileName)
        {
            var u = await _uow.Users.GetByIdAsync(userId);
            if (u == null) return null;
            var url = await _storage.UploadAsync(fileStream, fileName, "avatars");
            u.AvatarUrl = url;
            await _uow.Users.UpdateAsync(u);
            await _uow.SaveChangesAsync();
            return url;
        }

        public async Task<bool> UpdateFcmTokenAsync(int userId, string token)
        {
            var u = await _uow.Users.GetByIdAsync(userId);
            if (u == null) return false;
            u.FcmToken = token;
            await _uow.Users.UpdateAsync(u);
            await _uow.SaveChangesAsync();
            return true;
        }

        public async Task<PagedResult<UserDto>> GetAllAsync(int page, int pageSize, string? search)
        {
            var query = _uow.Users.Query();
            if (!string.IsNullOrEmpty(search))
                query = query.Where(u => u.Name.Contains(search) || (u.Email != null && u.Email.Contains(search)));
            var total = await query.CountAsync();
            var items = await query.OrderByDescending(u => u.CreatedAt)
                .Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();
            return new PagedResult<UserDto>(items.Select(ToDto).ToList(), total, page, pageSize,
                (int)Math.Ceiling((double)total / pageSize));
        }

        public async Task<bool> SetActiveAsync(int userId, bool isActive)
        {
            var u = await _uow.Users.GetByIdAsync(userId);
            if (u == null) return false;
            u.IsActive = isActive;
            await _uow.Users.UpdateAsync(u);
            await _uow.SaveChangesAsync();
            return true;
        }

        private static UserDto ToDto(User u) =>
            new(u.Id, u.Name, u.Email, u.Phone, u.Role, u.AvatarUrl, u.IsActive);
    }

    // ── Address Service ───────────────────────────────────────────────────────
    public class AddressService : IAddressService
    {
        private readonly IUnitOfWork _uow;
        public AddressService(IUnitOfWork uow) { _uow = uow; }

        public async Task<List<AddressDto>> GetUserAddressesAsync(int userId)
        {
            var addrs = await _uow.Addresses.GetAllAsync(a => a.UserId == userId);
            return addrs.Select(ToDto).ToList();
        }

        public async Task<AddressDto?> CreateAsync(int userId, CreateAddressRequest req)
        {
            if (req.IsDefault)
            {
                var existing = await _uow.Addresses.GetAllAsync(a => a.UserId == userId && a.IsDefault);
                foreach (var a in existing) { a.IsDefault = false; await _uow.Addresses.UpdateAsync(a); }
            }
            var addr = new Address
            {
                UserId = userId,
                Label = req.Label,
                FullName = req.FullName,
                Phone = req.Phone,
                Street = req.Street,
                City = req.City,
                State = req.State,
                PinCode = req.PinCode ?? "",
                IsDefault = req.IsDefault
            };
            await _uow.Addresses.AddAsync(addr);
            await _uow.SaveChangesAsync();
            return ToDto(addr);
        }

        public async Task<AddressDto?> UpdateAsync(int userId, int addressId, CreateAddressRequest req)
        {
            var addr = await _uow.Addresses.FirstOrDefaultAsync(a => a.Id == addressId && a.UserId == userId);
            if (addr == null) return null;
            addr.Label = req.Label; addr.FullName = req.FullName; addr.Phone = req.Phone;
            addr.Street = req.Street; addr.City = req.City; addr.State = req.State;
            addr.PinCode = req.PinCode; addr.IsDefault = req.IsDefault;
            await _uow.Addresses.UpdateAsync(addr);
            await _uow.SaveChangesAsync();
            return ToDto(addr);
        }

        public async Task<bool> DeleteAsync(int userId, int addressId)
        {
            var addr = await _uow.Addresses.FirstOrDefaultAsync(a => a.Id == addressId && a.UserId == userId);
            if (addr == null) return false;
            await _uow.Addresses.DeleteAsync(addr);
            await _uow.SaveChangesAsync();
            return true;
        }

        public async Task<bool> SetDefaultAsync(int userId, int addressId)
        {
            var all = await _uow.Addresses.GetAllAsync(a => a.UserId == userId);
            foreach (var a in all) { a.IsDefault = a.Id == addressId; await _uow.Addresses.UpdateAsync(a); }
            await _uow.SaveChangesAsync();
            return true;
        }

        private static AddressDto ToDto(Address a) =>
            new(a.Id, a.Label, a.FullName, a.Phone, a.Street, a.City, a.State, a.PinCode, a.IsDefault);
    }

    // ── Farmer Service ────────────────────────────────────────────────────────
    public class FarmerService : IFarmerService
    {
        private readonly IUnitOfWork _uow;
        public FarmerService(IUnitOfWork uow) { _uow = uow; }

        public async Task<PagedResult<FarmerDto>> GetAllAsync(int page, int pageSize, bool? isApproved)
        {
            IQueryable<FarmerProfile> query = _uow.FarmerProfiles.Query().Include(f => f.User);
            if (isApproved.HasValue) query = query.Where(f => f.IsApproved == isApproved);
            var total = await query.CountAsync();
            var items = await query.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();
            return new PagedResult<FarmerDto>(items.Select(ToDto).ToList(), total, page, pageSize,
                (int)Math.Ceiling((double)total / pageSize));
        }

        public async Task<FarmerDto?> GetByIdAsync(int id)
        {
            var f = await _uow.FarmerProfiles.Query().Include(x => x.User).FirstOrDefaultAsync(x => x.Id == id);
            return f == null ? null : ToDto(f);
        }

        public async Task<FarmerDto?> GetByUserIdAsync(int userId)
        {
            var f = await _uow.FarmerProfiles.Query().Include(x => x.User).FirstOrDefaultAsync(x => x.UserId == userId);
            return f == null ? null : ToDto(f);
        }

        public async Task<FarmerDto?> RegisterAsync(int userId, RegisterFarmerRequest req)
        {
            var user = await _uow.Users.GetByIdAsync(userId);
            if (user == null) return null;

            var existingProfile = await _uow.FarmerProfiles.Query()
                .Include(x => x.User)
                .FirstOrDefaultAsync(x => x.UserId == userId);
            if (existingProfile != null)
            {
                return ToDto(existingProfile);
            }

            var profile = new FarmerProfile
            {
                UserId = userId,
                FarmName = req.FarmName,
                Description = req.Description,
                Location = req.Location,
                State = req.State,
                PinCode = req.PinCode ?? "",
                CertificationNumber = req.CertificationNumber,
                BankAccountNumber = req.BankAccountNumber,
                BankIfsc = req.BankIfsc
            };
            await _uow.FarmerProfiles.AddAsync(profile);
            user.Role = "farmer";
            await _uow.Users.UpdateAsync(user);
            await _uow.SaveChangesAsync();
            return await GetByIdAsync(profile.Id);
        }

        public async Task<FarmerDto?> CreateAdminAsync(string ownerName, RegisterFarmerRequest req)
        {
            // create a new user for the farmer
            var user = new User { Name = ownerName ?? "", Role = "farmer", IsActive = true };
            await _uow.Users.AddAsync(user);
            await _uow.SaveChangesAsync();

            var profile = new FarmerProfile
            {
                UserId = user.Id,
                FarmName = req.FarmName,
                Description = req.Description,
                Location = req.Location,
                State = req.State,
                PinCode = req.PinCode,
                CertificationNumber = req.CertificationNumber,
                BankAccountNumber = req.BankAccountNumber,
                BankIfsc = req.BankIfsc,
                IsApproved = req.IsApproved ?? false
            };
            await _uow.FarmerProfiles.AddAsync(profile);
            await _uow.SaveChangesAsync();
            return await GetByIdAsync(profile.Id);
        }

        public async Task<FarmerDto?> UpdateAsync(int farmerId, RegisterFarmerRequest req)
        {
            var f = await _uow.FarmerProfiles.Query().Include(x => x.User).FirstOrDefaultAsync(x => x.Id == farmerId);
            if (f == null) return null;
            f.FarmName = req.FarmName ?? f.FarmName;
            f.Description = req.Description;
            f.Location = req.Location ?? f.Location;
            f.State = req.State ?? f.State;
            f.PinCode = req.PinCode ?? f.PinCode;
            f.CertificationNumber = req.CertificationNumber ?? f.CertificationNumber;
            f.BankAccountNumber = req.BankAccountNumber ?? f.BankAccountNumber;
            f.BankIfsc = req.BankIfsc ?? f.BankIfsc;
            if (req.IsApproved.HasValue) f.IsApproved = req.IsApproved.Value;
            await _uow.FarmerProfiles.UpdateAsync(f);
            if (!string.IsNullOrEmpty(req.OwnerName) && f.User != null)
            {
                f.User.Name = req.OwnerName;
                await _uow.Users.UpdateAsync(f.User);
            }
            await _uow.SaveChangesAsync();
            return await GetByIdAsync(f.Id);
        }

        public async Task<bool> DeleteAsync(int farmerId)
        {
            var f = await _uow.FarmerProfiles.GetByIdAsync(farmerId);
            if (f == null) return false;
            await _uow.FarmerProfiles.DeleteAsync(f);
            // optionally demote user role back to 'user' if exists
            var user = await _uow.Users.GetByIdAsync(f.UserId);
            if (user != null)
            {
                user.Role = "user";
                await _uow.Users.UpdateAsync(user);
            }
            await _uow.SaveChangesAsync();
            return true;
        }

        public async Task<bool> ApproveAsync(int farmerId, bool approve)
        {
            var f = await _uow.FarmerProfiles.GetByIdAsync(farmerId);
            if (f == null) return false;
            f.IsApproved = approve;
            await _uow.FarmerProfiles.UpdateAsync(f);
            await _uow.SaveChangesAsync();
            return true;
        }

        private static FarmerDto ToDto(FarmerProfile f) => new(
            f.Id, f.UserId, f.FarmName, f.Description, f.Location, f.State,
            f.PinCode, f.CertificationNumber, f.BankAccountNumber, f.BankIfsc,
            f.IsApproved, f.TotalSales, f.Rating, f.ReviewCount,
            f.User?.Name ?? "", f.User?.AvatarUrl);
    }

    // ── Review Service ────────────────────────────────────────────────────────
    public class ReviewService : IReviewService
    {
        private readonly IUnitOfWork _uow;
        public ReviewService(IUnitOfWork uow) { _uow = uow; }

        public async Task<PagedResult<ReviewDto>> GetProductReviewsAsync(int productId, int page, int pageSize)
        {
            var query = _uow.Reviews.Query().Include(r => r.User)
                .Where(r => r.ProductId == productId).OrderByDescending(r => r.CreatedAt);
            var total = await query.CountAsync();
            var items = await query.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();
            return new PagedResult<ReviewDto>(items.Select(ToDto).ToList(), total, page, pageSize,
                (int)Math.Ceiling((double)total / pageSize));
        }

        public async Task<ReviewDto?> CreateAsync(int userId, CreateReviewRequest req)
        {
            var existing = await _uow.Reviews.ExistsAsync(r => r.UserId == userId && r.ProductId == req.ProductId);
            if (existing) return null;

            var review = new Review
            {
                ProductId = req.ProductId,
                UserId = userId,
                OrderId = req.OrderId,
                Rating = req.Rating,
                Comment = req.Comment,
                IsVerifiedPurchase = true
            };
            await _uow.Reviews.AddAsync(review);

            var product = await _uow.Products.GetByIdAsync(req.ProductId);
            if (product != null)
            {
                var allRatings = await _uow.Reviews.GetAllAsync(r => r.ProductId == req.ProductId);
                product.Rating = (decimal)(allRatings.Sum(r => r.Rating) + req.Rating) / (allRatings.Count + 1);
                product.ReviewCount = allRatings.Count + 1;
                await _uow.Products.UpdateAsync(product);
            }
            await _uow.SaveChangesAsync();
            return await GetReviewDtoAsync(review.Id);
        }

        public async Task<bool> DeleteAsync(int reviewId, int userId, string role)
        {
            var r = await _uow.Reviews.GetByIdAsync(reviewId);
            if (r == null || (role != "admin" && r.UserId != userId)) return false;
            await _uow.Reviews.DeleteAsync(r);
            await _uow.SaveChangesAsync();
            return true;
        }

        private async Task<ReviewDto?> GetReviewDtoAsync(int id)
        {
            var r = await _uow.Reviews.Query().Include(x => x.User).FirstOrDefaultAsync(x => x.Id == id);
            return r == null ? null : ToDto(r);
        }

        private static ReviewDto ToDto(Review r) =>
            new(r.Id, r.UserId, r.User?.Name ?? "", r.User?.AvatarUrl,
                r.Rating, r.Comment, r.IsVerifiedPurchase, r.CreatedAt);
    }

    // ── Admin Service ─────────────────────────────────────────────────────────
    public class AdminService : IAdminService
    {
        private readonly IUnitOfWork _uow;
        public AdminService(IUnitOfWork uow) { _uow = uow; }

        public async Task<DashboardStatsDto> GetDashboardStatsAsync()
        {
            var now = DateTime.UtcNow;
            var monthStart = new DateTime(now.Year, now.Month, 1);

            var totalUsers = await _uow.Users.Query().CountAsync(u => u.Role == "user");
            var totalFarmers = await _uow.FarmerProfiles.Query().CountAsync();
            var totalProducts = await _uow.Products.Query().CountAsync(p => p.IsActive);
            var totalOrders = await _uow.Orders.Query().CountAsync();
            var totalRevenue = await _uow.Orders.Query().Where(o => o.PaymentStatus == "paid").SumAsync(o => o.TotalAmount);
            var monthlyRevenue = await _uow.Orders.Query()
                .Where(o => o.PaymentStatus == "paid" && o.CreatedAt >= monthStart).SumAsync(o => o.TotalAmount);
            var pendingOrders = await _uow.Orders.Query().CountAsync(o => o.Status == "pending");
            var pendingFarmers = await _uow.FarmerProfiles.Query().CountAsync(f => !f.IsApproved);

            var revenueChart = await _uow.Orders.Query()
                .Where(o => o.PaymentStatus == "paid" && o.CreatedAt >= now.AddMonths(-6))
                .GroupBy(o => new { o.CreatedAt.Year, o.CreatedAt.Month })
                .Select(g => new RevenueDataPoint(
                    $"{g.Key.Year}-{g.Key.Month:D2}", g.Sum(o => o.TotalAmount), g.Count()))
                .OrderBy(r => r.Label).ToListAsync();

            return new DashboardStatsDto(totalUsers, totalFarmers, totalProducts, totalOrders,
                totalRevenue, monthlyRevenue, pendingOrders, pendingFarmers, revenueChart);
        }

        public async Task<PagedResult<OrderListDto>> GetAllOrdersAsync(int page, int pageSize, string? status)
        {
            var query = _uow.Orders.Query().Include(o => o.Items).Include(o => o.Address).AsQueryable();
            if (!string.IsNullOrEmpty(status)) query = query.Where(o => o.Status == status);
            var total = await query.CountAsync();
            var items = await query.OrderByDescending(o => o.CreatedAt)
                .Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();
            return new PagedResult<OrderListDto>(
                items.Select(o => new OrderListDto(o.Id, o.OrderNumber, o.Status, o.PaymentStatus,
                    o.TotalAmount, o.Items?.Count ?? 0, o.CreatedAt,
                    o.EstimatedDelivery?.ToString("dd MMM yyyy"),
                    o.Address?.FullName)).ToList(),
                total, page, pageSize, (int)Math.Ceiling((double)total / pageSize));
        }
    }

    // ── Category Service ──────────────────────────────────────────────────────
    public class CategoryService : ICategoryService
    {
        private readonly IUnitOfWork _uow;
        private readonly ICacheService _cache;
        public CategoryService(IUnitOfWork uow, ICacheService cache) { _uow = uow; _cache = cache; }

        public async Task<List<CategoryDto>> GetAllAsync()
        {
            var result = await _uow.Categories.Query()
                .Where(c => c.IsActive)
                .OrderBy(c => c.DisplayOrder)
                .Select(c => new CategoryDto(
                    c.Id, c.Name, c.Slug, c.Description, c.IconUrl,
                    c.DisplayOrder,
                    c.Products.Where(p => p.IsActive).Count(),
                    c.IsActive, c.ShowOnHome))
                .ToListAsync();
            return result;
        }

        public async Task<CategoryDto?> GetByIdAsync(int id)
        {
            try
            {
                var result = await _uow.Categories.Query()
                    .Where(c => c.Id == id)
                    .Select(c => new CategoryDto(
                        c.Id, c.Name, c.Slug, c.Description, c.IconUrl,
                        c.DisplayOrder,
                        c.Products.Where(p => p.IsActive).Count(),
                        c.IsActive, c.ShowOnHome))
                    .FirstOrDefaultAsync();
                return result;
            }
            catch
            {
                return null;
            }
        }

        public async Task<CategoryDto?> GetBySlugAsync(string slug)
        {
            try
            {
                var result = await _uow.Categories.Query()
                    .Where(c => c.Slug == slug && c.IsActive)
                    .Select(c => new CategoryDto(
                        c.Id, c.Name, c.Slug, c.Description, c.IconUrl,
                        c.DisplayOrder,
                        c.Products.Where(p => p.IsActive).Count(),
                        c.IsActive, c.ShowOnHome))
                    .FirstOrDefaultAsync();
                return result;
            }
            catch
            {
                return null;
            }
        }

        // ── FIX: CreateAsync — was missing, now includes slug dedup ──────────
        public async Task<CategoryDto> CreateAsync(CreateCategoryRequest req)
        {
            var slug = req.Name.ToLower().Replace(" ", "-");
            var exists = await _uow.Categories.ExistsAsync(c => c.Slug == slug);
            if (exists) slug += "-" + Guid.NewGuid().ToString("N")[..6];

            var category = new Category
            {
                Name = req.Name,
                Slug = slug,
                Description = req.Description,
                IconUrl = req.IconUrl,
                DisplayOrder = req.DisplayOrder,
                IsActive = req.IsActive,
                ShowOnHome = req.ShowOnHome
            };
            await _uow.Categories.AddAsync(category);
            await _uow.SaveChangesAsync();
            return ToDto(category);
        }

        // ── FIX: UpdateAsync — was missing ───────────────────────────────────
        public async Task<CategoryDto?> UpdateAsync(int id, UpdateCategoryRequest req)
        {
            var category = await _uow.Categories.GetByIdAsync(id);
            if (category == null) return null;

            if (req.Name != null)
            {
                category.Name = req.Name;
                category.Slug = req.Name.ToLower().Replace(" ", "-");
            }
            if (req.Description != null) category.Description = req.Description;
            if (req.IconUrl != null) category.IconUrl = req.IconUrl;
            if (req.DisplayOrder.HasValue) category.DisplayOrder = req.DisplayOrder.Value;
            if (req.IsActive.HasValue) category.IsActive = req.IsActive.Value;
            if (req.ShowOnHome.HasValue) category.ShowOnHome = req.ShowOnHome.Value;

            category.UpdatedAt = DateTime.UtcNow;
            await _uow.Categories.UpdateAsync(category);
            await _uow.SaveChangesAsync();
            return await GetByIdAsync(id);
        }

        // ── FIX: DeleteAsync — now hard deletes (use soft if preferred) ──────
        public async Task<bool> DeleteAsync(int id)
        {
            var category = await _uow.Categories.GetByIdAsync(id);
            if (category == null) return false;

            // Soft delete — keeps data integrity with existing products
            category.IsActive = false;
            category.UpdatedAt = DateTime.UtcNow;
            await _uow.Categories.UpdateAsync(category);
            await _uow.SaveChangesAsync();
            return true;
        }

        private static CategoryDto ToDto(Category c) => new(
            c.Id, c.Name, c.Slug, c.Description, c.IconUrl,
            c.DisplayOrder, c.Products?.Count(p => p.IsActive) ?? 0, c.IsActive, c.ShowOnHome);
    }
}