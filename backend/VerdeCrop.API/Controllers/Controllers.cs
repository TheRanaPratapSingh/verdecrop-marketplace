using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Serilog;
using VerdeCrop.API.Security;
using VerdeCrop.Application.DTOs;
using VerdeCrop.Application.Interfaces;

namespace VerdeCrop.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Produces("application/json")]
    public abstract class BaseController : ControllerBase
    {
        protected int CurrentUserId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "0");
        protected string CurrentUserRole => User.FindFirstValue(ClaimTypes.Role) ?? "";
    }

    // ── Auth ──────────────────────────────────────────────────────────────────
    [Route("api/auth")]
    public class AuthController : BaseController
    {
        private readonly IAuthService _auth;
        public AuthController(IAuthService auth) { _auth = auth; }

        [HttpPost("send-otp")]
        [AllowAnonymous]
        public async Task<IActionResult> SendOtp([FromBody] SendOtpRequest req)
        {
            if (!ModelState.IsValid)
                return BadRequest(ApiResponse.Fail("Invalid request parameters."));

            // Prevent OTP spray: reject clearly invalid identifiers
            if (req.Identifier.Length > 200 || req.Identifier.Contains('<') || req.Identifier.Contains('>'))
                return BadRequest(ApiResponse.Fail("Invalid identifier."));

            try
            {
                var result = await _auth.SendOtpAsync(req);
                return result
                    ? Ok(ApiResponse.Ok(true, "OTP sent successfully"))
                    : BadRequest(ApiResponse.Fail("Failed to send OTP"));
            }
            catch (InvalidOperationException ex) when (ex.Message == "ALREADY_REGISTERED")
            {
                return Conflict(ApiResponse.Fail("ALREADY_REGISTERED"));
            }
            catch (Exception ex)
            {
                return StatusCode(429, ApiResponse.Fail(ex.Message));
            }
        }

        [HttpPost("verify-otp")]
        [AllowAnonymous]
        public async Task<IActionResult> VerifyOtp([FromBody] VerifyOtpRequest req)
        {
            if (!ModelState.IsValid)
                return BadRequest(ApiResponse.Fail("Invalid request parameters."));

            var result = await _auth.VerifyOtpAsync(req);
            if (result == null)
            {
                Log.Warning("Failed OTP verification for identifier {Identifier} from {IP}",
                    req.Identifier, HttpContext.Connection.RemoteIpAddress);
                return Unauthorized(ApiResponse.Fail("Invalid or expired OTP"));
            }
            return Ok(ApiResponse.Ok(result));
        }

        [HttpPost("refresh")]
        [AllowAnonymous]
        public async Task<IActionResult> Refresh([FromBody] RefreshTokenRequest req)
        {
            var result = await _auth.RefreshTokenAsync(req.Token);
            return result != null
                ? Ok(ApiResponse.Ok(result))
                : Unauthorized(ApiResponse.Fail("Invalid refresh token"));
        }

        [HttpPost("logout")]
        public async Task<IActionResult> Logout([FromBody] LogoutRequest req)
        {
            await _auth.LogoutAsync(req.RefreshToken);
            return Ok(ApiResponse.Ok(true));
        }

        [HttpPost("verify-otp-only")]
        [AllowAnonymous]
        public async Task<IActionResult> VerifyOtpOnly([FromBody] VerifyOtpOnlyRequest req)
        {
            if (!ModelState.IsValid)
                return BadRequest(ApiResponse.Fail("Invalid request parameters."));
            var result = await _auth.VerifyOtpOnlyAsync(req);
            return result
                ? Ok(ApiResponse.Ok(true, "OTP verified successfully"))
                : Unauthorized(ApiResponse.Fail("Invalid or expired OTP"));
        }

        [HttpPost("register")]
        [AllowAnonymous]
        public async Task<IActionResult> Register([FromBody] DualOtpRegisterRequest req)
        {
            if (!ModelState.IsValid)
                return BadRequest(ApiResponse.Fail("Invalid request parameters."));
            var result = await _auth.RegisterWithDualVerificationAsync(req);
            if (result == null)
                return BadRequest(ApiResponse.Fail("Both mobile and email must be verified before registration."));
            return Ok(ApiResponse.Ok(result));
        }
    }

    // ── Users ─────────────────────────────────────────────────────────────────
    [Route("api/users")]
    [Authorize]
    public class UsersController : BaseController
    {
        private readonly IUserService _users;
        private readonly IAddressService _addresses;
        public UsersController(IUserService users, IAddressService addresses) { _users = users; _addresses = addresses; }

        [HttpGet("me")]
        public async Task<IActionResult> GetMe()
        {
            var u = await _users.GetByIdAsync(CurrentUserId);
            return u == null ? NotFound() : Ok(ApiResponse.Ok(u));
        }

        [HttpPut("me")]
        public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileRequest req)
        {
            if (!ModelState.IsValid)
                return BadRequest(ApiResponse.Fail(string.Join("; ", ModelState.Values
                    .SelectMany(v => v.Errors).Select(e => e.ErrorMessage))));

            var u = await _users.UpdateProfileAsync(CurrentUserId, req);
            return Ok(ApiResponse.Ok(u));
        }

        [HttpPost("me/avatar")]
        public async Task<IActionResult> UploadAvatar(IFormFile file)
        {
            if (file == null || file.Length == 0)
                return BadRequest(ApiResponse.Fail("No file provided."));
            if (file.Length > 5 * 1024 * 1024)
                return BadRequest(ApiResponse.Fail("File size must not exceed 5 MB."));

            var allowed = new[] { "image/jpeg", "image/png", "image/webp" };
            if (!allowed.Contains(file.ContentType.ToLowerInvariant()))
                return BadRequest(ApiResponse.Fail("Only JPEG, PNG, and WebP images are allowed."));

            var url = await _users.UploadAvatarAsync(CurrentUserId, file.OpenReadStream(), file.FileName);
            return Ok(ApiResponse.Ok(new { url }));
        }

        [HttpPut("me/fcm-token")]
        public async Task<IActionResult> UpdateFcmToken([FromBody] UpdateFcmTokenRequest req)
        {
            await _users.UpdateFcmTokenAsync(CurrentUserId, req.Token);
            return Ok(ApiResponse.Ok(true));
        }

        [HttpGet("me/addresses")]
        public async Task<IActionResult> GetAddresses()
        {
            var addrs = await _addresses.GetUserAddressesAsync(CurrentUserId);
            return Ok(ApiResponse.Ok(addrs));
        }

        [HttpPost("me/addresses")]
        public async Task<IActionResult> CreateAddress([FromBody] CreateAddressRequest req)
        {
            var addr = await _addresses.CreateAsync(CurrentUserId, req);
            return Ok(ApiResponse.Ok(addr));
        }

        [HttpPut("me/addresses/{id}")]
        public async Task<IActionResult> UpdateAddress(int id, [FromBody] CreateAddressRequest req)
        {
            var addr = await _addresses.UpdateAsync(CurrentUserId, id, req);
            return addr == null ? NotFound() : Ok(ApiResponse.Ok(addr));
        }

        [HttpDelete("me/addresses/{id}")]
        public async Task<IActionResult> DeleteAddress(int id)
        {
            await _addresses.DeleteAsync(CurrentUserId, id);
            return Ok(ApiResponse.Ok(true));
        }

        [HttpPut("me/addresses/{id}/default")]
        public async Task<IActionResult> SetDefault(int id)
        {
            await _addresses.SetDefaultAsync(CurrentUserId, id);
            return Ok(ApiResponse.Ok(true));
        }

        [HttpGet]
        [Authorize(Roles = "admin")]
        public async Task<IActionResult> GetAll([FromQuery] int page = 1, [FromQuery] int pageSize = 20, [FromQuery] string? search = null)
        {
            var result = await _users.GetAllAsync(
                InputValidator.ClampPage(page),
                InputValidator.ClampPageSize(pageSize, 50),
                search);
            return Ok(ApiResponse.Ok(result));
        }

        [HttpPut("{id}/active")]
        [Authorize(Roles = "admin")]
        public async Task<IActionResult> SetActive(int id, [FromBody] bool isActive)
        {
            await _users.SetActiveAsync(id, isActive);
            return Ok(ApiResponse.Ok(true));
        }
    }

    // ── Wishlist ──────────────────────────────────────────────────────────────
    [Route("api/wishlist")]
    [Authorize]
    public class WishlistController : BaseController
    {        private readonly IWishlistService _wishlist;
        public WishlistController(IWishlistService wishlist) { _wishlist = wishlist; }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var items = await _wishlist.GetWishlistAsync(CurrentUserId);
            return Ok(ApiResponse.Ok(items));
        }

        [HttpPost("{productId:int}")]
        public async Task<IActionResult> Add(int productId)
        {
            var result = await _wishlist.AddAsync(CurrentUserId, productId);
            return result ? Ok(ApiResponse.Ok(true)) : BadRequest(ApiResponse.Fail("Unable to add to wishlist"));
        }

        [HttpDelete("{productId:int}")]
        public async Task<IActionResult> Remove(int productId)
        {
            var result = await _wishlist.RemoveAsync(CurrentUserId, productId);
            return result ? Ok(ApiResponse.Ok(true)) : NotFound(ApiResponse.Fail("Wishlist item not found"));
        }
    }

    // ── Bundles ───────────────────────────────────────────────────────────────
    [Route("api/bundles")]
    public class BundlesController : BaseController
    {
        private readonly IProductBundleService _bundles;
        public BundlesController(IProductBundleService bundles) { _bundles = bundles; }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var result = await _bundles.GetAllAsync();
            return Ok(ApiResponse.Ok(result));
        }

        [HttpGet("{slug}")]
        public async Task<IActionResult> GetBySlug(string slug)
        {
            var result = await _bundles.GetBySlugAsync(slug);
            return result == null ? NotFound(ApiResponse.Fail("Bundle not found")) : Ok(ApiResponse.Ok(result));
        }

        [HttpPost]
        [Authorize(Roles = "admin")]
        public async Task<IActionResult> Create([FromBody] CreateBundleRequest req)
        {
            if (!ModelState.IsValid)
                return BadRequest(ApiResponse.Fail(string.Join("; ", ModelState.Values
                    .SelectMany(v => v.Errors).Select(e => e.ErrorMessage))));
            var result = await _bundles.CreateAsync(req);
            return result == null ? BadRequest(ApiResponse.Fail("Failed to create bundle")) : Ok(ApiResponse.Ok(result, "Bundle created"));
        }

        [HttpDelete("{id:int}")]
        [Authorize(Roles = "admin")]
        public async Task<IActionResult> Delete(int id)
        {
            var result = await _bundles.DeleteAsync(id);
            return result ? Ok(ApiResponse.Ok(true, "Bundle deleted")) : NotFound(ApiResponse.Fail("Bundle not found"));
        }

        [HttpPut("{id:int}/toggle")]
        [Authorize(Roles = "admin")]
        public async Task<IActionResult> Toggle(int id, [FromBody] bool isActive)
        {
            var result = await _bundles.ToggleActiveAsync(id, isActive);
            return result ? Ok(ApiResponse.Ok(true)) : NotFound(ApiResponse.Fail("Bundle not found"));
        }
    }

    // ── Price Alerts ──────────────────────────────────────────────────────────
    [Route("api/price-alerts")]
    [Authorize]
    public class PriceAlertsController : BaseController
    {
        private readonly IPriceAlertService _alerts;
        public PriceAlertsController(IPriceAlertService alerts) { _alerts = alerts; }

        [HttpGet]
        public async Task<IActionResult> GetMyAlerts()
        {
            var result = await _alerts.GetUserAlertsAsync(CurrentUserId);
            return Ok(ApiResponse.Ok(result));
        }

        [HttpPost]
        public async Task<IActionResult> SetAlert([FromBody] CreatePriceAlertRequest req)
        {
            if (!ModelState.IsValid)
                return BadRequest(ApiResponse.Fail(string.Join("; ", ModelState.Values
                    .SelectMany(v => v.Errors).Select(e => e.ErrorMessage))));
            var result = await _alerts.SetAlertAsync(CurrentUserId, req);
            return result == null
                ? BadRequest(ApiResponse.Fail("Product not found or unavailable"))
                : Ok(ApiResponse.Ok(result, "Price alert set"));
        }

        [HttpDelete("{productId:int}")]
        public async Task<IActionResult> DeleteAlert(int productId)
        {
            var result = await _alerts.DeleteAlertAsync(CurrentUserId, productId);
            return result ? Ok(ApiResponse.Ok(true, "Alert removed")) : NotFound(ApiResponse.Fail("Alert not found"));
        }

        [HttpPost("check")]
        [Authorize(Roles = "admin")]
        public async Task<IActionResult> TriggerCheck()
        {
            var count = await _alerts.CheckAndTriggerAlertsAsync();
            return Ok(ApiResponse.Ok(count, $"{count} alert(s) triggered"));
        }
    }

    // ── Categories ────────────────────────────────────────────────────────────
    [Route("api/categories")]
    public class CategoriesController : BaseController
    {
        private readonly ICategoryService _categories;
        public CategoriesController(ICategoryService categories) { _categories = categories; }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var cats = await _categories.GetAllAsync();
            return Ok(ApiResponse.Ok(cats));
        }

        [HttpGet("id/{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var cat = await _categories.GetByIdAsync(id);
            return cat == null ? NotFound() : Ok(ApiResponse.Ok(cat));
        }

        [HttpGet("{slug}")]
        public async Task<IActionResult> GetBySlug(string slug)
        {
            if (!InputValidator.IsValidSlug(slug))
                return BadRequest(ApiResponse.Fail("Invalid category slug."));

            var cat = await _categories.GetBySlugAsync(slug);
            return cat == null ? NotFound() : Ok(ApiResponse.Ok(cat));
        }

        [HttpPost]
        [Authorize(Roles = "admin")]
        public async Task<IActionResult> Create([FromBody] CreateCategoryRequest req)
        {
            if (!ModelState.IsValid)
                return BadRequest(ApiResponse.Fail(string.Join("; ", ModelState.Values
                    .SelectMany(v => v.Errors).Select(e => e.ErrorMessage))));
            var cat = await _categories.CreateAsync(req);
            return Ok(ApiResponse.Ok(cat, "Category created"));
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "admin")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateCategoryRequest req)
        {
            var cat = await _categories.UpdateAsync(id, req);
            return cat == null ? NotFound() : Ok(ApiResponse.Ok(cat, "Category updated"));
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "admin")]
        public async Task<IActionResult> Delete(int id)
        {
            var success = await _categories.DeleteAsync(id);
            return success ? Ok(ApiResponse.Ok(true, "Category deleted")) : NotFound(ApiResponse.Fail("Category not found"));
        }
    }

    // ── Farmers ───────────────────────────────────────────────────────────────
    [Route("api/farmers")]
    public class FarmersController : BaseController
    {
        private readonly IFarmerService _farmers;
        private readonly IUserService _users;
        public FarmersController(IFarmerService farmers, IUserService users) { _farmers = farmers; _users = users; }

        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] int page = 1, [FromQuery] int pageSize = 20, [FromQuery] bool? isApproved = null)
        {
            var result = await _farmers.GetAllAsync(
                InputValidator.ClampPage(page),
                InputValidator.ClampPageSize(pageSize, 100),
                isApproved);
            return Ok(ApiResponse.Ok(result));
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var f = await _farmers.GetByIdAsync(id);
            return f == null ? NotFound() : Ok(ApiResponse.Ok(f));
        }

        [HttpGet("me")]
        [Authorize(Roles = "farmer")]
        public async Task<IActionResult> GetMyProfile()
        {
            var f = await _farmers.GetByUserIdAsync(CurrentUserId);
            return f == null ? NotFound() : Ok(ApiResponse.Ok(f));
        }

        [HttpPost("register")]
        [Authorize]
        public async Task<IActionResult> Register([FromBody] RegisterFarmerRequest req)
        {
            if (!ModelState.IsValid)
                return BadRequest(ApiResponse.Fail(string.Join("; ", ModelState.Values
                    .SelectMany(v => v.Errors).Select(e => e.ErrorMessage))));

            // If admin is creating a seller from admin UI and provided an owner name, create a new user+farmer
            if (CurrentUserRole == "admin" && !string.IsNullOrEmpty(req.OwnerName))
            {
                var created = await _farmers.CreateAdminAsync(req.OwnerName, req);
                return created == null ? BadRequest(ApiResponse.Fail("Failed to create farmer")) : Ok(ApiResponse.Ok(created, "Farmer created"));
            }

            var f = await _farmers.RegisterAsync(CurrentUserId, req);
            return Ok(ApiResponse.Ok(f, "Farmer registration submitted for approval"));
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "admin")]
        public async Task<IActionResult> Update(int id, [FromBody] RegisterFarmerRequest req)
        {
            var updated = await _farmers.UpdateAsync(id, req);
            return updated == null ? NotFound() : Ok(ApiResponse.Ok(updated, "Farmer updated"));
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "admin")]
        public async Task<IActionResult> Delete(int id)
        {
            var success = await _farmers.DeleteAsync(id);
            return success ? Ok(ApiResponse.Ok(true, "Farmer deleted")) : NotFound(ApiResponse.Fail("Farmer not found"));
        }

        [HttpPut("{id}/approve")]
        [Authorize(Roles = "admin")]
        public async Task<IActionResult> Approve(int id, [FromBody] bool approve)
        {
            await _farmers.ApproveAsync(id, approve);
            return Ok(ApiResponse.Ok(true, approve ? "Farmer approved" : "Farmer rejected"));
        }

        [HttpPut("{id}/premium")]
        [Authorize(Roles = "admin")]
        public async Task<IActionResult> SetPremium(int id, [FromBody] SetPremiumRequest req)
        {
            if (!ModelState.IsValid)
                return BadRequest(ApiResponse.Fail(string.Join("; ", ModelState.Values
                    .SelectMany(v => v.Errors).Select(e => e.ErrorMessage))));
            var result = await _farmers.SetPremiumAsync(id, req.Plan, req.ExpiresAt);
            return result == null
                ? NotFound(ApiResponse.Fail("Farmer not found"))
                : Ok(ApiResponse.Ok(result, req.Plan == "premium" ? "Seller upgraded to Premium" : "Seller downgraded to Free"));
        }

        [HttpGet("women-led")]
        public async Task<IActionResult> GetWomenLed()
        {
            var result = await _farmers.GetWomenLedAsync();
            return Ok(ApiResponse.Ok(result));
        }

        [HttpPut("{id}/women-led")]
        [Authorize(Roles = "admin")]
        public async Task<IActionResult> SetWomenLed(int id, [FromBody] SetWomenLedRequest req)
        {
            var result = await _farmers.SetWomenLedAsync(id, req.IsWomenLed, req.Story);
            return result == null
                ? NotFound(ApiResponse.Fail("Farmer not found"))
                : Ok(ApiResponse.Ok(result, req.IsWomenLed ? "Marked as women-led farm" : "Women-led status removed"));
        }

        [HttpPost("{id}/photo")]
        [Authorize(Roles = "admin")]
        public async Task<IActionResult> UploadPhoto(int id, IFormFile file)
        {
            var farmer = await _farmers.GetByIdAsync(id);
            if (farmer == null) return NotFound(ApiResponse.Fail("Farmer not found"));

            if (file == null || file.Length == 0)
                return BadRequest(ApiResponse.Fail("No file provided."));
            if (file.Length > 5 * 1024 * 1024)
                return BadRequest(ApiResponse.Fail("File size must not exceed 5 MB."));

            var allowed = new[] { "image/jpeg", "image/png", "image/webp" };
            if (!allowed.Contains(file.ContentType.ToLowerInvariant()))
                return BadRequest(ApiResponse.Fail("Only JPEG, PNG, and WebP images are allowed."));

            var url = await _users.UploadAvatarAsync(farmer.UserId, file.OpenReadStream(), file.FileName);
            return Ok(ApiResponse.Ok(new { url }));
        }
    }

    // ── Products ──────────────────────────────────────────────────────────────
    [Route("api/products")]
    public class ProductsController : BaseController
    {
        private readonly IProductService _products;
        private readonly IFarmerService _farmers;
        private readonly IDynamicPricingService _pricing;
        public ProductsController(IProductService products, IFarmerService farmers, IDynamicPricingService pricing)
        {
            _products = products;
            _farmers = farmers;
            _pricing = pricing;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] ProductQueryParams query)
        {
            var result = await _products.GetAllAsync(query);
            return Ok(ApiResponse.Ok(result));
        }

        [HttpGet("featured")]
        public async Task<IActionResult> GetFeatured([FromQuery] int count = 8)
        {
            var result = await _products.GetFeaturedAsync(count);
            return Ok(ApiResponse.Ok(result));
        }

        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetById(int id)
        {
            var p = await _products.GetByIdAsync(id);
            return p == null ? NotFound() : Ok(ApiResponse.Ok(p));
        }

        [HttpGet("{slug}")]
        public async Task<IActionResult> GetBySlug(string slug)
        {
            if (!InputValidator.IsValidSlug(slug))
                return BadRequest(ApiResponse.Fail("Invalid product slug."));

            var p = await _products.GetBySlugAsync(slug);
            return p == null ? NotFound() : Ok(ApiResponse.Ok(p));
        }

        [HttpPost]
        [Authorize(Roles = "farmer")]
        public async Task<IActionResult> Create([FromBody] CreateProductRequest req)
        {
            if (!ModelState.IsValid)
                return BadRequest(ApiResponse.Fail(string.Join("; ", ModelState.Values
                    .SelectMany(v => v.Errors).Select(e => e.ErrorMessage))));

            var farmerProfile = await _farmers.GetByUserIdAsync(CurrentUserId);
            if (farmerProfile == null || !farmerProfile.IsApproved)
                return Forbid();
            var p = await _products.CreateAsync(farmerProfile.Id, req);
            return Ok(ApiResponse.Ok(p, "Product submitted for review"));
        }

        [HttpPost("admin")]
        [Authorize(Roles = "admin")]
        public async Task<IActionResult> CreateAdmin([FromBody] CreateProductRequest req, [FromQuery] int farmerId)
        {
            if (farmerId <= 0) return BadRequest(ApiResponse.Fail("farmerId query parameter is required"));
            var p = await _products.CreateAdminAsync(CurrentUserId, req, farmerId);
            return p == null ? BadRequest(ApiResponse.Fail("Failed to create product for farmer")) : Ok(ApiResponse.Ok(p, "Product created by admin"));
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "farmer,admin")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateProductRequest req)
        {
            var farmerId = 0;
            if (CurrentUserRole == "farmer")
            {
                var farmerProfile = await _farmers.GetByUserIdAsync(CurrentUserId);
                farmerId = farmerProfile?.Id ?? 0;
            }
            var p = await _products.UpdateAsync(id, farmerId, req);
            return p == null ? NotFound() : Ok(ApiResponse.Ok(p));
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "farmer,admin")]
        public async Task<IActionResult> Delete(int id)
        {
            var farmerId = 0;
            if (CurrentUserRole == "farmer")
            {
                var farmerProfile = await _farmers.GetByUserIdAsync(CurrentUserId);
                farmerId = farmerProfile?.Id ?? 0;
            }
            await _products.DeleteAsync(id, farmerId);
            return Ok(ApiResponse.Ok(true));
        }

        [HttpGet("seller/my")]
        [Authorize(Roles = "farmer")]
        public async Task<IActionResult> GetMyProducts([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
        {
            var farmerProfile = await _farmers.GetByUserIdAsync(CurrentUserId);
            if (farmerProfile == null) return NotFound(ApiResponse.Fail("Seller profile not found"));
            var result = await _products.GetSellerProductsAsync(
                farmerProfile.Id,
                InputValidator.ClampPage(page),
                InputValidator.ClampPageSize(pageSize, 50));
            return Ok(ApiResponse.Ok(result));
        }

        [HttpGet("seller/{id:int}")]
        [Authorize(Roles = "farmer,admin")]
        public async Task<IActionResult> GetSellerProductById(int id)
        {
            int farmerId = 0;
            if (CurrentUserRole == "farmer")
            {
                var fp = await _farmers.GetByUserIdAsync(CurrentUserId);
                farmerId = fp?.Id ?? -1;
                if (farmerId <= 0) return Forbid();
            }
            var p = await _products.GetSellerProductByIdAsync(id, farmerId);
            return p == null ? NotFound() : Ok(ApiResponse.Ok(p));
        }

        [HttpGet("pending")]
        [Authorize(Roles = "admin")]
        public async Task<IActionResult> GetPending([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
        {
            var result = await _products.GetPendingProductsAsync(
                InputValidator.ClampPage(page),
                InputValidator.ClampPageSize(pageSize, 50));
            return Ok(ApiResponse.Ok(result));
        }

        [HttpPut("{id:int}/approve")]
        [Authorize(Roles = "admin")]
        public async Task<IActionResult> Approve(int id, [FromBody] ApproveProductRequest req)
        {
            var result = await _products.ApproveProductAsync(id, req.Approve);
            return result
                ? Ok(ApiResponse.Ok(true, req.Approve ? "Product approved" : "Product rejected"))
                : NotFound(ApiResponse.Fail("Product not found"));
        }

        [HttpPut("{id:int}/featured")]
        [Authorize(Roles = "admin")]
        public async Task<IActionResult> SetFeatured(int id, [FromBody] bool isFeatured)
        {
            var result = await _products.ToggleFeaturedAsync(id, isFeatured);
            return result
                ? Ok(ApiResponse.Ok(true, isFeatured ? "Product marked as featured" : "Product removed from featured"))
                : NotFound(ApiResponse.Fail("Product not found"));
        }

        [HttpPost("{id}/images")]
        [Authorize(Roles = "farmer")]
        public async Task<IActionResult> UploadImage(int id, IFormFile file)
        {
            if (file == null)
                return BadRequest(ApiResponse.Fail("No file provided."));
            if (file.Length > 5 * 1024 * 1024)
                return BadRequest(ApiResponse.Fail("File size must not exceed 5 MB."));

            var allowed = new[] { "image/jpeg", "image/png", "image/webp" };
            if (!allowed.Contains(file.ContentType.ToLowerInvariant()))
                return BadRequest(ApiResponse.Fail("Only JPEG, PNG, and WebP images are allowed."));

            var url = await _products.UploadImageAsync(id, file.OpenReadStream(), file.FileName);
            return Ok(ApiResponse.Ok(new { url }));
        }

        [HttpGet("{id:int}/pricing")]
        public async Task<IActionResult> GetPricing(int id)
        {
            var result = await _pricing.GetProductPricingAsync(id);
            return result == null ? NotFound(ApiResponse.Fail("Product not found")) : Ok(ApiResponse.Ok(result));
        }
    }

    // ── Cart ──────────────────────────────────────────────────────────────────
    [Route("api/cart")]
    [Authorize]
    public class CartController : BaseController
    {
        private readonly ICartService _cart;
        public CartController(ICartService cart) { _cart = cart; }

        [HttpGet]
        public async Task<IActionResult> Get()
        {
            var cart = await _cart.GetCartAsync(CurrentUserId);
            return Ok(ApiResponse.Ok(cart));
        }

        [HttpPost("items")]
        public async Task<IActionResult> AddItem([FromBody] AddToCartRequest req)
        {
            var cart = await _cart.AddItemAsync(CurrentUserId, req);
            return Ok(ApiResponse.Ok(cart));
        }

        [HttpPut("items/{id}")]
        public async Task<IActionResult> UpdateItem(int id, [FromBody] UpdateCartItemRequest req)
        {
            var cart = await _cart.UpdateItemAsync(CurrentUserId, id, req.Quantity);
            return Ok(ApiResponse.Ok(cart));
        }

        [HttpDelete("items/{id}")]
        public async Task<IActionResult> RemoveItem(int id)
        {
            var cart = await _cart.RemoveItemAsync(CurrentUserId, id);
            return cart == null ? NotFound(ApiResponse.Fail("Item not found")) : Ok(ApiResponse.Ok(cart));
        }

        [HttpDelete]
        public async Task<IActionResult> Clear()
        {
            await _cart.ClearCartAsync(CurrentUserId);
            return Ok(ApiResponse.Ok(true));
        }

        [HttpPost("merge")]
        public async Task<IActionResult> MergeGuestCart([FromBody] MergeCartRequest req)
        {
            if (req.Items == null || req.Items.Count == 0)
                return Ok(ApiResponse.Ok(await _cart.GetCartAsync(CurrentUserId)));
            var cart = await _cart.MergeGuestCartAsync(CurrentUserId, req.Items);
            return Ok(ApiResponse.Ok(cart));
        }
    }

    // ── Orders ────────────────────────────────────────────────────────────────
    [Route("api/orders")]
    [Authorize]
    public class OrdersController : BaseController
    {
        private readonly IOrderService _orders;
        public OrdersController(IOrderService orders) { _orders = orders; }

        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] int page = 1, [FromQuery] int pageSize = 10)
        {
            var result = await _orders.GetUserOrdersAsync(
                CurrentUserId,
                InputValidator.ClampPage(page),
                InputValidator.ClampPageSize(pageSize, 50));
            return Ok(ApiResponse.Ok(result));
        }

        [HttpGet("seller")]
        [Authorize(Roles = "farmer")]
        public async Task<IActionResult> GetSellerOrders([FromQuery] int page = 1, [FromQuery] int pageSize = 20, [FromQuery] string? status = null)
        {
            if (status != null && !InputValidator.IsValidOrderStatus(status))
                return BadRequest(ApiResponse.Fail("Invalid order status value."));

            var result = await _orders.GetSellerOrdersAsync(
                CurrentUserId,
                InputValidator.ClampPage(page),
                InputValidator.ClampPageSize(pageSize, 50),
                status);
            return Ok(ApiResponse.Ok(result));
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var order = await _orders.GetByIdAsync(id, CurrentUserId, CurrentUserRole);
            return order == null ? NotFound() : Ok(ApiResponse.Ok(order));
        }

        [HttpPost]
        public async Task<IActionResult> PlaceOrder([FromBody] PlaceOrderRequest req)
        {
            if (!ModelState.IsValid)
                return BadRequest(ApiResponse.Fail(string.Join("; ", ModelState.Values
                    .SelectMany(v => v.Errors).Select(e => e.ErrorMessage))));

            if (!InputValidator.IsValidPaymentMethod(req.PaymentMethod))
                return BadRequest(ApiResponse.Fail("Invalid payment method."));

            var order = await _orders.PlaceOrderAsync(CurrentUserId, req);
            if (order == null) return BadRequest(ApiResponse.Fail("Failed to place order. Check stock or address."));
            return Ok(ApiResponse.Ok(order, "Order placed successfully"));
        }

        [HttpPost("apply-coupon")]
        public async Task<IActionResult> ApplyCoupon([FromBody] ApplyCouponRequest req)
        {
            var result = await _orders.ApplyCouponAsync(req);
            return result == null ? BadRequest(ApiResponse.Fail("Invalid or expired coupon")) : Ok(ApiResponse.Ok(result));
        }

        [HttpPost("{id}/cancel")]
        public async Task<IActionResult> Cancel(int id)
        {
            var result = await _orders.CancelAsync(id, CurrentUserId);
            return result ? Ok(ApiResponse.Ok(true)) : BadRequest(ApiResponse.Fail("Cannot cancel this order"));
        }

        [HttpPut("{id}/status")]
        [Authorize(Roles = "admin,farmer")]
        public async Task<IActionResult> UpdateStatus(int id, [FromBody] string status, [FromQuery] string? note = null)
        {
            if (!InputValidator.IsValidOrderStatus(status))
            {
                Log.Warning("Invalid order status '{Status}' attempted by user {UserId}", status, CurrentUserId);
                return BadRequest(ApiResponse.Fail("Invalid order status value."));
            }

            await _orders.UpdateStatusAsync(id, status, note, CurrentUserId);
            return Ok(ApiResponse.Ok(true));
        }
    }

    // ── Payments ──────────────────────────────────────────────────────────────
    [Route("api/payments")]
    [Authorize]
    public class PaymentsController : BaseController
    {
        private readonly IPaymentService _payments;
        public PaymentsController(IPaymentService payments) { _payments = payments; }

        [HttpPost("razorpay/create-order")]
        public async Task<IActionResult> CreateRazorpayOrder([FromBody] CreateRazorpayOrderRequest req)
        {
            var result = await _payments.CreateRazorpayOrderAsync(req.OrderId);
            return result == null ? BadRequest() : Ok(ApiResponse.Ok(result));
        }

        [HttpPost("razorpay/verify")]
        public async Task<IActionResult> VerifyRazorpay([FromBody] VerifyRazorpayRequest req)
        {
            var result = await _payments.VerifyRazorpayPaymentAsync(req);
            return result ? Ok(ApiResponse.Ok(true, "Payment verified")) : BadRequest(ApiResponse.Fail("Payment verification failed"));
        }

        [HttpPost("stripe/create-intent")]
        public async Task<IActionResult> CreateStripeIntent([FromBody] CreateStripeIntentRequest req)
        {
            var result = await _payments.CreateStripeIntentAsync(req.OrderId);
            return result == null ? BadRequest() : Ok(ApiResponse.Ok(result));
        }

        [AllowAnonymous]
        [HttpPost("stripe/webhook")]
        public async Task<IActionResult> StripeWebhook()
        {
            var payload = await new StreamReader(Request.Body).ReadToEndAsync();
            var sig = Request.Headers["Stripe-Signature"].FirstOrDefault() ?? "";
            await _payments.HandleStripeWebhookAsync(payload, sig);
            return Ok();
        }
    }

    // ── Reviews ───────────────────────────────────────────────────────────────
    [Route("api/reviews")]
    public class ReviewsController : BaseController
    {
        private readonly IReviewService _reviews;
        public ReviewsController(IReviewService reviews) { _reviews = reviews; }

        [HttpGet("product/{productId}")]
        public async Task<IActionResult> GetProductReviews(int productId, [FromQuery] int page = 1, [FromQuery] int pageSize = 10)
        {
            var result = await _reviews.GetProductReviewsAsync(productId, page, pageSize);
            return Ok(ApiResponse.Ok(result));
        }

        [HttpPost]
        [Authorize]
        public async Task<IActionResult> Create([FromBody] CreateReviewRequest req)
        {
            var review = await _reviews.CreateAsync(CurrentUserId, req);
            if (review == null) return BadRequest(ApiResponse.Fail("Already reviewed this product"));
            return Ok(ApiResponse.Ok(review));
        }

        [HttpDelete("{id}")]
        [Authorize]
        public async Task<IActionResult> Delete(int id)
        {
            await _reviews.DeleteAsync(id, CurrentUserId, CurrentUserRole);
            return Ok(ApiResponse.Ok(true));
        }
    }

    // ── Notifications ─────────────────────────────────────────────────────────
    [Route("api/notifications")]
    [Authorize]
    public class NotificationsController : BaseController
    {
        private readonly INotificationService _notifications;
        public NotificationsController(INotificationService notifications) { _notifications = notifications; }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var result = await _notifications.GetUserNotificationsAsync(CurrentUserId);
            return Ok(ApiResponse.Ok(result));
        }

        [HttpPut("{id}/read")]
        public async Task<IActionResult> MarkRead(int id)
        {
            await _notifications.MarkAsReadAsync(id, CurrentUserId);
            return Ok(ApiResponse.Ok(true));
        }

        [HttpPut("read-all")]
        public async Task<IActionResult> MarkAllRead()
        {
            await _notifications.MarkAllAsReadAsync(CurrentUserId);
            return Ok(ApiResponse.Ok(true));
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            await _notifications.DeleteAsync(id, CurrentUserId);
            return Ok(ApiResponse.Ok(true));
        }
    }

    // ── Admin ─────────────────────────────────────────────────────────────────
    [Route("api/admin")]
    [Authorize(Roles = "admin")]
    public class AdminController : BaseController
    {
        private readonly IAdminService _admin;
        private readonly IOrderService _orders;
        public AdminController(IAdminService admin, IOrderService orders) { _admin = admin; _orders = orders; }

        [HttpGet("dashboard")]
        public async Task<IActionResult> Dashboard()
        {
            var stats = await _admin.GetDashboardStatsAsync();
            return Ok(ApiResponse.Ok(stats));
        }

        [HttpGet("orders")]
        public async Task<IActionResult> GetOrders([FromQuery] int page = 1, [FromQuery] int pageSize = 20, [FromQuery] string? status = null)
        {
            if (status != null && !InputValidator.IsValidOrderStatus(status))
                return BadRequest(ApiResponse.Fail("Invalid order status value."));

            var result = await _orders.GetAllAsync(
                InputValidator.ClampPage(page),
                InputValidator.ClampPageSize(pageSize, 100),
                status);
            return Ok(ApiResponse.Ok(result));
        }
    }

    // ── Subscriptions ─────────────────────────────────────────────────────────
    [Route("api/subscriptions")]
    [Authorize]
    public class SubscriptionsController : BaseController
    {
        private readonly ISubscriptionService _subs;
        public SubscriptionsController(ISubscriptionService subs) { _subs = subs; }

        // GET /api/subscriptions
        [HttpGet]
        public async Task<IActionResult> GetMine()
        {
            var list = await _subs.GetUserSubscriptionsAsync(CurrentUserId);
            return Ok(ApiResponse.Ok(list));
        }

        // GET /api/subscriptions/{id}
        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetById(int id)
        {
            var sub = await _subs.GetByIdAsync(id, CurrentUserId);
            return sub == null ? NotFound() : Ok(ApiResponse.Ok(sub));
        }

        // POST /api/subscriptions
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateSubscriptionRequest req)
        {
            var sub = await _subs.CreateAsync(CurrentUserId, req);
            return sub == null ? BadRequest(ApiResponse.Fail("Could not create subscription.")) : Ok(ApiResponse.Ok(sub));
        }

        // PUT /api/subscriptions/{id}
        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateSubscriptionRequest req)
        {
            var sub = await _subs.UpdateAsync(id, CurrentUserId, req);
            return sub == null ? NotFound() : Ok(ApiResponse.Ok(sub));
        }

        // PUT /api/subscriptions/{id}/pause
        [HttpPut("{id:int}/pause")]
        public async Task<IActionResult> PauseResume(int id, [FromBody] PauseResumeRequest req)
        {
            var ok = await _subs.PauseResumeAsync(id, CurrentUserId, req.Pause);
            return ok ? Ok(ApiResponse.Ok(true)) : NotFound();
        }

        // DELETE /api/subscriptions/{id}
        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Cancel(int id)
        {
            var ok = await _subs.CancelAsync(id, CurrentUserId);
            return ok ? Ok(ApiResponse.Ok(true)) : NotFound();
        }

        // POST /api/subscriptions/process  — admin trigger
        [HttpPost("process")]
        public async Task<IActionResult> Process()
        {
            if (CurrentUserRole != "admin") return Forbid();
            var count = await _subs.ProcessDueSubscriptionsAsync();
            return Ok(ApiResponse.Ok(count));
        }
    }

    // ── Referral ──────────────────────────────────────────────────────────────
    [Route("api/referral")]
    [Authorize]
    public class ReferralController : BaseController
    {
        private readonly IReferralService _referral;
        public ReferralController(IReferralService referral) { _referral = referral; }

        // GET /api/referral/code  — get or create my unique invite code
        [HttpGet("code")]
        public async Task<IActionResult> GetMyCode()
        {
            var code = await _referral.GetOrCreateCodeAsync(CurrentUserId);
            return Ok(ApiResponse.Ok(code));
        }

        // POST /api/referral/apply  — apply a referral code (called after registration)
        [HttpPost("apply")]
        public async Task<IActionResult> ApplyCode([FromBody] ApplyReferralCodeRequest req)
        {
            var ok = await _referral.ApplyReferralCodeAsync(CurrentUserId, req.Code);
            return ok ? Ok(ApiResponse.Ok(true))
                      : BadRequest(ApiResponse.Fail("Invalid or already used referral code."));
        }

        // GET /api/referral/my-referrals  — list of people I referred + status
        [HttpGet("my-referrals")]
        public async Task<IActionResult> GetMyReferrals()
        {
            var list = await _referral.GetMyReferralsAsync(CurrentUserId);
            return Ok(ApiResponse.Ok(list));
        }

        // GET /api/referral/wallet  — credit balance + transaction history
        [HttpGet("wallet")]
        public async Task<IActionResult> GetWallet()
        {
            var wallet = await _referral.GetWalletAsync(CurrentUserId);
            return Ok(ApiResponse.Ok(wallet));
        }
    }
}