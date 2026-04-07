import React, { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Leaf, Minus, Plus, ChevronRight, ChevronLeft } from 'lucide-react'
import { useAuthStore, useCartStore, useGuestCartStore } from '../../store'
import type { GuestCartItem } from '../../store'
import { cartApi } from '../../services/api'
import { Spinner } from '../ui'
import type { Product } from '../../types'
import toast from 'react-hot-toast'
import { resolveAssetUrl, resolveLocalUrl, resolveProductImage } from '../../lib/image'
import { WishlistButton } from './WishlistButton'

const CompactProductCard: React.FC<{ product: Product }> = ({ product }) => {
  const { isAuthenticated } = useAuthStore()
  const { cart, setCart, openCart } = useCartStore()
  const { items: guestItems, addItem: addGuestItem, updateItem: updateGuestItem } = useGuestCartStore()
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

  const savingsAmt = product.originalPrice && product.originalPrice > product.price
    ? Math.round(product.originalPrice - product.price) : 0

  const handleAdd = async (e: React.MouseEvent) => {
    e.preventDefault()
    if (product.stockQuantity === 0) { toast.error('Out of stock'); return }
    if (!isAuthenticated) {
      addGuestItem({
        productId: product.id, productName: product.name, price: product.price,
        originalPrice: product.originalPrice, imageUrl: product.imageUrl,
        unit: product.unit, quantity: 1, stockQuantity: product.stockQuantity, slug: product.slug,
      })
      toast.success(`${product.name} added!`, { style: { borderRadius: '14px', background: '#175820', color: '#fff' }, icon: String.fromCodePoint(0x1f6d2) })
      return
    }
    setAdding(true)
    try {
      const updated = await cartApi.addItem(product.id, 1)
      setCart(updated)
      toast.success(`${product.name} added!`, { style: { borderRadius: '14px', background: '#175820', color: '#fff' }, icon: String.fromCodePoint(0x1F6D2) })
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

  return (
    <Link to={`/products/${product.slug}`} className="group flex-shrink-0 w-[140px] sm:w-[156px] bg-white rounded-2xl shadow-card hover:shadow-card-hover transition-all duration-300 overflow-hidden flex flex-col border border-stone-100/80 hover:border-forest-200 hover:-translate-y-1">
      {/* ── Product image ── */}
      <div className="relative w-full aspect-square bg-gradient-to-br from-emerald-50 to-stone-50 overflow-hidden">
        {imgSrc ? (
          <img src={imgSrc} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" onError={handleImgError} />
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
              <button onClick={handleDecrease} disabled={updating} className="flex items-center justify-center w-7 h-7 text-white hover:bg-forest-600 active:bg-forest-800 transition-colors disabled:opacity-50"><Minus className="w-3 h-3" strokeWidth={3} /></button>
              <span className="px-1.5 min-w-[1.25rem] text-center text-white text-xs font-label font-bold">{updating ? <Spinner size="sm" /> : cartQty}</span>
              <button onClick={handleIncrease} disabled={updating} className="flex items-center justify-center w-7 h-7 text-white hover:bg-forest-600 active:bg-forest-800 transition-colors disabled:opacity-50"><Plus className="w-3 h-3" strokeWidth={3} /></button>
            </div>
          ) : product.stockQuantity !== 0 ? (
            <button onClick={handleAdd} disabled={adding} className="px-3.5 h-7 bg-forest-600 text-white text-xs font-label font-bold rounded-xl shadow-btn hover:bg-forest-700 hover:shadow-btn-hover active:scale-95 transition-all duration-150 disabled:opacity-50">
              {adding ? <Spinner size="sm" /> : 'ADD'}
            </button>
          ) : null}
        </div>
        {product.stockQuantity === 0 && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] flex items-center justify-center">
            <span className="bg-stone-900 text-white text-[10px] font-label font-semibold px-2.5 py-1 rounded-full">Out of Stock</span>
          </div>
        )}
      </div>

      {/* ── Product info ── */}
      <div className="px-2.5 pt-2.5 pb-3 flex flex-col flex-1 gap-0.5">
        {/* Name — second most prominent */}
        <p className="text-[12.5px] font-label font-bold text-stone-900 leading-snug line-clamp-2 group-hover:text-forest-700 transition-colors duration-200">{product.name}</p>
        {/* Unit / weight — muted */}
        <p className="text-[10px] font-body text-[#666] leading-tight">{product.unit}</p>
        {/* Price row — most prominent */}
        <div className="flex items-baseline gap-1.5 flex-wrap mt-1">
          <span className="text-[14px] font-label font-bold text-[#111] leading-none">₹{product.price}</span>
          {product.originalPrice && product.originalPrice > product.price && (
            <span className="text-[10px] text-[#999] line-through font-body leading-none">₹{product.originalPrice}</span>
          )}
        </div>
        {/* Savings badge */}
        {savingsAmt > 0 && (
          <span className="inline-flex self-start mt-1 px-1.5 py-0.5 rounded-full text-[9px] font-label font-bold bg-forest-50 text-forest-700 border border-forest-100 leading-tight">₹{savingsAmt} OFF</span>
        )}
      </div>
    </Link>
  )
}

