import React, { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  ArrowRight, Leaf, Shield, Truck, Star, Sprout, Award,
  Apple, Wheat, Droplets, Flame, Bean, FlaskConical,
  Salad, Cookie, Milk, ShoppingBasket, TreeDeciduous, Flower2,
  Package, Cherry, Vegan, GlassWater, Wind,
} from 'lucide-react'
import { categoryApi, productApi } from '../services/api'
import { PageLayout } from '../components/layout'
import { ProductGrid } from '../components/product'
import { SEO } from '../components/SEO'
import type { Category, Product } from '../types'
import { HeroSlider } from '../components/HeroSlider'
import toast from 'react-hot-toast'

// ── Map category name keywords → Lucide icon + accent color ─────────────────
const ICON_MAP: { keywords: string[]; Icon: React.ElementType; bg: string; icon: string }[] = [
  { keywords: ['vegetable', 'veggie', 'sabzi', 'greens', 'seasonal'],   Icon: Salad,          bg: '#e8f5e8', icon: '#1e6e24' },
  { keywords: ['fruit', 'fruits', 'citrus', 'berry', 'mango'],          Icon: Apple,          bg: '#fff3e0', icon: '#c0621e' },
  { keywords: ['grain', 'wheat', 'atta', 'flour', 'rice', 'whole'],     Icon: Wheat,          bg: '#faf3e0', icon: '#8b6914' },
  { keywords: ['pulse', 'lentil', 'dal', 'bean', 'legume', 'organic'],  Icon: Bean,           bg: '#f3ede3', icon: '#7c4a1e' },
  { keywords: ['oil', 'ghee', 'fat', 'pressed', 'cold'],                Icon: Droplets,       bg: '#f0f7f0', icon: '#1e6e24' },
  { keywords: ['spice', 'herb', 'masala', 'season', 'turmeric'],        Icon: Flame,          bg: '#fff0f0', icon: '#c0391e' },
  { keywords: ['milk', 'dairy', 'curd', 'yogurt', 'paneer', 'ghee'],    Icon: Milk,           bg: '#f0f7ff', icon: '#1a5fa8' },
  { keywords: ['tea', 'coffee', 'drink', 'beverage', 'juice'],          Icon: GlassWater,     bg: '#f3f0ff', icon: '#5b21b6' },
  { keywords: ['snack', 'cookie', 'biscuit', 'breakfast', 'millet'],    Icon: Cookie,         bg: '#fefce8', icon: '#a16207' },
  { keywords: ['honey', 'sweet', 'jaggery', 'sugar'],                   Icon: FlaskConical,   bg: '#fffbeb', icon: '#b45309' },
  { keywords: ['nature', 'forest', 'tree', 'herbal', 'ayurved'],        Icon: TreeDeciduous,  bg: '#ecfdf5', icon: '#065f46' },
  { keywords: ['flower', 'rose', 'hibiscus', 'saffron'],                Icon: Flower2,        bg: '#fff0f8', icon: '#9d174d' },
  { keywords: ['vegan', 'plant', 'satvik', 'sattva', 'pura'],           Icon: Vegan,          bg: '#f0fdf4', icon: '#166534' },
]

const getCategoryIcon = (name: string): { Icon: React.ElementType; bg: string; icon: string } => {
  const lower = name.toLowerCase()
  for (const entry of ICON_MAP) {
    if (entry.keywords.some(k => lower.includes(k))) return entry
  }
  return { Icon: ShoppingBasket, bg: '#f0f7f0', icon: '#1e6e24' }
}

