import React, { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  ArrowRight, Leaf, Shield, Truck, Star, ChevronRight, Award,
  Wheat, Droplets, Apple, Carrot, Flame, Sprout, Bean,
  UtensilsCrossed, Package, type LucideIcon,
} from 'lucide-react'
import { categoryApi, productApi } from '../services/api'
import { PageLayout } from '../components/layout'
import { ProductRow } from '../components/product/ProductRow'
import { CategorySection } from '../components/product/CategorySection'
import { SEO } from '../components/SEO'
import type { Category, Product } from '../types'
import toast from 'react-hot-toast'
import { HeroSlider } from '../components/HeroSlider'
import { useAuthStore } from '../store'

// Category highlight cards (static, curated)
// nameKeyword is matched against real category names loaded from the API
const CATEGORY_HIGHLIGHTS = [
  {
    title: 'Satvik Pura Fast',
    subtitle: 'For Fast',
    emoji: '🌿',
    gradient: 'linear-gradient(135deg, #2d5a27 0%, #3d7a35 100%)',
    nameKeyword: 'satvik',
  },
  {
    title: 'Organic Products',
    subtitle: 'Organic products',
    emoji: '🫘',
    gradient: 'linear-gradient(135deg, #3d6b30 0%, #4e8c3e 100%)',
    nameKeyword: 'organic',
  },
  {
    title: 'Herbs & Spices',
    subtitle: 'Indian spices',
    emoji: '🌶️',
    gradient: 'linear-gradient(135deg, #4a6741 0%, #5d8451 100%)',
    nameKeyword: 'herb',
  },
  {
    title: 'Seasonal Vegetables',
    subtitle: 'Fresh organic vegetables',
    emoji: '🥦',
    gradient: 'linear-gradient(135deg, #2e6b1f 0%, #3d8c28 100%)',
    nameKeyword: 'vegetable',
  },
  {
    title: 'Farm Fresh Fruits',
    subtitle: 'Naturally grown fruits',
    emoji: '🍊',
    gradient: 'linear-gradient(135deg, #b84c15 0%, #d4622a 100%)',
    nameKeyword: 'fruit',
  },
]

// Icon mapping: category slug → Lucide icon + accent color
const CATEGORY_ICON_MAP: Record<string, { icon: LucideIcon; bg: string; color: string }> = {
  'seasonal-vegetables': { icon: Carrot,           bg: 'bg-emerald-50',  color: 'text-emerald-700' },
  'farm-fresh-fruits':   { icon: Apple,            bg: 'bg-orange-50',   color: 'text-orange-600'  },
  'whole-grains':        { icon: Wheat,            bg: 'bg-amber-50',    color: 'text-amber-700'   },
  'dairy-milk':          { icon: Droplets,         bg: 'bg-sky-50',      color: 'text-sky-600'     },
  'spices-seasonings':   { icon: Flame,            bg: 'bg-red-50',      color: 'text-red-600'     },
  'organics-pulses':     { icon: Bean,             bg: 'bg-lime-50',     color: 'text-lime-700'    },
  'cold-pressed-oils':   { icon: Droplets,         bg: 'bg-yellow-50',   color: 'text-yellow-600'  },
  'satvik-pura-fast':    { icon: UtensilsCrossed,  bg: 'bg-green-50',    color: 'text-green-700'   },
  'organic-products':    { icon: Sprout,           bg: 'bg-teal-50',     color: 'text-teal-700'    },
  'herbs-spices':        { icon: Flame,            bg: 'bg-rose-50',     color: 'text-rose-600'    },
}
const DEFAULT_CAT_ICON = { icon: Package, bg: 'bg-forest-50', color: 'text-forest-700' }

