using Microsoft.EntityFrameworkCore;
using VerdeCrop.Domain.Entities;

namespace VerdeCrop.Infrastructure.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        public DbSet<User> Users => Set<User>();
        public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
        public DbSet<OtpCode> OtpCodes => Set<OtpCode>();
        public DbSet<Address> Addresses => Set<Address>();
        public DbSet<Category> Categories => Set<Category>();
        public DbSet<FarmerProfile> FarmerProfiles => Set<FarmerProfile>();
        public DbSet<Product> Products => Set<Product>();
        public DbSet<Cart> Carts => Set<Cart>();
        public DbSet<CartItem> CartItems => Set<CartItem>();
        public DbSet<Order> Orders => Set<Order>();
        public DbSet<OrderItem> OrderItems => Set<OrderItem>();
        public DbSet<OrderStatusHistory> OrderStatusHistories => Set<OrderStatusHistory>();
        public DbSet<Payment> Payments => Set<Payment>();
        public DbSet<Review> Reviews => Set<Review>();
        public DbSet<WishlistItem> WishlistItems => Set<WishlistItem>();
        public DbSet<Coupon> Coupons => Set<Coupon>();
        public DbSet<Notification> Notifications => Set<Notification>();
        public DbSet<Subscription> Subscriptions => Set<Subscription>();
        public DbSet<SubscriptionItem> SubscriptionItems => Set<SubscriptionItem>();
        public DbSet<ProductBundle> ProductBundles => Set<ProductBundle>();
        public DbSet<BundleItem> BundleItems => Set<BundleItem>();
        public DbSet<PriceDropAlert> PriceDropAlerts => Set<PriceDropAlert>();
        public DbSet<ReferralCode> ReferralCodes => Set<ReferralCode>();
        public DbSet<Referral> Referrals => Set<Referral>();
        public DbSet<WalletCredit> WalletCredits => Set<WalletCredit>();

        protected override void OnModelCreating(ModelBuilder mb)
        {
            base.OnModelCreating(mb);

            // ===============================
            // 🔥 FIX ALL CASCADE ISSUES
            // ===============================

            // Product relations (Restrict)
            mb.Entity<CartItem>()
                .HasOne(ci => ci.Product)
                .WithMany(p => p.CartItems)
                .HasForeignKey(ci => ci.ProductId)
                .OnDelete(DeleteBehavior.Restrict);

            mb.Entity<OrderItem>()
                .HasOne(oi => oi.Product)
                .WithMany(p => p.OrderItems)
                .HasForeignKey(oi => oi.ProductId)
                .OnDelete(DeleteBehavior.Restrict);

            mb.Entity<Review>()
                .HasOne(r => r.Product)
                .WithMany(p => p.Reviews)
                .HasForeignKey(r => r.ProductId)
                .OnDelete(DeleteBehavior.Restrict);

            mb.Entity<WishlistItem>()
                .HasOne(w => w.Product)
                .WithMany(p => p.WishlistItems)
                .HasForeignKey(w => w.ProductId)
                .OnDelete(DeleteBehavior.Restrict);

            // Order relations (Restrict)
            mb.Entity<Order>()
                .HasOne(o => o.User)
                .WithMany(u => u.Orders)
                .HasForeignKey(o => o.UserId)
                .OnDelete(DeleteBehavior.Restrict);

            mb.Entity<Order>()
                .HasOne(o => o.Address)
                .WithMany()
                .HasForeignKey(o => o.AddressId)
                .OnDelete(DeleteBehavior.Restrict);

            // 🔥 IMPORTANT: Cart → User (Restrict)
            mb.Entity<Cart>()
                .HasOne(c => c.User)
                .WithMany()
                .HasForeignKey(c => c.UserId)
                .OnDelete(DeleteBehavior.Restrict);

            // ===============================
            // USER CONFIG
            // ===============================
            mb.Entity<User>(e => {
                e.HasIndex(u => u.Email).IsUnique().HasFilter("[Email] IS NOT NULL");
                e.HasIndex(u => u.Phone).IsUnique().HasFilter("[Phone] IS NOT NULL");
                e.HasQueryFilter(u => !u.IsDeleted);
            });

            // ===============================
            // PRECISION CONFIG
            // ===============================
            mb.Entity<Product>(e => {
                e.Property(p => p.Price).HasPrecision(10, 2);
                e.Property(p => p.OriginalPrice).HasPrecision(10, 2);
                e.Property(p => p.Rating).HasPrecision(3, 2);
                e.Property(p => p.MinOrderQty).HasPrecision(8, 3);
                e.Property(p => p.ImageUrls).HasConversion(
                    v => string.Join(',', v),
                    v => v.Split(',', StringSplitOptions.RemoveEmptyEntries).ToList());
                e.Property(p => p.KeyFeatures).HasConversion(
                    v => string.Join('\x1F', v),
                    v => v.Split('\x1F', StringSplitOptions.RemoveEmptyEntries).ToList());
            });

            mb.Entity<FarmerProfile>(e => {
                e.Property(f => f.TotalSales).HasPrecision(18, 2);
                e.Property(f => f.Rating).HasPrecision(3, 2);
            });

            mb.Entity<Order>(e => {
                e.Property(o => o.Subtotal).HasPrecision(10, 2);
                e.Property(o => o.DeliveryCharge).HasPrecision(10, 2);
                e.Property(o => o.DiscountAmount).HasPrecision(10, 2);
                e.Property(o => o.TaxAmount).HasPrecision(10, 2);
                e.Property(o => o.TotalAmount).HasPrecision(10, 2);
                e.HasIndex(o => o.OrderNumber).IsUnique();
            });

            mb.Entity<OrderItem>(e => {
                e.Property(i => i.Quantity).HasPrecision(8, 3);
                e.Property(i => i.UnitPrice).HasPrecision(10, 2);
                e.Property(i => i.TotalPrice).HasPrecision(10, 2);
            });

            mb.Entity<Payment>(e => {
                e.Property(p => p.Amount).HasPrecision(10, 2);
            });

            mb.Entity<Coupon>(e => {
                e.Property(c => c.DiscountValue).HasPrecision(10, 2);
                e.Property(c => c.MinOrderAmount).HasPrecision(10, 2);
                e.Property(c => c.MaxDiscountAmount).HasPrecision(10, 2);
                e.HasIndex(c => c.Code).IsUnique();
            });

            mb.Entity<CartItem>(e => {
                e.Property(i => i.Quantity).HasPrecision(8, 3);
            });

            mb.Entity<Review>(e => {
                e.Property(r => r.ImageUrls).HasConversion(
                    v => string.Join(',', v),
                    v => v.Split(',', StringSplitOptions.RemoveEmptyEntries).ToList());
            });

            mb.Entity<WishlistItem>(e => {
                e.HasIndex(w => new { w.UserId, w.ProductId }).IsUnique();
            });

            // ===============================
            // SAFE CASCADE (Allowed)
            // ===============================
            mb.Entity<CartItem>()
                .HasOne(i => i.Cart)
                .WithMany(c => c.Items)
                .OnDelete(DeleteBehavior.Cascade);

            mb.Entity<OrderItem>()
                .HasOne(i => i.Order)
                .WithMany(o => o.Items)
                .OnDelete(DeleteBehavior.Cascade);

            mb.Entity<OrderStatusHistory>()
                .HasOne(h => h.Order)
                .WithMany(o => o.StatusHistory)
                .OnDelete(DeleteBehavior.Cascade);

            mb.Entity<Payment>()
                .HasOne(p => p.Order)
                .WithMany(o => o.Payments)
                .OnDelete(DeleteBehavior.Cascade);

            // ===============================
            // SUBSCRIPTION CONFIG
            // ===============================
            mb.Entity<Subscription>(e => {
                e.Property(s => s.Price).HasPrecision(10, 2);
                e.HasOne(s => s.User).WithMany().HasForeignKey(s => s.UserId).OnDelete(DeleteBehavior.Restrict);
                e.HasOne(s => s.Address).WithMany().HasForeignKey(s => s.AddressId).OnDelete(DeleteBehavior.Restrict);
            });

            mb.Entity<SubscriptionItem>(e => {
                e.Property(i => i.Quantity).HasPrecision(8, 3);
                e.HasOne(i => i.Subscription).WithMany(s => s.Items).HasForeignKey(i => i.SubscriptionId).OnDelete(DeleteBehavior.Cascade);
                e.HasOne(i => i.Product).WithMany().HasForeignKey(i => i.ProductId).OnDelete(DeleteBehavior.Restrict);
            });

            mb.Entity<Order>(e2 => {
                e2.HasOne<Subscription>().WithMany(s => s.GeneratedOrders).HasForeignKey(o => o.SubscriptionId).IsRequired(false).OnDelete(DeleteBehavior.SetNull);
            });

            // ===============================
            // BUNDLE & PRICE ALERT CONFIG
            // ===============================
            mb.Entity<ProductBundle>(e => {
                e.Property(b => b.DiscountPercent).HasPrecision(5, 2);
                e.HasIndex(b => b.Slug).IsUnique();
            });

            mb.Entity<BundleItem>(e => {
                e.HasOne(i => i.Bundle).WithMany(b => b.Items).HasForeignKey(i => i.BundleId).OnDelete(DeleteBehavior.Cascade);
                e.HasOne(i => i.Product).WithMany().HasForeignKey(i => i.ProductId).OnDelete(DeleteBehavior.Restrict);
                e.HasIndex(i => new { i.BundleId, i.ProductId }).IsUnique();
            });

            mb.Entity<PriceDropAlert>(e => {
                e.Property(a => a.TargetPrice).HasPrecision(10, 2);
                e.HasOne(a => a.User).WithMany().HasForeignKey(a => a.UserId).OnDelete(DeleteBehavior.Cascade);
                e.HasOne(a => a.Product).WithMany().HasForeignKey(a => a.ProductId).OnDelete(DeleteBehavior.Restrict);
                e.HasIndex(a => new { a.UserId, a.ProductId }).IsUnique();
            });

            // ===============================
            // REFERRAL CONFIG
            // ===============================
            mb.Entity<ReferralCode>(e => {
                e.HasOne(rc => rc.User)
                    .WithOne(u => u.ReferralCode)
                    .HasForeignKey<ReferralCode>(rc => rc.UserId)
                    .OnDelete(DeleteBehavior.Cascade);
                e.HasIndex(rc => rc.Code).IsUnique();
            });

            mb.Entity<Referral>(e => {
                e.Property(r => r.CreditsAwarded).HasPrecision(10, 2);
                e.HasOne(r => r.ReferralCode)
                    .WithMany(rc => rc.Referrals)
                    .HasForeignKey(r => r.ReferralCodeId)
                    .OnDelete(DeleteBehavior.Cascade);
                e.HasOne(r => r.Referrer)
                    .WithMany(u => u.ReferralsGiven)
                    .HasForeignKey(r => r.ReferrerId)
                    .OnDelete(DeleteBehavior.Restrict);
                e.HasOne(r => r.ReferredUser)
                    .WithMany(u => u.ReferralsReceived)
                    .HasForeignKey(r => r.ReferredUserId)
                    .OnDelete(DeleteBehavior.Restrict);
                e.HasIndex(r => r.ReferredUserId).IsUnique(); // each user can only be referred once
            });

            mb.Entity<WalletCredit>(e => {
                e.Property(w => w.Amount).HasPrecision(10, 2);
                e.HasOne(w => w.User)
                    .WithMany(u => u.WalletCredits)
                    .HasForeignKey(w => w.UserId)
                    .OnDelete(DeleteBehavior.Cascade);
                e.HasOne(w => w.Referral)
                    .WithMany(r => r.Credits)
                    .HasForeignKey(w => w.ReferralId)
                    .IsRequired(false)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            // ===============================
            // SEED DATA
            // ===============================
            mb.Entity<Category>().HasData(
                new Category { Id = 1, Name = "Vegetables", Slug = "vegetables", IconUrl = "🥦", DisplayOrder = 1, IsActive = true, ShowOnHome = true, CreatedAt = DateTime.UtcNow },
                new Category { Id = 2, Name = "Fruits", Slug = "fruits", IconUrl = "🍎", DisplayOrder = 2, IsActive = true, ShowOnHome = true, CreatedAt = DateTime.UtcNow },
                new Category { Id = 3, Name = "Grains & Pulses", Slug = "grains-pulses", IconUrl = "🌾", DisplayOrder = 3, IsActive = true, ShowOnHome = true, CreatedAt = DateTime.UtcNow },
                new Category { Id = 4, Name = "Dairy", Slug = "dairy", IconUrl = "🥛", DisplayOrder = 4, IsActive = true, ShowOnHome = true, CreatedAt = DateTime.UtcNow },
                new Category { Id = 5, Name = "Herbs & Spices", Slug = "herbs-spices", IconUrl = "🌿", DisplayOrder = 5, IsActive = true, ShowOnHome = true, CreatedAt = DateTime.UtcNow },
                new Category { Id = 6, Name = "Honey & Jam", Slug = "honey-jam", IconUrl = "🍯", DisplayOrder = 6, IsActive = true, ShowOnHome = true, CreatedAt = DateTime.UtcNow }
            );
        }
    }
}
