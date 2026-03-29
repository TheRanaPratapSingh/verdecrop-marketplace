import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { Heart, ShoppingCart, Leaf, Star } from 'lucide-react'
import { useAuthStore, useCartStore } from '../../store'
import { cartApi } from '../../services/api'
import { Spinner } from '../ui'
import type { Product, Category } from '../../types'
import toast from 'react-hot-toast'
import { resolveAssetUrl, resolveLocalUrl, resolveCategoryIcon, resolveProductImage } from '../../lib/image'


// ── Shared helper: renders category icon correctly regardless of format ────────
// Handles: emoji (1–2 chars), image path (/icons/x.png), full URL, empty
export const CategoryIcon: React.FC<{
  iconUrl?: string | null
  name?: string
  size?: string   // tailwind size class e.g. "w-6 h-6"
}> = ({ iconUrl, name = '', size = 'w-6 h-6' }) => {
  const [imgError, setImgError] = useState(false)
  const [fallbacked, setFallbacked] = useState(false)

  const isEmoji = iconUrl && [...iconUrl].length <= 2
  const defaultIcon = resolveCategoryIcon(name)
  const initialSrc = isEmoji
    ? iconUrl
    : resolveAssetUrl(iconUrl) || resolveLocalUrl(iconUrl) || defaultIcon

  const [src, setSrc] = useState(initialSrc)

  const handleError = () => {
    if (fallbacked) {
      setImgError(true)
      return
    }

    setFallbacked(true)

    const local = resolveLocalUrl(iconUrl) || defaultIcon
    if (local && local !== src) {
      setSrc(local)
      return
    }

    setImgError(true)
  }

  if (!iconUrl && !defaultIcon) return <span className="text-2xl">🌿</span>
  if (imgError) return <span className="text-2xl">🌿</span>
  if (isEmoji) return <span className="text-2xl">{iconUrl}</span>

  return (
    <img
      src={src}
      alt={name}
      className={`${size} object-contain`}
      onError={handleError}
    />
  )
}

