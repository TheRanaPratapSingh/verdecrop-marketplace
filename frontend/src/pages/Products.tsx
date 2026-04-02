import React, { useEffect, useState, useCallback } from 'react'
import { useSearchParams, Link, useParams, useNavigate } from 'react-router-dom'
import { Filter, SlidersHorizontal, X, Star, Heart, ShoppingCart, Leaf, ChevronLeft, ChevronRight, MapPin, ChevronDown, Sparkles } from 'lucide-react'
import { productApi, categoryApi, cartApi } from '../services/api'
import { resolveAssetUrl, resolveLocalUrl, resolveProductImage } from '../lib/image'
import { PageLayout } from '../components/layout'
import { ProductGrid, CategoryIcon } from '../components/product'
import { Button, Badge, Spinner, Pagination, PriceDisplay, StarRating, EmptyState } from '../components/ui'
import { useCartStore, useAuthStore } from '../store'
import type { Product, Category } from '../types'
import toast from 'react-hot-toast'
import { trackEvent } from '../lib/analytics'

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
  const farmerId = searchParams.get('farmerId') || ''
  const farmerName = searchParams.get('farmerName') || ''

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
      if (farmerId) params.farmerId = farmerId

      const res = await productApi.getAll(params)
      const apiItems = Array.isArray(res) ? res : (res?.items || [])
      const filteredItems = farmerId ? apiItems.filter(p => String(p.farmerId) === String(farmerId)) : apiItems
      setProducts(filteredItems)
      setTotal(farmerId ? filteredItems.length : (res?.totalCount || 0))
      setTotalPages(farmerId ? 1 : (res?.totalPages || 1))
    } finally { setLoading(false) }
  }, [page, search, resolvedCategoryId, sortBy, isOrganic, minPrice, maxPrice, farmerId])

  useEffect(() => { loadProducts() }, [loadProducts])
  useEffect(() => { categoryApi.getAll().then(setCategories).catch(() => {}) }, [])

  const clearFilters = () => setSearchParams(new URLSearchParams())

  const hasFilters = !!(search || categoryId || categorySlug || isOrganic || minPrice || maxPrice || farmerId)

  return (
    <PageLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-display font-bold text-gray-900">
              {search
                ? `Results for "${search}"`
                : farmerId
                  ? `Products from ${farmerName || 'Selected Farm'}`
                  : resolvedCategoryId
                    ? categories.find(c => c.id === Number(resolvedCategoryId))?.name || 'Products'
                    : 'All Products'}
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

        <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6">
          {/* ── Filter Sidebar ── */}
          <aside className={`${filtersOpen ? 'block' : 'hidden'} lg:block`}>
            <div className="bg-white rounded-2xl shadow-card p-5 sticky top-24 space-y-6 max-h-[calc(100vh-7rem)] overflow-y-auto">
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
          <div className="min-w-0">
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
  const navigate = useNavigate()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [qty, setQty] = useState(1)
  const [unitPack, setUnitPack] = useState(1)
  const [adding, setAdding] = useState(false)
  const [buyingNow, setBuyingNow] = useState(false)
  const [activeImg, setActiveImg] = useState(0)
  const [wishlisted, setWishlisted] = useState(false)
  const [openSection, setOpenSection] = useState<'details' | 'nutrition' | 'story'>('details')
  const { setCart, openCart } = useCartStore()
  const { isAuthenticated } = useAuthStore()

  useEffect(() => {
    if (!slug) return
    setLoading(true)
    productApi.getBySlug(slug)
      .then(p => {
        setProduct(p)
        trackEvent('view_product', {
          product_id: p.id,
          product_name: p.name,
          category_name: p.categoryName,
          price: p.price,
        })
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [slug])

  const handleAddToCart = async () => {
    if (!product) return
    if (!isAuthenticated) { toast.error('Please login to continue'); return }
    setAdding(true)
    try {
      const cart = await cartApi.addItem(product.id, qty * unitPack)
      setCart(cart)
      trackEvent('add_to_cart', {
        product_id: product.id,
        product_name: product.name,
        quantity: qty * unitPack,
        value: product.price * qty * unitPack,
      })
      toast.success('Added to cart!', { icon: '🛒' })
      openCart()
    } catch { toast.error('Could not add to cart') }
    finally { setAdding(false) }
  }

  const handleBuyNow = async () => {
    if (!product) return
    if (!isAuthenticated) { toast.error('Please login to continue'); return }
    setBuyingNow(true)
    try {
      const cart = await cartApi.addItem(product.id, qty * unitPack)
      setCart(cart)
      trackEvent('buy_now', {
        product_id: product.id,
        product_name: product.name,
        quantity: qty * unitPack,
        value: product.price * qty * unitPack,
      })
      toast.success('Ready to checkout', { icon: '⚡' })
      navigate('/checkout')
    } catch {
      toast.error('Could not proceed to checkout')
    } finally {
      setBuyingNow(false)
    }
  }

  if (loading) return (
    <PageLayout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="h-4 w-64 bg-stone-200 rounded-full animate-pulse mb-8" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          <div>
            <div className="aspect-square rounded-3xl bg-stone-200 animate-pulse" />
            <div className="grid grid-cols-4 gap-3 mt-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="aspect-square rounded-2xl bg-stone-200 animate-pulse" />
              ))}
            </div>
          </div>
          <div className="space-y-4">
            <div className="h-7 w-36 bg-stone-200 rounded-full animate-pulse" />
            <div className="h-10 w-4/5 bg-stone-200 rounded-2xl animate-pulse" />
            <div className="h-5 w-1/2 bg-stone-200 rounded-full animate-pulse" />
            <div className="h-24 w-full bg-stone-200 rounded-3xl animate-pulse" />
            <div className="h-16 w-full bg-stone-200 rounded-2xl animate-pulse" />
            <div className="h-12 w-full bg-stone-200 rounded-2xl animate-pulse" />
          </div>
        </div>
      </div>
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
  const unitOptions = [1, 5, 10]
  const finalPrice = product.price * unitPack
  const finalOriginalPrice = product.originalPrice ? product.originalPrice * unitPack : undefined
  const saveAmount = finalOriginalPrice ? Math.max(0, finalOriginalPrice - finalPrice) : 0
  const hasReviews = (product.reviewCount || 0) > 0
  const farmInitial = product.farmerName?.[0]?.toUpperCase() || 'F'

  // Track product view
  useEffect(() => {
    if (product) {
      trackEvent('Product Viewed', {
        product_id: product.id,
        product_name: product.name,
        category: product.categoryName,
        price: product.price,
        variant: product.imageUrls?.[0] || '',
      })
    }
  }, [product])

  return (
    <PageLayout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-28 md:pb-8">
        <div className="flex items-center gap-2 text-sm text-stone-400 mb-6 font-body">
          <Link to="/" className="hover:text-forest-700 transition-colors">Home</Link>
          <span>/</span>
          <Link to="/products" className="hover:text-forest-700 transition-colors">Products</Link>
          <span>/</span>
          <span className="text-stone-700 font-medium truncate">{product.name}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-12">
          <div>
            <div className="relative aspect-square rounded-3xl overflow-hidden bg-stone-100 shadow-[0_20px_60px_rgba(17,24,39,0.14)] group">
              {product.isOrganic && (
                <div className="absolute top-4 left-4 z-10 px-3 py-1.5 rounded-full bg-white/90 backdrop-blur text-forest-700 text-xs font-label font-semibold inline-flex items-center gap-1.5 shadow-sm">
                  <Leaf className="w-3.5 h-3.5" /> Organic
                </div>
              )}
              {images[activeImg] ? (
                <img
                  src={images[activeImg]}
                  alt={product.name}
                  className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-110"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-8xl">🌿</div>
              )}
              {images.length > 1 && (
                <>
                  <button
                    title="Previous image"
                    onClick={() => setActiveImg(i => (i - 1 + images.length) % images.length)}
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/85 hover:bg-white rounded-2xl shadow-sm transition"
                  >
                    <ChevronLeft className="w-4 h-4 mx-auto" />
                  </button>
                  <button
                    title="Next image"
                    onClick={() => setActiveImg(i => (i + 1) % images.length)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/85 hover:bg-white rounded-2xl shadow-sm transition"
                  >
                    <ChevronRight className="w-4 h-4 mx-auto" />
                  </button>
                </>
              )}
            </div>

            {images.length > 1 && (
              <div className="grid grid-cols-5 gap-3 mt-4">
                {images.map((img, i) => (
                  <button
                    key={i}
                    title={`Preview image ${i + 1}`}
                    onClick={() => setActiveImg(i)}
                    className={`aspect-square rounded-2xl overflow-hidden border-2 transition-all duration-200 ${i === activeImg ? 'border-forest-600 scale-[1.02]' : 'border-stone-200 hover:border-stone-300'}`}
                  >
                    <img src={img} alt={`${product.name} thumbnail ${i + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="lg:sticky lg:top-24 self-start">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  {product.isFeatured && <Badge variant="earth">Featured</Badge>}
                  {discount > 0 && <Badge variant="red">{discount}% OFF</Badge>}
                </div>
                <h1 className="text-3xl sm:text-4xl font-display font-semibold text-stone-900 tracking-tight">{product.name}</h1>
              </div>
              <button
                title="Add to wishlist"
                onClick={() => setWishlisted(v => !v)}
                className="w-11 h-11 rounded-2xl border border-stone-200 hover:border-red-300 hover:bg-red-50 transition"
              >
                <Heart className={`w-5 h-5 mx-auto transition-colors ${wishlisted ? 'fill-red-500 text-red-500' : 'text-stone-400'}`} />
              </button>
            </div>

            <div className="flex items-center gap-2 text-sm mb-4">
              <StarRating rating={product.rating || 0} size="sm" />
              <span className="font-semibold text-stone-800">{(product.rating || 0).toFixed(1)}</span>
              <span className="text-stone-500">({product.reviewCount || 0} reviews)</span>
            </div>

            <div className="bg-white border border-stone-200 rounded-3xl p-4 mb-5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-forest-100 text-forest-700 flex items-center justify-center font-label font-bold flex-shrink-0">
                  {farmInitial}
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-stone-500">Sold by</p>
                  <Link to={`/products?farmerId=${product.farmerId}&farmerName=${encodeURIComponent(product.farmerName)}`} className="text-sm font-semibold text-forest-700 hover:underline truncate block">{product.farmerName}</Link>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-stone-100 text-stone-600 text-xs inline-flex items-center gap-1.5 whitespace-nowrap"><MapPin className="w-3.5 h-3.5" />{product.farmLocation || 'Village Rampur'}</span>
            </div>

            <div className="bg-gradient-to-r from-forest-50 to-sage-50 border border-forest-100 rounded-3xl p-5 mb-5">
              <div className="flex items-end gap-3 flex-wrap">
                <p className="text-4xl font-display font-semibold text-stone-900">₹{finalPrice.toFixed(0)}</p>
                {finalOriginalPrice && finalOriginalPrice > finalPrice && <p className="text-lg text-stone-400 line-through">₹{finalOriginalPrice.toFixed(0)}</p>}
                <p className="text-sm text-stone-600 mb-1">for {unitPack} {product.unit}</p>
              </div>
              {saveAmount > 0 && (
                <p className="mt-2 text-sm text-forest-700 font-medium">You save ₹{saveAmount.toFixed(0)}</p>
              )}

              <div className="mt-4">
                <p className="text-xs uppercase tracking-wide text-stone-500 font-label mb-2">Select Pack</p>
                <div className="flex gap-2 flex-wrap">
                  {unitOptions.map(u => (
                    <button
                      key={u}
                      title={`Select ${u} ${product.unit}`}
                      onClick={() => setUnitPack(u)}
                      className={`px-3.5 py-2 rounded-xl text-sm font-medium transition ${unitPack === u ? 'bg-forest-700 text-white shadow-sm' : 'bg-white text-stone-600 border border-stone-200 hover:border-stone-300'}`}
                    >
                      {u}{product.unit}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center rounded-2xl border border-stone-200 bg-white overflow-hidden">
                <button
                  title="Decrease quantity"
                  onClick={() => setQty(q => Math.max(1, q - 1))}
                  className="w-11 h-11 text-stone-600 hover:bg-stone-50 active:scale-95 transition"
                >−</button>
                <span className="w-10 text-center font-semibold text-stone-800">{qty}</span>
                <button
                  title="Increase quantity"
                  onClick={() => setQty(q => Math.min(product.stockQuantity, q + 1))}
                  className="w-11 h-11 text-stone-600 hover:bg-stone-50 active:scale-95 transition"
                >+</button>
              </div>

              <Button
                variant="primary"
                onClick={handleAddToCart}
                loading={adding}
                disabled={product.stockQuantity === 0}
                className="flex-1 justify-center bg-gradient-to-r from-forest-700 to-forest-500 hover:from-forest-800 hover:to-forest-600"
                size="lg"
              >
                <ShoppingCart className="w-5 h-5" /> Add to Cart
              </Button>
            </div>

            <Button
              variant="outline"
              onClick={handleBuyNow}
              loading={buyingNow}
              disabled={product.stockQuantity === 0}
              className="w-full justify-center mb-5"
              size="lg"
            >
              Buy Now
            </Button>

            <div className="grid grid-cols-2 gap-2.5 mb-6 text-sm">
              {[
                { label: '100% Organic', icon: '🌿' },
                { label: 'Fast Delivery', icon: '🚚' },
                { label: 'Secure Payment', icon: '🔒' },
                { label: 'Women Produced', icon: '👩‍🌾' },
              ].map(item => (
                <div key={item.label} className="rounded-2xl border border-stone-200 bg-white px-3 py-2.5 text-stone-600 font-body inline-flex items-center gap-2">
                  <span>{item.icon}</span>
                  <span className="text-xs sm:text-sm">{item.label}</span>
                </div>
              ))}
            </div>

            <div className="border border-stone-200 rounded-3xl bg-white overflow-hidden">
              {[
                {
                  key: 'details' as const,
                  title: 'Product Details',
                  body: `Category: ${product.categoryName}. Minimum order: ${product.minOrderQty} ${product.unit}. Available stock: ${product.stockQuantity} ${product.unit}. ${product.description || ''}`,
                },
                {
                  key: 'nutrition' as const,
                  title: 'Nutritional Info',
                  body: 'Rich in fiber, vitamins, and natural minerals. Ideal for clean daily nutrition and balanced meals.',
                },
                {
                  key: 'story' as const,
                  title: 'Farm Story',
                  body: `This produce comes directly from ${product.farmerName}, with careful harvesting and quality checks before dispatch.`,
                },
              ].map(section => {
                const isOpen = openSection === section.key
                return (
                  <div key={section.key} className="border-b last:border-b-0 border-stone-100">
                    <button
                      title={`Toggle ${section.title}`}
                      onClick={() => setOpenSection(isOpen ? 'details' : section.key)}
                      className="w-full px-4 py-3.5 text-left flex items-center justify-between hover:bg-stone-50 transition"
                    >
                      <span className="text-sm font-semibold text-stone-800 inline-flex items-center gap-2"><Sparkles className="w-4 h-4 text-forest-600" />{section.title}</span>
                      <ChevronDown className={`w-4 h-4 text-stone-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {isOpen && (
                      <div className="px-4 pb-4 text-sm text-stone-600 leading-relaxed animate-fade-in">{section.body}</div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <div className="mt-12">
          <div className="flex items-center justify-between gap-3 mb-5">
            <div>
              <h2 className="text-2xl font-display font-semibold text-stone-900">Customer Reviews</h2>
              <p className="text-sm text-stone-500">Real feedback from verified buyers</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => toast('Review submission will be available soon')}>Write Review</Button>
          </div>

          <div className="bg-white border border-stone-200 rounded-3xl p-5 mb-5">
            <div className="flex items-center gap-3 mb-3">
              <p className="text-3xl font-display font-semibold text-stone-900">{(product.rating || 0).toFixed(1)}</p>
              <div>
                <StarRating rating={product.rating || 0} size="md" />
                <p className="text-xs text-stone-500 mt-1">Based on {product.reviewCount || 0} reviews</p>
              </div>
            </div>
          </div>

          {hasReviews && product.reviews ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {product.reviews.map(review => (
                <article key={review.id} className="bg-white rounded-3xl border border-stone-200 p-5 shadow-card hover:shadow-modal transition-all duration-200">
                  <div className="flex items-start justify-between mb-3 gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {review.userAvatar ? (
                        <img src={review.userAvatar} alt={review.userName} className="w-10 h-10 rounded-2xl object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-2xl bg-forest-100 flex items-center justify-center font-bold text-forest-700 text-sm">{review.userName[0]}</div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-stone-900 truncate">{review.userName}</p>
                        <p className="text-xs text-stone-400">{new Date(review.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <StarRating rating={review.rating} size="sm" />
                      {review.isVerifiedPurchase && <span className="text-[11px] text-forest-700 font-medium">Verified</span>}
                    </div>
                  </div>
                  {review.comment && <p className="text-sm text-stone-600 leading-relaxed">{review.comment}</p>}
                </article>
              ))}
            </div>
          ) : (
            <EmptyState title="No reviews yet" description="Be the first one to share feedback for this product." />
          )}
        </div>
      </div>

      <div className="md:hidden fixed bottom-4 left-3 right-3 z-40 rounded-2xl bg-white/95 backdrop-blur border border-stone-200 shadow-modal p-3 flex items-center gap-3">
        <div className="min-w-0">
          <p className="text-xs text-stone-500">{qty * unitPack}{product.unit}</p>
          <p className="text-base font-display font-semibold text-stone-900">₹{(finalPrice * qty).toFixed(0)}</p>
        </div>
        <Button
          variant="primary"
          onClick={handleAddToCart}
          loading={adding}
          disabled={product.stockQuantity === 0}
          className="flex-1 justify-center bg-gradient-to-r from-forest-700 to-forest-500"
        >
          <ShoppingCart className="w-4 h-4" /> Add to Cart
        </Button>
      </div>
    </PageLayout>
  )
}
