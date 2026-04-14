using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
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
        private readonly ICacheService _cache;
        private readonly Microsoft.Extensions.Configuration.IConfiguration _config;

        public AuthService(IUnitOfWork uow, IJwtService jwt, IOtpService otpSvc,
            IEmailService email, ISmsService sms, ICacheService cache,
            Microsoft.Extensions.Configuration.IConfiguration config)
        {
            _uow = uow; _jwt = jwt; _otpSvc = otpSvc;
            _email = email; _sms = sms; _cache = cache; _config = config;
        }

        public async Task<bool> SendOtpAsync(SendOtpRequest req)
        {
            var otp = await _otpSvc.GenerateOtpAsync(req.Identifier, req.Purpose);

            var isEmail = req.Identifier.Contains('@');
            if (isEmail)
                await _email.SendOtpEmailAsync(req.Identifier, otp, req.Purpose);
            else
                await _sms.SendOtpSmsAsync(req.Identifier, otp);
            return true;
        }

        public async Task<AuthResponse?> VerifyOtpAsync(VerifyOtpRequest req)
        {
            var valid = await ValidateLoginOrRegisterOtpAsync(req.Identifier, req.Code);
            if (!valid) return null;

            var normalizedEmail = string.IsNullOrWhiteSpace(req.Email) ? (req.Identifier.Contains('@') ? req.Identifier : null) : req.Email.Trim();
            var normalizedPhone = string.IsNullOrWhiteSpace(req.Phone) ? (!req.Identifier.Contains('@') ? req.Identifier : null) : req.Phone.Trim();

            User? user = null;
            if (!string.IsNullOrWhiteSpace(normalizedEmail))
                user = await _uow.Users.FirstOrDefaultAsync(u => u.Email == normalizedEmail);
            if (user == null && !string.IsNullOrWhiteSpace(normalizedPhone))
                user = await _uow.Users.FirstOrDefaultAsync(u => u.Phone == normalizedPhone);
            if (user == null)
                user = await _uow.Users.FirstOrDefaultAsync(u => u.Email == req.Identifier || u.Phone == req.Identifier);

            if (user == null)
            {
                user = new User
                {
                    Name = req.Name ?? normalizedEmail ?? normalizedPhone ?? req.Identifier,
                    Email = normalizedEmail,
                    Phone = normalizedPhone,
                    IsEmailVerified = !string.IsNullOrWhiteSpace(normalizedEmail),
                    IsPhoneVerified = !string.IsNullOrWhiteSpace(normalizedPhone),
                    Role = "user"
                };
                await _uow.Users.AddAsync(user);
                var cart = new Cart { User = user };
                await _uow.Carts.AddAsync(cart);
                await _uow.SaveChangesAsync();
                await SendRegistrationSuccessEmailAsync(user, !string.IsNullOrWhiteSpace(user.Email));
            }
            else
            {
                var updated = false;
                var hasFarmerProfile = await _uow.FarmerProfiles.Query().AnyAsync(f => f.UserId == user.Id);
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
                {
                    await _uow.Users.UpdateAsync(user);
                    await _uow.SaveChangesAsync();
                }
                await SendLoginWelcomeEmailAsync(user);
            }

            return await BuildAuthResponseAsync(user);
        }

        private async Task<bool> ValidateLoginOrRegisterOtpAsync(string identifier, string code)
        {
            if (await _otpSvc.ValidateOtpAsync(identifier, code, "login")) return true;
            return await _otpSvc.ValidateOtpAsync(identifier, code, "register");
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

        public async Task<bool> VerifyOtpOnlyAsync(VerifyOtpOnlyRequest req)
        {
            var valid = await ValidateLoginOrRegisterOtpAsync(req.Identifier, req.Code);
            if (!valid) return false;
            await _cache.SetAsync($"preverified:{req.Identifier}", true, TimeSpan.FromMinutes(15));
            return true;
        }

        public async Task<AuthResponse?> RegisterWithDualVerificationAsync(DualOtpRegisterRequest req)
        {
            var phoneVerified = await _cache.GetAsync<bool?>($"preverified:{req.Phone}");
            var emailVerified = await _cache.GetAsync<bool?>($"preverified:{req.Email}");
            if (phoneVerified != true || emailVerified != true) return null;

            await _cache.DeleteAsync($"preverified:{req.Phone}");
            await _cache.DeleteAsync($"preverified:{req.Email}");

            User? user = await _uow.Users.FirstOrDefaultAsync(u => u.Phone == req.Phone);
            if (user == null)
                user = await _uow.Users.FirstOrDefaultAsync(u => u.Email == req.Email);

            if (user == null)
            {
                user = new User
                {
                    Name = req.Name,
                    Phone = req.Phone,
                    Email = req.Email,
                    IsPhoneVerified = true,
                    IsEmailVerified = true,
                    Role = "user"
                };
                await _uow.Users.AddAsync(user);
                var cart = new Cart { User = user };
                await _uow.Carts.AddAsync(cart);
                await _uow.SaveChangesAsync();
                await SendRegistrationSuccessEmailAsync(user, true);
            }
            else
            {
                var updated = false;
                if (!string.Equals(user.Phone, req.Phone))
                {
                    user.Phone = req.Phone;
                    user.IsPhoneVerified = true;
                    updated = true;
                }
                if (!string.Equals(user.Email, req.Email, StringComparison.OrdinalIgnoreCase))
                {
                    user.Email = req.Email;
                    user.IsEmailVerified = true;
                    updated = true;
                }
                if (updated)
                {
                    await _uow.Users.UpdateAsync(user);
                    await _uow.SaveChangesAsync();
                }
            }

            return await BuildAuthResponseAsync(user);
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
            try
            {
                var query = _uow.Products.Query()
                    .Where(p => p.IsActive);

                if (!string.IsNullOrWhiteSpace(q.Search))
                    query = query.Where(p => p.Name.Contains(q.Search) || (p.Description != null && p.Description.Contains(q.Search)));
                if (q.CategoryId.HasValue)
                    query = query.Where(p => p.CategoryId == q.CategoryId);
                else if (!string.IsNullOrWhiteSpace(q.CategorySlug))
                    query = query.Where(p => p.Category != null && p.Category.Slug == q.CategorySlug);
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
                var items = await query
                    .Skip((q.Page - 1) * q.PageSize)
                    .Take(q.PageSize)
                    .Select(p => new ProductListDto(
                        p.Id, p.Name, p.Slug,
                        p.CategoryId, p.Category != null ? p.Category.Name : "",
                        p.FarmerId, p.Farmer != null ? p.Farmer.FarmName : "",
                        p.Price, p.OriginalPrice, p.Unit, p.StockQuantity,
                        p.ImageUrl, p.IsOrganic, p.IsFeatured,
                        p.Rating, p.ReviewCount, p.IsActive))
                    .ToListAsync();

                return new PagedResult<ProductListDto>(
                    items, total, q.Page, q.PageSize,
                    (int)Math.Ceiling((double)total / q.PageSize));
            }
            catch
            {
                return new PagedResult<ProductListDto>(
                    new List<ProductListDto>(), 0, q.Page, q.PageSize, 0);
            }
        }

        public async Task<ProductDetailDto?> GetByIdAsync(int id)
        {
            try
            {
                var result = await _uow.Products.Query()
                    .Where(x => x.Id == id && x.IsActive)
                    .Select(p => new ProductDetailDto(
                        p.Id, p.Name, p.Slug, p.Description,
                        p.CategoryId, p.Category != null ? p.Category.Name : "",
                        p.FarmerId, p.Farmer != null ? p.Farmer.FarmName : "",
                        p.Farmer != null ? p.Farmer.Location : "",
                        p.Price, p.OriginalPrice, p.Unit, p.MinOrderQty, p.StockQuantity,
                        p.ImageUrl, p.ImageUrls, p.IsOrganic, p.IsFeatured,
                        p.Rating, p.ReviewCount, p.IsActive,
                        p.Reviews.Select(r => new ReviewDto(
                            r.Id, r.UserId,
                            r.User != null ? r.User.Name : "",
                            r.User != null ? r.User.AvatarUrl : null,
                            r.Rating, r.Comment, r.IsVerifiedPurchase, r.CreatedAt
                        )).ToList()))
                    .FirstOrDefaultAsync();
                return result;
            }
            catch
            {
                return null;
            }
        }

        public async Task<ProductDetailDto?> GetBySlugAsync(string slug)
        {
            try
            {
                var result = await _uow.Products.Query()
                    .Where(x => x.Slug == slug && x.IsActive)
                    .Select(p => new ProductDetailDto(
                        p.Id, p.Name, p.Slug, p.Description,
                        p.CategoryId, p.Category != null ? p.Category.Name : "",
                        p.FarmerId, p.Farmer != null ? p.Farmer.FarmName : "",
                        p.Farmer != null ? p.Farmer.Location : "",
                        p.Price, p.OriginalPrice, p.Unit, p.MinOrderQty, p.StockQuantity,
                        p.ImageUrl, p.ImageUrls, p.IsOrganic, p.IsFeatured,
                        p.Rating, p.ReviewCount, p.IsActive,
                        p.Reviews.Select(r => new ReviewDto(
                            r.Id, r.UserId,
                            r.User != null ? r.User.Name : "",
                            r.User != null ? r.User.AvatarUrl : null,
                            r.Rating, r.Comment, r.IsVerifiedPurchase, r.CreatedAt
                        )).ToList()))
                    .FirstOrDefaultAsync();
                return result;
            }
            catch
            {
                return null;
            }
        }

        public async Task<List<ProductListDto>> GetFeaturedAsync(int count = 8)
        {
            try
            {
                var result = await _uow.Products.Query()
                    .Where(p => p.IsActive && p.IsFeatured)
                    .OrderByDescending(p => p.Rating)
                    .Take(count)
                    .Select(p => new ProductListDto(
                        p.Id, p.Name, p.Slug,
                        p.CategoryId, p.Category != null ? p.Category.Name : "",
                        p.FarmerId, p.Farmer != null ? p.Farmer.FarmName : "",
                        p.Price, p.OriginalPrice, p.Unit, p.StockQuantity,
                        p.ImageUrl, p.IsOrganic, p.IsFeatured,
                        p.Rating, p.ReviewCount, p.IsActive))
                    .ToListAsync();
                return result;
            }
            catch
            {
                return new List<ProductListDto>();
            }
        }

        public async Task<List<ProductListDto>> GetByFarmerAsync(int farmerId)
        {
            try
            {
                var products = await _uow.Products.Query()
                    .Where(p => p.FarmerId == farmerId)
                    .OrderByDescending(p => p.CreatedAt)
                    .Select(p => new ProductListDto(
                        p.Id, p.Name, p.Slug,
                        p.CategoryId, p.Category != null ? p.Category.Name : "",
                        p.FarmerId, p.Farmer != null ? p.Farmer.FarmName : "",
                        p.Price, p.OriginalPrice, p.Unit, p.StockQuantity,
                        p.ImageUrl, p.IsOrganic, p.IsFeatured,
                        p.Rating, p.ReviewCount, p.IsActive))
                    .ToListAsync();
                return products;
            }
            catch
            {
                return new List<ProductListDto>();
            }
        }

        // ── FIX: Now saves Description, ImageUrl, ImageUrls, IsFeatured ──────
        public async Task<ProductDetailDto?> CreateAsync(int farmerId, CreateProductRequest req)
        {
            if (farmerId <= 0) return null;
            return await CreateInternalAsync(farmerId, req, isAdminCreated: false);
        }

        // ── FIX: Was completely missing — referenced in controller ────────────
        public async Task<ProductDetailDto?> CreateAdminAsync(int adminUserId, CreateProductRequest req, int farmerId)
        {
            if (farmerId <= 0) return null;
            var farmer = await _uow.FarmerProfiles.GetByIdAsync(farmerId);
            if (farmer == null) return null;
            return await CreateInternalAsync(farmerId, req, isAdminCreated: true);
        }

        private async Task<ProductDetailDto?> CreateInternalAsync(int farmerId, CreateProductRequest req, bool isAdminCreated = false)
        {
            var slug = GenerateSlug(req.Name);

            var product = new Product
            {
                Name = req.Name,
                Slug = slug,
                Description = req.Description,
                CategoryId = req.CategoryId,
                FarmerId = farmerId,
                Price = req.Price,
                OriginalPrice = req.OriginalPrice,
                Unit = req.Unit,
                MinOrderQty = req.MinOrderQty,
                StockQuantity = req.StockQuantity,
                IsOrganic = req.IsOrganic,
                IsFeatured = req.IsFeatured ?? false,
                ImageUrl = req.ImageUrl,
                ImageUrls = req.ImageUrls ?? new List<string>(),
                // Extended fields
                Subcategory = req.Subcategory,
                Tags = req.Tags ?? new List<string>(),
                Village = req.Village,
                CertificationType = req.CertificationType,
                QuantityOptions = req.QuantityOptions ?? new List<string>(),
                HarvestDate = req.HarvestDate,
                ShelfLifeDays = req.ShelfLifeDays,
                FreshnessGuarantee = req.FreshnessGuarantee,
                DeliveryTime = req.DeliveryTime,
                AvailableCities = req.AvailableCities ?? new List<string>(),
                IsFarmToHome = req.IsFarmToHome,
                // Approval: admin-created products are immediately active; seller-created go to pending
                Status = isAdminCreated ? "approved" : "pending",
                IsActive = isAdminCreated,
            };

            if (string.IsNullOrEmpty(product.ImageUrl) && product.ImageUrls.Count > 0)
                product.ImageUrl = product.ImageUrls[0];

            await _uow.Products.AddAsync(product);
            await _uow.SaveChangesAsync();
            await _cache.DeleteAsync("featured_products");
            return await GetByIdRawAsync(product.Id);
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
            if (req.CategoryId.HasValue) product.CategoryId = req.CategoryId.Value;
            if (req.Price.HasValue) product.Price = req.Price.Value;
            if (req.OriginalPrice.HasValue) product.OriginalPrice = req.OriginalPrice;
            if (req.Unit != null) product.Unit = req.Unit;
            if (req.MinOrderQty.HasValue) product.MinOrderQty = req.MinOrderQty.Value;
            if (req.StockQuantity.HasValue) product.StockQuantity = req.StockQuantity.Value;
            if (req.IsOrganic.HasValue) product.IsOrganic = req.IsOrganic.Value;
            if (req.IsFeatured.HasValue) product.IsFeatured = req.IsFeatured.Value;
            if (req.IsActive.HasValue) product.IsActive = req.IsActive.Value;

            // Image updates
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

            // Extended field updates
            if (req.Subcategory != null) product.Subcategory = req.Subcategory;
            if (req.Tags != null) product.Tags = req.Tags;
            if (req.Village != null) product.Village = req.Village;
            if (req.CertificationType != null) product.CertificationType = req.CertificationType;
            if (req.QuantityOptions != null) product.QuantityOptions = req.QuantityOptions;
            if (req.HarvestDate.HasValue) product.HarvestDate = req.HarvestDate;
            if (req.ShelfLifeDays.HasValue) product.ShelfLifeDays = req.ShelfLifeDays;
            if (req.FreshnessGuarantee != null) product.FreshnessGuarantee = req.FreshnessGuarantee;
            if (req.DeliveryTime != null) product.DeliveryTime = req.DeliveryTime;
            if (req.AvailableCities != null) product.AvailableCities = req.AvailableCities;
            if (req.IsFarmToHome.HasValue) product.IsFarmToHome = req.IsFarmToHome.Value;

            product.UpdatedAt = DateTime.UtcNow;
            await _uow.Products.UpdateAsync(product);
            await _uow.SaveChangesAsync();
            await _cache.DeleteAsync("featured_products");
            return await GetByIdRawAsync(product.Id);
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

        private async Task<ProductDetailDto?> GetByIdRawAsync(int id)
        {
            try
            {
                return await _uow.Products.Query()
                    .Where(p => p.Id == id)
                    .Select(p => new ProductDetailDto(
                        p.Id, p.Name, p.Slug, p.Description,
                        p.CategoryId, p.Category != null ? p.Category.Name : "",
                        p.FarmerId, p.Farmer != null ? p.Farmer.FarmName : "",
                        p.Farmer != null ? p.Farmer.Location : "",
                        p.Price, p.OriginalPrice, p.Unit, p.MinOrderQty, p.StockQuantity,
                        p.ImageUrl, p.ImageUrls, p.IsOrganic, p.IsFeatured,
                        p.Rating, p.ReviewCount, p.IsActive,
                        new List<ReviewDto>()))
                    .FirstOrDefaultAsync();
            }
            catch { return null; }
        }

        public async Task<PagedResult<SellerProductDto>> GetSellerProductsAsync(int farmerId, int page, int pageSize)
        {
            try
            {
                var query = _uow.Products.Query().Where(p => p.FarmerId == farmerId);
                var total = await query.CountAsync();
                var items = await query
                    .OrderByDescending(p => p.CreatedAt)
                    .Skip((page - 1) * pageSize)
                    .Take(pageSize)
                    .Select(p => new SellerProductDto(
                        p.Id, p.Name, p.Slug,
                        p.CategoryId, p.Category != null ? p.Category.Name : "",
                        p.Price, p.OriginalPrice, p.Unit,
                        p.StockQuantity, p.ImageUrl,
                        p.IsOrganic, p.IsFeatured, p.IsActive,
                        p.Rating, p.ReviewCount,
                        p.Status, p.CreatedAt))
                    .ToListAsync();
                return new PagedResult<SellerProductDto>(items, total, page, pageSize,
                    (int)Math.Ceiling((double)total / pageSize));
            }
            catch { return new PagedResult<SellerProductDto>(new List<SellerProductDto>(), 0, page, pageSize, 0); }
        }

        public async Task<SellerProductDetailDto?> GetSellerProductByIdAsync(int productId, int farmerId)
        {
            try
            {
                var query = _uow.Products.Query().Where(p => p.Id == productId);
                if (farmerId > 0) query = query.Where(p => p.FarmerId == farmerId);
                return await query.Select(p => new SellerProductDetailDto(
                    p.Id, p.Name, p.Slug, p.Description,
                    p.CategoryId, p.Category != null ? p.Category.Name : "",
                    p.FarmerId, p.Farmer != null ? p.Farmer.FarmName : "",
                    p.Farmer != null ? p.Farmer.Location : "",
                    p.Price, p.OriginalPrice, p.Unit, p.MinOrderQty, p.StockQuantity,
                    p.ImageUrl, p.ImageUrls, p.IsOrganic, p.IsFeatured, p.IsActive,
                    p.Rating, p.ReviewCount, p.Status, p.CreatedAt,
                    p.Subcategory, p.Tags, p.Village, p.CertificationType,
                    p.QuantityOptions, p.HarvestDate, p.ShelfLifeDays,
                    p.FreshnessGuarantee, p.DeliveryTime, p.AvailableCities, p.IsFarmToHome))
                    .FirstOrDefaultAsync();
            }
            catch { return null; }
        }

        public async Task<PagedResult<SellerProductDto>> GetPendingProductsAsync(int page, int pageSize)
        {
            try
            {
                var query = _uow.Products.Query().Where(p => p.Status == "pending");
                var total = await query.CountAsync();
                var items = await query
                    .OrderByDescending(p => p.CreatedAt)
                    .Skip((page - 1) * pageSize)
                    .Take(pageSize)
                    .Select(p => new SellerProductDto(
                        p.Id, p.Name, p.Slug,
                        p.CategoryId, p.Category != null ? p.Category.Name : "",
                        p.Price, p.OriginalPrice, p.Unit,
                        p.StockQuantity, p.ImageUrl,
                        p.IsOrganic, p.IsFeatured, p.IsActive,
                        p.Rating, p.ReviewCount,
                        p.Status, p.CreatedAt))
                    .ToListAsync();
                return new PagedResult<SellerProductDto>(items, total, page, pageSize,
                    (int)Math.Ceiling((double)total / pageSize));
            }
            catch { return new PagedResult<SellerProductDto>(new List<SellerProductDto>(), 0, page, pageSize, 0); }
        }

        public async Task<bool> ApproveProductAsync(int productId, bool approve)
        {
            var product = await _uow.Products.GetByIdAsync(productId);
            if (product == null) return false;
            product.Status = approve ? "approved" : "rejected";
            product.IsActive = approve;
            product.UpdatedAt = DateTime.UtcNow;
            await _uow.Products.UpdateAsync(product);
            await _uow.SaveChangesAsync();
            await _cache.DeleteAsync("featured_products");
            return true;
        }

        public async Task<bool> ToggleFeaturedAsync(int productId, bool isFeatured)
        {
            var product = await _uow.Products.GetByIdAsync(productId);
            if (product == null) return false;
            product.IsFeatured = isFeatured;
            product.UpdatedAt = DateTime.UtcNow;
            await _uow.Products.UpdateAsync(product);
            await _uow.SaveChangesAsync();
            await _cache.DeleteAsync("featured_products");
            return true;
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
            p.ImageUrl, p.ImageUrls ?? new List<string>(), p.IsOrganic, p.IsFeatured,
            p.Rating, p.ReviewCount, p.IsActive,
            p.Reviews?.Select(r => new ReviewDto(
                r.Id, r.UserId, r.User?.Name ?? "", r.User?.AvatarUrl,
                r.Rating, r.Comment, r.IsVerifiedPurchase, r.CreatedAt
            )).ToList() ?? new List<ReviewDto>());
    }

    // ── Dynamic Pricing Service ───────────────────────────────────────────────
    public class DynamicPricingService : IDynamicPricingService
    {
        private readonly IUnitOfWork _uow;

        // Category name keywords → seasonal month ranges [startMonth, endMonth] (inclusive)
        private static readonly (string[] Keywords, int StartMonth, int EndMonth)[] _seasonalRules =
        {
            (new[] { "vegetable", "sabzi", "greens", "leafy" },  10, 2),  // Oct–Feb: winter vegs peak
            (new[] { "fruit",    "mango",  "berry",  "citrus" }, 4,  8),  // Apr–Aug: summer fruits peak
            (new[] { "herb",     "spice",  "masala", "ginger"  }, 11, 3), // Nov–Mar: winter herbs peak
            (new[] { "root",     "tuber",  "carrot", "radish"  }, 10, 2), // Oct–Feb: root veg peak
        };

        private const decimal MaxAdjustmentPercent = 30m;

        public DynamicPricingService(IUnitOfWork uow) => _uow = uow;

        public DynamicPriceDto ComputePrice(int productId, decimal basePrice, int stockQuantity,
            int reviewCount, decimal rating, string? categoryName, DateTime? harvestDate)
        {
            var factors = new List<string>();
            decimal totalAdjustment = 0m;
            string primaryLabel = "";

            // ── Demand rule ──────────────────────────────────────────────────
            if (reviewCount > 50 && rating >= 4.5m)
            {
                totalAdjustment += 15m;
                factors.Add("🔥 High demand");
                primaryLabel = "🔥 High demand price";
            }
            else if (reviewCount > 20 && rating >= 4.0m)
            {
                totalAdjustment += 8m;
                factors.Add("⭐ Popular product");
                if (string.IsNullOrEmpty(primaryLabel))
                    primaryLabel = "🔥 High demand price";
            }

            // ── Season rule ──────────────────────────────────────────────────
            if (IsInSeason(categoryName, harvestDate))
            {
                totalAdjustment += 8m;
                factors.Add("🌱 Peak season");
                if (string.IsNullOrEmpty(primaryLabel))
                    primaryLabel = "🌱 Seasonal price";
            }

            // ── Stock rule ───────────────────────────────────────────────────
            if (stockQuantity < 10 && stockQuantity > 0)
            {
                totalAdjustment += 10m;
                factors.Add("⚠️ Low stock");
                if (string.IsNullOrEmpty(primaryLabel))
                    primaryLabel = "⚠️ Low stock price";
            }
            else if (stockQuantity < 30 && stockQuantity > 0)
            {
                totalAdjustment += 5m;
                factors.Add("📦 Limited availability");
                if (string.IsNullOrEmpty(primaryLabel))
                    primaryLabel = "📦 Limited availability";
            }

            // ── Cap ──────────────────────────────────────────────────────────
            totalAdjustment = Math.Min(totalAdjustment, MaxAdjustmentPercent);

            var dynamicPrice = totalAdjustment > 0
                ? Math.Round(basePrice * (1 + totalAdjustment / 100), 2)
                : basePrice;

            return new DynamicPriceDto(
                BasePrice: basePrice,
                DynamicPrice: dynamicPrice,
                AdjustmentPercent: totalAdjustment,
                PricingLabel: primaryLabel,
                Factors: factors,
                ComputedAt: DateTime.UtcNow);
        }

        public async Task<DynamicPriceDto?> GetProductPricingAsync(int productId)
        {
            try
            {
                var p = await _uow.Products.Query()
                    .Where(x => x.Id == productId && x.IsActive)
                    .Select(x => new
                    {
                        x.Id, x.Price, x.StockQuantity,
                        x.ReviewCount, x.Rating, x.HarvestDate,
                        CategoryName = x.Category != null ? x.Category.Name : null
                    })
                    .FirstOrDefaultAsync();

                if (p == null) return null;

                return ComputePrice(p.Id, p.Price, p.StockQuantity,
                    p.ReviewCount, p.Rating, p.CategoryName, p.HarvestDate);
            }
            catch { return null; }
        }

        // Returns true when current month falls within the seasonal peak for the category
        private static bool IsInSeason(string? categoryName, DateTime? harvestDate)
        {
            if (string.IsNullOrWhiteSpace(categoryName)) return false;

            var month = (harvestDate ?? DateTime.UtcNow).Month;
            var lowerName = categoryName.ToLowerInvariant();

            foreach (var (keywords, start, end) in _seasonalRules)
            {
                bool nameMatch = keywords.Any(k => lowerName.Contains(k));
                if (!nameMatch) continue;

                bool inRange = start <= end
                    ? month >= start && month <= end          // e.g. Apr–Aug (no year wrap)
                    : month >= start || month <= end;         // e.g. Oct–Feb (wraps year)

                if (inRange) return true;
            }
            return false;
        }
    }

    // ── Product Bundle Service ────────────────────────────────────────────────
    public class ProductBundleService : IProductBundleService
    {
        private readonly IUnitOfWork _uow;
        public ProductBundleService(IUnitOfWork uow) => _uow = uow;

        public async Task<List<BundleDto>> GetAllAsync()
        {
            var bundles = await _uow.ProductBundles.Query()
                .Include(b => b.Items).ThenInclude(i => i.Product)
                .Where(b => b.IsActive)
                .OrderByDescending(b => b.CreatedAt)
                .ToListAsync();
            return bundles.Select(ToDto).ToList();
        }

        public async Task<BundleDto?> GetBySlugAsync(string slug)
        {
            var b = await _uow.ProductBundles.Query()
                .Include(b => b.Items).ThenInclude(i => i.Product)
                .FirstOrDefaultAsync(b => b.Slug == slug && b.IsActive);
            return b == null ? null : ToDto(b);
        }

        public async Task<BundleDto?> GetByIdAsync(int id)
        {
            var b = await _uow.ProductBundles.Query()
                .Include(b => b.Items).ThenInclude(i => i.Product)
                .FirstOrDefaultAsync(b => b.Id == id);
            return b == null ? null : ToDto(b);
        }

        public async Task<BundleDto?> CreateAsync(CreateBundleRequest req)
        {
            var slug = req.Name.ToLowerInvariant()
                .Replace(" ", "-")
                .Replace("&", "and")
                .Replace("'", "");
            slug = System.Text.RegularExpressions.Regex.Replace(slug, @"[^a-z0-9\-]", "");
            if (await _uow.ProductBundles.ExistsAsync(b => b.Slug == slug))
                slug = $"{slug}-{DateTimeOffset.UtcNow.ToUnixTimeSeconds()}";

            var bundle = new ProductBundle
            {
                Name = req.Name,
                Slug = slug,
                Description = req.Description,
                ImageUrl = req.ImageUrl,
                DiscountPercent = req.DiscountPercent,
                IsActive = true
            };
            await _uow.ProductBundles.AddAsync(bundle);
            await _uow.SaveChangesAsync();

            foreach (var item in req.Items)
            {
                await _uow.BundleItems.AddAsync(new BundleItem
                {
                    BundleId = bundle.Id,
                    ProductId = item.ProductId,
                    Quantity = item.Quantity
                });
            }
            await _uow.SaveChangesAsync();
            return await GetByIdAsync(bundle.Id);
        }

        public async Task<bool> DeleteAsync(int id)
        {
            var b = await _uow.ProductBundles.GetByIdAsync(id);
            if (b == null) return false;
            await _uow.ProductBundles.DeleteAsync(b);
            await _uow.SaveChangesAsync();
            return true;
        }

        public async Task<bool> ToggleActiveAsync(int id, bool isActive)
        {
            var b = await _uow.ProductBundles.GetByIdAsync(id);
            if (b == null) return false;
            b.IsActive = isActive;
            b.UpdatedAt = DateTime.UtcNow;
            await _uow.ProductBundles.UpdateAsync(b);
            await _uow.SaveChangesAsync();
            return true;
        }

        private static BundleDto ToDto(ProductBundle b)
        {
            var items = b.Items.Select(i => new BundleItemDto(
                i.ProductId,
                i.Product?.Name ?? "",
                i.Product?.ImageUrl,
                i.Product?.Price ?? 0,
                i.Product?.Unit ?? "kg",
                i.Quantity)).ToList();

            var originalTotal = items.Sum(i => i.Price * i.Quantity);
            var bundlePrice = b.DiscountPercent > 0
                ? Math.Round(originalTotal * (1 - b.DiscountPercent / 100), 2)
                : originalTotal;

            return new BundleDto(b.Id, b.Name, b.Slug, b.Description, b.ImageUrl,
                b.DiscountPercent, originalTotal, bundlePrice, b.IsActive, items);
        }
    }

    // ── Price Alert Service ───────────────────────────────────────────────────
    public class PriceAlertService : IPriceAlertService
    {
        private readonly IUnitOfWork _uow;
        private readonly INotificationService _notifications;
        public PriceAlertService(IUnitOfWork uow, INotificationService notifications)
        {
            _uow = uow;
            _notifications = notifications;
        }

        public async Task<List<PriceAlertDto>> GetUserAlertsAsync(int userId)
        {
            return await _uow.PriceDropAlerts.Query()
                .Include(a => a.Product)
                .Where(a => a.UserId == userId)
                .OrderByDescending(a => a.CreatedAt)
                .Select(a => new PriceAlertDto(
                    a.Id, a.ProductId, a.Product.Name, a.Product.ImageUrl,
                    a.Product.Price, a.TargetPrice, a.IsTriggered, a.CreatedAt))
                .ToListAsync();
        }

        public async Task<PriceAlertDto?> SetAlertAsync(int userId, CreatePriceAlertRequest req)
        {
            var product = await _uow.Products.GetByIdAsync(req.ProductId);
            if (product == null || !product.IsActive) return null;

            // Upsert: update if already exists
            var existing = await _uow.PriceDropAlerts.FirstOrDefaultAsync(
                a => a.UserId == userId && a.ProductId == req.ProductId);

            if (existing != null)
            {
                existing.TargetPrice = req.TargetPrice;
                existing.IsTriggered = false;
                existing.TriggeredAt = null;
                existing.UpdatedAt = DateTime.UtcNow;
                await _uow.PriceDropAlerts.UpdateAsync(existing);
            }
            else
            {
                existing = new PriceDropAlert
                {
                    UserId = userId,
                    ProductId = req.ProductId,
                    TargetPrice = req.TargetPrice
                };
                await _uow.PriceDropAlerts.AddAsync(existing);
            }
            await _uow.SaveChangesAsync();

            return new PriceAlertDto(existing.Id, product.Id, product.Name, product.ImageUrl,
                product.Price, req.TargetPrice, false, existing.CreatedAt);
        }

        public async Task<bool> DeleteAlertAsync(int userId, int productId)
        {
            var alert = await _uow.PriceDropAlerts.FirstOrDefaultAsync(
                a => a.UserId == userId && a.ProductId == productId);
            if (alert == null) return false;
            await _uow.PriceDropAlerts.DeleteAsync(alert);
            await _uow.SaveChangesAsync();
            return true;
        }

        public async Task<int> CheckAndTriggerAlertsAsync()
        {
            var untriggered = await _uow.PriceDropAlerts.Query()
                .Include(a => a.Product)
                .Where(a => !a.IsTriggered && a.Product.IsActive)
                .ToListAsync();

            int count = 0;
            foreach (var alert in untriggered)
            {
                if (alert.Product.Price <= alert.TargetPrice)
                {
                    alert.IsTriggered = true;
                    alert.TriggeredAt = DateTime.UtcNow;
                    await _uow.PriceDropAlerts.UpdateAsync(alert);
                    await _notifications.SendAsync(
                        alert.UserId,
                        "🎉 Price Drop Alert!",
                        $"{alert.Product.Name} is now ₹{alert.Product.Price} — your target was ₹{alert.TargetPrice}!",
                        "promo",
                        $"/products/{alert.Product.Slug}");
                    count++;
                }
            }
            if (count > 0) await _uow.SaveChangesAsync();
            return count;
        }
    }

    // ── Subscription Service ───────────────────────────────────────────────────
    public class SubscriptionService : ISubscriptionService
    {
        private readonly IUnitOfWork _uow;
        private readonly INotificationService _notifications;

        public SubscriptionService(IUnitOfWork uow, INotificationService notifications)
        {
            _uow = uow;
            _notifications = notifications;
        }

        public async Task<List<SubscriptionDto>> GetUserSubscriptionsAsync(int userId)
        {
            var subs = await _uow.Subscriptions.Query()
                .Include(s => s.Address)
                .Include(s => s.Items).ThenInclude(i => i.Product)
                .Where(s => s.UserId == userId)
                .OrderByDescending(s => s.CreatedAt)
                .ToListAsync();
            return subs.Select(ToDto).ToList();
        }

        public async Task<SubscriptionDto?> GetByIdAsync(int subscriptionId, int userId)
        {
            var sub = await _uow.Subscriptions.Query()
                .Include(s => s.Address)
                .Include(s => s.Items).ThenInclude(i => i.Product)
                .FirstOrDefaultAsync(s => s.Id == subscriptionId && s.UserId == userId);
            return sub == null ? null : ToDto(sub);
        }

        public async Task<SubscriptionDto?> CreateAsync(int userId, CreateSubscriptionRequest req)
        {
            var address = await _uow.Addresses.FirstOrDefaultAsync(a => a.Id == req.AddressId && a.UserId == userId);
            if (address == null) return null;

            var nextDelivery = req.Frequency == "weekly"
                ? DateTime.UtcNow.AddDays(7)
                : DateTime.UtcNow.AddDays(30);

            var sub = new Subscription
            {
                UserId = userId,
                AddressId = req.AddressId,
                BoxType = req.BoxType,
                Frequency = req.Frequency,
                Status = "active",
                StartDate = DateTime.UtcNow,
                NextDeliveryDate = nextDelivery,
                Notes = req.Notes
            };

            if (req.Items != null && req.Items.Count > 0)
            {
                var productIds = req.Items.Select(i => i.ProductId).ToList();
                var products = await _uow.Products.Query()
                    .Where(p => productIds.Contains(p.Id)).ToListAsync();

                sub.Items = req.Items.Select(i =>
                {
                    var p = products.FirstOrDefault(pr => pr.Id == i.ProductId);
                    return new SubscriptionItem
                    {
                        ProductId = i.ProductId,
                        Quantity = i.Quantity
                    };
                }).ToList();

                sub.Price = products.Sum(p =>
                {
                    var qty = req.Items.FirstOrDefault(i => i.ProductId == p.Id)?.Quantity ?? 1;
                    return p.Price * qty;
                });
            }

            await _uow.Subscriptions.AddAsync(sub);
            await _uow.SaveChangesAsync();

            try
            {
                await _notifications.SendAsync(userId, "Subscription Created! 🌿",
                    $"Your {sub.Frequency} {sub.BoxType} box subscription is active. Next delivery: {sub.NextDeliveryDate:dd MMM yyyy}.", "system");
            }
            catch { }

            return await GetByIdAsync(sub.Id, userId);
        }

        public async Task<SubscriptionDto?> UpdateAsync(int subscriptionId, int userId, UpdateSubscriptionRequest req)
        {
            var sub = await _uow.Subscriptions.Query()
                .Include(s => s.Items)
                .FirstOrDefaultAsync(s => s.Id == subscriptionId && s.UserId == userId);
            if (sub == null || sub.Status == "cancelled") return null;

            if (req.AddressId.HasValue) sub.AddressId = req.AddressId.Value;
            if (req.Notes != null) sub.Notes = req.Notes;

            if (req.Items != null && req.Items.Count > 0)
            {
                foreach (var old in sub.Items.ToList())
                    await _uow.SubscriptionItems.DeleteAsync(old);

                var productIds = req.Items.Select(i => i.ProductId).ToList();
                var products = await _uow.Products.Query()
                    .Where(p => productIds.Contains(p.Id)).ToListAsync();

                sub.Items = req.Items.Select(i => new SubscriptionItem
                {
                    SubscriptionId = subscriptionId,
                    ProductId = i.ProductId,
                    Quantity = i.Quantity
                }).ToList();

                sub.Price = products.Sum(p =>
                {
                    var qty = req.Items.FirstOrDefault(i => i.ProductId == p.Id)?.Quantity ?? 1;
                    return p.Price * qty;
                });
            }

            sub.UpdatedAt = DateTime.UtcNow;
            await _uow.Subscriptions.UpdateAsync(sub);
            await _uow.SaveChangesAsync();
            return await GetByIdAsync(subscriptionId, userId);
        }

        public async Task<bool> PauseResumeAsync(int subscriptionId, int userId, bool pause)
        {
            var sub = await _uow.Subscriptions.FirstOrDefaultAsync(
                s => s.Id == subscriptionId && s.UserId == userId && s.Status != "cancelled");
            if (sub == null) return false;

            sub.Status = pause ? "paused" : "active";
            sub.PausedAt = pause ? DateTime.UtcNow : null;
            if (!pause)
            {
                sub.NextDeliveryDate = sub.Frequency == "weekly"
                    ? DateTime.UtcNow.AddDays(7)
                    : DateTime.UtcNow.AddDays(30);
            }
            sub.UpdatedAt = DateTime.UtcNow;
            await _uow.Subscriptions.UpdateAsync(sub);
            await _uow.SaveChangesAsync();

            try
            {
                var msg = pause ? "Your subscription has been paused." : "Your subscription has been resumed. 🌿";
                await _notifications.SendAsync(userId, pause ? "Subscription Paused" : "Subscription Resumed!", msg, "system");
            }
            catch { }

            return true;
        }

        public async Task<bool> CancelAsync(int subscriptionId, int userId)
        {
            var sub = await _uow.Subscriptions.FirstOrDefaultAsync(
                s => s.Id == subscriptionId && s.UserId == userId && s.Status != "cancelled");
            if (sub == null) return false;

            sub.Status = "cancelled";
            sub.EndDate = DateTime.UtcNow;
            sub.UpdatedAt = DateTime.UtcNow;
            await _uow.Subscriptions.UpdateAsync(sub);
            await _uow.SaveChangesAsync();
            return true;
        }

        public async Task<List<SubscriptionDto>> GetAllAsync(int page, int pageSize)
        {
            var subs = await _uow.Subscriptions.Query()
                .Include(s => s.Address)
                .Include(s => s.Items).ThenInclude(i => i.Product)
                .OrderByDescending(s => s.CreatedAt)
                .Skip((page - 1) * pageSize).Take(pageSize)
                .ToListAsync();
            return subs.Select(ToDto).ToList();
        }

        public async Task<int> ProcessDueSubscriptionsAsync()
        {
            var due = await _uow.Subscriptions.Query()
                .Include(s => s.Items).ThenInclude(i => i.Product)
                .Where(s => s.Status == "active" && s.NextDeliveryDate <= DateTime.UtcNow)
                .ToListAsync();

            foreach (var sub in due)
            {
                sub.NextDeliveryDate = sub.Frequency == "weekly"
                    ? sub.NextDeliveryDate.AddDays(7)
                    : sub.NextDeliveryDate.AddMonths(1);
                sub.UpdatedAt = DateTime.UtcNow;
                await _uow.Subscriptions.UpdateAsync(sub);

                try
                {
                    await _notifications.SendAsync(sub.UserId, "Subscription Box Dispatched! 📦",
                        $"Your {sub.Frequency} box is on the way! Next delivery: {sub.NextDeliveryDate:dd MMM yyyy}.", "order");
                }
                catch { }
            }

            await _uow.SaveChangesAsync();
            return due.Count;
        }

        private static SubscriptionDto ToDto(Subscription s) => new(
            s.Id, s.BoxType, s.Frequency, s.Status, s.Price,
            s.StartDate, s.EndDate, s.NextDeliveryDate, s.Notes, s.CreatedAt,
            new AddressDto(s.Address.Id, s.Address.Label, s.Address.FullName, s.Address.Phone,
                s.Address.Street, s.Address.City, s.Address.State, s.Address.PinCode, s.Address.IsDefault),
            s.Items.Select(i => new SubscriptionItemDto(
                i.ProductId, i.Product?.Name ?? "", i.Product?.ImageUrl,
                i.Quantity, i.Product?.Unit ?? "kg", i.Product?.Price ?? 0)).ToList());
    }

    // ── Order Service ─────────────────────────────────────────────────────────
    public class OrderService : IOrderService
    {
        private readonly IUnitOfWork _uow;
        private readonly INotificationService _notifications;
        private readonly IEmailService _email;
        private readonly ICacheService _cache;
        private readonly Microsoft.Extensions.Configuration.IConfiguration _config;
        private readonly IReferralService _referral;

        public OrderService(
            IUnitOfWork uow,
            INotificationService notifications,
            IEmailService email,
            ICacheService cache,
            Microsoft.Extensions.Configuration.IConfiguration config,
            IReferralService referral)
        {
            _uow = uow;
            _notifications = notifications;
            _email = email;
            _cache = cache;
            _config = config;
            _referral = referral;
        }

        public async Task<OrderDetailDto?> PlaceOrderAsync(int userId, PlaceOrderRequest req)
        {
            var cart = await _uow.Carts.Query()
                .Include(c => c.Items).ThenInclude(i => i.Product)
                .FirstOrDefaultAsync(c => c.UserId == userId);

            if (cart == null || !cart.Items.Any()) return null;

            var address = await _uow.Addresses.FirstOrDefaultAsync(a => a.Id == req.AddressId && a.UserId == userId);
            if (address == null) return null;

            var user = await _uow.Users.GetByIdAsync(userId);
            if (user == null) return null;

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
                Status = "pending",
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
            await _uow.OrderStatusHistories.AddAsync(new OrderStatusHistory
            {
                Order = order,
                Status = "pending",
                Note = "Order placed",
                UpdatedByUserId = userId
            });

            foreach (var item in cart.Items)
            {
                item.Product.StockQuantity -= (int)item.Quantity;
                await _uow.Products.UpdateAsync(item.Product);
                await _uow.CartItems.DeleteAsync(item);
            }

            await _uow.SaveChangesAsync();

            try
            {
                await _notifications.SendAsync(userId, "Order Placed! 🎉",
                    $"Order #{order.OrderNumber} confirmed. Expected delivery in 3 days.", "order");
            }
            catch
            {
            }

            try
            {
                var emailOrder = await LoadOrderForNotificationsAsync(order.Id);
                if (emailOrder != null)
                    await SendOrderPlacementEmailsAsync(emailOrder);
            }
            catch
            {
            }

            try
            {
                await _referral.AwardCreditsOnFirstOrderAsync(userId, order.Id);
            }
            catch
            {
            }

            return await GetByIdAsync(order.Id, userId, "user");
        }

        public async Task<PagedResult<OrderListDto>> GetUserOrdersAsync(int userId, int page, int pageSize)
        {
            var query = _uow.Orders.Query()
                .Include(o => o.Items)
                .Include(o => o.Address)
                .Where(o => o.UserId == userId)
                .OrderByDescending(o => o.CreatedAt);

            var total = await query.CountAsync();
            var items = await query.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();

            return new PagedResult<OrderListDto>(items.Select(ToListDto).ToList(), total, page, pageSize,
                (int)Math.Ceiling((double)total / pageSize));
        }

        public async Task<PagedResult<OrderDetailDto>> GetSellerOrdersAsync(int sellerUserId, int page, int pageSize, string? status)
        {
            var farmerProfile = await _uow.FarmerProfiles.FirstOrDefaultAsync(f => f.UserId == sellerUserId);
            if (farmerProfile == null)
                return new PagedResult<OrderDetailDto>(new List<OrderDetailDto>(), 0, page, pageSize, 0);

            var query = _uow.Orders.Query()
                .Include(o => o.User)
                .Include(o => o.Address)
                .Include(o => o.Items).ThenInclude(i => i.Product)
                .Include(o => o.StatusHistory)
                .Where(o => o.Items.Any(i => i.Product.FarmerId == farmerProfile.Id));

            if (!string.IsNullOrWhiteSpace(status))
                query = query.Where(o => o.Status == status);

            query = query.OrderByDescending(o => o.CreatedAt);
            var total = await query.CountAsync();
            var orders = await query.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();

            var items = orders.Select(o => ToSellerDetailDto(o, farmerProfile.Id)).ToList();
            return new PagedResult<OrderDetailDto>(items, total, page, pageSize, (int)Math.Ceiling((double)total / pageSize));
        }

        public async Task<OrderDetailDto?> GetByIdAsync(int orderId, int userId, string role)
        {
            var query = _uow.Orders.Query()
                .Include(o => o.User)
                .Include(o => o.Address)
                .Include(o => o.Items).ThenInclude(i => i.Product)
                .Include(o => o.StatusHistory);

            if (role == "admin")
            {
                var adminOrder = await query.FirstOrDefaultAsync(o => o.Id == orderId);
                return adminOrder == null ? null : ToDetailDto(adminOrder);
            }

            if (role == "farmer")
            {
                var farmerProfile = await _uow.FarmerProfiles.FirstOrDefaultAsync(f => f.UserId == userId);
                if (farmerProfile == null) return null;
                var farmerOrder = await query.FirstOrDefaultAsync(o => o.Id == orderId && o.Items.Any(i => i.Product.FarmerId == farmerProfile.Id));
                return farmerOrder == null ? null : ToSellerDetailDto(farmerOrder, farmerProfile.Id);
            }

            var userOrder = await query.FirstOrDefaultAsync(o => o.Id == orderId && o.UserId == userId);
            return userOrder == null ? null : ToDetailDto(userOrder);
        }

        public async Task<bool> UpdateStatusAsync(int orderId, string status, string? note, int updatedBy)
        {
            var order = await _uow.Orders.Query()
                .Include(o => o.Items).ThenInclude(i => i.Product)
                .FirstOrDefaultAsync(o => o.Id == orderId);
            if (order == null) return false;

            var updater = await _uow.Users.GetByIdAsync(updatedBy);
            if (updater == null) return false;

            if (updater.Role == "farmer")
            {
                var farmerProfile = await _uow.FarmerProfiles.FirstOrDefaultAsync(f => f.UserId == updatedBy);
                if (farmerProfile == null || !order.Items.Any(i => i.Product.FarmerId == farmerProfile.Id))
                    return false;
            }
            else if (updater.Role != "admin")
            {
                return false;
            }

            var normalizedStatus = NormalizeOrderStatus(status);
            if (normalizedStatus == null) return false;
            if (!CanTransition(order.Status, normalizedStatus)) return false;

            order.Status = normalizedStatus;
            if (normalizedStatus == "delivered")
            {
                order.DeliveredAt = DateTime.UtcNow;
                order.PaymentStatus = "paid";
            }

            await _uow.Orders.UpdateAsync(order);
            await _uow.OrderStatusHistories.AddAsync(new OrderStatusHistory
            {
                OrderId = orderId,
                Status = normalizedStatus,
                Note = note,
                UpdatedByUserId = updatedBy
            });
            await _uow.SaveChangesAsync();
            await _cache.DeleteAsync(GetReminderCacheKey(orderId));
            await _notifications.SendAsync(order.UserId, "Order Update",
                $"Your order #{order.OrderNumber} is now {normalizedStatus}.", "order");
            return true;
        }

        public async Task<bool> CancelAsync(int orderId, int userId)
        {
            var order = await _uow.Orders.Query()
                .Include(o => o.Items).ThenInclude(i => i.Product)
                .Include(o => o.User)
                .Include(o => o.Address)
                .FirstOrDefaultAsync(o => o.Id == orderId);
            if (order == null || order.UserId != userId) return false;
            if (order.Status is "shipped" or "delivered" or "cancelled") return false;
            if (DateTime.UtcNow > order.CreatedAt.AddMinutes(5)) return false;

            order.Status = "cancelled";
            await _uow.Orders.UpdateAsync(order);
            await _uow.OrderStatusHistories.AddAsync(new OrderStatusHistory
            {
                OrderId = orderId,
                Status = "cancelled",
                Note = "Cancelled by user",
                UpdatedByUserId = userId
            });
            await _uow.SaveChangesAsync();
            await _cache.DeleteAsync(GetReminderCacheKey(orderId));
            await _notifications.SendAsync(userId, "Order Cancelled",
                $"Your order #{order.OrderNumber} has been cancelled.", "order");

            var fullOrder = await LoadOrderForNotificationsAsync(orderId);
            if (fullOrder != null)
                await SendOrderCancellationEmailsAsync(fullOrder);

            return true;
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
            var query = _uow.Orders.Query().Include(o => o.Items).Include(o => o.Address).AsQueryable();
            if (!string.IsNullOrEmpty(status)) query = query.Where(o => o.Status == status);
            query = query.OrderByDescending(o => o.CreatedAt);
            var total = await query.CountAsync();
            var items = await query.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();
            return new PagedResult<OrderListDto>(items.Select(ToListDto).ToList(), total, page, pageSize,
                (int)Math.Ceiling((double)total / pageSize));
        }

        private async Task<Order?> LoadOrderForNotificationsAsync(int orderId)
        {
            return await _uow.Orders.Query()
                .Include(o => o.User)
                .Include(o => o.Address)
                .Include(o => o.Items)
                    .ThenInclude(i => i.Product)
                        .ThenInclude(p => p.Farmer)
                            .ThenInclude(f => f.User)
                .FirstOrDefaultAsync(o => o.Id == orderId);
        }

        private async Task SendOrderPlacementEmailsAsync(Order order)
        {
            await SendCustomerOrderEmailAsync(order, "Order Confirmed! 🎉", "CONFIRMED",
                "Thank you for your purchase. Your order has been placed successfully and is now being prepared.");
            await SendAdminOrderEmailsAsync(order, "New Order Received 🛒", "NEW ORDER",
                "A new order has been placed on Graamo. Review the complete order details below.");
            await SendSellerOrderEmailsAsync(order, "New Seller Order to Fulfill 📦", "SELLER ALERT",
                "A new order containing your products has been placed. Please review the items below and start fulfillment.", false);
        }

        private async Task SendOrderCancellationEmailsAsync(Order order)
        {
            await SendAdminOrderEmailsAsync(order, "Order Cancelled by Customer", "CANCELLED",
                "A customer has cancelled this order within the allowed cancellation window.");
            await SendSellerOrderEmailsAsync(order, "Order Cancelled - Stop Fulfillment", "CANCELLED",
                "This order has been cancelled by the customer. Please do not process or dispatch the items below.", false);
        }

        private async Task SendPendingOrderReminderEmailsAsync(Order order)
        {
            await SendAdminOrderEmailsAsync(order, "Order Action Reminder ⏰", "REMINDER",
                "No action has been taken on this order for 15 minutes. Please review and update the order status.", true);
            await SendSellerOrderEmailsAsync(order, "Seller Order Reminder ⏰", "REMINDER",
                "This order is still pending. Please review your items and take action as soon as possible.", true);
        }

        private async Task SendCustomerOrderEmailAsync(Order order, string heading, string badge, string intro)
        {
            if (string.IsNullOrWhiteSpace(order.User?.Email) || order.Address == null) return;
            var html = BuildOrderEmailHtml(order, order.Items.ToList(), heading, intro, badge, false, null, null);
            await _email.SendEmailAsync(order.User.Email, $"Order Confirmed - {order.OrderNumber}", html);
        }

        private async Task SendAdminOrderEmailsAsync(Order order, string heading, string badge, string intro, bool includeActionLink = false)
        {
            if (order.Address == null || order.User == null) return;
            var adminEmails = await _uow.Users.Query()
                .Where(u => u.Role == "admin" && u.IsActive && u.Email != null)
                .Select(u => u.Email!)
                .Distinct()
                .ToListAsync();

            if (adminEmails.Count == 0) return;

            var html = BuildOrderEmailHtml(
                order,
                order.Items.ToList(),
                heading,
                intro,
                badge,
                true,
                includeActionLink ? GetActionLink(order.Id, true) : null,
                includeActionLink ? "Review Order" : null);

            foreach (var adminEmail in adminEmails)
                await _email.SendEmailAsync(adminEmail, $"{heading} - {order.OrderNumber}", html);
        }

        private async Task SendSellerOrderEmailsAsync(Order order, string heading, string badge, string intro, bool includeActionLink)
        {
            if (order.Address == null || order.User == null) return;

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
                var sellerInfo = $"<div style='margin:20px 0;padding:18px;border:1px solid #dce5f0;border-radius:14px;background:#f8fbff'><div style='font-size:12px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:#4b6788;margin-bottom:10px'>Seller Details</div><div style='color:#17324d;font-size:14px;line-height:1.8'><div><strong>Seller:</strong> {group.Key.SellerName}</div><div><strong>Farm:</strong> {group.Key.FarmName}</div><div><strong>Customer:</strong> {order.User.Name}</div><div><strong>Customer Phone:</strong> {order.User.Phone ?? "N/A"}</div></div></div>";
                var html = BuildOrderEmailHtml(
                    order,
                    group.ToList(),
                    heading,
                    intro,
                    badge,
                    false,
                    includeActionLink ? GetActionLink(order.Id, false) : null,
                    includeActionLink ? "Open Order" : null,
                    sellerInfo);

                await _email.SendEmailAsync(group.Key.SellerEmail, $"{heading} - {order.OrderNumber}", html);
            }
        }

        private string BuildOrderEmailHtml(
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
        <div style='padding:18px 28px 26px;color:#a0aec0;font-size:12px;text-align:center;border-top:1px solid #edf2f7'>© 2026 Graamo · Order notification</div>
      </div>
    </div>
  </body>
</html>";
        }

        private string GetActionLink(int orderId, bool isAdmin)
        {
            var baseUrl = (_config["App:FrontendBaseUrl"] ?? _config["Frontend:BaseUrl"] ?? "http://localhost:3000").TrimEnd('/');
            return isAdmin ? $"{baseUrl}/admin/orders" : $"{baseUrl}/orders/{orderId}";
        }

        private static string? NormalizeOrderStatus(string status)
        {
            return status.Trim().ToLowerInvariant() switch
            {
                "accept" => "confirmed",
                "accepted" => "confirmed",
                "confirm" => "confirmed",
                "confirmed" => "confirmed",
                "process" => "processing",
                "processing" => "processing",
                "ship" => "shipped",
                "shipped" => "shipped",
                "deliver" => "delivered",
                "delivered" => "delivered",
                _ => null
            };
        }

        private static bool CanTransition(string currentStatus, string nextStatus)
        {
            currentStatus = currentStatus.Trim().ToLowerInvariant();
            nextStatus = nextStatus.Trim().ToLowerInvariant();
            return currentStatus switch
            {
                "pending" => nextStatus == "confirmed",
                "confirmed" => nextStatus == "processing",
                "processing" => nextStatus == "shipped",
                "shipped" => nextStatus == "delivered",
                _ => false
            };
        }

        private static string GetReminderCacheKey(int orderId) => $"order:reminder:last:{orderId}";

        private static OrderListDto ToListDto(Order o) => new(
            o.Id, o.OrderNumber, o.Status, o.PaymentStatus, o.TotalAmount,
            o.Items?.Count ?? 0, o.CreatedAt, o.EstimatedDelivery?.ToString("dd MMM yyyy"),
            o.Address?.FullName);

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

        private static OrderDetailDto ToSellerDetailDto(Order o, int farmerId)
        {
            var sellerItems = o.Items?
                .Where(i => i.Product?.FarmerId == farmerId)
                .Select(i => new OrderItemDto(
                    i.Id, i.ProductId, i.ProductName, i.Product?.ImageUrl,
                    i.Quantity, i.Unit, i.UnitPrice, i.TotalPrice))
                .ToList() ?? new List<OrderItemDto>();

            var sellerSubtotal = sellerItems.Sum(i => i.TotalPrice);

            return new OrderDetailDto(
                o.Id, o.OrderNumber, o.Status, o.PaymentStatus, o.PaymentMethod,
                sellerSubtotal, 0, 0, 0, sellerSubtotal,
                o.CouponCode, o.Notes, o.CreatedAt, o.EstimatedDelivery, o.DeliveredAt,
                new AddressDto(o.Address.Id, o.Address.Label, o.Address.FullName, o.Address.Phone,
                    o.Address.Street, o.Address.City, o.Address.State, o.Address.PinCode, o.Address.IsDefault),
                sellerItems,
                o.StatusHistory?.OrderBy(h => h.CreatedAt)
                    .Select(h => new OrderStatusHistoryDto(h.Id, h.Status, h.Note, h.CreatedAt)).ToList() ?? new());
        }
    }

    // ── Referral Service ──────────────────────────────────────────────────────
    public class ReferralService : IReferralService
    {
        private readonly IUnitOfWork _uow;
        private readonly INotificationService _notifications;
        private const decimal ReferrerReward = 50m;   // ₹50 credits for referrer

        public ReferralService(IUnitOfWork uow, INotificationService notifications)
        {
            _uow = uow;
            _notifications = notifications;
        }

        public async Task<ReferralCodeDto> GetOrCreateCodeAsync(int userId)
        {
            var existing = await _uow.ReferralCodes.FirstOrDefaultAsync(rc => rc.UserId == userId);
            if (existing != null)
                return ToDto(existing);

            var code = new ReferralCode
            {
                UserId = userId,
                Code = GenerateCode(userId),
                IsActive = true
            };
            await _uow.ReferralCodes.AddAsync(code);
            await _uow.SaveChangesAsync();
            return ToDto(code);
        }

        public async Task<bool> ApplyReferralCodeAsync(int newUserId, string code)
        {
            // User can only be referred once
            var alreadyReferred = await _uow.Referrals.ExistsAsync(r => r.ReferredUserId == newUserId);
            if (alreadyReferred) return false;

            var referralCode = await _uow.ReferralCodes.FirstOrDefaultAsync(rc =>
                rc.Code == code.Trim().ToUpper() && rc.IsActive);
            if (referralCode == null) return false;

            // Can't refer yourself
            if (referralCode.UserId == newUserId) return false;

            var referral = new Referral
            {
                ReferralCodeId = referralCode.Id,
                ReferrerId = referralCode.UserId,
                ReferredUserId = newUserId,
                Status = "pending"
            };

            referralCode.UsageCount++;
            await _uow.Referrals.AddAsync(referral);
            await _uow.ReferralCodes.UpdateAsync(referralCode);
            await _uow.SaveChangesAsync();
            return true;
        }

        public async Task<List<ReferralDto>> GetMyReferralsAsync(int userId)
        {
            var referrals = await _uow.Referrals.Query()
                .Include(r => r.ReferredUser)
                .Where(r => r.ReferrerId == userId)
                .OrderByDescending(r => r.CreatedAt)
                .ToListAsync();

            return referrals.Select(r => new ReferralDto(
                r.Id,
                r.ReferredUserId,
                r.ReferredUser?.Name ?? "User",
                r.Status,
                r.CreditsAwarded,
                r.CompletedAt,
                r.CreatedAt)).ToList();
        }

        public async Task<WalletSummaryDto> GetWalletAsync(int userId)
        {
            var credits = await _uow.WalletCredits.Query()
                .Where(w => w.UserId == userId)
                .OrderByDescending(w => w.CreatedAt)
                .ToListAsync();

            var earned = credits.Where(c => c.Type == "earned").Sum(c => c.Amount);
            var redeemed = credits.Where(c => c.Type == "redeemed").Sum(c => c.Amount);
            var balance = earned - redeemed;

            var recent = credits.Take(20).Select(c => new WalletCreditDto(
                c.Id, c.Amount, c.Type, c.Description, c.CreatedAt)).ToList();

            return new WalletSummaryDto(earned, redeemed, balance, recent);
        }

        public async Task AwardCreditsOnFirstOrderAsync(int userId, int orderId)
        {
            // Only award if this is the user's first order
            var orderCount = await _uow.Orders.Query()
                .Where(o => o.UserId == userId)
                .CountAsync();
            if (orderCount != 1) return;

            // Find pending referral where this user was referred
            var referral = await _uow.Referrals.Query()
                .FirstOrDefaultAsync(r => r.ReferredUserId == userId && r.Status == "pending");
            if (referral == null) return;

            // Award credits to referrer
            var credit = new WalletCredit
            {
                UserId = referral.ReferrerId,
                Amount = ReferrerReward,
                Type = "earned",
                Description = $"Referral reward — your friend placed their first order!",
                ReferralId = referral.Id
            };
            await _uow.WalletCredits.AddAsync(credit);

            referral.Status = "completed";
            referral.CreditsAwarded = ReferrerReward;
            referral.CompletedAt = DateTime.UtcNow;
            await _uow.Referrals.UpdateAsync(referral);
            await _uow.SaveChangesAsync();

            try
            {
                await _notifications.SendAsync(referral.ReferrerId,
                    "You earned ₹50 credits! 🎉",
                    "Your referred friend just placed their first order. ₹50 has been added to your wallet.",
                    "system");
            }
            catch { }
        }

        public async Task<bool> RedeemCreditsAsync(int userId, decimal amount, int orderId)
        {
            var wallet = await GetWalletAsync(userId);
            if (wallet.Balance < amount) return false;

            var credit = new WalletCredit
            {
                UserId = userId,
                Amount = amount,
                Type = "redeemed",
                Description = $"Redeemed on order #{orderId}"
            };
            await _uow.WalletCredits.AddAsync(credit);
            await _uow.SaveChangesAsync();
            return true;
        }

        private static ReferralCodeDto ToDto(ReferralCode rc) =>
            new(rc.Id, rc.Code, rc.UsageCount, rc.IsActive, rc.CreatedAt);

        private static string GenerateCode(int userId)
        {
            var chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
            var rng = new Random(userId + (int)(DateTime.UtcNow.Ticks % int.MaxValue));
            var suffix = new string(Enumerable.Range(0, 6).Select(_ => chars[rng.Next(chars.Length)]).ToArray());
            return $"VC{suffix}";
        }
    }
}