// Helper: Map category slugs to emoji and colors
const getCategoryStyle = (slug?: string) => {
  const styleMap: Record<string, { emoji: string; from: string; to: string }> = {
    'seasonal-vegetables': { emoji: '🥦', from: '#2d8f3c', to: '#1e5e2a' },
    'farm-fresh-fruits': { emoji: '🍊', from: '#d97d3c', to: '#a85a2a' },
    'whole-grains': { emoji: '🌾', from: '#9b8b5c', to: '#6b6a42' },
    'dairy-milk': { emoji: '🥛', from: '#d4a574', to: '#a07c4f' },
    'spices-seasonings': { emoji: '🧂', from: '#8b5a3c', to: '#5c3d27' },
    'organics-pulses': { emoji: '🫘', from: '#6b4423', to: '#4a2f1a' },
    'cold-pressed-oils': { emoji: '🫒', from: '#8b7355', to: '#5c4a38' },
  }
  return styleMap[slug || ''] || { emoji: '🌿', from: '#5a7f5a', to: '#3d5342' }
}

const HomePage: React.FC = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const isFarmer = user?.role?.toString().trim().toLowerCase() === 'farmer'
  const [categories, setCategories] = useState<Category[]>([])
  const [featured, setFeatured] = useState<Product[]>([])
  const [categoryProducts, setCategoryProducts] = useState<Record<string, Product[]>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const state = location.state as { registrationSuccess?: boolean; welcomeMessage?: string } | null
    const sessionMessage = sessionStorage.getItem('postRegisterSuccess')
    const message = state?.registrationSuccess
      ? (state.welcomeMessage || 'Registration successful! Welcome to Graamo!')
      : sessionMessage

    if (message) {
      toast.success(message)
      sessionStorage.removeItem('postRegisterSuccess')
      navigate(location.pathname, { replace: true, state: null })
    }
  }, [location.pathname, location.state, navigate])

  useEffect(() => {
    Promise.all([
      categoryApi.getAll(),
      productApi.getFeatured(12)
    ])
      .then(([cats, prods]) => {
        const allCats = cats || []
        setCategories(allCats)
        setFeatured(prods || [])

        // Fetch products for each category highlight in parallel
        const fetchCatProducts = CATEGORY_HIGHLIGHTS.map(async (highlight) => {
          const matched = allCats.find(c => c.name.toLowerCase().includes(highlight.nameKeyword))
          if (!matched) return { key: highlight.nameKeyword, products: [] }
          try {
            const result = await productApi.getAll({ categoryId: matched.id, pageSize: 6 })
            return { key: highlight.nameKeyword, products: result?.items || [] }
          } catch {
            return { key: highlight.nameKeyword, products: [] }
          }
        })

        Promise.all(fetchCatProducts).then((results) => {
          const map: Record<string, Product[]> = {}
          results.forEach(r => { map[r.key] = r.products })
          setCategoryProducts(map)
        })
      })
      .catch((err) => {
        console.error('API ERROR:', err)
        setCategories([])
        setFeatured([])
      })
      .finally(() => setLoading(false))
  }, [])

  const homeCategories = categories.filter(c => c.showOnHome)
  const displayCategories = (homeCategories.length > 0 ? homeCategories : categories).slice(0, 5)

  return (
    <PageLayout>
      <SEO
        titleOverride="Graamo – Organic Marketplace"
        description="Buy 100% certified organic vegetables, fruits, grains & more directly from 50+ trusted Indian farmers. No chemicals, no middlemen – farm fresh to your door."
        canonical="https://graamo.in/"
      />
      {/* ── HERO SLIDER ───────────────────────────────────────────────────── */}
      <HeroSlider />

      {/* ── CATEGORY HIGHLIGHT CARDS ─────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-10 py-8 sm:py-10">
        <div className="flex sm:grid sm:grid-cols-5 gap-4 overflow-x-auto sm:overflow-visible pb-2 sm:pb-0 scrollbar-hide snap-x snap-mandatory sm:snap-none">
          {CATEGORY_HIGHLIGHTS.map((highlight) => {
            const matched = categories.find(c => c.name.toLowerCase().includes(highlight.nameKeyword))
            const to = matched ? `/products?categoryId=${matched.id}` : `/products?search=${highlight.nameKeyword}`
            return (
              <Link
                key={highlight.title}
                to={to}
                className="group relative flex-shrink-0 w-52 sm:w-auto rounded-2xl p-5 flex items-center gap-3 snap-start overflow-hidden shadow-card hover:shadow-card-hover hover:-translate-y-1 transition-all duration-300"
                style={{ background: highlight.gradient }}
              >
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
                <span className="text-3xl flex-shrink-0 group-hover:scale-110 transition-transform duration-200">{highlight.emoji}</span>
                <div className="relative z-10 flex-1 min-w-0">
                  <p className="font-label font-semibold text-white text-sm leading-tight">{highlight.title}</p>
                  <p className="text-white/60 text-xs font-body mt-0.5 truncate">{highlight.subtitle}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-white/40 flex-shrink-0 group-hover:translate-x-0.5 group-hover:text-white/70 transition-all duration-200" />
              </Link>
            )
          })}
        </div>
      </section>

      {/* ── CATEGORY BANNERS
      <section className="max-w-7xl mx-auto px-6 sm:px-10 -mt-16 relative z-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {displayCategories.length === 0 ? (
            <div className="col-span-full text-center py-8 text-sm text-stone-400">No categories available</div>
          ) : (
            displayCategories.map((cat) => {
              const { emoji, from, to } = getCategoryStyle(cat.slug)
              return (
                <Link
                  key={cat.id}
                  to={`/products?categoryId=${cat.id}`}
                  className="group relative overflow-hidden rounded-3xl p-6 flex items-center gap-4 shadow-card hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-300"
                  style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
                >
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br from-white/5 to-transparent" />
                  <span className="text-4xl flex-shrink-0">{emoji}</span>
                  <div className="relative z-10">
                    <p className="font-label font-semibold text-white text-base leading-tight">{cat.name}</p>
                    <p className="text-white/60 text-xs font-body mt-0.5">{cat.description || `${cat.productCount} products`}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-white/40 ml-auto group-hover:translate-x-1 group-hover:text-white/70 transition-all duration-200 flex-shrink-0" />
                </Link>
              )
            })
          )}
        </div>
      </section>

      {/* ── CATEGORIES GRID ──────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-6 sm:px-10 py-16">
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="section-label mb-2">Browse</p>
            <h2 className="font-display text-4xl font-semibold text-stone-900">Shop by Category</h2>
          </div>
          <Link to="/products" className="hidden sm:flex items-center gap-1.5 text-sm font-label font-medium text-forest-600 hover:text-forest-800 transition-colors">
            View all <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-stone-100 rounded-2xl h-36 animate-pulse" />
            ))}
          </div>
        ) : categories.length === 0 ? (
          <p className="text-stone-400 font-body text-sm py-8">No categories yet — seed data needed.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {categories.map((cat, i) => {
              const { icon: CatIcon, bg, color } = CATEGORY_ICON_MAP[cat.slug ?? ''] ?? DEFAULT_CAT_ICON
              return (
                <Link
                  key={cat.id}
                  to={`/products?categoryId=${cat.id}`}
                  className="group flex flex-col items-center gap-3 py-6 px-4 bg-white rounded-2xl border border-stone-100 shadow-sm hover:shadow-md hover:-translate-y-1 hover:border-forest-200 transition-all duration-300 animate-fade-up"
                  style={{ animationDelay: `${i * 60}ms`, animationFillMode: 'both' }}
                >
                  <div className={`w-16 h-16 ${bg} rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-200`}>
                    <CatIcon className={`w-8 h-8 ${color}`} strokeWidth={1.5} />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-label font-semibold text-stone-800 group-hover:text-forest-700 leading-tight transition-colors">{cat.name}</p>
                    <p className="text-[11px] text-stone-400 font-body mt-0.5">{cat.productCount} items</p>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </section>

      {/* ── FEATURED PRODUCTS SLIDER ──────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto pb-12">
        <ProductRow
          title="Featured This Season"
          products={featured}
          loading={loading}
          seeAllLink="/products?isFeatured=true"
          skeletonCount={8}
        />
      </section>

      {/* ── CATEGORY PRODUCT SECTIONS ────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-10 pb-10 space-y-12">
        {CATEGORY_HIGHLIGHTS.map((highlight) => {
          const matched = categories.find(c => c.name.toLowerCase().includes(highlight.nameKeyword))
          const seeAllLink = matched
            ? `/products?categoryId=${matched.id}`
            : `/products?search=${highlight.nameKeyword}`
          return (
            <CategorySection
              key={highlight.nameKeyword}
              title={highlight.title}
              emoji={highlight.emoji}
              products={categoryProducts[highlight.nameKeyword] || []}
              loading={loading}
              seeAllLink={seeAllLink}
            />
          )
        })}
      </section>

      {/* ── TRUST SECTION ────────────────────────────────────────────────────── */}
      <section className="bg-white border-y border-stone-100 py-16">
        <div className="max-w-7xl mx-auto px-6 sm:px-10">
          <div className="text-center mb-12">
            <p className="section-label mb-3">Why Graamo</p>
            <h2 className="font-display text-4xl font-semibold text-stone-900">Committed to purity & trust</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Award, title: 'Certified Organic', desc: 'Every product third-party certified pesticide-free by licensed bodies', color: 'text-forest-600', bg: 'bg-forest-50' },
              { icon: Truck, title: 'Farm to Doorstep', desc: 'Direct from farm — no middlemen, maximum freshness guaranteed', color: 'text-blue-600', bg: 'bg-blue-50' },
              { icon: Shield, title: 'Quality Guaranteed', desc: 'Not satisfied? Full refund within 24 hours, no questions asked', color: 'text-amber-600', bg: 'bg-amber-50' },
              { icon: Star, title: '500+ Families Trust Us', desc: 'Loved by health-conscious households across 20+ cities in India', color: 'text-purple-600', bg: 'bg-purple-50' },
            ].map(({ icon: Icon, title, desc, color, bg }) => (
              <div key={title} className="group flex flex-col items-center text-center p-7 rounded-3xl hover:bg-stone-50 transition-colors duration-200 cursor-default">
                <div className={`w-14 h-14 ${bg} rounded-2xl flex items-center justify-center mb-5 group-hover:scale-105 transition-transform duration-200`}>
                  <Icon className={`w-7 h-7 ${color}`} strokeWidth={1.6} />
                </div>
                <h3 className="font-label font-semibold text-stone-900 mb-2">{title}</h3>
                <p className="text-sm font-body text-stone-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ─────────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-6 sm:px-10 py-20">
        <div className="text-center mb-12">
          <p className="section-label mb-3">Real Stories</p>
          <h2 className="font-display text-4xl font-semibold text-stone-900">What our families say</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { name: 'Priya Sharma', city: 'Bangalore', text: 'Finally found organic produce I can actually trust. My kids love the fresh vegetables and I love knowing exactly which farm they came from.', rating: 5 },
            { name: 'Rajesh Kumar', city: 'Delhi', text: 'The quality is exceptional — you can taste the difference immediately. The farmer connection feature is brilliant, I know exactly who grew my food.', rating: 5 },
            { name: 'Anita Menon', city: 'Mumbai', text: 'Graamo has completely changed how my family eats. Same-day delivery, zero pesticides, and the farmers are so passionate about what they grow.', rating: 5 },
          ].map((t, i) => (
            <div key={t.name} className="card p-7 animate-fade-up" style={{ animationDelay: `${i * 100}ms`, animationFillMode: 'both' }}>
              <div className="flex gap-1 mb-5">
                {Array.from({ length: t.rating }).map((_, j) => <Star key={j} className="w-4 h-4 fill-amber-400 text-amber-400" />)}
              </div>
              <blockquote className="font-display text-xl text-stone-700 leading-relaxed mb-6 italic">"{t.text}"</blockquote>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-forest-100 flex items-center justify-center font-label font-bold text-forest-700">
                  {t.name[0]}
                </div>
                <div>
                  <p className="text-sm font-label font-semibold text-stone-800">{t.name}</p>
                  <p className="text-xs text-stone-400 font-body">{t.city}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FARMER CTA ───────────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-6 sm:px-10 pb-20">
        <div className="relative bg-forest-950 rounded-4xl overflow-hidden p-10 md:p-16 flex flex-col md:flex-row items-center gap-10">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_80%_at_0%_50%,rgba(46,139,50,0.2)_0%,transparent_70%)]" />
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

          <div className="flex-1 relative z-10">
            <div className="flex items-center gap-2 mb-4">
              <Leaf className="w-4 h-4 text-forest-300" />
              <span className="text-xs font-label font-semibold text-forest-300 tracking-widest uppercase">For Organic Farmers</span>
            </div>
            <h2 className="font-display text-4xl md:text-5xl font-semibold text-white leading-tight mb-4">
              {isFarmer ? <>Welcome back,<br />Seller!</> : <>Sell directly to<br />5000+ families</>}
            </h2>
            <p className="text-stone-400 font-body text-base leading-relaxed max-w-md">
              {isFarmer
                ? 'Manage your products, track orders, and grow your farm business on Graamo.'
                : 'Join Graamo and reach health-conscious consumers who pay fair prices for quality organic produce. Zero commission on your first 100 orders.'}
            </p>
          </div>
          <div className="relative z-10 flex flex-col items-center gap-3 flex-shrink-0">
            {isFarmer ? (
              <>
                <Link to="/seller/products" className="inline-flex items-center gap-2.5 px-8 py-4 bg-white text-stone-900 font-label font-semibold text-sm rounded-2xl shadow-lg hover:bg-stone-50 active:scale-[0.98] transition-all duration-200 whitespace-nowrap">
                  Manage Products <ArrowRight className="w-4 h-4" />
                </Link>
                <Link to="/seller/orders" className="text-xs text-forest-300 hover:text-white transition-colors font-body">
                  View Seller Orders →
                </Link>
              </>
            ) : (
              <>
                <Link to="/become-a-seller" className="inline-flex items-center gap-2.5 px-8 py-4 bg-white text-stone-900 font-label font-semibold text-sm rounded-2xl shadow-lg hover:bg-stone-50 active:scale-[0.98] transition-all duration-200 whitespace-nowrap">
                  Start Selling Free <ArrowRight className="w-4 h-4" />
                </Link>
                <p className="text-xs text-stone-500 font-body text-center">No setup fee · Instant approval · 24/7 support</p>
              </>
            )}
          </div>
        </div>
      </section>
    </PageLayout>
  )
}

// ── Shared helper: renders category icon correctly regardless of format ────────
// Handles: emoji (1-2 chars), image path (/icons/x.png), full URL (https://...), empty
export const CategoryIcon: React.FC<{ iconUrl?: string | null; name?: string; className?: string }> = ({
  iconUrl, name = '', className = 'w-6 h-6'
}) => {
  if (!iconUrl) return <span className="text-2xl">🌿</span>

  // It's an emoji (1–2 unicode characters)
  const isEmoji = [...iconUrl].length <= 2
  if (isEmoji) return <span className="text-2xl">{iconUrl}</span>

  // It's an image path or URL
  return (
    <img
      src={iconUrl.startsWith('http') ? iconUrl : iconUrl}
      alt={name}
      className={`${className} object-contain`}
      onError={(e) => {
        // If image fails to load, fall back to a plant emoji
        const target = e.currentTarget
        target.style.display = 'none'
        const span = document.createElement('span')
        span.textContent = '🌿'
        span.className = 'text-2xl'
        target.parentNode?.appendChild(span)
      }}
    />
  )
}

export default HomePage