const SkeletonCard: React.FC = () => (
  <div className="flex-shrink-0 w-[140px] sm:w-[156px] bg-white rounded-2xl shadow-card border border-stone-100/80 overflow-hidden animate-pulse">
    <div className="aspect-square bg-stone-100" />
    <div className="px-2.5 pt-2.5 pb-3 space-y-2">
      <div className="h-3 bg-stone-100 rounded-full w-full" />
      <div className="h-2.5 bg-stone-100 rounded-full w-1/2" />
      <div className="h-3.5 bg-stone-100 rounded-full w-2/3 mt-1" />
    </div>
  </div>
)

interface ProductRowProps {
  title: string
  products: Product[]
  loading?: boolean
  seeAllLink?: string
  skeletonCount?: number
}

export const ProductRow: React.FC<ProductRowProps> = ({ title, products, loading = false, seeAllLink = '/products', skeletonCount = 10 }) => {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)
  const SCROLL_BY = 480

  const updateArrows = () => {
    const el = scrollRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 4)
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
  }

  const scrollLeft = () => scrollRef.current?.scrollBy({ left: -SCROLL_BY, behavior: 'smooth' })
  const scrollRight = () => scrollRef.current?.scrollBy({ left: SCROLL_BY, behavior: 'smooth' })

  return (
    <div className="w-full">
      {/* ── Section header ── */}
      <div className="flex items-center justify-between mb-4 px-6 sm:px-10">
        <h2 className="font-display text-xl sm:text-2xl font-semibold text-stone-900">{title}</h2>
        <Link to={seeAllLink} className="flex items-center gap-0.5 text-sm font-label font-semibold text-forest-600 hover:text-forest-800 transition-colors">
          See All <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
      {/* ── Slider track ── */}
      <div className="relative">
        {/* Left arrow – fades in once user has scrolled right */}
        <button
          onClick={scrollLeft}
          aria-label="Scroll left"
          className={`hidden sm:flex absolute left-2 top-1/2 -translate-y-1/2 z-10 w-9 h-9 items-center justify-center bg-white border border-stone-200 rounded-full shadow-md hover:shadow-lg hover:border-forest-300 transition-all duration-200 ${canScrollLeft ? 'opacity-100 scale-100' : 'opacity-0 scale-90 pointer-events-none'}`}
        >
          <ChevronLeft className="w-4 h-4 text-stone-600" />
        </button>
        {/* Right arrow – fades out when all cards are visible */}
        <button
          onClick={scrollRight}
          aria-label="Scroll right"
          className={`hidden sm:flex absolute right-2 top-1/2 -translate-y-1/2 z-10 w-9 h-9 items-center justify-center bg-white border border-stone-200 rounded-full shadow-md hover:shadow-lg hover:border-forest-300 transition-all duration-200 ${canScrollRight ? 'opacity-100 scale-100' : 'opacity-0 scale-90 pointer-events-none'}`}
        >
          <ChevronRight className="w-4 h-4 text-stone-600" />
        </button>
        {/* Scroll container:
            – pl-6/pl-10 aligns the first card with the section header text
            – scroll-pl-6/scroll-pl-10 keeps snap targets aligned with that offset
            – end spacer div ensures the last card never gets clipped at the right edge */}
        <div
          ref={scrollRef}
          onScroll={updateArrows}
          className="flex gap-3 sm:gap-4 overflow-x-auto scrollbar-hide scroll-smooth pb-3 pl-6 sm:pl-10 scroll-pl-6 sm:scroll-pl-10 snap-x snap-mandatory"
        >
          {loading
            ? Array.from({ length: skeletonCount }).map((_, i) => <div key={i} className="snap-start flex-shrink-0"><SkeletonCard /></div>)
            : products.map(p => <div key={p.id} className="snap-start flex-shrink-0"><CompactProductCard product={p} /></div>)
          }
          {/* Right spacer: ensures the last card scrolls fully into view */}
          <div className="flex-shrink-0 w-6 sm:w-10" aria-hidden="true" />
        </div>
      </div>
    </div>
  )
}