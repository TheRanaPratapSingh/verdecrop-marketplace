using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using VerdeCrop.Application.Interfaces;

namespace VerdeCrop.API.Services
{
    // Development-only fallback: saves files to wwwroot/uploads/{folder}/ and returns
    // a root-relative URL served by app.UseStaticFiles().
    // In production, AzureBlobStorageService is always used instead.
    public class LocalFileStorageService : IStorageService
    {
        private static readonly HashSet<string> _allowedExtensions =
            new(StringComparer.OrdinalIgnoreCase) { ".jpg", ".jpeg", ".png", ".webp" };

        private readonly string _wwwRoot;

        public LocalFileStorageService(IWebHostEnvironment env)
        {
            _wwwRoot = env.WebRootPath ?? Path.Combine(env.ContentRootPath, "wwwroot");
        }

        public async Task<string> UploadAsync(Stream fileStream, string fileName, string folder, string? contentType = null)
        {
            var ext = Path.GetExtension(fileName);
            if (!_allowedExtensions.Contains(ext))
                throw new ArgumentException(
                    $"File extension '{ext}' is not allowed. Accepted: {string.Join(", ", _allowedExtensions)}");

            var uploadsDir = Path.Combine(_wwwRoot, "uploads", folder);
            Directory.CreateDirectory(uploadsDir);

            var uniqueName = $"{Guid.NewGuid():N}{ext.ToLowerInvariant()}";
            var filePath = Path.Combine(uploadsDir, uniqueName);

            using var fs = new FileStream(filePath, FileMode.Create, FileAccess.Write, FileShare.None);
            await fileStream.CopyToAsync(fs);

            return $"/uploads/{folder}/{uniqueName}";
        }

        public Task DeleteAsync(string url)
        {
            try
            {
                var relativePath = url.TrimStart('/').Replace('/', Path.DirectorySeparatorChar);
                var fullPath = Path.Combine(_wwwRoot, relativePath);
                if (File.Exists(fullPath)) File.Delete(fullPath);
            }
            catch { /* best-effort */ }
            return Task.CompletedTask;
        }
    }
}

