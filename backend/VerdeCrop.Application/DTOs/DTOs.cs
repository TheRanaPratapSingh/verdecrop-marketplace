using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace VerdeCrop.Application.DTOs
{
    // ── Auth ──────────────────────────────────────────────────────────────────
    public record SendOtpRequest(
        [Required][StringLength(200, MinimumLength = 5)] string Identifier,
        [StringLength(20)] string Purpose = "login");

    public record VerifyOtpRequest(
        [Required][StringLength(200, MinimumLength = 5)] string Identifier,
        [Required][StringLength(6, MinimumLength = 6)] string Code,
        [StringLength(100)] string? Name = null,
        [EmailAddress][StringLength(200)] string? Email = null,
        [StringLength(20)] string? Phone = null);

    public record AuthResponse(string AccessToken, string RefreshToken, UserDto User);
    public record RefreshTokenRequest([Required][StringLength(500)] string Token);
    public record LogoutRequest([Required][StringLength(500)] string RefreshToken);

    // ── User ──────────────────────────────────────────────────────────────────
    public record UserDto(int Id, string Name, string? Email, string? Phone, string Role, string? AvatarUrl, bool IsActive);
    public record UpdateProfileRequest(
        [Required][StringLength(100, MinimumLength = 2)] string Name,
        [EmailAddress][StringLength(200)] string? Email,
        [StringLength(20)] string? Phone);
    public record UpdateFcmTokenRequest([Required][StringLength(500)] string Token);

    // ── Address ───────────────────────────────────────────────────────────────
    public record AddressDto(int Id, string Label, string FullName, string Phone, string Street, string City, string State, string PinCode, bool IsDefault);
    public record CreateAddressRequest(
        [Required][StringLength(20)] string Label,
        [Required][StringLength(100)] string FullName,
        [Required][StringLength(20)] string Phone,
        [Required][StringLength(200)] string Street,
        [Required][StringLength(100)] string City,
        [Required][StringLength(100)] string State,
        [Required][StringLength(10, MinimumLength = 4)] string PinCode,
        bool IsDefault = false);

    // ── Category ──────────────────────────────────────────────────────────────
    public record CategoryDto(int Id, string Name, string Slug, string? Description, string? IconUrl, int DisplayOrder, int ProductCount);

    public record CreateCategoryRequest(
        [Required][StringLength(100, MinimumLength = 2)] string Name,
        [StringLength(500)] string? Description,
        [StringLength(500)] string? IconUrl,
        int DisplayOrder = 0,
        bool IsActive = true);

    public record UpdateCategoryRequest(
        [StringLength(100)] string? Name,
        [StringLength(500)] string? Description,
        [StringLength(500)] string? IconUrl,
        int? DisplayOrder,
        bool? IsActive);

    // ── Farmer ────────────────────────────────────────────────────────────────
    public record FarmerDto(int Id, int UserId, string FarmName, string? Description, string Location, string State,
        string? PinCode, string? CertificationNumber, string? BankAccountNumber, string? BankIfsc,
        bool IsApproved, decimal TotalSales, decimal Rating, int ReviewCount,
        string OwnerName, string? AvatarUrl);

    public record RegisterFarmerRequest(
        [Required][StringLength(150, MinimumLength = 2)] string FarmName,
        [StringLength(100)] string? OwnerName,
        [StringLength(1000)] string? Description,
        [Required][StringLength(200)] string Location,
        [Required][StringLength(100)] string State,
        [StringLength(10)] string? PinCode,
        [StringLength(100)] string? CertificationNumber,
        [StringLength(30)] string? BankAccountNumber,
        [StringLength(15)] string? BankIfsc,
        bool? IsApproved = null
    );

    // ── Product ───────────────────────────────────────────────────────────────
    public record ProductListDto(
        int Id, string Name, string Slug,
        int CategoryId, string CategoryName,
        int FarmerId, string FarmerName,
        decimal Price, decimal? OriginalPrice, string Unit,
        int StockQuantity, string? ImageUrl,
        bool IsOrganic, bool IsFeatured,
        decimal Rating, int ReviewCount, bool IsActive);

    public record ProductDetailDto(
        int Id, string Name, string Slug, string? Description,
        int CategoryId, string CategoryName,
        int FarmerId, string FarmerName, string FarmLocation,
        decimal Price, decimal? OriginalPrice, string Unit,
        decimal MinOrderQty, int StockQuantity,
        string? ImageUrl, List<string> ImageUrls,
        bool IsOrganic, bool IsFeatured,
        decimal Rating, int ReviewCount, bool IsActive,
        List<ReviewDto> Reviews);

    public record ProductQueryParams(
        string? Search, int? CategoryId, string? CategorySlug, int? FarmerId,
        decimal? MinPrice, decimal? MaxPrice,
        bool? IsOrganic, bool? IsFeatured, bool? InStock,
        string SortBy = "newest", int Page = 1, int PageSize = 20);

    // ── FIX: Added ImageUrl, ImageUrls, IsFeatured — were missing, causing images/description not to save
    public record CreateProductRequest(
        [Required][StringLength(200, MinimumLength = 2)] string Name,
        [StringLength(2000)] string? Description,
        [Required] int CategoryId,
        [Required][Range(0.01, 1_000_000)] decimal Price,
        [Range(0, 1_000_000)] decimal? OriginalPrice,
        [Required][StringLength(20)] string Unit,
        [Range(0, 10_000)] decimal MinOrderQty,
        [Required][Range(0, 100_000)] int StockQuantity,
        bool IsOrganic = true,
        bool? IsFeatured = null,
        [StringLength(1000)] string? ImageUrl = null,
        List<string>? ImageUrls = null
    );

    // ── FIX: Added CategoryId, ImageUrl, ImageUrls — were missing, updates couldn't change these fields
    public record UpdateProductRequest(
        string? Name,
        string? Description,
        int? CategoryId,
        decimal? Price,
        decimal? OriginalPrice,
        string? Unit,
        decimal? MinOrderQty,
        int? StockQuantity,
        bool? IsOrganic,
        bool? IsFeatured,
        bool? IsActive,
        string? ImageUrl,
        List<string>? ImageUrls
    );

    // ── Cart ──────────────────────────────────────────────────────────────────
    public record CartDto(int Id, List<CartItemDto> Items, decimal Subtotal, decimal ItemCount);
    public record CartItemDto(int Id, int ProductId, string ProductName, string? ImageUrl, decimal Price, decimal Quantity, string Unit, decimal Total);
    public record AddToCartRequest([Required] int ProductId, [Required] decimal Quantity);
    public record UpdateCartItemRequest([Required] decimal Quantity);

    // ── Order ─────────────────────────────────────────────────────────────────
    public record OrderListDto(int Id, string OrderNumber, string Status, string PaymentStatus, decimal TotalAmount,
        int ItemCount, DateTime CreatedAt, string? EstimatedDelivery, string? CustomerName);

    public record OrderDetailDto(int Id, string OrderNumber, string Status, string PaymentStatus,
        string PaymentMethod, decimal Subtotal, decimal DeliveryCharge, decimal DiscountAmount,
        decimal TaxAmount, decimal TotalAmount, string? CouponCode, string? Notes,
        DateTime CreatedAt, DateTime? EstimatedDelivery, DateTime? DeliveredAt,
        AddressDto Address, List<OrderItemDto> Items, List<OrderStatusHistoryDto> StatusHistory);

    public record OrderItemDto(int Id, int ProductId, string ProductName, string? ImageUrl,
        decimal Quantity, string Unit, decimal UnitPrice, decimal TotalPrice);

    public record OrderStatusHistoryDto(int Id, string Status, string? Note, DateTime CreatedAt);

    public record PlaceOrderRequest(
        [Required] int AddressId,
        [Required][StringLength(20)] string PaymentMethod,
        [StringLength(50)] string? CouponCode,
        [StringLength(500)] string? Notes);

    public record ApplyCouponRequest([Required] string Code, [Required] decimal OrderAmount);
    public record CouponResponseDto(string Code, string DiscountType, decimal DiscountValue, decimal DiscountAmount, decimal FinalAmount);

    // ── Payment ───────────────────────────────────────────────────────────────
    public record CreateRazorpayOrderRequest([Required] int OrderId);
    public record RazorpayOrderResponse(string RazorpayOrderId, decimal Amount, string Currency, string KeyId);
    public record VerifyRazorpayRequest([Required] string RazorpayOrderId, [Required] string RazorpayPaymentId, [Required] string RazorpaySignature, [Required] int OrderId);
    public record CreateStripeIntentRequest([Required] int OrderId);
    public record StripeIntentResponse(string ClientSecret, string PaymentIntentId);

    // ── Review ────────────────────────────────────────────────────────────────
    public record ReviewDto(int Id, int UserId, string UserName, string? UserAvatar, int Rating, string? Comment, bool IsVerifiedPurchase, DateTime CreatedAt);
    public record CreateReviewRequest([Required] int ProductId, [Required] int OrderId, [Required][Range(1, 5)] int Rating, string? Comment);

    // ── Notification ──────────────────────────────────────────────────────────
    public record NotificationDto(int Id, string Title, string Body, string Type, string? ActionUrl, bool IsRead, DateTime CreatedAt);

    // ── Admin ─────────────────────────────────────────────────────────────────
    public record DashboardStatsDto(int TotalUsers, int TotalFarmers, int TotalProducts, int TotalOrders,
        decimal TotalRevenue, decimal MonthlyRevenue, int PendingOrders, int PendingFarmerApprovals,
        List<RevenueDataPoint> RevenueChart);
    public record RevenueDataPoint(string Label, decimal Revenue, int Orders);

    // ── Pagination ────────────────────────────────────────────────────────────
    public record PagedResult<T>(List<T> Items, int TotalCount, int Page, int PageSize, int TotalPages);

    // ── Generic API Response ──────────────────────────────────────────────────
    public record ApiResponse<T>(bool Success, string? Message, T? Data, object? Errors = null);
    public static class ApiResponse
    {
        public static ApiResponse<T> Ok<T>(T data, string? message = null) => new(true, message, data);
        public static ApiResponse<T> Fail<T>(string message, T? data = default) => new(false, message, data);
        public static ApiResponse<object> Fail(string message) => new(false, message, null);
    }
}
