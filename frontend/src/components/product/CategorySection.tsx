import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ChevronRight, Leaf, Minus, Plus } from 'lucide-react'
import { useAuthStore, useCartStore, useGuestCartStore } from '../../store'
import type { GuestCartItem } from '../../store'
import { cartApi } from '../../services/api'
import { Spinner } from '../ui'
import type { Product } from '../../types'
import toast from 'react-hot-toast'
import { resolveAssetUrl, resolveLocalUrl, resolveProductImage } from '../../lib/image'
import { WishlistButton } from './WishlistButton'

// ── Grid-friendly product card (fills its column width) ───────────────────────
const GridProductCard: React.FC<{ product: Product }> = ({ product }) => {
  const { isAuthenticated } = useAuthStore()
  const { cart, setCart, openCart } = useCartStore()
  const { items: guestItems, addItem: addGuestItem, updateItem: updateGuestItem } = useGuestCartStore()
  const navigate = useNavigate()
  const [adding, setAdding] = useState(false)
  const [updating, setUpdating] = useState(false)

  const cartItem = isAuthenticated ? cart?.items.find(i => i.productId === product.id) : null
  const guestItem = !isAuthenticated ? guestItems.find((i: GuestCartItem) => i.productId === product.id) : null
  const cartQty = cartItem?.quantity ?? guestItem?.quantity ?? 0

  const base = resolveAssetUrl(product.imageUrl) || resolveLocalUrl(product.imageUrl) || resolveProductImage(product.slug, product.name)
  const [imgSrc, setImgSrc] = useState<string | undefined>(base)
  const [fallbacked, setFallbacked] = useState(false)

  const handleImgError = () => {
    if (!fallbacked) {
      setFallbacked(true)
      const local = resolveLocalUrl(product.imageUrl) || resolveProductImage(product.slug, product.name)
      if (local && local !== imgSrc) { setImgSrc(local); return }
    }
    setImgSrc(undefined)
  }

  const savingsAmt =
    product.originalPrice && product.originalPrice > product.price
      ? Math.round(product.originalPrice - product.price)
      : 0

  const handleAdd = async (e: React.MouseEvent) => {
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
    } catch {
      toast.error('Could not add to cart')
    } finally {
      setAdding(false)
    }
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
    } catch {
      toast.error('Could not update cart')
    } finally {
      setUpdating(false)
    }
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
      const updated =
        cartItem.quantity === 1
          ? await cartApi.removeItem(cartItem.id)
          : await cartApi.updateItem(cartItem.id, cartItem.quantity - 1)
      setCart(updated)
    } catch {
      toast.error('Could not update cart')
    } finally {
      setUpdating(false)
    }
  }

  return (
    <Link
      to={`/products/${encodeURIComponent(product.slug)}`}
      className="group w-full bg-white rounded-2xl shadow-card hover:shadow-card-hover transition-all duration-300 overflow-hidden flex flex-col border border-stone-100/80 hover:border-forest-200 hover:-translate-y-1"
    >
      {/* ── Product image ── */}
      <div className="relative w-full aspect-square bg-gradient-to-br from-emerald-50 to-stone-50 overflow-hidden">
        {imgSrc ? (
          <img
            src={imgSrc}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
            onError={handleImgError}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl">🌿</div>
        )}

        {product.isOrganic && (
          <span className="absolute top-2 left-2 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-label font-bold bg-forest-700 text-white leading-tight shadow-sm">
            <Leaf className="w-2.5 h-2.5" strokeWidth={2.5} />ORG
          </span>
        )}

        {isAuthenticated && (
          <WishlistButton
            productId={product.id}
            productName={product.name}
            size="sm"
            className="absolute top-2 right-2 p-1.5 bg-white/95 backdrop-blur-sm rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200"
          />
        )}

        {/* ── Cart stepper / ADD button ── */}
        <div onClick={e => e.preventDefault()} className="absolute bottom-2 right-2">
          {cartQty > 0 ? (
            <div className="flex items-center bg-forest-700 rounded-xl overflow-hidden shadow-md h-7">
              <button
                onClick={handleDecrease}
                disabled={updating}
                className="flex items-center justify-center w-7 h-7 text-white hover:bg-forest-600 active:bg-forest-800 transition-colors disabled:opacity-50"
              >
                <Minus className="w-3 h-3" strokeWidth={3} />
              </button>
              <span className="px-1.5 min-w-[1.25rem] text-center text-white text-xs font-label font-bold">
                {updating ? <Spinner size="sm" /> : cartQty}
              </span>
              <button
                onClick={handleIncrease}
                disabled={updating}
                className="flex items-center justify-center w-7 h-7 text-white hover:bg-forest-600 active:bg-forest-800 transition-colors disabled:opacity-50"
              >
                <Plus className="w-3 h-3" strokeWidth={3} />
              </button>
            </div>
          ) : product.stockQuantity !== 0 ? (
            <button
              onClick={handleAdd}
              disabled={adding}
              className="px-3.5 h-7 bg-forest-600 text-white text-xs font-label font-bold rounded-xl shadow-btn hover:bg-forest-700 hover:shadow-btn-hover active:scale-95 transition-all duration-150 disabled:opacity-50"
            >
              {adding ? <Spinner size="sm" /> : 'ADD'}
            </button>
          ) : null}
        </div>

        {product.stockQuantity === 0 && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] flex items-center justify-center">
            <span className="bg-stone-900 text-white text-[10px] font-label font-semibold px-2.5 py-1 rounded-full">
              Out of Stock
            </span>
          </div>
        )}
      </div>

      {/* ── Product info ── */}
      <div className="px-3 pt-2.5 pb-3 flex flex-col flex-1 gap-0.5">
        {/* Name — second most prominent */}
        <p className="text-[13px] font-label font-bold text-stone-900 leading-snug line-clamp-2 group-hover:text-forest-700 transition-colors duration-200">
          {product.name}
        </p>
        {/* Unit / weight — muted */}
        <p className="text-[10.5px] font-body text-[#666] leading-tight">{product.unit}</p>
        {/* Price row — most prominent */}
        <div className="flex items-baseline gap-1.5 flex-wrap mt-1.5">
          <span className="text-[15px] font-label font-bold text-[#111] leading-none">₹{product.price}</span>
          {product.originalPrice && product.originalPrice > product.price && (
            <span className="text-[11px] text-[#999] line-through font-body leading-none">₹{product.originalPrice}</span>
          )}
        </div>
        {/* Savings badge */}
        {savingsAmt > 0 && (
          <span className="inline-flex self-start mt-1.5 px-1.5 py-0.5 rounded-full text-[9px] font-label font-bold bg-forest-50 text-forest-700 border border-forest-100 leading-tight">
            ₹{savingsAmt} OFF
          </span>
        )}
      </div>
    </Link>
  )
}

