/**
 * scripts/fetch-slugs.ts
 *
 * Postbuild script — fetches all product slugs from the live API and
 * writes a pre-rendered HTML shell for each /products/:slug route into
 * the dist directory so bots get real <title>, <meta description>, and
 * og:* tags instead of a blank SPA shell.
 *
 * Run via:  npm run postbuild
 * Which calls: tsx scripts/fetch-slugs.ts
 *
 * How it works:
 *  1. Fetch every product slug from the API (paginated).
 *  2. Read dist/index.html (the Vite-built shell).
 *  3. For each slug, inject page-specific <title>, <meta description>,
 *     og:title, og:url, og:image into a copy of the shell.
 *  4. Write dist/products/<slug>/index.html.
 *
 * Azure Static Web Apps serves dist/products/organic-tomatoes/index.html
 * for GET /products/organic-tomatoes — React then hydrates it normally.
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DIST = path.resolve(__dirname, '../dist')
const API_BASE = process.env.VITE_API_URL
  ?? 'https://graamo-cwb0f0g8hdbghkbq.centralindia-01.azurewebsites.net'
const BASE_URL = 'https://graamo.in'
const PAGE_SIZE = 100

// ── Types ─────────────────────────────────────────────────────────────────────
interface ProductSlug {
  slug: string
  name: string
  description?: string
  price?: number
  imageUrl?: string
  imageUrls?: string[]
  categoryName?: string
  farmerName?: string
  isOrganic?: boolean
}

interface PagedResult<T> {
  items: T[]
  totalPages: number
  total: number
}

// ── Fetch all slugs (paginated) ───────────────────────────────────────────────
async function fetchAllSlugs(): Promise<ProductSlug[]> {
  const all: ProductSlug[] = []
  let page = 1
  let totalPages = 1

  console.log(`[prerender] Fetching product slugs from ${API_BASE}…`)

  while (page <= totalPages) {
    const url = `${API_BASE}/api/products?page=${page}&pageSize=${PAGE_SIZE}&sortBy=newest`
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(15_000),
    })

    if (!res.ok) {
      console.warn(`[prerender] API returned ${res.status} on page ${page} — stopping pagination`)
      break
    }

    const json = await res.json() as { data?: PagedResult<ProductSlug> }
    const data = json.data

    if (!data?.items?.length) break

    all.push(...data.items)
    totalPages = data.totalPages ?? 1
    console.log(`[prerender]   page ${page}/${totalPages} — ${data.items.length} products`)
    page++
  }

  console.log(`[prerender] Total slugs fetched: ${all.length}`)
  return all
}

// ── Inject meta into the HTML shell ──────────────────────────────────────────
function injectMeta(shell: string, product: ProductSlug): string {
  const title = `${product.name} | Graamo`
  const desc = product.description
    ? product.description.slice(0, 155)
    : `Buy ${product.isOrganic ? 'certified organic ' : ''}${product.name}${product.categoryName ? ` in ${product.categoryName}` : ''} from ${product.farmerName ?? 'a verified farm'} on Graamo.`.slice(0, 155)
  const url = `${BASE_URL}/products/${product.slug}`
  const image = product.imageUrls?.[0] ?? product.imageUrl ?? `${BASE_URL}/og-default.jpg`

  const metaBlock = `
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(desc)}" />
    <link rel="canonical" href="${url}" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(desc)}" />
    <meta property="og:url" content="${url}" />
    <meta property="og:image" content="${image}" />
    <meta property="og:type" content="website" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(desc)}" />
    <meta name="twitter:image" content="${image}" />`

  // Replace the default <title> and insert our meta right after <head>
  return shell
    .replace(/<title>.*?<\/title>/s, '')
    .replace('<head>', `<head>${metaBlock}`)
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

// ── Write one HTML file per slug ──────────────────────────────────────────────
async function writeProductPages(products: ProductSlug[], shell: string): Promise<void> {
  let written = 0
  let skipped = 0

  for (const product of products) {
    if (!product.slug) { skipped++; continue }

    const dir = path.join(DIST, 'products', product.slug)
    fs.mkdirSync(dir, { recursive: true })

    const html = injectMeta(shell, product)
    fs.writeFileSync(path.join(dir, 'index.html'), html, 'utf-8')
    written++
  }

  console.log(`[prerender] Written: ${written} product pages. Skipped (no slug): ${skipped}`)
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const shellPath = path.join(DIST, 'index.html')
  if (!fs.existsSync(shellPath)) {
    console.error('[prerender] dist/index.html not found — run `npm run build` first')
    process.exit(1)
  }

  const shell = fs.readFileSync(shellPath, 'utf-8')

  let products: ProductSlug[] = []
  try {
    products = await fetchAllSlugs()
  } catch (err) {
    console.warn('[prerender] Could not reach API — skipping dynamic product prerender:', (err as Error).message)
    console.warn('[prerender] Static routes are still pre-rendered by vite-plugin-prerender.')
    process.exit(0) // non-fatal — CI/CD should not fail the build for this
  }

  if (products.length === 0) {
    console.log('[prerender] No products found — nothing to write.')
    process.exit(0)
  }

  await writeProductPages(products, shell)
  console.log('[prerender] Dynamic pre-render complete ✓')
}

main().catch(err => {
  console.error('[prerender] Unexpected error:', err)
  process.exit(1)
})
