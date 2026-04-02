import DOMPurify from 'dompurify'

// ── sanitizeHtml ─────────────────────────────────────────────────────────────
// Strips all HTML tags and potentially dangerous content from a string.
// Use for any user-generated content rendered via dangerouslySetInnerHTML or
// displayed in the DOM. Prefer rendering as plain text wherever possible.
export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] })
}

// ── sanitizeRichHtml ─────────────────────────────────────────────────────────
// Allows a safe subset of HTML tags (bold, italic, links, lists) while stripping
// scripts, event handlers, and dangerous attributes.
export function sanitizeRichHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'ul', 'ol', 'li', 'br', 'p', 'a'],
    ALLOWED_ATTR: ['href', 'rel', 'target'],
    FORCE_BODY: true,
  })
}

// ── sanitizeInput ─────────────────────────────────────────────────────────────
// Trims and strips HTML from a plain text input field value before submission.
// Prefer calling this in form `onSubmit` handlers rather than on every keystroke.
export function sanitizeInput(value: string): string {
  return sanitizeHtml(value.trim())
}

// ── isValidSlug ──────────────────────────────────────────────────────────────
// Mirrors the backend InputValidator.IsValidSlug whitelist.
// Use to guard navigation and API calls using URL slugs.
export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9-]{1,100}$/.test(slug)
}

// ── isValidEmail ─────────────────────────────────────────────────────────────
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

// ── isValidPhone ─────────────────────────────────────────────────────────────
// Mirrors the backend SafePhoneAttribute regex.
export function isValidPhone(phone: string): boolean {
  return /^\+?[0-9\s-]{7,15}$/.test(phone)
}
