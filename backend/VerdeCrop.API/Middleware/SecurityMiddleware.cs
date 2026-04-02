using System.Text;
using System.Text.Json;
using Ganss.Xss;
using Microsoft.AspNetCore.Http.Features;
using Serilog;

namespace VerdeCrop.API.Middleware
{
    // ── Security Headers Middleware ───────────────────────────────────────────
    // Adds OWASP-recommended HTTP security headers to every response.
    public class SecurityHeadersMiddleware(RequestDelegate next)
    {
        public async Task InvokeAsync(HttpContext context)
        {
            var headers = context.Response.Headers;

            // Prevent the page from being framed (clickjacking protection)
            headers["X-Frame-Options"] = "DENY";

            // Stop browsers from MIME-sniffing the response type
            headers["X-Content-Type-Options"] = "nosniff";

            // Restrict referrer info sent with requests
            headers["Referrer-Policy"] = "strict-origin-when-cross-origin";

            // Disable browser features we don't use
            headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()";

            // Remove server banner
            headers.Remove("Server");
            headers.Remove("X-Powered-By");

            // Content-Security-Policy: tight policy — only allow our own origin + CDN fonts
            headers["Content-Security-Policy"] =
                "default-src 'self'; " +
                "script-src 'self'; " +
                "style-src 'self' https://fonts.googleapis.com; " +
                "font-src 'self' https://fonts.gstatic.com; " +
                "img-src 'self' data: https://verdecropblob.blob.core.windows.net; " +
                "connect-src 'self'; " +
                "frame-ancestors 'none';";

            await next(context);
        }
    }

    // ── XSS Sanitization Middleware ───────────────────────────────────────────
    // Sanitizes the JSON request body to strip any HTML/script injection before
    // it reaches any controller or service.
    public class XssSanitizationMiddleware(RequestDelegate next)
    {
        private static readonly HtmlSanitizer Sanitizer = new();
        private static readonly HashSet<string> SkipPaths = new(StringComparer.OrdinalIgnoreCase)
        {
            "/api/payments/stripe/webhook"   // raw body needed for signature verification
        };

        public async Task InvokeAsync(HttpContext context)
        {
            if (!SkipPaths.Contains(context.Request.Path) &&
                context.Request.ContentType?.Contains("application/json", StringComparison.OrdinalIgnoreCase) == true &&
                context.Request.ContentLength > 0)
            {
                context.Request.EnableBuffering();
                var body = await new StreamReader(context.Request.Body, Encoding.UTF8, leaveOpen: true).ReadToEndAsync();
                context.Request.Body.Position = 0;

                if (!string.IsNullOrWhiteSpace(body))
                {
                    var sanitized = SanitizeJson(body);
                    if (sanitized != body)
                    {
                        Log.Warning("XSS attempt detected from {IP} on {Path}",
                            context.Connection.RemoteIpAddress, context.Request.Path);
                    }
                    var bytes = Encoding.UTF8.GetBytes(sanitized);
                    context.Request.Body = new MemoryStream(bytes);
                    context.Request.ContentLength = bytes.Length;
                }
            }

            await next(context);
        }

        private static string SanitizeJson(string json)
        {
            try
            {
                using var doc = JsonDocument.Parse(json);
                var sanitized = SanitizeElement(doc.RootElement);
                return JsonSerializer.Serialize(sanitized);
            }
            catch
            {
                // If JSON parsing fails, return as-is and let model binding reject it
                return json;
            }
        }

        private static object? SanitizeElement(JsonElement element) => element.ValueKind switch
        {
            JsonValueKind.Object => SanitizeObject(element),
            JsonValueKind.Array  => element.EnumerateArray().Select(SanitizeElement).ToList(),
            JsonValueKind.String => Sanitizer.Sanitize(element.GetString() ?? ""),
            _                    => JsonSerializer.Deserialize<object>(element.GetRawText())
        };

        private static Dictionary<string, object?> SanitizeObject(JsonElement element)
        {
            var dict = new Dictionary<string, object?>();
            foreach (var prop in element.EnumerateObject())
                dict[prop.Name] = SanitizeElement(prop.Value);
            return dict;
        }
    }

    // ── Global Exception Handler Middleware ────────────────────────────────────
    // Catches all unhandled exceptions and returns a clean, safe response.
    // Never leaks stack traces or internal error details to the client in production.
    public class GlobalExceptionMiddleware(RequestDelegate next, IWebHostEnvironment env)
    {
        public async Task InvokeAsync(HttpContext context)
        {
            try
            {
                await next(context);
            }
            catch (Exception ex)
            {
                Log.Error(ex, "Unhandled exception for {Method} {Path} from {IP}",
                    context.Request.Method,
                    context.Request.Path,
                    context.Connection.RemoteIpAddress);

                context.Response.StatusCode = 500;
                context.Response.ContentType = "application/json";

                var message = env.IsDevelopment()
                    ? ex.Message
                    : "An internal error occurred. Please try again later.";

                await context.Response.WriteAsJsonAsync(new { success = false, message });
            }
        }
    }
}