// ── ProductCard ───────────────────────────────────────────────────────────────
export const ProductCard: React.FC<{ product: Product }> = ({ product }) => {
  const { isAuthenticated } = useAuthStore()
  const { setCart, openCart } = useCartStore()
  const [adding, setAdding] = useState(false)
  const [wishlisted, setWishlisted] = useState(false)
  const productBaseImage = resolveAssetUrl(product.imageUrl) || resolveLocalUrl(product.imageUrl) || resolveProductImage(product.slug, product.name)
  const [imageSrc, setImageSrc] = useState<string | undefined>(productBaseImage)
  const [imageFallbacked, setImageFallbacked] = useState(false)

  const handleImageError = () => {
    if (!imageFallbacked) {
      setImageFallbacked(true)
      const local = resolveLocalUrl(product.imageUrl) || resolveProductImage(product.slug, product.name)
      if (local && local !== imageSrc) {
        setImageSrc(local)
        return
      }
    }
    setImageSrc(undefined)
  }

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault()
    if (!isAuthenticated) { toast.error('Please login to add to cart'); return }
    setAdding(true)
    try {
      const cart = await cartApi.addItem(product.id, 1)
      setCart(cart)
      toast.success(`${product.name} added!`, {
        style: { borderRadius: '14px', background: '#175820', color: '#fff' },
        icon: '🛒'
      })
      openCart()
    } catch { toast.error('Could not add to cart') }
    finally { setAdding(false) }
  }

  const discount = product.originalPrice && product.originalPrice > product.price
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100) : 0

  return (
    <Link to={`/products/${product.slug}`} className="group block">
      <div className="bg-white rounded-[26px] shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden hover:-translate-y-1">
        {/* Image */}
        <div className="relative overflow-hidden bg-gradient-to-br from-emerald-50 via-white to-stone-50 aspect-[4/3]">
          {imageSrc ? (
            <img
              src={imageSrc}
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500"
              loading="lazy"
              onError={handleImageError}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-5xl bg-gradient-to-br from-forest-50 to-sage-100">🌿</div>
          )}

          {/* Badges */}
          <div className="absolute top-3 left-3 flex flex-col gap-1.5">
            {product.isOrganic && (
              <div className="flex items-center gap-1 px-2 py-1 bg-forest-700/90 backdrop-blur-sm rounded-full">
                <Leaf className="w-2.5 h-2.5 text-white" strokeWidth={2} />
                <span className="text-[9px] font-label font-bold text-white tracking-widest uppercase">Organic</span>
              </div>
            )}
            {discount > 0 && (
              <div className="px-2 py-0.5 bg-red-500 rounded-full">
                <span className="text-[9px] font-label font-bold text-white">-{discount}%</span>
              </div>
            )}
          </div>

          {/* Wishlist */}
          <button
            onClick={e => { e.preventDefault(); setWishlisted(v => !v) }}
            className="absolute top-3 right-3 p-2 bg-white/90 backdrop-blur-sm rounded-2xl shadow-sm opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110"
          >
            <Heart className={`w-4 h-4 transition-all duration-200 ${wishlisted ? 'fill-red-500 text-red-500' : 'text-stone-400'}`} strokeWidth={1.8} />
          </button>

          {/* Out of stock */}
          {product.stockQuantity === 0 && (
            <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] flex items-center justify-center">
              <span className="bg-stone-900 text-white text-xs font-label font-semibold px-4 py-1.5 rounded-full tracking-wide">Out of Stock</span>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-4">
          <p className="text-[10px] font-label font-medium text-stone-400 tracking-wide mb-0.5 uppercase truncate">{product.farmerName}</p>
          <h3 className="font-label font-semibold text-stone-800 leading-snug line-clamp-2 mb-2 group-hover:text-forest-700 transition-colors">{product.name}</h3>

          {product.reviewCount > 0 && (
            <div className="flex items-center gap-1.5 mb-2.5">
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map(i => (
                  <Star key={i} className={`w-3 h-3 ${i <= Math.round(product.rating) ? 'fill-amber-400 text-amber-400' : 'fill-stone-200 text-stone-200'}`} />
                ))}
              </div>
              <span className="text-[10px] text-stone-400 font-body">({product.reviewCount})</span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-display font-semibold text-forest-700">₹{product.price}</span>
              {product.originalPrice && product.originalPrice > product.price && (
                <span className="text-xs text-stone-400 line-through font-body">₹{product.originalPrice}</span>
              )}
              <span className="text-[10px] text-stone-400 font-body">/{product.unit}</span>
            </div>

            <button
              onClick={handleAddToCart}
              disabled={adding || product.stockQuantity === 0}
              className="flex items-center justify-center gap-2 px-3 py-2.5 bg-forest-700 hover:bg-forest-600 active:bg-forest-800 text-white rounded-xl transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm hover:shadow"
            >
              {adding ? <Spinner size="sm" /> : <><ShoppingCart className="w-4 h-4" strokeWidth={2} /><span className="text-xs sm:text-sm font-medium">Add to Cart</span></>}
            </button>
          </div>
        </div>
      </div>
    </Link>
  )
}

// ── ProductGrid ───────────────────────────────────────────────────────────────
export const ProductGrid: React.FC<{ products: Product[]; loading?: boolean }> = ({ products, loading }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="bg-white rounded-3xl shadow-card overflow-hidden animate-pulse">
            <div className="aspect-[4/3] bg-stone-100" />
            <div className="p-4 space-y-2.5">
              <div className="h-2.5 bg-stone-100 rounded-full w-1/2" />
              <div className="h-4 bg-stone-100 rounded-full w-5/6" />
              <div className="h-5 bg-stone-100 rounded-full w-1/3 mt-3" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (!products.length) {
    return (
      <div className="text-center py-20">
        <div className="text-5xl mb-4">🌱</div>
        <p className="font-display text-2xl text-stone-600">No products found</p>
        <p className="text-stone-400 font-body mt-2">Try adjusting your filters or search terms.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
      {products.map((p, i) => (
        <div key={p.id} className="animate-fade-up" style={{ animationDelay: `${i * 40}ms`, animationFillMode: 'both' }}>
          <ProductCard product={p} />
        </div>
      ))}
    </div>
  )
}

// ── CategoryCard ──────────────────────────────────────────────────────────────
export const CategoryCard: React.FC<{ category: Category }> = ({ category }) => (
  <Link
    to={`/products?categoryId=${category.id}`}
    className="group flex flex-col items-center gap-2.5 py-5 px-3 bg-white rounded-3xl shadow-card hover:shadow-card-hover hover:-translate-y-1 transition-all duration-300"
  >
    {/* ── FIXED: uses CategoryIcon helper instead of broken length <= 2 check ── */}
    <div className="w-12 h-12 rounded-2xl bg-forest-50 group-hover:bg-forest-100 flex items-center justify-center transition-colors duration-200 overflow-hidden">
      <CategoryIcon iconUrl={category.iconUrl} name={category.name} size="w-7 h-7" />
    </div>
    <span className="text-[11px] font-label font-semibold text-stone-700 group-hover:text-forest-700 text-center leading-tight transition-colors">
      {category.name}
    </span>
    <span className="text-[10px] text-stone-400 font-body">{category.productCount} items</span>
  </Link>
)