// ── Skeleton card (mirrors GridProductCard shape) ─────────────────────────────
const GridSkeletonCard: React.FC = () => (
  <div className="w-full bg-white rounded-2xl shadow-card border border-stone-100/80 overflow-hidden animate-pulse">
    <div className="aspect-square bg-stone-100" />
    <div className="px-3 pt-2.5 pb-3 space-y-2">
      <div className="h-3 bg-stone-100 rounded-full w-full" />
      <div className="h-2.5 bg-stone-100 rounded-full w-1/2" />
      <div className="h-4 bg-stone-100 rounded-full w-2/3 mt-1" />
    </div>
  </div>
)

// ── CategorySection ────────────────────────────────────────────────────────────
export interface CategorySectionProps {
  title: string
  emoji?: string
  products: Product[]
  loading?: boolean
  seeAllLink?: string
}

export const CategorySection: React.FC<CategorySectionProps> = ({
  title,
  emoji,
  products,
  loading = false,
  seeAllLink = '/products',
}) => {
  const displayProducts = products.slice(0, 6)

  // While loading we always render (shows skeletons).
  // After load, hide only when there are genuinely no products for this category.
  if (!loading && displayProducts.length === 0) return null

  return (
    <div className="w-full">
      {/* ── Section header ── */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-xl sm:text-2xl font-semibold text-stone-900 flex items-center gap-2">
          {emoji && <span className="text-2xl leading-none">{emoji}</span>}
          {title}
        </h2>
        <Link
          to={seeAllLink}
          className="flex items-center gap-0.5 text-sm font-label font-semibold text-forest-600 hover:text-forest-800 transition-colors whitespace-nowrap"
        >
          See All <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      {/* ── Product grid: mobile 2 · tablet 3 · desktop 6 ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => <GridSkeletonCard key={i} />)
          : displayProducts.map(p => <GridProductCard key={p.id} product={p} />)}
      </div>
    </div>
  )
}
