using System.Text.Json;
using Microsoft.Extensions.Caching.Distributed;
using VerdeCrop.Application.Interfaces;

namespace VerdeCrop.Infrastructure.Services
{
    public class MemoryCacheService : ICacheService
    {
        private readonly IDistributedCache _cache;

        public MemoryCacheService(IDistributedCache cache)
        {
            _cache = cache;
        }

        public async Task SetAsync<T>(string key, T value, TimeSpan? expiry = null)
        {
            var json = JsonSerializer.Serialize(value);

            var options = new DistributedCacheEntryOptions();
            if (expiry.HasValue)
                options.AbsoluteExpirationRelativeToNow = expiry.Value;
            else
                options.AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(30);

            await _cache.SetStringAsync(key, json, options);
        }

        public async Task<T?> GetAsync<T>(string key)
        {
            var json = await _cache.GetStringAsync(key);

            if (json == null)
                return default;

            return JsonSerializer.Deserialize<T>(json);
        }

        public async Task DeleteAsync(string key)
        {
            await _cache.RemoveAsync(key);
        }

        public async Task DeleteByPrefixAsync(string prefix)
        {
            // DistributedMemoryCache doesn't support scanning keys — NO-OP for now
            await Task.CompletedTask;
        }
    }
}