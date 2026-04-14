using System;
using System.Collections.Generic;

namespace VerdeCrop.Domain.Entities
{
    public class BaseEntity
    {
        public int Id { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }
    }

    public class User : BaseEntity
    {
        public string Name { get; set; } = "";
        public string? Email { get; set; }
        public string? Phone { get; set; }
        public string? PasswordHash { get; set; }
        public string Role { get; set; } = "user"; // user | farmer | admin
        public string? AvatarUrl { get; set; }
        public bool IsActive { get; set; } = true;
        public bool IsDeleted { get; set; } = false;
        public bool IsEmailVerified { get; set; } = false;
        public bool IsPhoneVerified { get; set; } = false;
        public string? FcmToken { get; set; }
        public ICollection<Address> Addresses { get; set; } = new List<Address>();
        public ICollection<Order> Orders { get; set; } = new List<Order>();
        public ICollection<Review> Reviews { get; set; } = new List<Review>();
        public ICollection<WishlistItem> WishlistItems { get; set; } = new List<WishlistItem>();
        public ICollection<Notification> Notifications { get; set; } = new List<Notification>();
        public FarmerProfile? FarmerProfile { get; set; }
        public ReferralCode? ReferralCode { get; set; }
        public ICollection<Referral> ReferralsGiven { get; set; } = new List<Referral>();
        public ICollection<Referral> ReferralsReceived { get; set; } = new List<Referral>();
        public ICollection<WalletCredit> WalletCredits { get; set; } = new List<WalletCredit>();
    }

    public class RefreshToken : BaseEntity
    {
        public int UserId { get; set; }
        public string Token { get; set; } = "";
        public DateTime ExpiresAt { get; set; }
        public bool IsRevoked { get; set; } = false;
        public string? ReplacedByToken { get; set; }
        public User User { get; set; } = null!;
    }

    public class OtpCode : BaseEntity
    {
        public string Identifier { get; set; } = ""; // phone or email
        public string Code { get; set; } = "";
        public string Purpose { get; set; } = "login"; // login | register | reset
        public DateTime ExpiresAt { get; set; }
        public bool IsUsed { get; set; } = false;
        public int AttemptCount { get; set; } = 0;
    }

    public class Address : BaseEntity
    {
        public int UserId { get; set; }
        public string Label { get; set; } = "Home";
        public string FullName { get; set; } = "";
        public string Phone { get; set; } = "";
        public string Street { get; set; } = "";
        public string City { get; set; } = "";
        public string State { get; set; } = "";
        public string PinCode { get; set; } = "";
        public bool IsDefault { get; set; } = false;
        public User User { get; set; } = null!;
    }

    public class Category : BaseEntity
    {
        public string Name { get; set; } = "";
        public string Slug { get; set; } = "";
        public string? Description { get; set; }
        public string? IconUrl { get; set; }
        public int DisplayOrder { get; set; } = 0;
        public bool IsActive { get; set; } = true;
        public bool ShowOnHome { get; set; } = false;
        public ICollection<Product> Products { get; set; } = new List<Product>();
    }

    public class FarmerProfile : BaseEntity
    {
        public int UserId { get; set; }
        public string FarmName { get; set; } = "";
        public string? Description { get; set; }
        public string Location { get; set; } = "";
        public string State { get; set; } = "";
        public string? PinCode { get; set; }
        public string? CertificationNumber { get; set; }
        public string? BankAccountNumber { get; set; }
        public string? BankIfsc { get; set; }
        public bool IsApproved { get; set; } = false;
        public decimal TotalSales { get; set; } = 0;
        public decimal Rating { get; set; } = 0;
        public int ReviewCount { get; set; } = 0;
        // Premium seller
        public bool IsPremium { get; set; } = false;
        public string PremiumPlan { get; set; } = "free"; // free | premium
        public DateTime? PremiumExpiresAt { get; set; }
        // Women empowerment
        public bool IsWomenLed { get; set; } = false;
        public string? WomenStory { get; set; }
        public User User { get; set; } = null!;
        public ICollection<Product> Products { get; set; } = new List<Product>();
    }

