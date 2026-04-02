using System.ComponentModel.DataAnnotations;
using System.Text.RegularExpressions;

namespace VerdeCrop.API.Security
{
    // ── Input Validator ───────────────────────────────────────────────────────
    // Server-side validation helpers. Never trust frontend values.
    public static partial class InputValidator
    {
        // Valid slug: lowercase letters, digits, hyphens only (no path traversal)
        [GeneratedRegex(@"^[a-z0-9\-]{1,100}$")]
        private static partial Regex SlugRegex();

        // Valid sort-by values (whitelist approach)
        private static readonly HashSet<string> AllowedSortValues = new(StringComparer.OrdinalIgnoreCase)
        {
            "newest", "oldest", "price_asc", "price_desc", "rating", "popular"
        };

        // Allowed order statuses
        private static readonly HashSet<string> AllowedOrderStatuses = new(StringComparer.OrdinalIgnoreCase)
        {
            "pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "refunded"
        };

        // Allowed payment methods
        private static readonly HashSet<string> AllowedPaymentMethods = new(StringComparer.OrdinalIgnoreCase)
        {
            "razorpay", "stripe", "cod"
        };

        /// <summary>Validates that a slug is safe (lowercase, hyphens, no traversal).</summary>
        public static bool IsValidSlug(string? slug) =>
            !string.IsNullOrWhiteSpace(slug) && SlugRegex().IsMatch(slug);

        /// <summary>Validates sortBy is one of the allowed whitelist values.</summary>
        public static bool IsValidSortBy(string? sortBy) =>
            string.IsNullOrWhiteSpace(sortBy) || AllowedSortValues.Contains(sortBy);

        /// <summary>Validates an order status transition value.</summary>
        public static bool IsValidOrderStatus(string? status) =>
            string.IsNullOrWhiteSpace(status) || AllowedOrderStatuses.Contains(status);

        /// <summary>Validates a payment method.</summary>
        public static bool IsValidPaymentMethod(string? method) =>
            !string.IsNullOrWhiteSpace(method) && AllowedPaymentMethods.Contains(method);

        /// <summary>Clamps a page size to prevent DoS via large page requests.</summary>
        public static int ClampPageSize(int requested, int max = 100) =>
            Math.Clamp(requested, 1, max);

        /// <summary>Clamps a page number to be positive.</summary>
        public static int ClampPage(int requested) =>
            Math.Max(1, requested);

        /// <summary>Strips any characters that could be used for path traversal or injection.</summary>
        public static string? SanitizeString(string? value) =>
            value == null ? null : value.Trim().Replace("..", "").Replace("/", "").Replace("\\", "");
    }

    // ── Validation Attribute: Safe Slug ───────────────────────────────────────
    [AttributeUsage(AttributeTargets.Property | AttributeTargets.Parameter)]
    public class SafeSlugAttribute : ValidationAttribute
    {
        protected override ValidationResult? IsValid(object? value, ValidationContext ctx)
        {
            if (value is string s && !InputValidator.IsValidSlug(s))
                return new ValidationResult("Invalid slug format. Only lowercase letters, digits, and hyphens are allowed.");
            return ValidationResult.Success;
        }
    }

    // ── Validation Attribute: No HTML ─────────────────────────────────────────
    [AttributeUsage(AttributeTargets.Property | AttributeTargets.Parameter)]
    public class NoHtmlAttribute : ValidationAttribute
    {
        private static readonly Regex HtmlTagPattern = new("<[^>]*>", RegexOptions.Compiled);

        protected override ValidationResult? IsValid(object? value, ValidationContext ctx)
        {
            if (value is string s && HtmlTagPattern.IsMatch(s))
                return new ValidationResult("HTML tags are not allowed in this field.");
            return ValidationResult.Success;
        }
    }

    // ── Validation Attribute: Safe Phone ──────────────────────────────────────
    [AttributeUsage(AttributeTargets.Property | AttributeTargets.Parameter)]
    public class SafePhoneAttribute : ValidationAttribute
    {
        private static readonly Regex PhonePattern = new(@"^\+?[0-9\s\-]{7,15}$", RegexOptions.Compiled);

        protected override ValidationResult? IsValid(object? value, ValidationContext ctx)
        {
            if (value is string s && !PhonePattern.IsMatch(s))
                return new ValidationResult("Invalid phone number format.");
            return ValidationResult.Success;
        }
    }
}
