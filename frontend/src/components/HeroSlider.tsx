import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, ChevronLeft, ChevronRight, Sprout } from 'lucide-react'

// ── Slide data ────────────────────────────────────────────────────────────────
export interface HeroSlide {
  id: number
  badge: string
  heading: string[]          // lines, second item rendered in italic forest-300
  sub: string
  cta: { label: string; to: string; primary: boolean }[]
  stats: [string, string][]
  bg: string                 // Tailwind gradient or solid class
  accentFrom: string         // radial-gradient colour stop 1
  accentTo: string           // radial-gradient colour stop 2
  imgUrl?: string            // optional lazy-loaded right-side image
}

const SLIDES: HeroSlide[] = [
  {
    id: 1,
    badge: '100% Certified Organic',
    heading: ['Pure Organic,', 'Straight from', 'the Farm'],
    sub: 'Connect directly with 500+ certified organic farmers. No chemicals, no preservatives — just nature\'s finest delivered to your door.',
    cta: [
      { label: 'Shop Now', to: '/products', primary: true },
      { label: 'Meet Our Farmers', to: '/farmers', primary: false },
    ],
    stats: [['500+', 'Certified Farmers'], ['2,000+', 'Organic Products'], ['50k+', 'Happy Families']],
    bg: 'bg-forest-950',
    accentFrom: 'rgba(46,139,50,0.18)',
    accentTo: 'rgba(21,86,32,0.10)',
    imgUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=900&q=80&auto=format&fit=crop',
  },
  {
    id: 2,
    badge: 'Farm-Fresh · Zero Pesticides',
    heading: ['Seasonal Harvest,', 'Delivered Fresh', 'Daily'],
    sub: 'Handpicked vegetables, fruits and grains arrive at your door within 24 hours of harvest. Taste the real difference.',
    cta: [
      { label: 'Browse Vegetables', to: '/products?category=vegetables', primary: true },
      { label: 'How It Works', to: '/about', primary: false },
    ],
    stats: [['24 hrs', 'Farm to Door'], ['0%', 'Chemicals Used'], ['100%', 'Natural Growth']],
    bg: 'bg-[#0c2e14]',
    accentFrom: 'rgba(85,163,60,0.20)',
    accentTo: 'rgba(22,74,30,0.14)',
    imgUrl: 'https://images.unsplash.com/photo-1506484381205-f7945653044d?w=900&q=80&auto=format&fit=crop',
  },
  {
    id: 3,
    badge: 'Direct From Farmers',
    heading: ['Support Local', 'Farmers,', 'Eat Better'],
    sub: 'Every purchase goes directly to the farmer\'s pocket. No middlemen, no markups — fair prices for growers and buyers alike.',
    cta: [
      { label: 'Shop by Farms', to: '/farmers', primary: true },
      { label: 'Start Selling Free', to: '/become-a-seller', primary: false },
    ],
    stats: [['₹0', 'Commission (1st 100)'], ['500+', 'Verified Farms'], ['20+', 'Cities Covered']],
    bg: 'bg-[#0e1f0e]',
    accentFrom: 'rgba(46,139,50,0.22)',
    accentTo: 'rgba(15,60,20,0.16)',
    imgUrl: 'https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=900&q=80&auto=format&fit=crop',
  },
]

const INTERVAL_MS = 4500
const TRANSITION_MS = 600