    public class Product : BaseEntity
    {
        public string Name { get; set; } = "";
        public string Slug { get; set; } = "";
        public string? Description { get; set; }
        public int CategoryId { get; set; }
        public int FarmerId { get; set; }
        public decimal Price { get; set; }
        public decimal? OriginalPrice { get; set; }
        public string Unit { get; set; } = "kg"; // kg | g | piece | litre | dozen
        public decimal MinOrderQty { get; set; } = 1;
        public int StockQuantity { get; set; } = 0;
        public string? ImageUrl { get; set; }
        public List<string> ImageUrls { get; set; } = new();
        public bool IsOrganic { get; set; } = true;
        public bool IsFeatured { get; set; } = false;
        public bool IsActive { get; set; } = true;
        public decimal Rating { get; set; } = 0;
        public int ReviewCount { get; set; } = 0;
        // Extended seller fields
        public string? Subcategory { get; set; }
        public List<string> Tags { get; set; } = new();
        public string? Village { get; set; }
        public string? CertificationType { get; set; }
        public List<string> QuantityOptions { get; set; } = new();
        public DateTime? HarvestDate { get; set; }
        public int? ShelfLifeDays { get; set; }
        public string? FreshnessGuarantee { get; set; }
        public string? DeliveryTime { get; set; }
        public List<string> AvailableCities { get; set; } = new();
        public bool IsFarmToHome { get; set; } = false;
        public string Status { get; set; } = "approved"; // pending | approved | rejected
        public Category Category { get; set; } = null!;
        public FarmerProfile Farmer { get; set; } = null!;
        public ICollection<OrderItem> OrderItems { get; set; } = new List<OrderItem>();
        public ICollection<Review> Reviews { get; set; } = new List<Review>();
        public ICollection<WishlistItem> WishlistItems { get; set; } = new List<WishlistItem>();
        public ICollection<CartItem> CartItems { get; set; } = new List<CartItem>();
    }

    public class Cart : BaseEntity
    {
        public int UserId { get; set; }
        public User User { get; set; } = null!;
        public ICollection<CartItem> Items { get; set; } = new List<CartItem>();
    }

    public class CartItem : BaseEntity
    {
        public int CartId { get; set; }
        public int ProductId { get; set; }
        public decimal Quantity { get; set; }
        public Cart Cart { get; set; } = null!;
        public Product Product { get; set; } = null!;
    }

    public class Order : BaseEntity
    {
        public string OrderNumber { get; set; } = "";
        public int UserId { get; set; }
        public int AddressId { get; set; }
        public int? SubscriptionId { get; set; }
        public string Status { get; set; } = "pending"; // pending|confirmed|processing|shipped|delivered|cancelled|refunded
        public string PaymentMethod { get; set; } = "razorpay"; // razorpay|stripe|cod
        public string PaymentStatus { get; set; } = "pending"; // pending|paid|failed|refunded
        public decimal Subtotal { get; set; }
        public decimal DeliveryCharge { get; set; } = 0;
        public decimal DiscountAmount { get; set; } = 0;
        public decimal TaxAmount { get; set; } = 0;
        public decimal TotalAmount { get; set; }
        public string? CouponCode { get; set; }
        public string? Notes { get; set; }
        public DateTime? EstimatedDelivery { get; set; }
        public DateTime? DeliveredAt { get; set; }
        public User User { get; set; } = null!;
        public Address Address { get; set; } = null!;
        public ICollection<OrderItem> Items { get; set; } = new List<OrderItem>();
        public ICollection<Payment> Payments { get; set; } = new List<Payment>();
        public ICollection<OrderStatusHistory> StatusHistory { get; set; } = new List<OrderStatusHistory>();
    }

    public class OrderItem : BaseEntity
    {
        public int OrderId { get; set; }
        public int ProductId { get; set; }
        public string ProductName { get; set; } = "";
        public decimal Quantity { get; set; }
        public string Unit { get; set; } = "kg";
        public decimal UnitPrice { get; set; }
        public decimal TotalPrice { get; set; }
        public Order Order { get; set; } = null!;
        public Product Product { get; set; } = null!;
    }

    public class OrderStatusHistory : BaseEntity
    {
        public int OrderId { get; set; }
        public string Status { get; set; } = "";
        public string? Note { get; set; }
        public int? UpdatedByUserId { get; set; }
        public Order Order { get; set; } = null!;
    }

    public class Payment : BaseEntity
    {
        public int OrderId { get; set; }
        public string Provider { get; set; } = ""; // razorpay|stripe|cod|upi
        public string? ProviderOrderId { get; set; }
        public string? ProviderPaymentId { get; set; }
        public string? ProviderSignature { get; set; }
        public decimal Amount { get; set; }
        public string Currency { get; set; } = "INR";
        public string Status { get; set; } = "pending"; // pending|success|failed|refunded
        public string? FailureReason { get; set; }
        // UPI QR fields
        public string? UpiString { get; set; }
        public DateTime? ExpiresAt { get; set; }
        public string? UpiTransactionRef { get; set; }
        public Order Order { get; set; } = null!;
    }

    public class Review : BaseEntity
    {
        public int ProductId { get; set; }
        public int UserId { get; set; }
        public int OrderId { get; set; }
        public int Rating { get; set; } // 1-5
        public string? Comment { get; set; }
        public List<string> ImageUrls { get; set; } = new();
        public bool IsVerifiedPurchase { get; set; } = false;
        public Product Product { get; set; } = null!;
        public User User { get; set; } = null!;
    }

    public class WishlistItem : BaseEntity
    {
        public int UserId { get; set; }
        public int ProductId { get; set; }
        public User User { get; set; } = null!;
        public Product Product { get; set; } = null!;
    }

