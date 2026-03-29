import React, { useEffect, useState, useCallback } from 'react'
import { useSearchParams, Link, useParams } from 'react-router-dom'
import { Filter, SlidersHorizontal, X, Star, Heart, ShoppingCart, Leaf, ChevronLeft, ChevronRight } from 'lucide-react'
import { productApi, categoryApi, cartApi } from '../services/api'
import { resolveAssetUrl, resolveLocalUrl, resolveProductImage } from '../lib/image'
import { PageLayout } from '../components/layout'
import { ProductGrid, CategoryIcon } from '../components/product'
import { Button, Badge, Spinner, Pagination, PriceDisplay, StarRating, EmptyState } from '../components/ui'
import { useCartStore, useAuthStore } from '../store'
import type { Product, Category } from '../types'
import toast from 'react-hot-toast'

// ── Products List Page ────────────────────────────────────────────────────────
export const ProductsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [filtersOpen, setFiltersOpen] = useState(false)

  const page = Number(searchParams.get('page') || 1)
  const search = searchParams.get('search') || ''
  const categoryId = searchParams.get('categoryId') || ''
  const categorySlug = searchParams.get('categorySlug') || ''
  const sortBy = searchParams.get('sortBy') || 'newest'
  const isOrganic = searchParams.get('isOrganic') || ''
  const minPrice = searchParams.get('minPrice') || ''
  const maxPrice = searchParams.get('maxPrice') || ''

  const setParam = (key: string, value: string) => {
    const p = new URLSearchParams(searchParams)
    if (value) p.set(key, value); else p.delete(key)
    if (key !== 'page') p.delete('page')
    setSearchParams(p)
  }

  const matchedCategory = categorySlug ? categories.find(c => c.slug === categorySlug) : undefined
  const resolvedCategoryId = categoryId || (matchedCategory ? String(matchedCategory.id) : '')

  const loadProducts = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, string> = { page: String(page), pageSize: '20', sortBy }
      if (search) params.search = search
      if (resolvedCategoryId) params.categoryId = resolvedCategoryId
      if (isOrganic) params.isOrganic = isOrganic
      if (minPrice) params.minPrice = minPrice
      if (maxPrice) params.maxPrice = maxPrice

      const res = await productApi.getAll(params)
      setProducts(Array.isArray(res) ? res : (res?.items || []))
      setTotal(res?.totalCount || 0)
      setTotalPages(res?.totalPages || 1)
    } finally { setLoading(false) }
  }, [page, search, resolvedCategoryId, sortBy, isOrganic, minPrice, maxPrice])

  useEffect(() => { loadProducts() }, [loadProducts])
  useEffect(() => { categoryApi.getAll().then(setCategories).catch(() => {}) }, [])

  const clearFilters = () => setSearchParams(new URLSearchParams())

  const hasFilters = !!(search || categoryId || categorySlug || isOrganic || minPrice || maxPrice)

  return (
    <PageLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-display font-bold text-gray-900">
              {search ? `Results for "${search}"` : resolvedCategoryId ? categories.find(c => c.id === Number(resolvedCategoryId))?.name || 'Products' : 'All Products'}
            </h1>
            {!loading && <p className="text-sm text-gray-500 font-body mt-0.5">{total.toLocaleString()} products</p>}
          </div>
          <div className="flex gap-2">
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="w-4 h-4" /> Clear
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => setFiltersOpen(v => !v)}>
              <SlidersHorizontal className="w-4 h-4" /> Filters
            </Button>
          </div>
        </div>

        <div className="flex gap-6">
          {/* ── Filter Sidebar ── */}
          <aside className={`${filtersOpen ? 'block' : 'hidden'} lg:block w-56 flex-shrink-0`}>
            <div className="bg-white rounded-2xl shadow-card p-5 sticky top-20 space-y-6">
              {/* Categories */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3 font-body">Category</h3>
                <div className="space-y-1.5">
                  <button
                    onClick={() => { setParam('categoryId', ''); setParam('categorySlug', '') }}
                    className={`w-full text-left text-sm px-3 py-2 rounded-xl transition font-body ${!categoryId && !categorySlug ? 'bg-leaf-50 text-leaf-700 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
                  >
                    All Categories
                  </button>
                  {categories.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => { setParam('categoryId', String(cat.id)); setParam('categorySlug', cat.slug) }}
                      className={`w-full text-left text-sm px-3 py-2 rounded-xl transition font-body flex justify-between items-center ${(categoryId === String(cat.id) || categorySlug === cat.slug) ? 'bg-leaf-50 text-leaf-700 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                      <span className="flex items-center gap-2">
                        <CategoryIcon iconUrl={cat.iconUrl} name={cat.name} size="w-4 h-4" />
                        {cat.name}
                      </span>
                      <span className="text-xs text-gray-400">{cat.productCount}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Sort */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3 font-body">Sort by</h3>
                <div className="space-y-1">
                  {[
                    { value: 'newest', label: 'Newest First' },
                    { value: 'price_asc', label: 'Price: Low to High' },
                    { value: 'price_desc', label: 'Price: High to Low' },
                    { value: 'rating', label: 'Best Rated' },
                    { value: 'popular', label: 'Most Popular' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setParam('sortBy', opt.value)}
                      className={`w-full text-left text-sm px-3 py-2 rounded-xl transition font-body ${sortBy === opt.value ? 'bg-leaf-50 text-leaf-700 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Organic */}
              <div>
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isOrganic === 'true'}
                    onChange={e => setParam('isOrganic', e.target.checked ? 'true' : '')}
                    className="w-4 h-4 accent-leaf-600 rounded"
                  />
                  <span className="text-sm font-body text-gray-700 flex items-center gap-1">
                    <Leaf className="w-3.5 h-3.5 text-leaf-600" /> Organic Only
                  </span>
                </label>
              </div>

              {/* Price Range */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3 font-body">Price Range</h3>
                <div className="flex gap-2 items-center">
                  <input
                    type="number" placeholder="Min"
                    value={minPrice}
                    onChange={e => setParam('minPrice', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm font-body focus:outline-none focus:border-leaf-400"
                  />
                  <span className="text-gray-400 text-xs">–</span>
                  <input
                    type="number" placeholder="Max"
                    value={maxPrice}
                    onChange={e => setParam('maxPrice', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm font-body focus:outline-none focus:border-leaf-400"
                  />
                </div>
              </div>
            </div>
          </aside>

          {/* ── Product Grid ── */}
          <div className="flex-1 min-w-0">
            {products.length === 0 && !loading ? (
              <EmptyState title="No products found" description="Try adjusting your filters or search terms." />
            ) : (
              <>
                <ProductGrid products={products} loading={loading} />
                {totalPages > 1 && (
                  <div className="mt-10">
                    <Pagination
                      page={page}
                      totalPages={totalPages}
                      onPageChange={p => setParam('page', String(p))}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </PageLayout>
  )
}

// ── Product Detail Page ───────────────────────────────────────────────────────
export const ProductDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [qty, setQty] = useState(1)
  const [adding, setAdding] = useState(false)
  const [activeImg, setActiveImg] = useState(0)
  const [wishlisted, setWishlisted] = useState(false)
  const { setCart, openCart } = useCartStore()
  const { isAuthenticated } = useAuthStore()

  useEffect(() => {
    if (!slug) return
    setLoading(true)
    productApi.getBySlug(slug)
      .then(p => { setProduct(p); setLoading(false) })
      .catch(() => setLoading(false))
  }, [slug])

  const handleAddToCart = async () => {
    if (!product) return
    if (!isAuthenticated) { toast.error('Please login to continue'); return }
    setAdding(true)
    try {
      const cart = await cartApi.addItem(product.id, qty)
      setCart(cart)
      toast.success('Added to cart!', { icon: '🛒' })
      openCart()
    } catch { toast.error('Could not add to cart') }
    finally { setAdding(false) }
  }

  if (loading) return (
    <PageLayout>
      <div className="max-w-5xl mx-auto px-6 py-12 flex justify-center"><Spinner size="lg" /></div>
    </PageLayout>
  )

  if (!product) return (
    <PageLayout>
      <div className="max-w-5xl mx-auto px-6 py-12">
        <EmptyState title="Product not found" description="This product may have been removed." action={<Link to="/products"><Button>Back to Shop</Button></Link>} />
      </div>
    </PageLayout>
  )

  const rawImages = product.imageUrls?.length ? product.imageUrls : product.imageUrl ? [product.imageUrl] : []
  let images = rawImages
    .map(img => resolveAssetUrl(img) || resolveLocalUrl(img))
    .filter(Boolean) as string[]

  if (!images.length) {
    const fallback = resolveProductImage(product.slug, product.name)
    if (fallback) images = [fallback]
  }

  const discount = product.originalPrice && product.originalPrice > product.price
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100) : 0

  return (
    <PageLayout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-sm text-gray-500 mb-6 font-body">
          <Link to="/" className="hover:text-leaf-600 transition">Home</Link>
          <span>/</span>
          <Link to="/products" className="hover:text-leaf-600 transition">Products</Link>
          <span>/</span>
          <span className="text-gray-700">{product.name}</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {/* Images */}
          <div>
            <div className="aspect-square rounded-2xl overflow-hidden bg-gray-50 mb-3 relative">
              {images[activeImg] ? (
                <img src={images[activeImg]} alt={product.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-8xl">🌿</div>
              )}
              {images.length > 1 && (
                <>
                  <button onClick={() => setActiveImg(i => (i - 1 + images.length) % images.length)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 p-2 bg-white/80 rounded-xl hover:bg-white transition shadow-sm">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button onClick={() => setActiveImg(i => (i + 1) % images.length)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-white/80 rounded-xl hover:bg-white transition shadow-sm">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto">
                {images.map((img, i) => (
                  <button key={i} onClick={() => setActiveImg(i)}
                    className={`flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition ${i === activeImg ? 'border-leaf-500' : 'border-transparent'}`}>
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div>
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <div className="flex flex-wrap gap-2 mb-2">
                  {product.isOrganic && <Badge variant="green"><Leaf className="w-3 h-3" /> Organic</Badge>}
                  {product.isFeatured && <Badge variant="earth">⭐ Featured</Badge>}
                  {discount > 0 && <Badge variant="red">{discount}% OFF</Badge>}
                </div>
                <h1 className="text-2xl font-display font-bold text-gray-900">{product.name}</h1>
                <p className="text-sm text-gray-500 font-body mt-1">
                  By <Link to={`/farmers/${product.farmerId}`} className="text-leaf-600 hover:underline">{product.farmerName}</Link>
                  {product.farmLocation && ` · ${product.farmLocation}`}
                </p>
              </div>
              <button onClick={() => setWishlisted(v => !v)} className="p-2.5 border border-gray-200 rounded-xl hover:border-red-300 transition flex-shrink-0">
                <Heart className={`w-5 h-5 transition-colors ${wishlisted ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} />
              </button>
            </div>

            {/* Rating */}
            {product.reviewCount > 0 && (
              <div className="flex items-center gap-2 mb-4">
                <StarRating rating={product.rating} size="md" />
                <span className="text-sm font-semibold text-gray-800">{product.rating.toFixed(1)}</span>
                <span className="text-sm text-gray-500 font-body">({product.reviewCount} reviews)</span>
              </div>
            )}

            {/* Product details */}
            <div className="grid grid-cols-2 gap-2 mb-5 text-sm text-gray-600 font-body">
              <div className="bg-gray-50 p-3 rounded-xl">Category: <span className="font-semibold text-gray-800">{product.categoryName || 'N/A'}</span></div>
              <div className="bg-gray-50 p-3 rounded-xl">Unit size: <span className="font-semibold text-gray-800">{product.unit}</span></div>
              <div className="bg-gray-50 p-3 rounded-xl">Min order: <span className="font-semibold text-gray-800">{product.minOrderQty} {product.unit}</span></div>
              <div className="bg-gray-50 p-3 rounded-xl">Stock: <span className="font-semibold text-gray-800">{product.stockQuantity} {product.unit}</span></div>
              <div className="bg-gray-50 p-3 rounded-xl">Organic: <span className="font-semibold text-gray-800">{product.isOrganic ? 'Yes' : 'No'}</span></div>
              <div className="bg-gray-50 p-3 rounded-xl">Featured: <span className="font-semibold text-gray-800">{product.isFeatured ? 'Yes' : 'No'}</span></div>
            </div>

            {/* Price */}
            <div className="mb-5">
              <PriceDisplay price={product.price} originalPrice={product.originalPrice} size="lg" />
              <p className="text-sm text-gray-500 font-body mt-1">per {product.unit}</p>
            </div>

            {/* Description */}
            {product.description && (
              <p className="text-gray-600 font-body text-sm leading-relaxed mb-5 p-4 bg-gray-50 rounded-xl">{product.description}</p>
            )}

            {/* Quantity + Add to Cart */}
            <div className="flex gap-3 mb-4">
              <div className="flex items-center gap-0 border border-gray-200 rounded-xl overflow-hidden">
                <button onClick={() => setQty(q => Math.max(1, q - 1))} className="px-3.5 py-2.5 text-gray-500 hover:bg-gray-50 transition text-lg font-medium">−</button>
                <span className="px-4 py-2.5 text-sm font-semibold text-gray-800 min-w-[40px] text-center font-body">{qty}</span>
                <button onClick={() => setQty(q => Math.min(product.stockQuantity, q + 1))} className="px-3.5 py-2.5 text-gray-500 hover:bg-gray-50 transition text-lg font-medium">+</button>
              </div>
              <Button
                variant="primary"
                onClick={handleAddToCart}
                loading={adding}
                disabled={product.stockQuantity === 0}
                className="flex-1 justify-center"
                size="lg"
              >
                <ShoppingCart className="w-5 h-5" />
                {product.stockQuantity === 0 ? 'Out of Stock' : 'Add to Cart'}
              </Button>
            </div>

            <p className="text-xs text-gray-500 font-body">
              {product.stockQuantity > 0
                ? <span className="text-leaf-600 font-medium">✓ {product.stockQuantity} {product.unit} in stock</span>
                : <span className="text-red-500">✗ Currently out of stock</span>}
            </p>
          </div>
        </div>

        {/* Reviews */}
        {product.reviews && product.reviews.length > 0 && (
          <div className="mt-12">
            <h2 className="text-xl font-display font-bold text-gray-900 mb-6">Customer Reviews</h2>
            <div className="space-y-4">
              {product.reviews.map(review => (
                <div key={review.id} className="bg-white rounded-2xl shadow-card p-5">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      {review.userAvatar ? (
                        <img src={review.userAvatar} alt={review.userName} className="w-9 h-9 rounded-full object-cover" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-leaf-100 flex items-center justify-center font-bold text-leaf-700 text-sm">
                          {review.userName[0]}
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-semibold text-gray-800 font-body">{review.userName}</p>
                        {review.isVerifiedPurchase && <Badge variant="green" size="sm">✓ Verified Purchase</Badge>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <StarRating rating={review.rating} size="sm" />
                      <span className="text-xs text-gray-400 font-body">{new Date(review.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </div>
                  </div>
                  {review.comment && <p className="text-sm text-gray-600 font-body leading-relaxed">{review.comment}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  )
}
