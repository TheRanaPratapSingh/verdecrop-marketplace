// ── Image Compression Utility ─────────────────────────────────────────────────
// Compresses an image File using the Canvas API.
// - Resizes to max 1200px on the longest side (preserving aspect ratio)
// - Outputs WEBP (falls back to JPEG for Safari)
// - Iteratively reduces quality AND dimensions until the result is ≤ TARGET_SIZE_BYTES
// Returns a new File with the compressed data.

const TARGET_SIZE_BYTES = 2 * 1024 * 1024   // 2 MB hard target
const MAX_DIMENSION     = 1200
const INITIAL_QUALITY   = 0.82
const MIN_QUALITY       = 0.30               // lower floor for very large images
const QUALITY_STEP      = 0.08
const MIN_DIMENSION     = 400                // never shrink below this

/** Returns true when the browser can encode WEBP via canvas.toBlob */
function supportsWebp(): boolean {
  try {
    const c = document.createElement('canvas')
    c.width = 1; c.height = 1
    return c.toDataURL('image/webp').startsWith('data:image/webp')
  } catch { return false }
}

/** Scale width/height so neither side exceeds maxDim */
function scaleDimensions(w: number, h: number, maxDim: number): [number, number] {
  if (w <= maxDim && h <= maxDim) return [w, h]
  if (w >= h) return [maxDim, Math.round((h / w) * maxDim)]
  return [Math.round((w / h) * maxDim), maxDim]
}

/** Draw image onto a canvas at given dimensions and return a Blob */
function drawAndBlob(
  img: HTMLImageElement,
  w: number, h: number,
  type: string, quality: number
): Promise<Blob | null> {
  const canvas = document.createElement('canvas')
  canvas.width = w; canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) return Promise.resolve(null)
  ctx.drawImage(img, 0, 0, w, h)
  return new Promise<Blob | null>(res => canvas.toBlob(res, type, quality))
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

      const outputType = supportsWebp() ? 'image/webp' : 'image/jpeg'
      const ext        = outputType === 'image/webp' ? 'webp' : 'jpg'
      const baseName   = file.name.replace(/\.[^.]+$/, '')

      // Start at max dimension
      let [curW, curH] = scaleDimensions(img.width, img.height, MAX_DIMENSION)
      let blob: Blob | null = null

      // ── Pass 1: iterate quality at current dimension ───────────────────────
      let quality = INITIAL_QUALITY
      while (quality >= MIN_QUALITY) {
        blob = await drawAndBlob(img, curW, curH, outputType, quality)
        if (blob && blob.size <= TARGET_SIZE_BYTES) break
        quality -= QUALITY_STEP
      }

      // ── Pass 2: if still too large, progressively shrink dimensions ────────
      if (!blob || blob.size > TARGET_SIZE_BYTES) {
        let scale = 0.85
        while (scale > 0.3) {
          const w = Math.max(MIN_DIMENSION, Math.round(curW * scale))
          const h = Math.max(MIN_DIMENSION, Math.round(curH * scale))
          blob = await drawAndBlob(img, w, h, outputType, MIN_QUALITY)
          if (blob && blob.size <= TARGET_SIZE_BYTES) break
          scale -= 0.15
        }
      }

      // ── Last resort: absolute minimum ──────────────────────────────────────
      if (!blob) {
        blob = await drawAndBlob(img, MIN_DIMENSION, MIN_DIMENSION, outputType, 0.25)
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