// ── Component ─────────────────────────────────────────────────────────────────
export const HeroSlider: React.FC = () => {
  const [current, setCurrent]   = useState(0)
  const [animKey, setAnimKey]   = useState(0)   // bumped on each slide change to re-trigger CSS animations
  const [paused, setPaused]     = useState(false)
  const [dir, setDir]           = useState<'next' | 'prev'>('next')
  const [transitioning, setTransitioning] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const goTo = useCallback((idx: number, direction: 'next' | 'prev' = 'next') => {
    if (transitioning) return
    setTransitioning(true)
    setDir(direction)
    setTimeout(() => {
      setCurrent(idx)
      setAnimKey(k => k + 1)
      setTransitioning(false)
    }, TRANSITION_MS / 2)
  }, [transitioning])

  const next = useCallback(() => {
    goTo((current + 1) % SLIDES.length, 'next')
  }, [current, goTo])

  const prev = useCallback(() => {
    goTo((current - 1 + SLIDES.length) % SLIDES.length, 'prev')
  }, [current, goTo])

  // Auto-slide
  useEffect(() => {
    if (paused) { timerRef.current && clearInterval(timerRef.current); return }
    timerRef.current = setInterval(next, INTERVAL_MS)
    return () => { timerRef.current && clearInterval(timerRef.current) }
  }, [paused, next])

  const slide = SLIDES[current]

  return (
    <section
      className={`relative min-h-[92vh] flex items-center overflow-hidden ${slide.bg} transition-colors duration-700`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-label="Hero slider"
    >
      {/* ── Background accents ───────────────────────────────────────────── */}
      <div
        className="absolute inset-0 transition-opacity duration-700"
        style={{
          background: `radial-gradient(ellipse 80% 60% at 30% 50%, ${slide.accentFrom} 0%, transparent 70%),
                       radial-gradient(ellipse 40% 60% at 80% 30%, ${slide.accentTo} 0%, transparent 70%)`,
        }}
      />
      <div className="absolute inset-0 opacity-[0.03]"
        style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
      <div className="absolute top-20 right-[15%] w-64 h-64 rounded-full bg-forest-800/20 blur-3xl animate-float" />
      <div className="absolute bottom-20 right-[30%] w-48 h-48 rounded-full bg-forest-700/15 blur-2xl animate-float" style={{ animationDelay: '2s' }} />

      {/* ── Slide-out / slide-in wrapper ─────────────────────────────────── */}
      <div
        className="absolute inset-0 flex items-center pointer-events-none"
        style={{
          opacity: transitioning ? 0 : 1,
          transform: transitioning
            ? `translateX(${dir === 'next' ? '-30px' : '30px'})`
            : 'translateX(0)',
          transition: `opacity ${TRANSITION_MS / 2}ms ease, transform ${TRANSITION_MS / 2}ms ease`,
        }}
      />

      {/* ── Content ──────────────────────────────────────────────────────── */}
      <div className="relative max-w-7xl mx-auto px-6 sm:px-10 py-20 w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

        {/* Left – text */}
        <div
          key={animKey}
          style={{ opacity: transitioning ? 0 : 1, transition: `opacity ${TRANSITION_MS / 2}ms ease` }}
        >
          {/* Badge */}
          <div className="flex items-center gap-2.5 mb-6 animate-fade-up" style={{ animationDelay: '0.05s', animationFillMode: 'both' }}>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-forest-700/30 border border-forest-600/30 rounded-full">
              <Sprout className="w-3.5 h-3.5 text-forest-300" />
              <span className="text-xs font-label font-semibold text-forest-200 tracking-widest uppercase">
                {slide.badge}
              </span>
            </div>
          </div>

          {/* Heading */}
          <h1
            className="font-display text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-semibold text-white leading-[0.92] tracking-tight mb-6 animate-fade-up"
            style={{ animationDelay: '0.15s', animationFillMode: 'both' }}
          >
            {slide.heading[0]}<br />
            <span className="text-forest-300 italic">{slide.heading[1]}</span><br />
            {slide.heading[2]}
          </h1>

          {/* Sub */}
          <p
            className="text-stone-300 text-lg font-body leading-relaxed max-w-xl mb-10 animate-fade-up"
            style={{ animationDelay: '0.25s', animationFillMode: 'both' }}
          >
            {slide.sub}
          </p>

          {/* CTAs */}
          <div className="flex flex-wrap gap-4 animate-fade-up" style={{ animationDelay: '0.35s', animationFillMode: 'both' }}>
            {slide.cta.map(c => c.primary ? (
              <Link
                key={c.label}
                to={c.to}
                className="inline-flex items-center gap-2.5 px-7 py-4 bg-white text-stone-900 font-label font-semibold text-sm rounded-2xl shadow-lg hover:bg-stone-50 active:scale-[0.98] transition-all duration-200 tracking-wide"
              >
                {c.label} <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <Link
                key={c.label}
                to={c.to}
                className="inline-flex items-center gap-2.5 px-7 py-4 border border-white/20 text-white font-label font-medium text-sm rounded-2xl hover:bg-white/8 active:scale-[0.98] transition-all duration-200 tracking-wide"
              >
                {c.label}
              </Link>
            ))}
          </div>

          {/* Stats */}
          <div className="flex gap-8 sm:gap-10 mt-14 animate-fade-up" style={{ animationDelay: '0.45s', animationFillMode: 'both' }}>
            {slide.stats.map(([n, l]) => (
              <div key={l}>
                <div className="font-display text-3xl font-semibold text-white">{n}</div>
                <div className="text-xs font-label text-stone-400 tracking-wide mt-0.5">{l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right – image (lazy-loaded, hidden on mobile) */}
        {slide.imgUrl && (
          <div
            key={`img-${animKey}`}
            className="hidden lg:block relative animate-fade-up"
            style={{ animationDelay: '0.1s', animationFillMode: 'both' }}
          >
            <div className="relative rounded-4xl overflow-hidden shadow-modal aspect-[4/3]">
              <img
                src={slide.imgUrl}
                alt={slide.heading.join(' ')}
                loading="lazy"
                className="w-full h-full object-cover scale-105 hover:scale-100 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
            </div>
            {/* floating pill */}
            <div className="absolute -bottom-4 -left-4 glass-dark rounded-2xl px-4 py-3 flex items-center gap-3 shadow-modal">
              <div className="w-9 h-9 rounded-xl bg-forest-500/30 flex items-center justify-center flex-shrink-0">
                <Sprout className="w-4 h-4 text-forest-300" />
              </div>
              <div>
                <p className="text-xs font-label font-semibold text-white leading-tight">Certified Organic</p>
                <p className="text-[11px] text-stone-400 font-body">Verified by FSSAI &amp; PGS</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Left / Right arrows ───────────────────────────────────────────── */}
      <button
        onClick={prev}
        aria-label="Previous slide"
        className="absolute left-4 sm:left-6 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-2xl bg-white/10 border border-white/15 hover:bg-white/20 active:scale-95 text-white flex items-center justify-center transition-all duration-200 backdrop-blur-sm"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
      <button
        onClick={next}
        aria-label="Next slide"
        className="absolute right-4 sm:right-6 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-2xl bg-white/10 border border-white/15 hover:bg-white/20 active:scale-95 text-white flex items-center justify-center transition-all duration-200 backdrop-blur-sm"
      >
        <ChevronRight className="w-5 h-5" />
      </button>

      {/* ── Dots ─────────────────────────────────────────────────────────── */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2.5">
        {SLIDES.map((s, i) => (
          <button
            key={s.id}
            onClick={() => goTo(i, i > current ? 'next' : 'prev')}
            aria-label={`Go to slide ${i + 1}`}
            className={`rounded-full transition-all duration-400 ${
              i === current
                ? 'w-8 h-2.5 bg-white'
                : 'w-2.5 h-2.5 bg-white/30 hover:bg-white/60'
            }`}
          />
        ))}
      </div>

      {/* ── Progress bar ─────────────────────────────────────────────────── */}
      {!paused && (
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/10 z-20">
          <div
            key={`prog-${current}`}
            className="h-full bg-forest-400/70 rounded-full"
            style={{
              animation: `progressBar ${INTERVAL_MS}ms linear forwards`,
            }}
          />
        </div>
      )}

      {/* ── Bottom fade ──────────────────────────────────────────────────── */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-cream to-transparent pointer-events-none" />

      {/* Progress bar keyframe injected inline so no CSS file edit needed */}
      <style>{`
        @keyframes progressBar {
          from { width: 0% }
          to   { width: 100% }
        }
      `}</style>
    </section>
  )
}
