import React, { useEffect, useState, useCallback } from 'react'
import { useSearchParams, Link, useParams, useNavigate } from 'react-router-dom'
import { Filter, SlidersHorizontal, X, Star, Heart, ShoppingCart, Leaf, ChevronLeft, ChevronRight, MapPin, ChevronDown, Sparkles, CheckCircle2, FlaskConical, BookOpen, Package, Info } from 'lucide-react'
import { productApi, categoryApi, cartApi, reviewApi } from '../services/api'
import { resolveAssetUrl, resolveLocalUrl, resolveProductImage } from '../lib/image'
import { PageLayout } from '../components/layout'
import { ProductGrid, CategoryIcon } from '../components/product'
import { SEO } from '../components/SEO'
import { Button, Badge, Spinner, Pagination, PriceDisplay, StarRating, EmptyState } from '../components/ui'
import { useCartStore, useAuthStore, useGuestCartStore } from '../store'
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
  // When a slug is present it is the authoritative filter: use the slug-resolved id.
  // If categories have not loaded yet leave resolvedCategoryId empty so loadProducts
  // falls through to sending categorySlug directly to the API (backend supports it).
  const resolvedCategoryId = matchedCategory
    ? String(matchedCategory.id)
    : categorySlug
      ? ''
      : categoryId

  const loadProducts = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, string> = { page: String(page), pageSize: '20', sortBy }
      if (search) params.search = search
      if (resolvedCategoryId) params.categoryId = resolvedCategoryId
      else if (categorySlug) params.categorySlug = categorySlug
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
  }, [page, search, resolvedCategoryId, categorySlug, sortBy, isOrganic, minPrice, maxPrice, farmerId])

  useEffect(() => { loadProducts() }, [loadProducts])
  useEffect(() => { categoryApi.getAll().then(setCategories).catch(() => {}) }, [])

  const clearFilters = () => setSearchParams(new URLSearchParams())

  const hasFilters = !!(search || categoryId || categorySlug || isOrganic || minPrice || maxPrice || farmerId)

  return (
    <PageLayout>
      <SEO
        title={
          search
            ? `"${search}" – Organic Products`
            : matchedCategory
              ? `${matchedCategory.name} – Organic`
              : farmerId
                ? `${farmerName || 'Farm'} Products`
                : 'Shop Organic Products'
        }
        description={
          matchedCategory
            ? `Buy fresh certified organic ${matchedCategory.name.toLowerCase()} directly from verified Indian farmers on Graamo. No chemicals, no middlemen.`
            : `Browse ${total > 0 ? total + '+' : 'thousands of'} certified organic products from trusted Indian farms. Fresh vegetables, fruits, grains & more on Graamo.`
        }
        canonical={`https://graamo.in/products`}
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-display font-bold text-gray-900">
              {search
                ? `Results for "${search}"`
                : farmerId
                  ? `Products from ${farmerName || 'Selected Farm'}`
                  : matchedCategory?.name
                      || (resolvedCategoryId
                        ? categories.find(c => c.id === Number(resolvedCategoryId))?.name || 'Products'
                        : categorySlug
                          ? 'Products'
                          : 'All Products')}
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

function parseVariantPrices(variantPrices?: string): Record<string, number> {
  if (!variantPrices) return {}
  try { return JSON.parse(variantPrices) as Record<string, number> } catch { return {} }
}

function getVariantPrice(product: Product, selectedVariant: string | null): number {
  const vp = parseVariantPrices(product.variantPrices)
  const labels = product.quantityOptions?.length ? product.quantityOptions : Object.keys(vp)
  const active = selectedVariant ?? labels[0] ?? null
  if (active && vp[active] != null) return vp[active]
  return product.price
}

export const ProductDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [qty, setQty] = useState(1)
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [buyingNow, setBuyingNow] = useState(false)
  const [activeImg, setActiveImg] = useState(0)
  const [wishlisted, setWishlisted] = useState(false)
  const [openSection, setOpenSection] = useState<'overview' | 'features' | 'nutrition' | 'story' | 'additional'>('overview')
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [reviewRating, setReviewRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [reviewComment, setReviewComment] = useState('')
  const [submittingReview, setSubmittingReview] = useState(false)
  const { setCart, openCart } = useCartStore()
  const { isAuthenticated } = useAuthStore()
  const { addItem: addGuestItem } = useGuestCartStore()

  useEffect(() => {
    if (!slug) return
    setLoading(true)
    productApi.getBySlug(slug)
      .then(p => {
        setProduct(p)
        setLoading(false)
      })
      .catch(async () => {
        // Fallback: if the slug contains special characters that the URL encoded but the
        // backend still couldn't match, try fetching by the numeric ID embedded in the URL
        // (some legacy product cards link by ID directly)
        const idMatch = /^(\d+)$/.exec(slug)
        if (idMatch) {
          try {
            const p = await productApi.getById(Number(idMatch[1]))
            setProduct(p)
          } catch { /* not found */ }
        }
        setLoading(false)
      })
  }, [slug])

  useEffect(() => {
    if (!product) return
    trackEvent('view_product', {
      product_id: product.id,
      product_name: product.name,
      category_name: product.categoryName,
      price: product.price,
    })
  }, [product])

  const handleAddToCart = async () => {
    if (!product) return
    const variantPrice = getVariantPrice(product, selectedVariant)
    if (!isAuthenticated) {
      addGuestItem({
        productId: product.id,
        productName: product.name,
        price: variantPrice,
        originalPrice: product.originalPrice,
        imageUrl: product.imageUrl,
        unit: selectedVariant ?? product.unit,
        quantity: qty,
        stockQuantity: product.stockQuantity,
        slug: product.slug,
      })
      toast.success(`${product.name} added to cart!`, {
        style: { borderRadius: '14px', background: '#175820', color: '#fff' },
        icon: '🛒',
      })
      return
    }
    setAdding(true)
    try {
      const cart = await cartApi.addItem(product.id, qty)
      setCart(cart)
      trackEvent('add_to_cart', {
        product_id: product.id,
        product_name: product.name,
        quantity: qty,
        value: variantPrice * qty,
      })
      toast.success('Added to cart!', { icon: '🛒' })
      openCart()
    } catch { toast.error('Could not add to cart') }
    finally { setAdding(false) }
  }

  const handleBuyNow = async () => {
    if (!product) return
    if (!isAuthenticated) { navigate('/login'); return }
    const variantPrice = getVariantPrice(product, selectedVariant)
    setBuyingNow(true)
    try {
      const cart = await cartApi.addItem(product.id, qty)
      setCart(cart)
      trackEvent('buy_now', {
        product_id: product.id,
        product_name: product.name,
        quantity: qty,
        value: variantPrice * qty,
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

  const handleSubmitReview = async () => {
    if (!reviewRating) { toast.error('Please select a star rating'); return }
    setSubmittingReview(true)
    try {
      const newReview = await reviewApi.create({
        productId: product.id,
        rating: reviewRating,
        comment: reviewComment.trim() || undefined,
      })
      toast.success('Review submitted! Thank you for your feedback.', {
        style: { borderRadius: '14px', background: '#175820', color: '#fff' },
        icon: '⭐',
      })
      setShowReviewModal(false)
      setReviewRating(0)
      setReviewComment('')
      setProduct(prev => prev ? {
        ...prev,
        reviews: [newReview, ...(prev.reviews || [])],
        reviewCount: (prev.reviewCount || 0) + 1,
      } : prev)
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.message
      toast.error(msg === 'Already reviewed this product' ? 'You have already reviewed this product.' : (msg ?? 'Failed to submit review'))
    } finally {
      setSubmittingReview(false)
    }
  }

  return (
    <PageLayout>
      <SEO
        title={product.name}
        description={`Buy ${product.name} – ${product.isOrganic ? '100% certified organic, ' : ''}₹${product.price}/${product.unit ?? 'unit'} from ${product.farmerName ?? 'a verified farm'} on Graamo. ${product.description ? product.description.slice(0, 80) : 'Farm fresh, no chemicals.'}`.slice(0, 155)}
        canonical={`https://graamo.in/products/${product.slug}`}
        image={images[0] ?? undefined}
        type="website"
      />
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
              {isAuthenticated && (
                <button
                  title="Add to wishlist"
                  onClick={() => setWishlisted(v => !v)}
                  className="w-11 h-11 rounded-2xl border border-stone-200 hover:border-red-300 hover:bg-red-50 transition"
                >
                  <Heart className={`w-5 h-5 mx-auto transition-colors ${wishlisted ? 'fill-red-500 text-red-500' : 'text-stone-400'}`} />
                </button>
              )}
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

            {/* ── Premium Product Info Accordion ── */}
            {(() => {
              // Parse nutrition JSON safely
              type NutRow = { nutrient: string; value: string }
              let nutritionRows: NutRow[] = []
              if (product.nutritionInfo) {
                try { nutritionRows = JSON.parse(product.nutritionInfo) } catch { }
              }

              const sections: {
                key: 'overview' | 'features' | 'nutrition' | 'story' | 'additional'
                title: string
                icon: React.ReactNode
                hasContent: boolean
              }[] = [
                {
                  key: 'overview',
                  title: 'Product Overview',
                  icon: <BookOpen className="w-4 h-4 text-forest-600" />,
                  hasContent: true,
                },
                {
                  key: 'features',
                  title: 'Key Features',
                  icon: <CheckCircle2 className="w-4 h-4 text-forest-600" />,
                  hasContent: !!(product.keyFeatures && product.keyFeatures.length > 0),
                },
                {
                  key: 'nutrition',
                  title: 'Nutritional Info',
                  icon: <FlaskConical className="w-4 h-4 text-forest-600" />,
                  hasContent: nutritionRows.length > 0,
                },
                {
                  key: 'story',
                  title: 'Farm Story',
                  icon: <Leaf className="w-4 h-4 text-forest-600" />,
                  hasContent: !!(product.farmStory),
                },
                {
                  key: 'additional',
                  title: 'Additional Details',
                  icon: <Info className="w-4 h-4 text-forest-600" />,
                  hasContent: !!(product.storageInstructions || product.packagingDetails || product.shelfLifeDays),
                },
              ]

              return (
                <div className="border border-stone-200 rounded-3xl bg-white overflow-hidden divide-y divide-stone-100">
                  {sections.map(section => {
                    const isOpen = openSection === section.key
                    return (
                      <div key={section.key}>
                        <button
                          title={`Toggle ${section.title}`}
                          onClick={() => setOpenSection(isOpen ? 'overview' : section.key)}
                          className="w-full px-4 py-3.5 text-left flex items-center justify-between hover:bg-stone-50 transition group"
                        >
                          <span className="text-sm font-semibold text-stone-800 inline-flex items-center gap-2">
                            <span className="w-7 h-7 rounded-xl bg-forest-50 group-hover:bg-forest-100 flex items-center justify-center transition flex-shrink-0">
                              {section.icon}
                            </span>
                            {section.title}
                          </span>
                          <ChevronDown className={`w-4 h-4 text-stone-400 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {isOpen && (
                          <div className="px-4 pb-5 text-sm text-stone-600 leading-relaxed animate-fade-up">

                            {/* ── OVERVIEW ── */}
                            {section.key === 'overview' && (
                              <div className="space-y-3">
                                {product.description ? (
                                  <p className="text-stone-600 leading-relaxed">{product.description}</p>
                                ) : (
                                  <p className="text-stone-400 italic">No description provided.</p>
                                )}
                                <div className="grid grid-cols-2 gap-2 pt-2">
                                  {[
                                    { label: 'Category', value: product.categoryName },
                                    { label: 'Min. Order', value: `${product.minOrderQty} ${product.unit}` },
                                    { label: 'Stock', value: `${product.stockQuantity} ${product.unit}` },
                                    ...(product.deliveryTime ? [{ label: 'Delivery', value: product.deliveryTime }] : []),
                                  ].map(r => (
                                    <div key={r.label} className="bg-stone-50 rounded-xl px-3 py-2">
                                      <p className="text-[10px] uppercase tracking-wider text-stone-400 font-medium">{r.label}</p>
                                      <p className="text-sm font-semibold text-stone-800 mt-0.5">{r.value}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* ── KEY FEATURES ── */}
                            {section.key === 'features' && (
                              <div>
                                {(product.keyFeatures && product.keyFeatures.length > 0) ? (
                                  <ul className="space-y-2.5 pt-1">
                                    {product.keyFeatures.map((feat, i) => (
                                      <li key={i} className="flex items-start gap-3">
                                        <span className="w-5 h-5 rounded-full bg-forest-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                                          <CheckCircle2 className="w-3 h-3 text-forest-600" />
                                        </span>
                                        <span className="text-stone-700">{feat}</span>
                                      </li>
                                    ))}
                                  </ul>
                                ) : (
                                  <div className="space-y-2.5 pt-1">
                                    {[
                                      product.isOrganic ? '100% Organic — Grown without pesticides' : null,
                                      '🌾 Farm Fresh — Direct from source',
                                      '🚚 Fast Delivery — Same or next day',
                                      '💚 Quality Checked — Handpicked produce',
                                    ].filter(Boolean).map((feat, i) => (
                                      <div key={i} className="flex items-start gap-3">
                                        <span className="w-5 h-5 rounded-full bg-forest-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                                          <CheckCircle2 className="w-3 h-3 text-forest-600" />
                                        </span>
                                        <span className="text-stone-700">{feat}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}

                            {/* ── NUTRITION ── */}
                            {section.key === 'nutrition' && (
                              <div>
                                {nutritionRows.length > 0 ? (
                                  <div className="overflow-hidden rounded-xl border border-stone-200 mt-1">
                                    <table className="w-full text-sm">
                                      <thead>
                                        <tr className="bg-forest-50">
                                          <th className="text-left px-4 py-2.5 text-xs font-semibold text-forest-800 uppercase tracking-wider">Nutrient</th>
                                          <th className="text-right px-4 py-2.5 text-xs font-semibold text-forest-800 uppercase tracking-wider">Per 100g</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-stone-100">
                                        {nutritionRows.map((row, i) => (
                                          <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-stone-50/50'}>
                                            <td className="px-4 py-2.5 text-stone-700 font-medium">{row.nutrient}</td>
                                            <td className="px-4 py-2.5 text-stone-900 font-semibold text-right">{row.value}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                ) : (
                                  <p className="text-stone-400 italic pt-1">Nutritional information not available for this product.</p>
                                )}
                              </div>
                            )}

                            {/* ── FARM STORY ── */}
                            {section.key === 'story' && (
                              <div className="bg-gradient-to-br from-forest-50 to-amber-50/40 border border-forest-100 rounded-2xl p-4 mt-1">
                                <div className="flex items-start gap-3 mb-3">
                                  <div className="w-9 h-9 rounded-2xl bg-forest-100 text-forest-700 flex items-center justify-center font-bold text-sm flex-shrink-0">
                                    {product.farmerName[0]}
                                  </div>
                                  <div>
                                    <p className="text-sm font-semibold text-stone-900">{product.farmerName}</p>
                                    <p className="text-xs text-stone-500 flex items-center gap-1">
                                      <MapPin className="w-3 h-3" />
                                      {product.farmLocation || 'Village Farm'}
                                    </p>
                                  </div>
                                </div>
                                <p className="text-stone-700 leading-relaxed text-[13px]">
                                  {product.farmStory || `यह उत्पाद ${product.farmerName} द्वारा उगाया गया है। ताज़गी और गुणवत्ता की गारंटी के साथ, सीधे खेत से आपके घर तक।`}
                                </p>
                              </div>
                            )}

                            {/* ── ADDITIONAL DETAILS ── */}
                            {section.key === 'additional' && (
                              <div className="space-y-3 pt-1">
                                {[
                                  product.storageInstructions && { icon: '🌡️', label: 'Storage', value: product.storageInstructions },
                                  product.packagingDetails && { icon: '📦', label: 'Packaging', value: product.packagingDetails },
                                  product.shelfLifeDays && { icon: '📅', label: 'Shelf Life', value: `${product.shelfLifeDays} days` },
                                  product.freshnessGuarantee && { icon: '✅', label: 'Freshness Guarantee', value: product.freshnessGuarantee },
                                  product.certificationType && product.certificationType !== 'None' && { icon: '🏅', label: 'Certification', value: product.certificationType },
                                ].filter(Boolean).map((item: any) => (
                                  <div key={item.label} className="flex items-start gap-3 bg-stone-50 rounded-xl px-3.5 py-3">
                                    <span className="text-base leading-none mt-0.5">{item.icon}</span>
                                    <div>
                                      <p className="text-[10px] uppercase tracking-wider text-stone-400 font-medium">{item.label}</p>
                                      <p className="text-sm text-stone-800 font-medium mt-0.5">{item.value}</p>
                                    </div>
                                  </div>
                                ))}
                                {!product.storageInstructions && !product.packagingDetails && !product.shelfLifeDays && !product.freshnessGuarantee && (
                                  <p className="text-stone-400 italic">No additional details available.</p>
                                )}
                              </div>
                            )}

                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )
            })()}
          </div>
        </div>

        <div className="mt-12">
          <div className="flex items-center justify-between gap-3 mb-5">
            <div>
              <h2 className="text-2xl font-display font-semibold text-stone-900">Customer Reviews</h2>
              <p className="text-sm text-stone-500">Real feedback from verified buyers</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => isAuthenticated ? setShowReviewModal(true) : navigate(`/auth?redirect=/products/${slug}`)}
            >Write Review</Button>
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

      {/* ── Write Review Modal ──────────────────────────────────────────── */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !submittingReview && setShowReviewModal(false)} />
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-modal p-6 animate-fade-up">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-lg font-display font-semibold text-stone-900">Write a Review</h3>
                <p className="text-xs text-stone-500 mt-0.5 truncate max-w-[250px]">{product.name}</p>
              </div>
              <button
                onClick={() => !submittingReview && setShowReviewModal(false)}
                className="w-8 h-8 rounded-xl bg-stone-100 hover:bg-stone-200 flex items-center justify-center transition"
                aria-label="Close"
              >
                <X className="w-4 h-4 text-stone-500" />
              </button>
            </div>

            {/* Star Rating */}
            <div className="mb-5">
              <p className="text-sm font-medium text-stone-700 mb-2">Your Rating <span className="text-red-400">*</span></p>
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setReviewRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="transition-transform hover:scale-110 focus:outline-none"
                    aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
                  >
                    <Star
                      className={`w-8 h-8 transition-colors ${
                        star <= (hoverRating || reviewRating)
                          ? 'fill-amber-400 text-amber-400'
                          : 'fill-stone-200 text-stone-200'
                      }`}
                    />
                  </button>
                ))}
                {(hoverRating || reviewRating) > 0 && (
                  <span className="ml-2 text-sm font-medium text-stone-600">
                    {(['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'])[hoverRating || reviewRating]}
                  </span>
                )}
              </div>
            </div>

            {/* Comment */}
            <div className="mb-6">
              <p className="text-sm font-medium text-stone-700 mb-2">Your Comment <span className="text-stone-400 font-normal">(optional)</span></p>
              <textarea
                value={reviewComment}
                onChange={e => setReviewComment(e.target.value)}
                placeholder="Share your experience with this product…"
                rows={4}
                maxLength={1000}
                className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-800 placeholder-stone-400 resize-none focus:outline-none focus:ring-2 focus:ring-forest-400 focus:border-transparent transition"
              />
              <p className="text-right text-[11px] text-stone-400 mt-1">{reviewComment.length}/1000</p>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowReviewModal(false)}
                disabled={submittingReview}
                className="flex-1 justify-center"
              >Cancel</Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSubmitReview}
                loading={submittingReview}
                disabled={!reviewRating}
                className="flex-1 justify-center bg-gradient-to-r from-forest-700 to-forest-500"
              >Submit Review</Button>
            </div>
          </div>
        </div>
      )}

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
