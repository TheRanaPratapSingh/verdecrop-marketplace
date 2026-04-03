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
        public string Provider { get; set; } = ""; // razorpay|stripe|cod
        public string? ProviderOrderId { get; set; }
        public string? ProviderPaymentId { get; set; }
        public string? ProviderSignature { get; set; }
        public decimal Amount { get; set; }
        public string Currency { get; set; } = "INR";
        public string Status { get; set; } = "pending"; // pending|success|failed|refunded
        public string? FailureReason { get; set; }
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
}
