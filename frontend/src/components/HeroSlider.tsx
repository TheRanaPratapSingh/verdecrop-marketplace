import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, ChevronLeft, ChevronRight, Heart, Leaf, Sprout } from 'lucide-react'

type BadgeIconType = 'sprout' | 'leaf' | 'heart'

interface Slide {
  id:            number
  badge:         string
  badgeIcon:     BadgeIconType
  heading:       string
  headingAccent: string
  headingEnd:    string
  sub:           string
  cta:           { label: string; to: string; primary: boolean }[]
  stats:         { value: string; label: string }[]
  bgColor:       string
  accentFrom:    string
  accentTo:      string
  accentColor:   string
  imgUrl:        string
  pillText:      string
  pillSub:       string
}
const SLIDES: Slide[] = [
  {
    id: 1, badge: '100% Certified Organic', badgeIcon: 'sprout',
    heading: 'Pure Organic,', headingAccent: 'Straight from', headingEnd: 'the Farm',
    sub: "Connect directly with 50+ certified organic farmers. No chemicals, no preservatives — just nature's finest delivered to your door.",
    cta: [{ label: 'Shop Now', to: '/products', primary: true }, { label: 'Meet Our Farmers', to: '/farmers', primary: false }],
    stats: [{ value: '50+', label: 'Certified Farmers' }, { value: '2,000+', label: 'Organic Products' }, { value: '500+', label: 'Happy Families' }],
    bgColor: '#071c0a', accentFrom: 'rgba(46,139,50,0.22)', accentTo: 'rgba(21,86,32,0.13)', accentColor: '#85c487',
    imgUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=900&q=80&auto=format&fit=crop',
    pillText: 'Certified Organic', pillSub: 'Verified by FSSAI and PGS',
  },
  {
    id: 2, badge: 'Farm-Fresh · Zero Pesticides', badgeIcon: 'leaf',
    heading: 'Seasonal Harvest,', headingAccent: 'Delivered Fresh', headingEnd: 'Daily',
    sub: 'Handpicked vegetables, fruits and grains arrive at your door within 24 hours of harvest. Taste the real difference.',
    cta: [{ label: 'Browse Produce', to: '/products', primary: true }, { label: 'How It Works', to: '/about', primary: false }],
    stats: [{ value: '24 hrs', label: 'Farm to Door' }, { value: '0%', label: 'Chemicals Used' }, { value: '100%', label: 'Natural Growth' }],
    bgColor: '#0c2e14', accentFrom: 'rgba(85,163,60,0.22)', accentTo: 'rgba(22,74,30,0.14)', accentColor: '#a2bc98',
    imgUrl: 'https://images.unsplash.com/photo-1506484381205-f7945653044d?w=900&q=80&auto=format&fit=crop',
    pillText: 'Harvest Today', pillSub: 'Ships within 24 hours',
  },
  {
    id: 3, badge: 'Direct From Farmers', badgeIcon: 'sprout',
    heading: 'Support Local', headingAccent: 'Farmers,', headingEnd: 'Eat Better',
    sub: "Every purchase goes directly to the farmer's pocket. No middlemen, no markups — fair prices for growers and buyers alike.",
    cta: [{ label: 'Shop by Farms', to: '/farmers', primary: true }, { label: 'Start Selling Free', to: '/become-a-seller', primary: false }],
    stats: [{ value: 'Rs.0', label: 'Commission (1st 100)' }, { value: '50+', label: 'Verified Farms' }, { value: '20+', label: 'Cities Covered' }],
    bgColor: '#0e1f0e', accentFrom: 'rgba(46,139,50,0.22)', accentTo: 'rgba(15,60,20,0.16)', accentColor: '#85c487',
    imgUrl: 'https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=900&q=80&auto=format&fit=crop',
    pillText: 'Zero Middlemen', pillSub: 'Fair farm-gate prices',
  },
  {
    id: 4, badge: 'Women Empowerment', badgeIcon: 'heart',
    heading: 'Empowering Women,', headingAccent: 'One Harvest', headingEnd: 'at a Time',
    sub: "Supporting India's women farmers who grow with strength, care, and resilience. Every purchase puts power back into their hands.",
    cta: [{ label: 'Support Women Farmers', to: '/farmers', primary: true }, { label: 'Shop Now', to: '/products', primary: false }],
    stats: [{ value: '200+', label: 'Women-Led Farms' }, { value: '12+', label: 'States Represented' }, { value: '100%', label: 'Direct Income' }],
    bgColor: '#1a0a2e', accentFrom: 'rgba(180,80,160,0.22)', accentTo: 'rgba(100,30,120,0.14)', accentColor: '#e8a0d8',
    imgUrl: 'https://images.unsplash.com/photo-1585320806297-9794b3e4aaae?w=900&q=80&auto=format&fit=crop',
    pillText: 'Women-Led Harvest', pillSub: '200+ farms across India',
  },
]

