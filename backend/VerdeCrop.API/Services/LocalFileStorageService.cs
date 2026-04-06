using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using VerdeCrop.Application.Interfaces;

namespace VerdeCrop.API.Services
{
    // Saves uploaded files to wwwroot/uploads/{folder}/ and returns a root-relative URL.
    // The URL is served by app.UseStaticFiles() at runtime.
    // When Azure:BlobStorage:ConnectionString is set, AzureBlobStorageService is used instead.
    public class LocalFileStorageService : IStorageService
    {
        private readonly string _wwwRoot;

        public LocalFileStorageService(IWebHostEnvironment env)
        {
            _wwwRoot = env.WebRootPath ?? Path.Combine(env.ContentRootPath, "wwwroot");
        }

        public async Task<string> UploadAsync(Stream fileStream, string fileName, string folder)
        {
            var uploadsDir = Path.Combine(_wwwRoot, "uploads", folder);
            Directory.CreateDirectory(uploadsDir);

            var ext = Path.GetExtension(fileName);
            var uniqueName = $"{Guid.NewGuid():N}{ext}";
            var filePath = Path.Combine(uploadsDir, uniqueName);

            using var fs = new FileStream(filePath, FileMode.Create, FileAccess.Write, FileShare.None);
            await fileStream.CopyToAsync(fs);

            // Root-relative URL — resolveAssetUrl() on the frontend will prepend CDN_BASE_URL
            return $"/uploads/{folder}/{uniqueName}";
        }

        public Task DeleteAsync(string url)
        {
            try
            {
                var relativePath = url.TrimStart('/').Replace('/', Path.DirectorySeparatorChar);
                var fullPath = Path.Combine(_wwwRoot, relativePath);
                if (File.Exists(fullPath))
                    File.Delete(fullPath);
            }
            catch { /* best-effort */ }
            return Task.CompletedTask;
        }
    }
}
