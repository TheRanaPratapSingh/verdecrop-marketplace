// ── Image Compression Utility ─────────────────────────────────────────────────
// Compresses an image File using the Canvas API.
// - Resizes to max 1200px on the longest side (preserving aspect ratio)
// - Outputs WEBP (falls back to JPEG for Safari)
// - Iteratively reduces quality until the result is ≤ TARGET_SIZE_BYTES
// Returns a new File with the compressed data.

const TARGET_SIZE_BYTES = 2 * 1024 * 1024  // 2 MB
const MAX_DIMENSION    = 1200
const INITIAL_QUALITY  = 0.82
const MIN_QUALITY      = 0.40
const QUALITY_STEP     = 0.08

/** Returns true when the browser can encode WEBP via canvas.toBlob */
function supportsWebp(): boolean {
  try {
    const c = document.createElement('canvas')
    c.width = 1; c.height = 1
    return c.toDataURL('image/webp').startsWith('data:image/webp')
  } catch { return false }
}

/**
 * Compress a single image File.
 * @param file   Original File (JPG / PNG / WEBP)
 * @returns      A new (smaller) File, or the original if already ≤ TARGET_SIZE_BYTES
 */
export async function compressImage(file: File): Promise<File> {
  // Already small enough — skip compression
  if (file.size <= TARGET_SIZE_BYTES) return file

  return new Promise((resolve, reject) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)

    img.onload = async () => {
      URL.revokeObjectURL(objectUrl)

      // ── Calculate target dimensions ────────────────────────────────────────
      let { width, height } = img
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        if (width >= height) {
          height = Math.round((height / width) * MAX_DIMENSION)
          width  = MAX_DIMENSION
        } else {
          width  = Math.round((width / height) * MAX_DIMENSION)
          height = MAX_DIMENSION
        }
      }

      const canvas  = document.createElement('canvas')
      canvas.width  = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) { reject(new Error('Canvas not supported')); return }
      ctx.drawImage(img, 0, 0, width, height)

      const outputType = supportsWebp() ? 'image/webp' : 'image/jpeg'
      const ext        = outputType === 'image/webp' ? 'webp' : 'jpg'
      const baseName   = file.name.replace(/\.[^.]+$/, '')

      // ── Iteratively lower quality until size ≤ TARGET ──────────────────────
      let quality = INITIAL_QUALITY
      let blob: Blob | null = null

      while (quality >= MIN_QUALITY) {
        blob = await new Promise<Blob | null>(res =>
          canvas.toBlob(res, outputType, quality)
        )
        if (blob && blob.size <= TARGET_SIZE_BYTES) break
        quality -= QUALITY_STEP
      }

      // Last-resort: accept whatever we got at MIN_QUALITY
      if (!blob) {
        blob = await new Promise<Blob | null>(res =>
          canvas.toBlob(res, outputType, MIN_QUALITY)
        )
      }

      if (!blob) { reject(new Error('Compression failed')); return }

      const compressed = new File([blob], `${baseName}.${ext}`, { type: outputType })
      resolve(compressed)
    }

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Failed to load image'))
    }

    img.src = objectUrl
  })
}