const HomePage: React.FC = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const [categories, setCategories] = useState<Category[]>([])
  const [featured, setFeatured] = useState<Product[]>([])
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
      productApi.getFeatured(8)
    ])
      .then(([cats, prods]) => {
        setCategories(cats || [])
        setFeatured(prods || [])
      })
      .catch((err) => {
        console.error('API ERROR:', err)
        setCategories([])
        setFeatured([])
      })
      .finally(() => setLoading(false))
  }, [])

  const homeCategories = categories.filter(c => c.showOnHome)
  void homeCategories // kept for potential future use

  return (
    <PageLayout>
      <SEO
        titleOverride="Graamo – Organic Marketplace"
        description="Buy 100% certified organic vegetables, fruits, grains & more directly from 500+ trusted Indian farmers. No chemicals, no middlemen – farm fresh to your door."
        canonical="https://graamo.in/"
      />
      <HeroSlider />

      {/* ── SHOP BY CATEGORY ─────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-10 py-14 sm:py-20">
        {/* Section header */}
        <div className="flex items-end justify-between mb-10">
          <div>
            <p className="font-label text-xs font-semibold tracking-widest uppercase text-forest-600 mb-2">Browse</p>
            <h2 className="font-display text-3xl sm:text-4xl font-semibold text-stone-900 leading-tight">Shop by Category</h2>
          </div>
          <Link
            to="/products"
            className="hidden sm:inline-flex items-center gap-1.5 text-sm font-label font-medium text-forest-600 hover:text-forest-800 transition-colors"
          >
            View all <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {loading ? (
          /* Skeleton */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-3xl bg-stone-100 animate-pulse" style={{ height: 140 }} />
            ))}
          </div>
        ) : categories.length === 0 ? (
          <p className="text-stone-400 font-body text-sm py-8">No categories yet.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
            {categories.map((cat, i) => {
              const { Icon, bg, icon } = getCategoryIcon(cat.name)
              return (
                <Link
                  key={cat.id}
                  to={`/products?categoryId=${cat.id}`}
                  className="group flex flex-col items-center gap-3 py-6 px-3 bg-white rounded-3xl border border-stone-100 shadow-card hover:shadow-card-hover hover:-translate-y-1 hover:border-forest-200 transition-all duration-300 animate-fade-up focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-400"
                  style={{ animationDelay: `${i * 50}ms`, animationFillMode: 'both' }}
                >
                  {/* Icon container */}
                  <div
                    className="w-16 h-16 sm:w-[72px] sm:h-[72px] rounded-2xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110 flex-shrink-0"
                    style={{ backgroundColor: bg }}
                  >
                    <Icon
                      className="w-8 h-8 sm:w-9 sm:h-9 transition-colors duration-200"
                      style={{ color: icon }}
                      strokeWidth={1.6}
                    />
                  </div>
                  {/* Name */}
                  <span className="text-xs sm:text-[13px] font-label font-semibold text-stone-700 group-hover:text-forest-700 text-center leading-snug transition-colors line-clamp-2 px-1">
                    {cat.name}
                  </span>
                  {/* Item count */}
                  <span className="text-[10px] sm:text-xs font-body text-stone-400 group-hover:text-forest-500 transition-colors">
                    {cat.productCount} {cat.productCount === 1 ? 'item' : 'items'}
                  </span>
                </Link>
              )
            })}
          </div>
        )}

        {/* Mobile "View all" */}
        <div className="mt-8 flex justify-center sm:hidden">
          <Link
            to="/products"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-label font-semibold text-sm border border-forest-300 text-forest-700 hover:bg-forest-50 transition-all duration-200"
          >
            View all categories <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* ── FEATURED PRODUCTS ────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-6 sm:px-10 pb-16">
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="section-label mb-2">Handpicked</p>
            <h2 className="font-display text-4xl font-semibold text-stone-900">Featured This Season</h2>
          </div>
          <Link to="/products?isFeatured=true" className="hidden sm:flex items-center gap-1.5 text-sm font-label font-medium text-forest-600 hover:text-forest-800 transition-colors">
            See all <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        <ProductGrid products={featured} loading={loading} />
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
              { icon: Star, title: '50k+ Families Trust Us', desc: 'Loved by health-conscious households across 20+ cities in India', color: 'text-purple-600', bg: 'bg-purple-50' },
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
              Sell directly to<br />50,000+ families
            </h2>
            <p className="text-stone-400 font-body text-base leading-relaxed max-w-md">
              Join Graamo and reach health-conscious consumers who pay fair prices for quality organic produce. Zero commission on your first 100 orders.
            </p>
          </div>
          <div className="relative z-10 flex flex-col items-center gap-3 flex-shrink-0">
            <Link to="/become-a-seller" className="inline-flex items-center gap-2.5 px-8 py-4 bg-white text-stone-900 font-label font-semibold text-sm rounded-2xl shadow-lg hover:bg-stone-50 active:scale-[0.98] transition-all duration-200 whitespace-nowrap">
              Start Selling Free <ArrowRight className="w-4 h-4" />
            </Link>
            <p className="text-xs text-stone-500 font-body text-center">No setup fee · Instant approval · 24/7 support</p>
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