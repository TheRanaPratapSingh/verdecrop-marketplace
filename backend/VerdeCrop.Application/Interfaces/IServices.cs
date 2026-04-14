using System.Linq.Expressions;
using System.Threading.Tasks;
using VerdeCrop.Application.DTOs;
using VerdeCrop.Domain.Entities;
using static System.Net.WebRequestMethods;

namespace VerdeCrop.Application.Interfaces
{
    public interface IAuthService
    {
        Task<bool> SendOtpAsync(SendOtpRequest request);
        Task<AuthResponse?> VerifyOtpAsync(VerifyOtpRequest request);
        Task<bool> VerifyOtpOnlyAsync(VerifyOtpOnlyRequest request);
        Task<AuthResponse?> RegisterWithDualVerificationAsync(DualOtpRegisterRequest request);
        Task<AuthResponse?> RefreshTokenAsync(string refreshToken);
        Task<bool> LogoutAsync(string refreshToken);
    }
    public interface IRepository<T> where T : BaseEntity
    {
        Task<T?> GetByIdAsync(int id);
        Task<T?> FirstOrDefaultAsync(Expression<Func<T, bool>> predicate);
        Task<List<T>> GetAllAsync(Expression<Func<T, bool>>? predicate = null);
        Task<(List<T> Items, int Total)> GetPagedAsync(Expression<Func<T, bool>>? predicate, int page, int pageSize, Func<IQueryable<T>, IOrderedQueryable<T>>? orderBy = null);
        Task<T> AddAsync(T entity);
        Task UpdateAsync(T entity);
        Task DeleteAsync(T entity);
        Task<bool> ExistsAsync(Expression<Func<T, bool>> predicate);
        IQueryable<T> Query();
    }


    public interface IUnitOfWork : IDisposable
    {
        IRepository<User> Users { get; }
        IRepository<RefreshToken> RefreshTokens { get; }
        IRepository<OtpCode> OtpCodes { get; }
        IRepository<Address> Addresses { get; }
        IRepository<Category> Categories { get; }
        IRepository<FarmerProfile> FarmerProfiles { get; }
        IRepository<Product> Products { get; }
        IRepository<Cart> Carts { get; }
        IRepository<CartItem> CartItems { get; }
        IRepository<Order> Orders { get; }
        IRepository<OrderItem> OrderItems { get; }
        IRepository<OrderStatusHistory> OrderStatusHistories { get; }
        IRepository<Payment> Payments { get; }
        IRepository<Review> Reviews { get; }
        IRepository<WishlistItem> WishlistItems { get; }
        IRepository<Coupon> Coupons { get; }
        IRepository<Notification> Notifications { get; }
        IRepository<Subscription> Subscriptions { get; }
        IRepository<SubscriptionItem> SubscriptionItems { get; }
        IRepository<ProductBundle> ProductBundles { get; }
        IRepository<BundleItem> BundleItems { get; }
        IRepository<PriceDropAlert> PriceDropAlerts { get; }
        IRepository<ReferralCode> ReferralCodes { get; }
        IRepository<Referral> Referrals { get; }
        IRepository<WalletCredit> WalletCredits { get; }
        Task<int> SaveChangesAsync();
    }

    public interface IUserService
    {
        Task<UserDto?> GetByIdAsync(int id);
        Task<UserDto?> UpdateProfileAsync(int userId, UpdateProfileRequest req);
        Task<string?> UploadAvatarAsync(int userId, Stream fileStream, string fileName);
        Task<bool> UpdateFcmTokenAsync(int userId, string token);
        Task<PagedResult<UserDto>> GetAllAsync(int page, int pageSize, string? search);
        Task<bool> SetActiveAsync(int userId, bool isActive);
    }

    public interface IAddressService
    {
        Task<List<AddressDto>> GetUserAddressesAsync(int userId);
        Task<AddressDto?> CreateAsync(int userId, CreateAddressRequest req);
        Task<AddressDto?> UpdateAsync(int userId, int addressId, CreateAddressRequest req);
        Task<bool> DeleteAsync(int userId, int addressId);
        Task<bool> SetDefaultAsync(int userId, int addressId);
    }

    public interface ICategoryService
    {
        Task<List<CategoryDto>> GetAllAsync();
        Task<CategoryDto?> GetBySlugAsync(string slug);
        Task<CategoryDto?> GetByIdAsync(int id);
        Task<CategoryDto> CreateAsync(CreateCategoryRequest req);
        Task<CategoryDto?> UpdateAsync(int id, UpdateCategoryRequest req);
        Task<bool> DeleteAsync(int id);
    }