const INTERVAL_MS = 6000
const FADE_MS = 700
const BadgeIcon: React.FC<{ type: BadgeIconType; color: string }> = ({ type, color }) => {
  const cls = 'w-3.5 h-3.5 flex-shrink-0'
  if (type === 'heart') return <Heart  className={cls} style={{ color }} strokeWidth={2} />
  if (type === 'leaf')  return <Leaf   className={cls} style={{ color }} strokeWidth={2} />
  return                        <Sprout className={cls} style={{ color }} strokeWidth={2} />
}

interface LayerProps { slide: Slide; animKey: number; visible: boolean; isTop: boolean }

const SlideLayer: React.FC<LayerProps> = ({ slide, animKey, visible, isTop }) => {
  // For the incoming (top) layer: mount at opacity 0, then transition to 1 on next frame
  const [opacity, setOpacity] = useState(isTop ? 0 : 1)
  useLayoutEffect(() => {
    if (isTop) {
      const raf = requestAnimationFrame(() => setOpacity(1))
      return () => cancelAnimationFrame(raf)
    }
  }, [isTop])

  return (
  <div
    className="absolute inset-0 flex items-center"
    style={{
      backgroundColor: slide.bgColor,
      zIndex:     isTop ? 2 : 1,
      opacity:    isTop ? opacity : (visible ? 1 : 0),
      transition: `opacity ${FADE_MS}ms ease`,
      willChange: 'opacity',
    }}
  >
    <div className="absolute inset-0 pointer-events-none" style={{
      background:
        'radial-gradient(ellipse 75% 65% at 25% 50%, ' + slide.accentFrom + ' 0%, transparent 65%),' +
        'radial-gradient(ellipse 50% 70% at 80% 25%, ' + slide.accentTo   + ' 0%, transparent 65%)',
    }} />
    <div className="absolute inset-0 pointer-events-none opacity-[0.025]"
      style={{ backgroundImage: 'radial-gradient(circle,#fff 1px,transparent 1px)', backgroundSize: '28px 28px' }} />
    <div className="absolute top-16 right-[12%] w-56 h-56 rounded-full blur-3xl pointer-events-none animate-float"
      style={{ backgroundColor: slide.accentFrom, opacity: 0.5 }} />
    <div className="absolute bottom-24 left-[5%] w-40 h-40 rounded-full blur-2xl pointer-events-none animate-float"
      style={{ backgroundColor: slide.accentTo, opacity: 0.4, animationDelay: '2.5s' }} />

    <div className="relative z-10 w-full max-w-7xl mx-auto px-6 sm:px-10 pt-20 pb-28 sm:pt-24 sm:pb-32 grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
      <div key={animKey} className="min-w-0">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border mb-6"
          style={{ backgroundColor: slide.accentFrom, borderColor: slide.accentColor + '55', animation: 'hsu 0.5s 0.05s both' }}>
          <BadgeIcon type={slide.badgeIcon} color={slide.accentColor} />
          <span className="text-[11px] sm:text-xs font-label font-semibold tracking-widest uppercase" style={{ color: slide.accentColor }}>
            {slide.badge}
          </span>
        </div>
        <h1 className="font-display font-semibold text-white leading-[0.95] tracking-tight mb-5"
          style={{ fontSize: 'clamp(2.2rem,5.5vw,4.8rem)', animation: 'hsu 0.55s 0.12s both' }}>
          {slide.heading}<br />
          <span className="italic" style={{ color: slide.accentColor }}>{slide.headingAccent}</span><br />
          {slide.headingEnd}
        </h1>
        <p className="text-stone-300 font-body leading-relaxed max-w-lg mb-9"
          style={{ fontSize: 'clamp(0.9rem,1.4vw,1.05rem)', animation: 'hsu 0.55s 0.22s both' }}>
          {slide.sub}
        </p>
        <div className="flex flex-wrap gap-3 sm:gap-4 mb-12" style={{ animation: 'hsu 0.55s 0.32s both' }}>
          {slide.cta.map(c => c.primary ? (
            <Link key={c.label} to={c.to}
              className="inline-flex items-center gap-2.5 px-6 sm:px-7 py-3.5 sm:py-4 bg-white text-stone-900 font-label font-semibold text-sm rounded-2xl shadow-lg hover:bg-stone-50 active:scale-[0.98] transition-all duration-200 tracking-wide">
              {c.label} <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            <Link key={c.label} to={c.to}
              className="inline-flex items-center gap-2.5 px-6 sm:px-7 py-3.5 sm:py-4 border text-white font-label font-medium text-sm rounded-2xl hover:bg-white/10 active:scale-[0.98] transition-all duration-200 tracking-wide"
              style={{ borderColor: slide.accentColor + '55' }}>
              {c.label}
            </Link>
          ))}
        </div>
        <div className="flex flex-wrap gap-6 sm:gap-10" style={{ animation: 'hsu 0.55s 0.42s both' }}>
          {slide.stats.map(s => (
            <div key={s.label}>
              <div className="font-display text-2xl sm:text-3xl font-semibold text-white">{s.value}</div>
              <div className="text-[11px] sm:text-xs font-label text-stone-400 tracking-wide mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div key={'img-' + animKey} className="hidden lg:block relative" style={{ animation: 'hsu 0.6s 0.08s both' }}>
        <div className="relative rounded-[2rem] overflow-hidden aspect-[4/3]" style={{ boxShadow: '0 8px 48px rgba(0,0,0,0.55)' }}>
          <img src={slide.imgUrl} alt={slide.heading} loading="lazy" decoding="async"
            className="w-full h-full object-cover scale-[1.04] hover:scale-100 transition-transform duration-700" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/5 to-transparent" />
          {slide.badgeIcon === 'heart' && (
            <div className="absolute inset-0 bg-gradient-to-br from-purple-900/25 via-transparent to-pink-900/20" />
          )}
        </div>
        <div className="absolute -bottom-3 -left-4 flex items-center gap-3 rounded-2xl px-4 py-3 backdrop-blur-md border border-white/10"
          style={{ background: 'rgba(8,8,12,0.84)', boxShadow: '0 4px 24px rgba(0,0,0,0.4)' }}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: slide.accentFrom }}>
            <BadgeIcon type={slide.badgeIcon} color={slide.accentColor} />
          </div>
          <div>
            <p className="text-xs font-label font-semibold text-white leading-tight">{slide.pillText}</p>
            <p className="text-[11px] text-stone-400 font-body mt-0.5">{slide.pillSub}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
  )
}
export const HeroSlider: React.FC = () => {
  const [current,  setCurrent]  = useState(0)
  const [incoming, setIncoming] = useState<number | null>(null)
  const [paused,   setPaused]   = useState(false)
  const fadingRef  = useRef(false)
  const currentRef = useRef(0)   // mirrors `current` so interval never captures a stale closure

  const goTo = useCallback((target: number) => {
    if (fadingRef.current || target === currentRef.current) return
    fadingRef.current = true
    setIncoming(target)
    setTimeout(() => {
      currentRef.current = target
      setCurrent(target)
      setIncoming(null)
      fadingRef.current = false
    }, FADE_MS)
  }, []) // no deps — reads refs, never captures state

  const advance = useCallback(
    () => goTo((currentRef.current + 1) % SLIDES.length),
    [goTo], // stable: goTo never changes
  )

  const retreat = useCallback(
    () => goTo((currentRef.current - 1 + SLIDES.length) % SLIDES.length),
    [goTo],
  )

  useEffect(() => {
    if (paused) return
    const t = setInterval(advance, INTERVAL_MS)
    return () => clearInterval(t)
  }, [paused, advance]) // advance is now stable → effect runs only when paused toggles

  const slide = SLIDES[current]

  return (
    <>
      <section
        className="relative w-full overflow-hidden"
        style={{ minHeight: 'min(92vh,820px)' }}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        aria-label="Hero slider"
      >
        <SlideLayer slide={slide} animKey={current} visible isTop={false} />
        {incoming !== null && (
          <SlideLayer slide={SLIDES[incoming]} animKey={incoming} visible isTop />
        )}

        <button onClick={retreat} aria-label="Previous slide"
          className="absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 z-30 w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-white/10 border border-white/15 hover:bg-white/25 active:scale-95 text-white flex items-center justify-center transition-all duration-200 backdrop-blur-sm">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button onClick={advance} aria-label="Next slide"
          className="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 z-30 w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-white/10 border border-white/15 hover:bg-white/25 active:scale-95 text-white flex items-center justify-center transition-all duration-200 backdrop-blur-sm">
          <ChevronRight className="w-5 h-5" />
        </button>

        <div className="absolute bottom-6 left-0 right-0 z-30 flex flex-col items-center gap-2.5">
          <div className="flex items-center gap-2">
            {SLIDES.map((s, i) => (
              <button key={s.id} onClick={() => goTo(i)} aria-label={'Go to slide ' + (i + 1)}
                style={i === current ? { backgroundColor: slide.accentColor } : undefined}
                className={'rounded-full transition-all duration-300 ' + (i === current ? 'w-7 h-2' : 'w-2 h-2 bg-white/30 hover:bg-white/60')}
              />
            ))}
          </div>
          <div className="w-24 h-[2px] bg-white/15 rounded-full overflow-hidden">
            <div key={'pb-' + current} className="h-full rounded-full"
              style={{
                backgroundColor: slide.accentColor,
                animation: paused ? 'none' : ('hsProgress ' + INTERVAL_MS + 'ms linear forwards'),
              }}
            />
          </div>
        </div>
      </section>

      <div className="h-px bg-gradient-to-r from-transparent via-stone-200 to-transparent" />
    </>
  )
}
