import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { ShoppingCart, Leaf, Star, Minus, Plus } from 'lucide-react'
import { useAuthStore, useCartStore, useGuestCartStore } from '../../store'
import { cartApi } from '../../services/api'
import { Spinner } from '../ui'
import type { Product, Category } from '../../types'
import toast from 'react-hot-toast'
import { resolveAssetUrl, resolveLocalUrl, resolveCategoryIcon, resolveProductImage } from '../../lib/image'
import { WishlistButton } from './WishlistButton'


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
  const { cart, setCart } = useCartStore()
  const { items: guestItems, addItem: addGuestItem, updateItem: updateGuestItem } = useGuestCartStore()
  const [adding, setAdding] = useState(false)
  const [updating, setUpdating] = useState(false)

  // Derive current quantity from whichever cart is active
  const cartItem = isAuthenticated ? cart?.items.find(i => i.productId === product.id) : null
  const guestItem = !isAuthenticated ? guestItems.find(i => i.productId === product.id) : null
  const cartQty = cartItem?.quantity ?? guestItem?.quantity ?? 0
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
    if (product.stockQuantity === 0) { toast.error('Out of stock'); return }
    if (!isAuthenticated) {
      addGuestItem({
        productId: product.id,
        productName: product.name,
        price: product.price,
        originalPrice: product.originalPrice,
        imageUrl: product.imageUrl,
        unit: product.unit,
        quantity: 1,
        stockQuantity: product.stockQuantity,
        slug: product.slug,
      })
      toast.success(`${product.name} added!`, {
        style: { borderRadius: '14px', background: '#175820', color: '#fff' },
        icon: String.fromCodePoint(0x1F6D2),
      })
      return
    }
    setAdding(true)
    try {
      const updated = await cartApi.addItem(product.id, 1)
      setCart(updated)
      toast.success(`${product.name} added!`, {
        style: { borderRadius: '14px', background: '#175820', color: '#fff' },
        icon: String.fromCodePoint(0x1F6D2),
      })
    } catch { toast.error('Could not add to cart') }
    finally { setAdding(false) }
  }

  const handleIncrease = async (e: React.MouseEvent) => {
    e.preventDefault()
    if (!isAuthenticated) {
      if (!guestItem) return
      if (guestItem.quantity >= product.stockQuantity) { toast.error('Max stock reached'); return }
      updateGuestItem(product.id, guestItem.quantity + 1)
      return
    }
    if (!cartItem) return
    setUpdating(true)
    try {
      const updated = await cartApi.updateItem(cartItem.id, cartItem.quantity + 1)
      setCart(updated)
    } catch { toast.error('Could not update cart') }
    finally { setUpdating(false) }
  }

  const handleDecrease = async (e: React.MouseEvent) => {
    e.preventDefault()
    if (!isAuthenticated) {
      if (!guestItem) return
      updateGuestItem(product.id, guestItem.quantity - 1)
      return
    }
    if (!cartItem) return
    setUpdating(true)
    try {
      const updated = cartItem.quantity === 1
        ? await cartApi.removeItem(cartItem.id)
        : await cartApi.updateItem(cartItem.id, cartItem.quantity - 1)
      setCart(updated)
    } catch { toast.error('Could not update cart') }
    finally { setUpdating(false) }
  }

  const discount = product.originalPrice && product.originalPrice > product.price
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100) : 0

  return (
    <Link to={`/products/${product.slug}`} className="group block h-full">
      <div className="bg-white rounded-2xl shadow-card hover:shadow-card-hover transition-all duration-300 overflow-hidden hover:-translate-y-1 h-full flex flex-col">
        {/* Image */}
        <div className="relative overflow-hidden bg-gradient-to-br from-emerald-50 via-white to-stone-50 aspect-[4/3]">
          {imageSrc ? (
            <img
              src={imageSrc}
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
              onError={handleImageError}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-5xl bg-gradient-to-br from-forest-50 to-sage-100">🌿</div>
          )}

          {/* Badges */}
          <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5">
            {product.isOrganic && (
              <span className="badge-organic">
                <Leaf className="w-2.5 h-2.5" strokeWidth={2.5} />
                Organic
              </span>
            )}
            {discount > 0 && (
              <span className="badge-discount">-{discount}%</span>
            )}
            {product.pricingLabel && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-label font-semibold bg-amber-500/90 text-white backdrop-blur-sm shadow-sm leading-tight">
                {product.pricingLabel}
              </span>
            )}
          </div>

          {/* Wishlist */}
          {isAuthenticated && (
            <WishlistButton
              productId={product.id}
              productName={product.name}
              size="sm"
              className="absolute top-2.5 right-2.5 p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-sm opacity-0 group-hover:opacity-100 hover:scale-110"
            />
          )}

          {/* Out of stock */}
          {product.stockQuantity === 0 && (
            <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] flex items-center justify-center">
              <span className="bg-stone-900 text-white text-xs font-label font-semibold px-4 py-1.5 rounded-full tracking-wide">Out of Stock</span>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-4 flex flex-col flex-1">
          <p className="text-[10px] font-label font-medium text-stone-400 tracking-wider uppercase truncate">{product.farmerName}</p>
          <h3 className="font-label font-bold text-stone-900 text-sm leading-snug line-clamp-2 mt-1 group-hover:text-forest-700 transition-colors">{product.name}</h3>

          {product.reviewCount > 0 && (
            <div className="flex items-center gap-1 mt-2">
              <div className="flex">
                {[1, 2, 3, 4, 5].map(i => (
                  <Star key={i} className={`w-3 h-3 ${i <= Math.round(product.rating) ? 'fill-amber-400 text-amber-400' : 'fill-stone-200 text-stone-200'}`} />
                ))}
              </div>
              <span className="text-[10px] text-stone-400 font-body">({product.reviewCount})</span>
            </div>
          )}

          {/* Price + CTA — pushed to bottom */}
          <div className="mt-auto pt-3">
            <div className="flex items-baseline gap-1.5 mb-2.5">
              <span className="text-lg font-display font-bold text-forest-700">₹{product.price}</span>
              {product.originalPrice && product.originalPrice > product.price && (
                <span className="text-xs text-stone-400 line-through font-body">₹{product.originalPrice}</span>
              )}
              <span className="text-[10px] text-stone-400 font-body">/{product.unit}</span>
            </div>

            {cartQty > 0 ? (
              <div
                onClick={e => e.preventDefault()}
                className="w-full flex items-center justify-between bg-forest-700 rounded-xl overflow-hidden shadow-btn h-10"
              >
                <button
                  onClick={handleDecrease}
                  disabled={updating}
                  className="flex items-center justify-center w-10 h-10 text-white hover:bg-forest-600 active:bg-forest-800 transition-colors disabled:opacity-50"
                >
                  <Minus className="w-4 h-4" strokeWidth={2.5} />
                </button>
                <span className="flex-1 text-center text-white text-sm font-label font-bold">
                  {updating ? <Spinner size="sm" /> : cartQty}
                </span>
                <button
                  onClick={handleIncrease}
                  disabled={updating}
                  className="flex items-center justify-center w-10 h-10 text-white hover:bg-forest-600 active:bg-forest-800 transition-colors disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" strokeWidth={2.5} />
                </button>
              </div>
            ) : (
              <button
                onClick={handleAddToCart}
                disabled={adding || product.stockQuantity === 0}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-forest-700 hover:bg-forest-600 active:bg-forest-800 text-white text-sm font-label font-semibold rounded-xl shadow-btn hover:shadow-btn-hover active:scale-[0.97] transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {adding ? <Spinner size="sm" /> : <><ShoppingCart className="w-4 h-4" strokeWidth={2} />Add to Cart</>}
              </button>
            )}
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
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl shadow-card overflow-hidden animate-pulse">
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
    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
      {products.map((p, i) => (
        <div key={p.id} className="animate-fade-up h-full" style={{ animationDelay: `${i * 40}ms`, animationFillMode: 'both' }}>
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

export { CategorySection } from './CategorySection'
export type { CategorySectionProps } from './CategorySection'
export { WishlistButton } from './WishlistButton'