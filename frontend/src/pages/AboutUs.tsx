import React from 'react'
import { Link } from 'react-router-dom'
import { PageLayout } from '../components/layout'
import { SEO } from '../components/SEO'
import {
  ArrowRight, Leaf, Heart, Users, MapPin,
  Sprout, Handshake, TrendingUp, ShieldCheck,
} from 'lucide-react'

// ── DATA ─────────────────────────────────────────────────────────────────────

const IMPACT = [
  { value: '50+',   label: 'Certified Farmers',      color: '#2d8a32' },
  { value: '60%',   label: 'Women-Led Farms',         color: '#c05c8a' },
  { value: '20+',   label: 'Villages Impacted',       color: '#c07830' },
  { value: '500+',  label: 'Families Nourished',      color: '#1a5fa8' },
]

const WOMEN_STORIES = [
  {
    name: 'Sita Devi',
    village: 'Sitapur, Uttar Pradesh',
    quote: '"Graamo gave me a direct market. I no longer depend on middlemen. My children go to school because of this income."',
    crop: 'Organic Wheat & Pulses',
  },
  {
    name: 'Kamla Bai',
    village: 'Wardha, Maharashtra',
    quote: '"I grow turmeric the way my grandmother taught me — no chemicals, just patience and love. Graamo lets the world taste that."',
    crop: 'Turmeric & Spices',
  },
  {
    name: 'Meera Kumari',
    village: 'Anand, Gujarat',
    quote: '"Three years ago I had no savings. Today I own land. Graamo is not just a marketplace — it is my independence."',
    crop: 'Cold-Pressed Groundnut Oil',
  },
]

const VALUES = [
  {
    Icon: Sprout,
    title: 'Regenerative Farming',
    body: 'Every partner farm follows chemical-free, soil-first practices that restore land rather than deplete it.',
    bg: '#f0fdf4', border: '#86efac', icon: '#16a34a',
  },
  {
    Icon: Handshake,
    title: 'Radical Fair Pricing',
    body: 'Farmers keep 85% of the sale price. Zero hidden commissions. Transparent pricing visible on every product page.',
    bg: '#fdf4ff', border: '#d8b4fe', icon: '#9333ea',
  },
  {
    Icon: TrendingUp,
    title: 'Women-First Growth',
    body: 'We actively onboard women-led farms, provide free training, and offer micro-grants to scale their operations.',
    bg: '#fff0f6', border: '#fbcfe8', icon: '#c05c8a',
  },
  {
    Icon: ShieldCheck,
    title: 'End-to-End Traceability',
    body: 'Scan any product QR code to trace it back to the farm, the farmer, and the harvest date.',
    bg: '#eff6ff', border: '#93c5fd', icon: '#1d4ed8',
  },
]

const CATEGORIES = [
  { label: 'Vegetables',        emoji: '🥦', path: '/products?category=vegetables' },
  { label: 'Fruits',            emoji: '🍊', path: '/products?category=fruits' },
  { label: 'Grains & Pulses',   emoji: '🌾', path: '/products?category=grains' },
  { label: 'Herbs & Spices',    emoji: '🌿', path: '/products?category=spices' },
  { label: 'Cold Pressed Oils', emoji: '🫒', path: '/products?category=oils' },
  { label: 'Dairy & Honey',     emoji: '🍯', path: '/products?category=dairy' },
]

// ── COMPONENT ─────────────────────────────────────────────────────────────────