    public interface IFarmerService
    {
        Task<PagedResult<FarmerDto>> GetAllAsync(int page, int pageSize, bool? isApproved);
        Task<FarmerDto?> GetByIdAsync(int id);
        Task<FarmerDto?> GetByUserIdAsync(int userId);
        Task<FarmerDto?> RegisterAsync(int userId, RegisterFarmerRequest req);
        Task<FarmerDto?> CreateAdminAsync(string ownerName, RegisterFarmerRequest req);
        Task<FarmerDto?> UpdateAsync(int farmerId, RegisterFarmerRequest req);
        Task<bool> DeleteAsync(int farmerId);
        Task<bool> ApproveAsync(int farmerId, bool approve);
        Task<FarmerDto?> SetPremiumAsync(int farmerId, string plan, DateTime? expiresAt);
        Task<FarmerDto?> SetWomenLedAsync(int farmerId, bool isWomenLed, string? story);
        Task<List<FarmerDto>> GetWomenLedAsync();
    }

    public interface IProductService
    {
        Task<PagedResult<ProductListDto>> GetAllAsync(ProductQueryParams query);
        Task<ProductDetailDto?> GetByIdAsync(int id);
        Task<ProductDetailDto?> GetBySlugAsync(string slug);
        Task<ProductDetailDto?> CreateAsync(int farmerId, CreateProductRequest req);
        Task<ProductDetailDto?> CreateAdminAsync(int adminUserId, CreateProductRequest req, int farmerId);
        Task<ProductDetailDto?> UpdateAsync(int productId, int farmerId, UpdateProductRequest req);
        Task<bool> DeleteAsync(int productId, int farmerId);
        Task<string?> UploadImageAsync(int productId, Stream fileStream, string fileName);
        Task<List<ProductListDto>> GetFeaturedAsync(int count = 8);
        Task<List<ProductListDto>> GetByFarmerAsync(int farmerId);
        // Seller / admin approval
        Task<PagedResult<SellerProductDto>> GetSellerProductsAsync(int farmerId, int page, int pageSize);
        Task<SellerProductDetailDto?> GetSellerProductByIdAsync(int productId, int farmerId);
        Task<PagedResult<SellerProductDto>> GetPendingProductsAsync(int page, int pageSize);
        Task<bool> ApproveProductAsync(int productId, bool approve);
        Task<bool> ToggleFeaturedAsync(int productId, bool isFeatured);
    }

    public interface ICartService
    {
        Task<CartDto?> GetCartAsync(int userId);
        Task<CartDto?> AddItemAsync(int userId, AddToCartRequest req);
        Task<CartDto?> UpdateItemAsync(int userId, int itemId, decimal quantity);
        Task<CartDto?> RemoveItemAsync(int userId, int itemId);
        Task<bool> ClearCartAsync(int userId);
        Task<CartDto?> MergeGuestCartAsync(int userId, List<MergeCartItem> items);
    }

    public interface IWishlistService
    {
        Task<List<ProductListDto>> GetWishlistAsync(int userId);
        Task<bool> AddAsync(int userId, int productId);
        Task<bool> RemoveAsync(int userId, int productId);
    }

    public interface IOrderService
    {
        Task<PagedResult<OrderListDto>> GetUserOrdersAsync(int userId, int page, int pageSize);
        Task<PagedResult<OrderDetailDto>> GetSellerOrdersAsync(int sellerUserId, int page, int pageSize, string? status);
        Task<OrderDetailDto?> GetByIdAsync(int orderId, int userId, string role);
        Task<OrderDetailDto?> PlaceOrderAsync(int userId, PlaceOrderRequest req);
        Task<bool> UpdateStatusAsync(int orderId, string status, string? note, int updatedBy);
        Task<bool> CancelAsync(int orderId, int userId);
        Task<CouponResponseDto?> ApplyCouponAsync(ApplyCouponRequest req);
        Task<PagedResult<OrderListDto>> GetAllAsync(int page, int pageSize, string? status);
    }

    public interface IPaymentService
    {
        Task<RazorpayOrderResponse?> CreateRazorpayOrderAsync(int orderId);
        Task<bool> VerifyRazorpayPaymentAsync(VerifyRazorpayRequest req);
        Task<StripeIntentResponse?> CreateStripeIntentAsync(int orderId);
        Task<bool> HandleStripeWebhookAsync(string payload, string signature);
    }

    public interface IReviewService
    {
        Task<PagedResult<ReviewDto>> GetProductReviewsAsync(int productId, int page, int pageSize);
        Task<ReviewDto?> CreateAsync(int userId, CreateReviewRequest req);
        Task<bool> DeleteAsync(int reviewId, int userId, string role);
    }