    public class Coupon : BaseEntity
    {
        public string Code { get; set; } = "";
        public string? Description { get; set; }
        public string DiscountType { get; set; } = "Percentage"; // Percentage|Fixed
        public decimal DiscountValue { get; set; }
        public decimal MinOrderAmount { get; set; } = 0;
        public decimal? MaxDiscountAmount { get; set; }
        public int? UsageLimit { get; set; }
        public int UsedCount { get; set; } = 0;
        public DateTime? ExpiryDate { get; set; }
        public bool IsActive { get; set; } = true;
    }

    public class Notification : BaseEntity
    {
        public int UserId { get; set; }
        public string Title { get; set; } = "";
        public string Body { get; set; } = "";
        public string Type { get; set; } = "system"; // order|promo|system|announce
        public string? ActionUrl { get; set; }
        public bool IsRead { get; set; } = false;
        public User User { get; set; } = null!;
    }

    // ── Subscription ─────────────────────────────────────────────────────────
    public class Subscription : BaseEntity
    {
        public int UserId { get; set; }
        public int AddressId { get; set; }
        public string BoxType { get; set; } = "vegetable"; // vegetable | fruit | custom
        public string Frequency { get; set; } = "weekly";  // weekly | monthly
        public string Status { get; set; } = "active";     // active | paused | cancelled
        public decimal Price { get; set; }
        public DateTime StartDate { get; set; } = DateTime.UtcNow;
        public DateTime? EndDate { get; set; }
        public DateTime NextDeliveryDate { get; set; }
        public DateTime? PausedAt { get; set; }
        public string? Notes { get; set; }
        public User User { get; set; } = null!;
        public Address Address { get; set; } = null!;
        public ICollection<SubscriptionItem> Items { get; set; } = new List<SubscriptionItem>();
        public ICollection<Order> GeneratedOrders { get; set; } = new List<Order>();
    }

    public class SubscriptionItem : BaseEntity
    {
        public int SubscriptionId { get; set; }
        public int ProductId { get; set; }
        public decimal Quantity { get; set; } = 1;
        public Subscription Subscription { get; set; } = null!;
        public Product Product { get; set; } = null!;
    }

    // ── Product Bundle ────────────────────────────────────────────────────────
    public class ProductBundle : BaseEntity
    {
        public string Name { get; set; } = "";
        public string Slug { get; set; } = "";
        public string? Description { get; set; }
        public string? ImageUrl { get; set; }
        public decimal DiscountPercent { get; set; } = 0; // e.g. 10 = 10% off
        public bool IsActive { get; set; } = true;
        public ICollection<BundleItem> Items { get; set; } = new List<BundleItem>();
    }

    public class BundleItem : BaseEntity
    {
        public int BundleId { get; set; }
        public int ProductId { get; set; }
        public int Quantity { get; set; } = 1;
        public ProductBundle Bundle { get; set; } = null!;
        public Product Product { get; set; } = null!;
    }

    // ── Price Drop Alert ──────────────────────────────────────────────────────
    public class PriceDropAlert : BaseEntity
    {
        public int UserId { get; set; }
        public int ProductId { get; set; }
        public decimal TargetPrice { get; set; }   // alert when price drops to or below this
        public bool IsTriggered { get; set; } = false;
        public DateTime? TriggeredAt { get; set; }
        public User User { get; set; } = null!;
        public Product Product { get; set; } = null!;
    }

    // ── Referral System ───────────────────────────────────────────────────────
    public class ReferralCode : BaseEntity
    {
        public int UserId { get; set; }
        public string Code { get; set; } = "";          // unique invite code e.g. VC-ABC123
        public int UsageCount { get; set; } = 0;
        public bool IsActive { get; set; } = true;
        public User User { get; set; } = null!;
        public ICollection<Referral> Referrals { get; set; } = new List<Referral>();
    }

    public class Referral : BaseEntity
    {
        public int ReferralCodeId { get; set; }
        public int ReferrerId { get; set; }             // user who owns the code
        public int ReferredUserId { get; set; }         // user who used the code
        public string Status { get; set; } = "pending"; // pending | completed
        public decimal CreditsAwarded { get; set; } = 0;
        public DateTime? CompletedAt { get; set; }
        public ReferralCode ReferralCode { get; set; } = null!;
        public User Referrer { get; set; } = null!;
        public User ReferredUser { get; set; } = null!;
        public ICollection<WalletCredit> Credits { get; set; } = new List<WalletCredit>();
    }

    public class WalletCredit : BaseEntity
    {
        public int UserId { get; set; }
        public decimal Amount { get; set; }
        public string Type { get; set; } = "earned";   // earned | redeemed | expired
        public string Description { get; set; } = "";
        public int? ReferralId { get; set; }
        public User User { get; set; } = null!;
        public Referral? Referral { get; set; }
    }
}
