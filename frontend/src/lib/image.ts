const CDN_BASE_URL = import.meta.env.VITE_CDN_BASE_URL || 'https://cdn.verdecrop.com'

const normalizeRelative = (path: string) => {
  if (!path) return undefined
  if (path.startsWith('/')) return path
  return `/${path.replace(/^\/*/, '')}`
}

const CATEGORY_ICON_OVERRIDES: Record<string, string> = {
  'seasonal-vegetables': '/icons/vegetables.png',
  'farm-fresh-fruits': '/icons/fruits.png',
  'whole-grains': '/icons/grains.png',
  'organic-pulses': '/icons/pulses.png',
  'cold-pressed-oils': '/icons/oils.png',
}

const PRODUCT_IMAGE_OVERRIDES: Record<string, string> = {
  'basmati-rice': 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=800&q=80',
  'mustard-oil': 'https://images.unsplash.com/photo-1580910051076-88f29eacc52c?auto=format&fit=crop&w=800&q=80',
  'toor-dal': 'https://images.unsplash.com/photo-1542060742-52c8a3d7f711?auto=format&fit=crop&w=800&q=80',
  'apple-shimla': 'https://images.unsplash.com/photo-1547516508-7cb14b30558b?auto=format&fit=crop&w=800&q=80',
  'tomato': 'https://images.unsplash.com/photo-1611080623298-5e5f5b8efbde?auto=format&fit=crop&w=800&q=80',
  'onion': 'https://images.unsplash.com/photo-1601004890684-d8cbf643f5f2?auto=format&fit=crop&w=800&q=80',
  'potato': 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80',
}

export const resolveAssetUrl = (src?: string | null): string | undefined => {
  if (!src) return undefined
  const trimmed = src.trim()
  if (!trimmed) return undefined

  if (/^https?:\/\//i.test(trimmed)) return trimmed
  if (/^\/\//.test(trimmed)) return `https:${trimmed}`

  if (trimmed.startsWith('/')) {
    return `${CDN_BASE_URL}${trimmed}`
  }

  const normalized = trimmed.replace(/^\/*/, '')
  return `${CDN_BASE_URL}/${normalized}`
}

export const resolveLocalUrl = (src?: string | null): string | undefined => {
  if (!src) return undefined
  const trimmed = src.trim()
  if (!trimmed) return undefined
  if (/^https?:\/\//i.test(trimmed) || /^\/\//.test(trimmed)) return trimmed
  return normalizeRelative(trimmed)
}

export const resolveCategoryIcon = (slug?: string | null) => {
  if (!slug) return undefined
  const key = slug.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  const override = CATEGORY_ICON_OVERRIDES[key]
  return override ? resolveAssetUrl(override) : undefined
}

export const resolveProductImage = (slug?: string | null, name?: string | null): string | undefined => {
  const key = (slug || name || '').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  const override = PRODUCT_IMAGE_OVERRIDES[key]
  return override ? resolveAssetUrl(override) : undefined
}

