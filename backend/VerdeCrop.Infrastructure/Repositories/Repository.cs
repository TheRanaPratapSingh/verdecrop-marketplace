using System;
using System.Collections.Generic;
using System.Linq;
using System.Linq.Expressions;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using VerdeCrop.Application.Interfaces;
using VerdeCrop.Domain.Entities;
using VerdeCrop.Infrastructure.Data;


namespace VerdeCrop.Infrastructure.Repositories
{
   
   
    public class Repository<T> : IRepository<T> where T : BaseEntity
    {
        protected readonly AppDbContext _ctx;
        protected readonly DbSet<T> _set;

        public Repository(AppDbContext ctx)
        {
            _ctx = ctx;
            _set = ctx.Set<T>();
        }

        public async Task<T?> GetByIdAsync(int id) => await _set.FindAsync(id);

        public async Task<T?> FirstOrDefaultAsync(Expression<Func<T, bool>> predicate)
            => await _set.FirstOrDefaultAsync(predicate);

        public async Task<List<T>> GetAllAsync(Expression<Func<T, bool>>? predicate = null)
            => predicate != null ? await _set.Where(predicate).ToListAsync() : await _set.ToListAsync();

        public async Task<(List<T> Items, int Total)> GetPagedAsync(
            Expression<Func<T, bool>>? predicate, int page, int pageSize,
            Func<IQueryable<T>, IOrderedQueryable<T>>? orderBy = null)
        {
            var q = predicate != null ? _set.Where(predicate) : _set.AsQueryable();
            var total = await q.CountAsync();
            if (orderBy != null) q = orderBy(q);
            var items = await q.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();
            return (items, total);
        }

        public async Task<T> AddAsync(T entity)
        {
            entity.CreatedAt = DateTime.UtcNow;
            await _set.AddAsync(entity);
            return entity;
        }

        public Task UpdateAsync(T entity)
        {
            entity.UpdatedAt = DateTime.UtcNow;
            _set.Update(entity);
            return Task.CompletedTask;
        }

        public Task DeleteAsync(T entity)
        {
            _set.Remove(entity);
            return Task.CompletedTask;
        }

        public async Task<bool> ExistsAsync(Expression<Func<T, bool>> predicate)
            => await _set.AnyAsync(predicate);

        public IQueryable<T> Query() => _set.AsQueryable();
    }

    public class UnitOfWork : IUnitOfWork
    {
        private readonly AppDbContext _ctx;

        public UnitOfWork(AppDbContext ctx)
        {
            _ctx = ctx;
            Users = new Repository<User>(ctx);
            RefreshTokens = new Repository<RefreshToken>(ctx);
            OtpCodes = new Repository<OtpCode>(ctx);
            Addresses = new Repository<Address>(ctx);
            Categories = new Repository<Category>(ctx);
            FarmerProfiles = new Repository<FarmerProfile>(ctx);
            Products = new Repository<Product>(ctx);
            Carts = new Repository<Cart>(ctx);
            CartItems = new Repository<CartItem>(ctx);
            Orders = new Repository<Order>(ctx);
            OrderItems = new Repository<OrderItem>(ctx);
            OrderStatusHistories = new Repository<OrderStatusHistory>(ctx);
            Payments = new Repository<Payment>(ctx);
            Reviews = new Repository<Review>(ctx);
            WishlistItems = new Repository<WishlistItem>(ctx);
            Coupons = new Repository<Coupon>(ctx);
            Notifications = new Repository<Notification>(ctx);
            Subscriptions = new Repository<Subscription>(ctx);
            SubscriptionItems = new Repository<SubscriptionItem>(ctx);
        }

        public IRepository<User> Users { get; }
        public IRepository<RefreshToken> RefreshTokens { get; }
        public IRepository<OtpCode> OtpCodes { get; }
        public IRepository<Address> Addresses { get; }
        public IRepository<Category> Categories { get; }
        public IRepository<FarmerProfile> FarmerProfiles { get; }
        public IRepository<Product> Products { get; }
        public IRepository<Cart> Carts { get; }
        public IRepository<CartItem> CartItems { get; }
        public IRepository<Order> Orders { get; }
        public IRepository<OrderItem> OrderItems { get; }
        public IRepository<OrderStatusHistory> OrderStatusHistories { get; }
        public IRepository<Payment> Payments { get; }
        public IRepository<Review> Reviews { get; }
        public IRepository<WishlistItem> WishlistItems { get; }
        public IRepository<Coupon> Coupons { get; }
        public IRepository<Notification> Notifications { get; }
        public IRepository<Subscription> Subscriptions { get; }
        public IRepository<SubscriptionItem> SubscriptionItems { get; }

        public Task<int> SaveChangesAsync() => _ctx.SaveChangesAsync();
        public void Dispose() => _ctx.Dispose();
    }
}