    public interface INotificationService
    {
        Task<List<NotificationDto>> GetUserNotificationsAsync(int userId);
        Task<bool> MarkAsReadAsync(int notificationId, int userId);
        Task<bool> MarkAllAsReadAsync(int userId);
        Task<bool> DeleteAsync(int notificationId, int userId);
        Task SendAsync(int userId, string title, string body, string type = "system", string? actionUrl = null);
        Task SendToAllAsync(string title, string body, string type = "announce");
    }

    public interface IAdminService
    {
        Task<DashboardStatsDto> GetDashboardStatsAsync();
        Task<PagedResult<OrderListDto>> GetAllOrdersAsync(int page, int pageSize, string? status);
    }

    public interface ISubscriptionService
    {
        Task<List<SubscriptionDto>> GetUserSubscriptionsAsync(int userId);
        Task<SubscriptionDto?> GetByIdAsync(int subscriptionId, int userId);
        Task<SubscriptionDto?> CreateAsync(int userId, CreateSubscriptionRequest req);
        Task<SubscriptionDto?> UpdateAsync(int subscriptionId, int userId, UpdateSubscriptionRequest req);
        Task<bool> PauseResumeAsync(int subscriptionId, int userId, bool pause);
        Task<bool> CancelAsync(int subscriptionId, int userId);
        Task<List<SubscriptionDto>> GetAllAsync(int page, int pageSize); // admin
        Task<int> ProcessDueSubscriptionsAsync(); // background / admin trigger
    }

    public interface IDynamicPricingService
    {
        DynamicPriceDto ComputePrice(int productId, decimal basePrice, int stockQuantity,
            int reviewCount, decimal rating, string? categoryName, DateTime? harvestDate);
        Task<DynamicPriceDto?> GetProductPricingAsync(int productId);
    }

    public interface IProductBundleService
    {
        Task<List<BundleDto>> GetAllAsync();
        Task<BundleDto?> GetBySlugAsync(string slug);
        Task<BundleDto?> GetByIdAsync(int id);
        Task<BundleDto?> CreateAsync(CreateBundleRequest req);
        Task<bool> DeleteAsync(int id);
        Task<bool> ToggleActiveAsync(int id, bool isActive);
    }

    public interface IPriceAlertService
    {
        Task<List<PriceAlertDto>> GetUserAlertsAsync(int userId);
        Task<PriceAlertDto?> SetAlertAsync(int userId, CreatePriceAlertRequest req);
        Task<bool> DeleteAlertAsync(int userId, int productId);
        Task<int> CheckAndTriggerAlertsAsync(); // called by background/admin
    }

    public interface IReferralService
    {
        Task<ReferralCodeDto> GetOrCreateCodeAsync(int userId);
        Task<bool> ApplyReferralCodeAsync(int newUserId, string code);
        Task<List<ReferralDto>> GetMyReferralsAsync(int userId);
        Task<WalletSummaryDto> GetWalletAsync(int userId);
        Task AwardCreditsOnFirstOrderAsync(int userId, int orderId);
        Task<bool> RedeemCreditsAsync(int userId, decimal amount, int orderId);
    }

    public interface IJwtService
    {
        string GenerateAccessToken(User user);
        string GenerateRefreshToken();
        int? ValidateAccessToken(string token);
    }

    public interface IOtpService
    {
        Task<string> GenerateOtpAsync(string identifier, string purpose);
        Task<bool> ValidateOtpAsync(string identifier, string code, string purpose);
    }

    public interface IEmailService
    {
        Task SendEmailAsync(string to, string subject, string htmlBody);
        Task SendOtpEmailAsync(string email, string otp, string purpose);
        Task SendWelcomeEmailAsync(string email, string name);
        Task SendLoginWelcomeEmailAsync(string email, string name);
        Task SendOrderConfirmationAsync(string email, string orderNumber, decimal amount);
    }

    public interface ISmsService
    {
        Task SendOtpSmsAsync(string phone, string otp);
    }

    public interface ICacheService
    {
        Task<T?> GetAsync<T>(string key);
        Task SetAsync<T>(string key, T value, TimeSpan? expiry = null);
        Task DeleteAsync(string key);
        Task DeleteByPrefixAsync(string prefix);
    }

    public interface IStorageService
    {
        Task<string> UploadAsync(Stream fileStream, string fileName, string folder);
        Task DeleteAsync(string url);
    }

    public interface IFirebaseService
    {
        Task SendToTokenAsync(string token, string title, string body, Dictionary<string, string>? data = null);
        Task SendToTopicAsync(string topic, string title, string body);
    }
}