export const AboutUsPage: React.FC = () => (
  <PageLayout>
    <SEO
      title="About Us"
      description="Graamo connects 50+ certified organic farmers — 60% women-led — directly with Indian families. From fields to families, with love."
      canonical="https://graamo.in/about-us"
    />

    {/* ── 1. HERO ──────────────────────────────────────────────────────────── */}
    <section className="relative w-full overflow-hidden" style={{ minHeight: 'min(90vh,720px)' }}>
      {/* Background image */}
      <img
        src="https://images.unsplash.com/photo-1585320806297-9794b3e4aaae?w=1400&q=80&auto=format&fit=crop"
        alt="Women farmers working in fields"
        className="absolute inset-0 w-full h-full object-cover object-center"
        loading="eager"
      />
      {/* Gradient overlays */}
      <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg,rgba(7,28,10,0.82) 0%,rgba(14,54,21,0.60) 55%,rgba(7,28,10,0.40) 100%)' }} />
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle,#fff 1px,transparent 1px)', backgroundSize: '28px 28px' }} />

      {/* Content */}
      <div className="relative z-10 max-w-5xl mx-auto px-6 sm:px-10 flex flex-col justify-center h-full py-24 sm:py-32">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-forest-400/40 bg-forest-400/10 w-fit mb-6">
          <Heart className="w-3.5 h-3.5 text-pink-300" strokeWidth={2} />
          <span className="text-forest-200 font-label text-xs tracking-widest uppercase">Our Story</span>
        </div>
        <h1 className="font-display font-semibold text-white leading-[0.95] tracking-tight mb-6" style={{ fontSize: 'clamp(2.8rem,7vw,5.5rem)' }}>
          From Fields<br />
          <span className="italic text-forest-300">to Families</span>
        </h1>
        <p className="text-forest-100/90 font-body leading-relaxed max-w-xl mb-10" style={{ fontSize: 'clamp(1rem,1.6vw,1.15rem)' }}>
          Empowering rural women and organic farmers across India — one honest, chemical-free harvest at a time.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            to="/products"
            className="inline-flex items-center gap-2.5 px-7 py-3.5 bg-white text-stone-900 font-label font-semibold text-sm rounded-2xl shadow-lg hover:bg-stone-50 active:scale-[0.98] transition-all duration-200"
          >
            Explore Products <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/become-a-seller"
            className="inline-flex items-center gap-2.5 px-7 py-3.5 border border-forest-400/40 text-white font-label font-medium text-sm rounded-2xl hover:bg-white/10 active:scale-[0.98] transition-all duration-200"
          >
            Join as a Farmer
          </Link>
        </div>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none" style={{ background: 'linear-gradient(to top,#fdf9f4,transparent)' }} />
    </section>

    {/* ── 2. OUR STORY ─────────────────────────────────────────────────────── */}
    <section className="max-w-5xl mx-auto px-6 sm:px-10 py-20 sm:py-28">
      <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
        {/* Image */}
        <div className="relative order-2 lg:order-1">
          <div className="rounded-4xl overflow-hidden aspect-[4/3] shadow-2xl">
            <img
              src="https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=800&q=80&auto=format&fit=crop"
              alt="Farmer harvesting organic crops"
              className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
              loading="lazy"
            />
          </div>
          {/* Floating stat pill */}
          <div className="absolute -bottom-5 -right-4 sm:-right-6 glass rounded-2xl px-5 py-3.5 shadow-xl border border-white/60">
            <p className="font-label font-bold text-forest-800 text-lg leading-tight">50+</p>
            <p className="text-stone-500 font-body text-xs mt-0.5">Organic Farmers</p>
          </div>
        </div>

        {/* Text */}
        <div className="order-1 lg:order-2">
          <p className="font-label text-xs font-semibold tracking-widest uppercase text-forest-600 mb-3">Our Story</p>
          <h2 className="font-display font-semibold text-stone-900 leading-tight mb-6" style={{ fontSize: 'clamp(2rem,4vw,3rem)' }}>
            Born from a belief that<br />
            <span className="italic text-forest-700">food should be honest</span>
          </h2>
          <div className="space-y-4 text-stone-600 font-body leading-relaxed" style={{ fontSize: '1.025rem' }}>
            <p>
              Behind every product on Graamo, there is a woman who wakes up before sunrise, tends her land with bare hands, and refuses to use the chemicals her neighbours swear by — because she believes her children and yours deserve better.
            </p>
            <p>
              Graamo was born from a simple injustice: a farmer earns ₹12 for a kilo of tomatoes that reaches your table priced at ₹60. Three middlemen. No transparency. No dignity.
            </p>
            <p>
              We built a direct bridge — from farm gate to your doorstep — so the farmer gets paid fairly and you get food you can actually trust.
            </p>
          </div>
        </div>
      </div>
    </section>

    {/* ── 3. IMPACT METRICS ────────────────────────────────────────────────── */}
    <section style={{ background: 'linear-gradient(135deg,#071c0a 0%,#0e3615 50%,#13461b 100%)' }} className="relative overflow-hidden py-20 sm:py-24">
      <div className="absolute inset-0 pointer-events-none opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(circle,#fff 1px,transparent 1px)', backgroundSize: '24px 24px' }} />
      <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full pointer-events-none animate-float" style={{ background: 'radial-gradient(circle,rgba(46,139,50,0.3) 0%,transparent 70%)' }} />

      <div className="relative z-10 max-w-5xl mx-auto px-6 sm:px-10">
        <div className="text-center mb-14">
          <p className="font-label text-xs font-semibold tracking-widest uppercase text-forest-300 mb-3">Our Impact</p>
          <h2 className="font-display font-semibold text-white" style={{ fontSize: 'clamp(2rem,4vw,3rem)' }}>
            Numbers that tell a<br /><span className="italic text-forest-300">real story</span>
          </h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {IMPACT.map(({ value, label, color }) => (
            <div key={label} className="text-center p-6 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-sm hover:bg-white/10 transition-colors duration-200">
              <p className="font-display font-bold text-4xl sm:text-5xl mb-2" style={{ color }}>{value}</p>
              <p className="font-label text-xs text-forest-200/80 tracking-wide uppercase">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* ── 4. WOMEN EMPOWERMENT ─────────────────────────────────────────────── */}
    <section className="max-w-6xl mx-auto px-6 sm:px-10 py-20 sm:py-28">
      <div className="text-center mb-14">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-pink-200 bg-pink-50 mb-4">
          <Heart className="w-3.5 h-3.5 text-pink-500" strokeWidth={2} />
          <span className="text-pink-700 font-label text-xs tracking-widest uppercase font-semibold">Women Empowerment</span>
        </div>
        <h2 className="font-display font-semibold text-stone-900 leading-tight" style={{ fontSize: 'clamp(2rem,4vw,3rem)' }}>
          Meet the women <span className="italic text-pink-600">behind your food</span>
        </h2>
        <p className="text-stone-500 font-body mt-4 max-w-2xl mx-auto">
          60% of our partner farms are owned and operated by women. These are not statistics — these are lives transformed.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
        {WOMEN_STORIES.map(({ name, village, quote, crop }) => (
          <div key={name} className="group bg-white rounded-3xl overflow-hidden border border-stone-100 shadow-card hover:shadow-card-hover hover:-translate-y-1 transition-all duration-300">
            {/* Content */}
            <div className="p-5 pt-6">
              <div className="flex items-start gap-2 mb-3">
                <div className="w-8 h-8 rounded-xl bg-pink-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Heart className="w-4 h-4 text-pink-500" strokeWidth={2} />
                </div>
                <div>
                  <p className="font-label font-bold text-stone-900 text-sm">{name}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3 text-stone-400" />
                    <p className="text-stone-400 font-body text-xs">{village}</p>
                  </div>
                </div>
              </div>
              <p className="text-stone-600 font-body text-sm leading-relaxed italic mb-3">{quote}</p>
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-forest-50 border border-forest-100 w-fit">
                <Leaf className="w-3 h-3 text-forest-600" />
                <span className="text-forest-700 font-label text-xs font-semibold">{crop}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>

    {/* ── 5. MISSION & VALUES ──────────────────────────────────────────────── */}
    <section className="bg-stone-50 border-y border-stone-100 py-20 sm:py-28">
      <div className="max-w-6xl mx-auto px-6 sm:px-10">
        <div className="text-center mb-14">
          <p className="font-label text-xs font-semibold tracking-widest uppercase text-forest-600 mb-3">What We Stand For</p>
          <h2 className="font-display font-semibold text-stone-900" style={{ fontSize: 'clamp(2rem,4vw,3rem)' }}>
            Principles that guide<br /><span className="italic text-forest-700">every harvest</span>
          </h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {VALUES.map(({ Icon, title, body, bg, border, icon }) => (
            <div
              key={title}
              className="group p-6 rounded-3xl border hover:-translate-y-1 hover:shadow-card-hover transition-all duration-300"
              style={{ backgroundColor: bg, borderColor: border }}
            >
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5" style={{ backgroundColor: icon + '18' }}>
                <Icon className="w-6 h-6" style={{ color: icon }} strokeWidth={1.7} />
              </div>
              <h3 className="font-label font-bold text-stone-800 text-sm mb-2">{title}</h3>
              <p className="font-body text-stone-500 text-xs leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* ── 6. SHOP BY CATEGORY ──────────────────────────────────────────────── */}
    <section className="max-w-5xl mx-auto px-6 sm:px-10 py-20 sm:py-24">
      <div className="flex items-end justify-between mb-10">
        <div>
          <p className="font-label text-xs font-semibold tracking-widest uppercase text-forest-600 mb-2">What We Grow</p>
          <h2 className="font-display font-semibold text-stone-900" style={{ fontSize: 'clamp(1.8rem,3.5vw,2.6rem)' }}>Shop by Category</h2>
        </div>
        <Link to="/products" className="hidden sm:inline-flex items-center gap-1.5 text-sm font-label font-medium text-forest-600 hover:text-forest-800 transition-colors">
          View all <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 sm:gap-4">
        {CATEGORIES.map(({ label, emoji, path }) => (
          <Link
            key={label}
            to={path}
            className="group flex flex-col items-center gap-2.5 py-5 px-2 bg-white rounded-3xl border border-stone-100 shadow-card hover:shadow-card-hover hover:-translate-y-1 hover:border-forest-200 transition-all duration-300"
          >
            <div className="w-14 h-14 rounded-2xl bg-forest-50 group-hover:bg-forest-100 flex items-center justify-center transition-colors duration-200 text-3xl">
              {emoji}
            </div>
            <span className="text-xs font-label font-semibold text-stone-700 group-hover:text-forest-700 text-center leading-snug transition-colors">{label}</span>
          </Link>
        ))}
      </div>
    </section>

    {/* ── 7. FINAL CTA ─────────────────────────────────────────────────────── */}
    <section className="relative overflow-hidden py-24 sm:py-32">
      {/* Background */}
      <img
        src="https://images.unsplash.com/photo-1542838132-92c53300491e?w=1400&q=80&auto=format&fit=crop"
        alt="Organic farm"
        className="absolute inset-0 w-full h-full object-cover object-center"
        loading="lazy"
      />
      <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg,rgba(7,28,10,0.88) 0%,rgba(14,54,21,0.78) 100%)' }} />
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle,#fff 1px,transparent 1px)', backgroundSize: '28px 28px' }} />

      <div className="relative z-10 max-w-3xl mx-auto px-6 sm:px-10 text-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-forest-400/40 bg-forest-400/10 mb-6">
          <Users className="w-3.5 h-3.5 text-forest-300" />
          <span className="text-forest-200 font-label text-xs tracking-widest uppercase">Join the Movement</span>
        </div>
        <h2 className="font-display font-semibold text-white leading-tight mb-5" style={{ fontSize: 'clamp(2.2rem,5vw,4rem)' }}>
          Be part of something<br /><span className="italic text-forest-300">deeply real</span>
        </h2>
        <p className="text-forest-100/80 font-body leading-relaxed max-w-xl mx-auto mb-10" style={{ fontSize: '1.05rem' }}>
          Every order you place puts money directly in a farmer's hands, keeps a child in school, and keeps a field chemical-free. Your choices matter more than you know.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/products"
            className="inline-flex items-center justify-center gap-2.5 px-8 py-4 bg-white text-stone-900 font-label font-semibold text-sm rounded-2xl shadow-lg hover:bg-stone-50 active:scale-[0.98] transition-all duration-200"
          >
            Shop Now <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/become-a-seller"
            className="inline-flex items-center justify-center gap-2.5 px-8 py-4 border border-forest-400/40 text-white font-label font-medium text-sm rounded-2xl hover:bg-white/10 active:scale-[0.98] transition-all duration-200"
          >
            Become a Seller
          </Link>
        </div>
      </div>
    </section>

  </PageLayout>
)

