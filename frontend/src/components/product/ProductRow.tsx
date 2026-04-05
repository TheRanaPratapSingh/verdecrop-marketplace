import React, { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Leaf, Minus, Plus, ChevronRight, ChevronLeft } from 'lucide-react'
import { useAuthStore, useCartStore } from '../../store'
import { cartApi } from '../../services/api'
import { Spinner } from '../ui'
import type { Product } from '../../types'
import toast from 'react-hot-toast'
import { resolveAssetUrl, resolveLocalUrl, resolveProductImage } from '../../lib/image'

const CompactProductCard: React.FC<{ product: Product }> = ({ product }) => {
  const { isAuthenticated } = useAuthStore()
  const { cart, setCart, openCart } = useCartStore()
  const [adding, setAdding] = useState(false)
  const [updating, setUpdating] = useState(false)

  const cartItem = cart?.items.find(i => i.productId === product.id)
  const cartQty = cartItem?.quantity ?? 0

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
    if (!isAuthenticated) { toast.error('Please login to add to cart'); return }
    setAdding(true)
    try {
      const updated = await cartApi.addItem(product.id, 1)
      setCart(updated)
      toast.success(`${product.name} added!`, { style: { borderRadius: '14px', background: '#175820', color: '#fff' }, icon: String.fromCodePoint(0x1F6D2) })
      openCart()
    } catch { toast.error('Could not add to cart') }
    finally { setAdding(false) }
  }

  const handleIncrease = async (e: React.MouseEvent) => {
    e.preventDefault()
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
    <Link to={`/products/${product.slug}`} className="group flex-shrink-0 w-[140px] sm:w-[152px] bg-white rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col border border-stone-100 hover:border-forest-200">
      <div className="relative w-full aspect-square bg-gradient-to-br from-emerald-50 to-stone-50 overflow-hidden">
        {imgSrc ? (
          <img src={imgSrc} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" onError={handleImgError} />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl">🌿</div>
        )}
        {product.isOrganic && (
          <span className="absolute top-1.5 left-1.5 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-label font-bold bg-forest-700/90 text-white leading-tight backdrop-blur-sm">
            <Leaf className="w-2 h-2" strokeWidth={2.5} />ORG
          </span>
        )}
        <div onClick={e => e.preventDefault()} className="absolute bottom-1.5 right-1.5">
          {cartQty > 0 ? (
            <div className="flex items-center bg-forest-700 rounded-xl overflow-hidden shadow-md h-7">
              <button onClick={handleDecrease} disabled={updating} className="flex items-center justify-center w-7 h-7 text-white hover:bg-forest-600 active:bg-forest-800 transition-colors disabled:opacity-50"><Minus className="w-3 h-3" strokeWidth={3} /></button>
              <span className="px-1.5 min-w-[1.25rem] text-center text-white text-xs font-label font-bold">{updating ? <Spinner size="sm" /> : cartQty}</span>
              <button onClick={handleIncrease} disabled={updating} className="flex items-center justify-center w-7 h-7 text-white hover:bg-forest-600 active:bg-forest-800 transition-colors disabled:opacity-50"><Plus className="w-3 h-3" strokeWidth={3} /></button>
            </div>
          ) : product.stockQuantity !== 0 ? (
            <button onClick={handleAdd} disabled={adding} className="px-3 h-7 bg-white border-2 border-forest-600 text-forest-700 text-xs font-label font-bold rounded-xl shadow-md hover:bg-forest-600 hover:text-white active:scale-95 transition-all duration-150 disabled:opacity-50">
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
      <div className="p-2 flex flex-col flex-1">
        <div className="flex items-center gap-1 flex-wrap">
          <span className="text-sm font-display font-bold text-forest-700">₹{product.price}</span>
          {product.originalPrice && product.originalPrice > product.price && (
            <span className="text-[10px] text-stone-400 line-through font-body">₹{product.originalPrice}</span>
          )}
        </div>
        {savingsAmt > 0 && (
          <span className="text-[9px] font-label font-semibold text-forest-600 leading-tight">₹{savingsAmt} OFF</span>
        )}
        <p className="text-[11px] font-label font-medium text-stone-800 leading-tight line-clamp-2 mt-0.5 group-hover:text-forest-700 transition-colors">{product.name}</p>
        <p className="text-[10px] text-stone-400 font-body mt-0.5">{product.unit}</p>
      </div>
    </Link>
  )
}

const SkeletonCard: React.FC = () => (
  <div className="flex-shrink-0 w-[140px] sm:w-[152px] bg-white rounded-2xl shadow-sm border border-stone-100 overflow-hidden animate-pulse">
    <div className="aspect-square bg-stone-100" />
    <div className="p-2 space-y-1.5">
      <div className="h-3 bg-stone-100 rounded-full w-2/3" />
      <div className="h-2.5 bg-stone-100 rounded-full w-1/2" />
      <div className="h-3 bg-stone-100 rounded-full w-full" />
      <div className="h-2.5 bg-stone-100 rounded-full w-1/3" />
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
      <div className="flex items-center justify-between mb-3 px-4 sm:px-0">
        <h2 className="font-display text-xl sm:text-2xl font-semibold text-stone-900">{title}</h2>
        <Link to={seeAllLink} className="flex items-center gap-0.5 text-sm font-label font-semibold text-forest-600 hover:text-forest-800 transition-colors">
          See All <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
      <div className="relative">
        {canScrollLeft && (
          <button onClick={scrollLeft} className="hidden sm:flex absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 w-8 h-8 items-center justify-center bg-white border border-stone-200 rounded-full shadow-md hover:shadow-lg hover:border-forest-300 transition-all duration-150">
            <ChevronLeft className="w-4 h-4 text-stone-600" />
          </button>
        )}
        {canScrollRight && (
          <button onClick={scrollRight} className="hidden sm:flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 w-8 h-8 items-center justify-center bg-white border border-stone-200 rounded-full shadow-md hover:shadow-lg hover:border-forest-300 transition-all duration-150">
            <ChevronRight className="w-4 h-4 text-stone-600" />
          </button>
        )}
        <div ref={scrollRef} onScroll={updateArrows} className="flex gap-3 overflow-x-auto pb-2 px-4 sm:px-0 scrollbar-hide scroll-smooth snap-x snap-mandatory">
          {loading
            ? Array.from({ length: skeletonCount }).map((_, i) => <div key={i} className="snap-start"><SkeletonCard /></div>)
            : products.map(p => <div key={p.id} className="snap-start"><CompactProductCard product={p} /></div>)
          }
        </div>
      </div>
    </div>
  )
}