import React, { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Leaf, Phone, Mail, ArrowRight, ChevronLeft, CheckCircle2, ShieldCheck, Truck, Sprout, User, Users } from 'lucide-react'
import { authApi, cartApi } from '../services/api'
import { useAuthStore, useCartStore, useGuestCartStore } from '../store'
import { SEO } from '../components/SEO'
import toast from 'react-hot-toast'
import { trackEvent } from '../lib/analytics'

// ── Shared OTP Input ──────────────────────────────────────────────────────────
const OtpInput: React.FC<{ length?: number; onChange: (val: string) => void; autoFocus?: boolean }> = ({ length = 6, onChange, autoFocus = true }) => {
  const [digits, setDigits] = useState<string[]>(Array(length).fill(''))
  const refs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    if (autoFocus) {
      const t = setTimeout(() => refs.current[0]?.focus(), 80)
      return () => clearTimeout(t)
    }
  }, [])

  const handleChange = (i: number, val: string) => {
    if (!/^\d*$/.test(val)) return
    const newDigits = [...digits]
    newDigits[i] = val.slice(-1)
    setDigits(newDigits)
    onChange(newDigits.join(''))
    if (val && i < length - 1) refs.current[i + 1]?.focus()
  }

  const handleKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      refs.current[i - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length)
    const newDigits = pasted.split('')
    while (newDigits.length < length) newDigits.push('')
    setDigits(newDigits)
    onChange(newDigits.join(''))
    refs.current[Math.min(pasted.length, length - 1)]?.focus()
  }

  return (
    <div className="flex gap-2.5 justify-center">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={el => refs.current[i] = el}
          type="text"
          inputMode="numeric"
          aria-label={`OTP digit ${i + 1}`}
          autoComplete="one-time-code"
          value={d}
          maxLength={1}
          onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKeyDown(i, e)}
          onPaste={handlePaste}
          className={`w-12 h-14 text-center text-xl font-bold border-2 rounded-xl outline-none transition-all duration-150 font-body bg-white shadow-sm
            ${d ? 'border-forest-500 bg-forest-50/80 text-forest-800 scale-105' : 'border-stone-200 focus:border-forest-500 focus:bg-white focus:scale-105 text-stone-800'}`}
        />
      ))}
    </div>
  )
}

// ── Left: Clean minimal branding panel ────────────────────────────────────────
const GraamoLeftPanel: React.FC = () => (
  <div className="hidden lg:flex flex-col justify-between py-10 px-10 bg-[#fdf8f0] border-r border-stone-200/60 w-[340px] flex-shrink-0">
    {/* Logo */}
    <Link to="/" className="flex items-center gap-2.5 group">
      <div className="w-10 h-10 bg-gradient-to-br from-forest-600 to-forest-800 rounded-[12px] flex items-center justify-center shadow-btn">
        <Leaf className="w-5 h-5 text-white" />
      </div>
      <div>
        <span className="font-display font-bold text-xl text-stone-900 tracking-tight leading-none block">Graamo</span>
        <span className="text-[10px] font-body text-stone-400 tracking-[0.16em] uppercase leading-none">Farm · Home</span>
      </div>
    </Link>

    {/* Central brand story */}
    <div className="space-y-6">
      {/* Graamo circular emblem SVG */}
      <div className="w-36 h-36">
        <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-[0_4px_20px_rgba(120,53,15,0.18)]">
          {/* Outer ring */}
          <circle cx="100" cy="100" r="96" fill="#fef3c7" stroke="#d97706" strokeWidth="2.5" opacity="0.9" />
          {/* Inner ring */}
          <circle cx="100" cy="100" r="80" fill="none" stroke="#f59e0b" strokeWidth="1" strokeDasharray="4 3" opacity="0.5" />
          {/* Left wheat stalk */}
          <path d="M42 155 Q38 120 45 90 Q48 80 52 88 Q46 110 48 140Z" fill="#d97706" opacity="0.7" />
          <ellipse cx="45" cy="85" rx="6" ry="10" fill="#f59e0b" transform="rotate(-20 45 85)" opacity="0.85" />
          <ellipse cx="50" cy="98" rx="5" ry="9" fill="#d97706" transform="rotate(-15 50 98)" opacity="0.75" />
          <ellipse cx="47" cy="111" rx="5" ry="8" fill="#b45309" transform="rotate(-10 47 111)" opacity="0.65" />
          {/* Right wheat stalk */}
          <path d="M158 155 Q162 120 155 90 Q152 80 148 88 Q154 110 152 140Z" fill="#d97706" opacity="0.7" />
          <ellipse cx="155" cy="85" rx="6" ry="10" fill="#f59e0b" transform="rotate(20 155 85)" opacity="0.85" />
          <ellipse cx="150" cy="98" rx="5" ry="9" fill="#d97706" transform="rotate(15 150 98)" opacity="0.75" />
          <ellipse cx="153" cy="111" rx="5" ry="8" fill="#b45309" transform="rotate(10 153 111)" opacity="0.65" />
          {/* Left leaf */}
          <path d="M60 148 Q42 130 44 110 Q52 120 62 138Z" fill="#16a34a" opacity="0.75" />
          {/* Right leaf */}
          <path d="M140 148 Q158 130 156 110 Q148 120 138 138Z" fill="#16a34a" opacity="0.75" />
          {/* Sun rays */}
          {[0,30,60,90,120,150,210,240,270,300,330].map((deg, i) => (
            <line key={i}
              x1={100 + 64 * Math.cos((deg - 90) * Math.PI / 180)}
              y1={100 + 64 * Math.sin((deg - 90) * Math.PI / 180)}
              x2={100 + 74 * Math.cos((deg - 90) * Math.PI / 180)}
              y2={100 + 74 * Math.sin((deg - 90) * Math.PI / 180)}
              stroke="#f59e0b" strokeWidth="1.5" opacity="0.4"
            />
          ))}
          {/* Horizon/field line */}
          <path d="M38 130 Q65 118 100 122 Q135 118 162 130" stroke="#b45309" strokeWidth="1.5" fill="none" opacity="0.4" strokeLinecap="round" />
          {/* Village hut left */}
          <path d="M55 130 L55 120 L63 114 L71 120 L71 130Z" fill="#92400e" opacity="0.55" />
          <path d="M63 114 L55 120 L71 120Z" fill="#b45309" opacity="0.65" />
          {/* Village hut right */}
          <path d="M129 130 L129 120 L137 114 L145 120 L145 130Z" fill="#92400e" opacity="0.55" />
          <path d="M137 114 L129 120 L145 120Z" fill="#b45309" opacity="0.65" />
          {/* Tree */}
          <rect x="98" y="112" width="4" height="14" rx="2" fill="#78350f" opacity="0.7" />
          <ellipse cx="100" cy="110" rx="10" ry="12" fill="#16a34a" opacity="0.75" />
          {/* Woman silhouette */}
          {/* Body / saree */}
          <path d="M88 150 Q90 165 100 168 Q110 165 112 150 Q106 156 100 157 Q94 156 88 150Z" fill="#d97706" opacity="0.9" />
          <path d="M92 118 Q86 128 84 140 Q84 148 88 150 Q92 145 94 136 Q94 126 96 118Z" fill="#f59e0b" opacity="0.8" />
          <path d="M96 112 Q96 126 98 134 Q100 138 102 134 Q104 126 104 112 Q102 110 100 110 Q98 110 96 112Z" fill="#b45309" opacity="0.88" />
          <path d="M104 118 Q110 126 112 138 Q112 146 112 150 Q116 148 116 138 Q114 126 108 116Z" fill="#d97706" opacity="0.7" />
          {/* Neck */}
          <rect x="98" y="100" width="4" height="10" rx="2" fill="#c2714a" />
          {/* Head */}
          <ellipse cx="100" cy="94" rx="10" ry="11" fill="#c2714a" />
          {/* Dupatta/drape */}
          <path d="M90 106 Q82 115 80 130 Q78 140 80 148 Q84 140 86 128 Q88 114 92 106Z" fill="#f59e0b" opacity="0.5" />
          {/* Hair */}
          <ellipse cx="100" cy="87" rx="11" ry="7" fill="#1a0f0a" opacity="0.9" />
          <path d="M89 87 Q88 95 90 104" stroke="#1a0f0a" strokeWidth="2.5" strokeLinecap="round" opacity="0.8" />
          {/* Bindi */}
          <circle cx="100" cy="92" r="1.2" fill="#dc2626" opacity="0.9" />
          {/* Basket of veggies */}
          <ellipse cx="115" cy="138" rx="9" ry="6" fill="#92400e" opacity="0.8" />
          <ellipse cx="115" cy="133" rx="8" ry="4" fill="#b45309" opacity="0.7" />
          <circle cx="111" cy="131" r="2.5" fill="#dc2626" opacity="0.85" />
          <circle cx="116" cy="130" r="2" fill="#16a34a" opacity="0.85" />
          <circle cx="120" cy="132" r="2" fill="#f97316" opacity="0.85" />
          {/* Smile */}
          <path d="M97 98 Q100 101 103 98" stroke="#7c2d12" strokeWidth="1" strokeLinecap="round" fill="none" />
          {/* GRAAMO wordmark */}
          <text x="100" y="183" textAnchor="middle" fontFamily="Georgia, serif" fontSize="14" fontWeight="bold" fill="#78350f" letterSpacing="3">GRAAMO</text>
          <text x="100" y="193" textAnchor="middle" fontFamily="sans-serif" fontSize="6" fill="#b45309" letterSpacing="1.5" opacity="0.8">ROOTED IN WOMEN</text>
        </svg>
      </div>

      <div className="space-y-2">
        <h2 className="font-display font-bold text-2xl text-stone-800 leading-tight">
          Farm fresh,<br />delivered with love
        </h2>
        <p className="text-sm font-body text-stone-500 leading-relaxed">
          Connecting families to organic farms across India — pure, trusted, and sustainably grown.
        </p>
      </div>

      {/* Mini trust pillars */}
      <div className="space-y-2.5">
        {[
          { icon: ShieldCheck, label: '100% Organic Certified',  color: 'text-forest-600', bg: 'bg-forest-50' },
          { icon: Users,       label: 'Women Empowered Farming', color: 'text-amber-700',  bg: 'bg-amber-50'  },
          { icon: Sprout,      label: 'No Middlemen',            color: 'text-forest-600', bg: 'bg-forest-50' },
        ].map(b => (
          <div key={b.label} className="flex items-center gap-3">
            <div className={`w-7 h-7 rounded-lg ${b.bg} flex items-center justify-center flex-shrink-0`}>
              <b.icon className={`w-3.5 h-3.5 ${b.color}`} />
            </div>
            <span className="text-xs font-body text-stone-600 font-medium">{b.label}</span>
          </div>
        ))}
      </div>
    </div>

    {/* Bottom tagline */}
    <div className="space-y-0.5">
      <p className="text-[10px] font-body text-stone-400 uppercase tracking-[0.18em]">PURE · ORGANIC · TRUSTED</p>
      <p className="text-[11px] font-body text-stone-300">© 2025 Graamo</p>
    </div>
  </div>
)

// ── Right: Rich visual storytelling panel with form overlay ──────────────────
const GraamoRightVisual: React.FC<{ children: React.ReactNode; title: string; subtitle: string; badge?: string }> = ({ children, title, subtitle, badge }) => (
  <div
    className="flex-1 relative overflow-hidden flex items-center justify-center py-8 px-6 lg:px-10 min-h-screen lg:min-h-0"
    style={{ background: 'linear-gradient(160deg, #fef3c7 0%, #fde68a 15%, #fbbf24 32%, #f59e0b 48%, #d97706 65%, #b45309 82%, #92400e 100%)' }}
  >
    {/* ── Layered atmospheric background ── */}
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {/* Sunrise glow from top-right */}
      <div
        className="absolute top-[-18%] right-[-8%] w-[75%] h-[70%] rounded-full animate-mesh-1"
        style={{ background: 'radial-gradient(ellipse, rgba(255,255,200,0.45) 0%, rgba(251,191,36,0.35) 25%, rgba(245,158,11,0.2) 50%, transparent 70%)', filter: 'blur(60px)' }}
      />
      {/* Warm earth glow bottom-left */}
      <div
        className="absolute bottom-[-20%] left-[-10%] w-[70%] h-[65%] rounded-full animate-mesh-2"
        style={{ background: 'radial-gradient(ellipse, rgba(120,53,15,0.6) 0%, rgba(92,40,14,0.4) 40%, transparent 68%)', filter: 'blur(70px)' }}
      />
      {/* Centre golden haze */}
      <div
        className="absolute top-[20%] left-[15%] w-[65%] h-[60%] rounded-full animate-mesh-3"
        style={{ background: 'radial-gradient(ellipse, rgba(255,230,100,0.22) 0%, transparent 60%)', filter: 'blur(50px)' }}
      />
      {/* Grain texture */}
      <div className="absolute inset-0 opacity-[0.06] bg-grain" />

      {/* ── SVG village field scenery ── */}
      <svg className="absolute bottom-0 left-0 w-full" viewBox="0 0 800 220" preserveAspectRatio="none" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Far field */}
        <ellipse cx="400" cy="220" rx="520" ry="80" fill="rgba(120,53,15,0.22)" />
        {/* Mid field */}
        <path d="M0 180 Q120 155 250 162 Q380 170 500 158 Q620 148 800 168 L800 220 L0 220Z" fill="rgba(101,44,10,0.28)" />
        {/* Near field rows */}
        <path d="M0 198 Q200 185 400 190 Q600 195 800 186 L800 220 L0 220Z" fill="rgba(78,34,8,0.35)" />
        {/* Field crop lines */}
        {[0,1,2,3,4,5,6,7].map(i => (
          <line key={i} x1={i * 115} y1="200" x2={i * 115 + 80} y2="175" stroke="rgba(180,83,9,0.18)" strokeWidth="1" />
        ))}
        {/* Village huts on horizon */}
        <path d="M90 165 L90 148 L102 138 L114 148 L114 165Z" fill="rgba(120,53,15,0.5)" />
        <path d="M102 138 L90 148 L114 148Z" fill="rgba(146,64,14,0.6)" />
        <rect x="99" y="152" width="6" height="13" fill="rgba(80,30,5,0.55)" />
        <path d="M220 168 L220 153 L230 144 L240 153 L240 168Z" fill="rgba(120,53,15,0.45)" />
        <path d="M230 144 L220 153 L240 153Z" fill="rgba(146,64,14,0.55)" />
        <path d="M680 162 L680 147 L692 137 L704 147 L704 162Z" fill="rgba(120,53,15,0.45)" />
        <path d="M692 137 L680 147 L704 147Z" fill="rgba(146,64,14,0.55)" />
        {/* Trees */}
        <rect x="148" y="150" width="3" height="22" fill="rgba(78,34,8,0.55)" />
        <ellipse cx="150" cy="148" rx="8" ry="10" fill="rgba(22,163,74,0.5)" />
        <rect x="338" y="154" width="3" height="18" fill="rgba(78,34,8,0.5)" />
        <ellipse cx="340" cy="152" rx="7" ry="9" fill="rgba(22,163,74,0.45)" />
        <rect x="568" y="152" width="3" height="20" fill="rgba(78,34,8,0.5)" />
        <ellipse cx="570" cy="150" rx="8" ry="10" fill="rgba(22,163,74,0.5)" />
        {/* Birds */}
        <path d="M290 60 Q295 55 300 60" stroke="rgba(120,53,15,0.45)" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        <path d="M310 50 Q315 44 320 50" stroke="rgba(120,53,15,0.4)" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        <path d="M530 40 Q535 34 540 40" stroke="rgba(120,53,15,0.35)" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      </svg>

      {/* ── Large farmer woman silhouette — bottom-right ── */}
      <div className="absolute bottom-0 right-[-2%] w-[44%] max-w-[280px] pointer-events-none select-none">
        <svg viewBox="0 0 220 380" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto drop-shadow-[0_10px_40px_rgba(0,0,0,0.25)]">
          {/* Ground shadow */}
          <ellipse cx="110" cy="365" rx="65" ry="18" fill="rgba(60,20,5,0.22)" />
          {/* Saree skirt */}
          <path d="M68 240 Q62 300 70 355 Q88 368 110 370 Q132 368 150 355 Q158 300 152 240 Q136 260 110 264 Q84 260 68 240Z" fill="#c2410c" opacity="0.9" />
          {/* Saree drape/pallu */}
          <path d="M74 160 Q58 180 52 210 Q48 235 58 250 Q66 235 70 210 Q74 185 80 165Z" fill="#fbbf24" opacity="0.82" />
          <path d="M80 165 Q72 190 70 215 Q68 235 68 240 Q78 228 82 210 Q86 190 88 168Z" fill="#f59e0b" opacity="0.7" />
          {/* Blouse / torso */}
          <path d="M84 148 Q84 180 88 200 Q98 210 110 212 Q122 210 132 200 Q136 180 136 148 Q124 158 110 160 Q96 158 84 148Z" fill="#b45309" opacity="0.92" />
          {/* Left arm down holding basket */}
          <path d="M84 152 Q68 170 62 200 Q60 220 64 240 Q72 228 76 208 Q80 185 88 164Z" fill="#c2714a" opacity="0.88" />
          {/* Right arm up (natural pose) */}
          <path d="M136 150 Q152 162 158 182 Q162 196 158 208 Q150 200 146 185 Q142 168 136 155Z" fill="#c2714a" opacity="0.88" />
          {/* Neck */}
          <rect x="106" y="128" width="8" height="18" rx="4" fill="#c2714a" />
          {/* Head */}
          <ellipse cx="110" cy="112" rx="24" ry="26" fill="#c2714a" />
          {/* Hair */}
          <ellipse cx="110" cy="97" rx="26" ry="16" fill="#1a0f0a" opacity="0.92" />
          <path d="M86 97 Q84 115 88 134" stroke="#1a0f0a" strokeWidth="5" strokeLinecap="round" opacity="0.85" />
          {/* Dupatta on head */}
          <path d="M84 95 Q90 82 110 80 Q130 82 136 95 Q128 88 110 86 Q92 88 84 95Z" fill="#fbbf24" opacity="0.78" />
          <path d="M84 95 Q76 106 74 122 Q76 118 84 110Z" fill="#fbbf24" opacity="0.55" />
          {/* Earring */}
          <circle cx="87" cy="113" r="2.5" fill="#fbbf24" opacity="0.9" />
          {/* Bindi */}
          <circle cx="110" cy="105" r="2.5" fill="#dc2626" opacity="0.9" />
          {/* Eyes */}
          <ellipse cx="103" cy="110" rx="3.5" ry="2.5" fill="#2d1a0e" />
          <ellipse cx="117" cy="110" rx="3.5" ry="2.5" fill="#2d1a0e" />
          <circle cx="104" cy="109" r="1" fill="white" opacity="0.7" />
          <circle cx="118" cy="109" r="1" fill="white" opacity="0.7" />
          {/* Smile */}
          <path d="M104 120 Q110 126 116 120" stroke="#9a4020" strokeWidth="1.8" strokeLinecap="round" fill="none" />
          {/* Basket of vegetables */}
          <ellipse cx="68" cy="238" rx="18" ry="10" fill="#92400e" opacity="0.85" />
          <ellipse cx="68" cy="230" rx="16" ry="7" fill="#b45309" opacity="0.78" />
          {/* Veggies in basket */}
          <circle cx="60" cy="226" r="5" fill="#dc2626" opacity="0.88" />
          <circle cx="70" cy="224" r="4.5" fill="#16a34a" opacity="0.88" />
          <circle cx="79" cy="227" r="4" fill="#f97316" opacity="0.88" />
          <path d="M70 224 L70 218" stroke="#16a34a" strokeWidth="1.5" />
          {/* Bangles */}
          <ellipse cx="64" cy="200" rx="5" ry="2" fill="none" stroke="#fbbf24" strokeWidth="2" opacity="0.85" />
          <ellipse cx="64" cy="205" rx="5" ry="2" fill="none" stroke="#f97316" strokeWidth="1.5" opacity="0.75" />
          {/* Necklace */}
          <path d="M97 130 Q110 140 123 130" stroke="#fbbf24" strokeWidth="1.8" fill="none" opacity="0.8" strokeLinecap="round" />
          <circle cx="110" cy="138" r="2" fill="#fbbf24" opacity="0.85" />
        </svg>
      </div>
    </div>

    {/* ── Graamo logo badge — top-left of right panel ── */}
    <Link
      to="/"
      className="absolute top-5 left-5 z-20 flex items-center gap-2 bg-white/[0.18] hover:bg-white/[0.28] backdrop-blur-lg border border-white/[0.30] rounded-2xl px-3 py-2 shadow-lg transition-all duration-300 lg:hidden"
    >
      <div className="w-7 h-7 rounded-xl bg-amber-900/80 flex items-center justify-center">
        <Leaf className="w-3.5 h-3.5 text-amber-200" />
      </div>
      <span className="font-display font-bold text-base text-white drop-shadow">Graamo</span>
    </Link>

    {/* ── Top-left storytelling content (desktop) ── */}
    <div className="absolute top-7 left-7 z-10 hidden lg:block max-w-[52%]">
      {/* Farm to home badge */}
      <div className="inline-flex items-center gap-2 bg-white/[0.18] backdrop-blur-md border border-white/[0.28] rounded-full px-3.5 py-1.5 mb-4 shadow-sm">
        <span className="text-sm leading-none">🌿</span>
        <span className="text-amber-100 text-[10px] font-bold font-body tracking-[0.18em] uppercase drop-shadow">Farm to Your Home</span>
      </div>

      {/* Hindi headline */}
      <h2
        className="font-display font-bold text-white leading-[1.05] drop-shadow-[0_2px_18px_rgba(0,0,0,0.45)] mb-3"
        style={{ fontSize: 'clamp(1.6rem, 2.8vw, 2.5rem)', textShadow: '0 2px 20px rgba(0,0,0,0.35)' }}
      >
        गांव से सीधे<br />आपके घर तक
      </h2>

      {/* Subtext */}
      <p className="text-amber-100/75 font-body text-[12px] leading-relaxed max-w-[210px]"
        style={{ textShadow: '0 1px 8px rgba(0,0,0,0.3)' }}>
        Pure, organic groceries sourced directly from trusted farmers across India.
      </p>
    </div>

    {/* ── Stats bottom-left (desktop) ── */}
    <div className="absolute bottom-7 left-7 z-10 hidden lg:flex items-center gap-3">
      {[
        { num: '50+',   label: 'Farmers',  emoji: '👩‍🌾' },
        { num: '2000+', label: 'Products', emoji: '🌿' },
        { num: '500+',  label: 'Families', emoji: '❤️' },
      ].map(({ num, label, emoji }) => (
        <div
          key={label}
          className="bg-white/[0.15] backdrop-blur-md border border-white/[0.22] rounded-xl px-3 py-2 text-center shadow-sm hover:bg-white/[0.22] transition-all duration-200"
        >
          <span className="text-sm leading-none block">{emoji}</span>
          <p className="text-white font-display font-bold text-sm leading-none mt-0.5 drop-shadow">{num}</p>
          <p className="text-amber-100/70 text-[9px] font-body mt-0.5">{label}</p>
        </div>
      ))}
      {/* Trust badges */}
      <div className="flex flex-col gap-1 ml-2">
        {[
          { icon: ShieldCheck, text: '100% Organic' },
          { icon: Users,       text: 'Women Empowered' },
          { icon: Sprout,      text: 'No Middlemen' },
        ].map(b => (
          <div key={b.text} className="flex items-center gap-1.5">
            <b.icon className="w-3 h-3 text-amber-200/80 flex-shrink-0 drop-shadow" />
            <span className="text-amber-100/70 text-[9px] font-body whitespace-nowrap" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>{b.text}</span>
          </div>
        ))}
      </div>
    </div>

    {/* ── Auth form — glassmorphism card ── */}
    <div className="relative z-20 w-full max-w-[400px]">
      <div
        className="bg-white/[0.88] backdrop-blur-2xl rounded-[24px] shadow-[0_8px_48px_rgba(0,0,0,0.22),0_2px_12px_rgba(0,0,0,0.12)] border border-white/[0.55] px-7 py-8"
        style={{ WebkitBackdropFilter: 'blur(24px)' }}
      >
        {/* Mobile logo (shown inside card on small screens) */}
        <div className="flex items-center gap-2 mb-6 lg:hidden">
          <div className="w-8 h-8 bg-gradient-to-br from-forest-600 to-forest-800 rounded-[10px] flex items-center justify-center shadow-btn">
            <Leaf className="w-4 h-4 text-white" />
          </div>
          <span className="font-display font-bold text-lg text-stone-900 tracking-tight">Graamo</span>
        </div>

        {/* Badge + Heading */}
        <div className="mb-6">
          {badge && (
            <div className="inline-flex items-center gap-1.5 mb-2">
              <div className="w-1.5 h-1.5 rounded-full bg-forest-500" />
              <p className="text-[11px] font-bold font-body text-forest-600 uppercase tracking-[0.15em]">{badge}</p>
            </div>
          )}
          <h1 className="font-display text-[1.65rem] font-bold text-stone-900 leading-tight mb-1">{title}</h1>
          <p className="text-stone-500 font-body text-[13px]">{subtitle}</p>
        </div>

        {children}
      </div>
    </div>
  </div>
)

// ── Auth Layout ───────────────────────────────────────────────────────────────
const AuthLayout: React.FC<{ children: React.ReactNode; title: string; subtitle: string; badge?: string }> = ({ children, title, subtitle, badge }) => (
  <div className="min-h-screen bg-stone-200 flex items-stretch">
    <div className="w-full flex flex-col lg:flex-row overflow-hidden lg:rounded-none">
      {/* ── LEFT: Clean minimal branding panel ── */}
      <GraamoLeftPanel />

      {/* ── RIGHT: Visual storytelling + form overlay ── */}
      <GraamoRightVisual title={title} subtitle={subtitle} badge={badge}>
        {children}
      </GraamoRightVisual>
    </div>
  </div>
)

// ── Login Page ────────────────────────────────────────────────────────────────
export const LoginPage: React.FC = () => {
  const { setAuth } = useAuthStore()
  const { setCart } = useCartStore()
  const { items: guestItems, clearCart: clearGuestCart } = useGuestCartStore()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/'

  const [step, setStep] = useState<'input' | 'otp'>('input')
  const [method, setMethod] = useState<'phone' | 'email'>('phone')
  const [identifier, setIdentifier] = useState('')
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [resendTimer, setResendTimer] = useState(0)

  const startTimer = () => {
    setResendTimer(30)
    const interval = setInterval(() => {
      setResendTimer(t => { if (t <= 1) { clearInterval(interval); return 0 } return t - 1 })
    }, 1000)
  }

  const handleSendOtp = async () => {
    if (!identifier.trim()) { toast.error('Enter your phone or email'); return }
    setLoading(true)
    try {
      await authApi.sendOtp(identifier)
      setStep('otp')
      startTimer()
      toast.success('OTP sent!')
    } catch { toast.error('Failed to send OTP. Try again.') }
    finally { setLoading(false) }
  }

  const handleVerifyOtp = async () => {
    if (otp.length < 6) { toast.error('Enter the 6-digit OTP'); return }
    setLoading(true)
    try {
      const res = await authApi.verifyOtp(identifier, otp)
      setAuth(res.user, res.accessToken, res.refreshToken)
      trackEvent('login_success', {
        method,
        user_role: res.user.role,
      })
      // Merge guest cart into user cart if guest had items
      if (guestItems.length > 0) {
        try {
          const mergedCart = await cartApi.merge(
            guestItems.map(i => ({ productId: i.productId, quantity: i.quantity, variantLabel: i.variantLabel }))
          )
          if (mergedCart) setCart(mergedCart)
          clearGuestCart()
        } catch {
          // Merge failed silently — user cart is unaffected
        }
      }
      toast.success(`Welcome back, ${res.user.name}!`)
      navigate(from, { replace: true })
    } catch { toast.error('Invalid OTP. Please try again.') }
    finally { setLoading(false) }
  }

  return (
    <>
      <SEO title="Log In" description="Sign in to your Graamo account to shop fresh organic produce." noIndex />
      <AuthLayout title="Welcome back" subtitle="Log in with your phone or email" badge="Sign In">
      {step === 'input' ? (
        <div className="space-y-4 animate-fade-up">
          <div className="flex gap-2 p-1 bg-gray-100 rounded-xl">
            <button
              onClick={() => { setMethod('phone'); setIdentifier('') }}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition font-body flex items-center justify-center gap-1.5 ${method === 'phone' ? 'bg-white shadow text-forest-700' : 'text-stone-500'}`}
            >
              <Phone className="w-4 h-4" /> Mobile Number
            </button>
            <button
              onClick={() => { setMethod('email'); setIdentifier('') }}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition font-body flex items-center justify-center gap-1.5 ${method === 'email' ? 'bg-white shadow text-forest-700' : 'text-stone-500'}`}
            >
              <Mail className="w-4 h-4" /> Email Address
            </button>
          </div>

          {method === 'phone' ? (
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-stone-700 font-body">Mobile Number</label>
              <div className="flex gap-2">
                <div className="flex items-center gap-1.5 px-3 bg-stone-100 border border-stone-200 rounded-xl text-sm font-body text-stone-600 font-medium flex-shrink-0">
                  🇮🇳 +91
                </div>
                <div className="relative flex-1">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                  <input
                    type="tel"
                    placeholder="98765 43210"
                    value={identifier}
                    onChange={e => setIdentifier(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSendOtp()}
                    maxLength={10}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-stone-200 text-sm font-body bg-stone-50 outline-none transition focus:bg-white focus:ring-2 focus:ring-forest-400/30 focus:border-forest-500"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-stone-700 font-body">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={identifier}
                  onChange={e => setIdentifier(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSendOtp()}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-stone-200 text-sm font-body bg-stone-50 outline-none transition focus:bg-white focus:ring-2 focus:ring-forest-400/30 focus:border-forest-500"
                />
              </div>
            </div>
          )}

          <button
            onClick={handleSendOtp}
            disabled={loading}
            className="w-full py-3.5 rounded-xl font-body font-semibold text-sm text-white flex items-center justify-center gap-2 transition-all duration-200 hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)', boxShadow: '0 4px 16px rgba(22,163,74,0.40)' }}
          >
            {loading
              ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              : <><span>Send OTP {method === 'phone' ? 'to Mobile' : 'to Email'}</span><ArrowRight className="w-4 h-4" /></>}
          </button>

          <p className="text-center text-sm text-stone-500 font-body">
            New user?{' '}
            <Link to="/register" className="text-forest-700 font-semibold hover:underline">Sign up</Link>
          </p>
        </div>
      ) : (
        <div className="space-y-6 animate-fade-up">
          <button onClick={() => setStep('input')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition font-body">
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
          <div className="text-center">
            <p className="text-gray-600 font-body">We sent a 6-digit OTP to</p>
            <p className="font-semibold text-gray-900 font-body">{identifier}</p>
          </div>
          <OtpInput onChange={setOtp} />
          <button
            onClick={handleVerifyOtp}
            disabled={loading}
            className="w-full py-3.5 rounded-xl font-body font-semibold text-sm text-white flex items-center justify-center gap-2 transition-all duration-200 hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)', boxShadow: '0 4px 16px rgba(22,163,74,0.40)' }}
          >
            {loading
              ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              : <><CheckCircle2 className="w-4 h-4" /><span>Verify & Login</span></>}
          </button>
          <p className="text-center text-sm font-body">
            {resendTimer > 0 ? (
              <span className="text-stone-500">Resend OTP in {resendTimer}s</span>
            ) : (
              <button onClick={handleSendOtp} className="text-forest-700 font-semibold hover:underline">
                Resend OTP
              </button>
            )}
          </p>
          <p className="text-center text-sm text-stone-500 font-body">
            New user?{' '}
            <Link to="/register" className="text-forest-700 font-semibold hover:underline">Sign up</Link>
          </p>
        </div>
      )}
    </AuthLayout>
    </>
  )
}

// ── Register Page ─────────────────────────────────────────────────────────────
export const RegisterPage: React.FC = () => {
  const { setAuth } = useAuthStore()
  const { setCart } = useCartStore()
  const { items: guestItems, clearCart: clearGuestCart } = useGuestCartStore()
  const navigate = useNavigate()

  // Form fields
  const [name, setName]           = useState('')
  const [method, setMethod]       = useState<'phone' | 'email'>('phone')
  const [phone, setPhone]         = useState('')
  const [email, setEmail]         = useState('')

  // Derived identifier based on method
  const identifier = method === 'phone'
    ? phone.replace(/\D/g, '').replace(/^(\d{10})$/, '+91$1')
    : email.trim()

  // OTP flow
  const [step, setStep]           = useState<'form' | 'otp' | 'done'>('form')
  const [otp, setOtp]             = useState('')

  // Loading
  const [sending, setSending]     = useState(false)
  const [verifying, setVerifying] = useState(false)

  // Resend timer
  const [resendTimer, setResendTimer] = useState(0)

  // Errors
  const [nameError, setNameError]           = useState('')
  const [identifierError, setIdentifierError] = useState('')
  const [alreadyRegistered, setAlreadyRegistered] = useState(false)

  const startTimer = () => {
    setResendTimer(30)
    const iv = setInterval(() => setResendTimer(t => { if (t <= 1) { clearInterval(iv); return 0 } return t - 1 }), 1000)
  }

  const validateIdentifier = () => {
    if (method === 'phone') {
      const digits = phone.replace(/\D/g, '')
      if (digits.length !== 10) return 'Enter a valid 10-digit mobile number'
    } else {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return 'Enter a valid email address'
    }
    return ''
  }

  const handleSendOtp = async () => {
    const nErr = name.trim().length < 2 ? 'Name must be at least 2 characters' : ''
    const iErr = validateIdentifier()
    setNameError(nErr)
    setIdentifierError(iErr)
    setAlreadyRegistered(false)
    if (nErr || iErr) return

    setSending(true)
    try {
      await authApi.sendOtp(identifier, 'register')
      setStep('otp')
      startTimer()
      toast.success(method === 'phone' ? 'OTP sent to your mobile!' : 'OTP sent to your email!')
    } catch (e: any) {
      const msg: string = e?.response?.data?.message ?? ''
      if (msg === 'ALREADY_REGISTERED' || e?.response?.status === 409) {
        setAlreadyRegistered(true)
      } else {
        toast.error('Failed to send OTP. Try again.')
      }
    } finally { setSending(false) }
  }

  const handleVerifyOtp = async () => {
    if (otp.length < 6) { toast.error('Enter the 6-digit OTP'); return }
    setVerifying(true)
    try {
      const res = await authApi.verifyOtp(identifier, otp, name.trim())
      setAuth(res.user, res.accessToken, res.refreshToken)
      trackEvent('register_success', { method, user_role: res.user.role })
      if (guestItems.length > 0) {
        try {
          const mergedCart = await cartApi.merge(
            guestItems.map(i => ({ productId: i.productId, quantity: i.quantity }))
          )
          if (mergedCart) setCart(mergedCart)
          clearGuestCart()
        } catch { /* silent */ }
      }
      const msg = `Welcome to Graamo, ${res.user.name}! 🌱`
      toast.success(msg)
      navigate('/', { replace: true, state: { registrationSuccess: true, welcomeMessage: msg } })
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Invalid OTP. Please try again.')
    } finally { setVerifying(false) }
  }

  const handleResendOtp = async () => {
    setSending(true)
    try {
      await authApi.sendOtp(identifier, 'register')
      startTimer()
      toast.success('OTP resent!')
    } catch (e: any) {
      const msg: string = e?.response?.data?.message ?? ''
      if (msg === 'ALREADY_REGISTERED' || e?.response?.status === 409) {
        setAlreadyRegistered(true)
        setStep('form')
      } else {
        toast.error('Failed to resend OTP.')
      }
    } finally { setSending(false) }
  }

  const switchMethod = (m: 'phone' | 'email') => {
    setMethod(m)
    setPhone('')
    setEmail('')
    setOtp('')
    setStep('form')
    setAlreadyRegistered(false)
    setNameError('')
    setIdentifierError('')
    setResendTimer(0)
  }

  return (
    <>
      <SEO title="Create Account" description="Join Graamo to shop fresh certified organic produce directly from Indian farmers." noIndex />
      <AuthLayout title="Create your Graamo account" subtitle="Join thousands of health-conscious families" badge="New Account">

        {/* Step indicator */}
        <div className="flex items-center gap-1.5 mb-6">
          {([{ idx: 0, label: 'Verify' }, { idx: 1, label: 'Done' }] as const).map((s, i, arr) => (
            <React.Fragment key={s.idx}>
              <div className="flex flex-col items-center gap-0.5">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold font-body transition-all duration-300
                  ${step === 'done' || (step === 'otp' && s.idx === 0)
                    ? 'bg-forest-600 text-white shadow-[0_0_0_3px_rgba(30,110,36,0.15)]'
                    : s.idx === 0 && step === 'form'
                    ? 'bg-forest-500 text-white ring-2 ring-forest-300/60 shadow-[0_2px_8px_rgba(22,163,74,0.35)]'
                    : s.idx === 1 && step === 'otp'
                    ? 'bg-forest-500 text-white ring-2 ring-forest-300/60 shadow-[0_2px_8px_rgba(22,163,74,0.35)]'
                    : 'bg-stone-100 text-stone-400'}`}>
                  {step === 'done' ? <CheckCircle2 className="w-4 h-4" /> : s.idx + 1}
                </div>
                <span className={`text-[10px] font-body font-medium hidden sm:block transition-colors duration-300
                  ${(step === 'form' && s.idx === 0) || (step === 'otp' && s.idx <= 1) || step === 'done' ? 'text-forest-700' : 'text-stone-400'}`}>{s.label}</span>
              </div>
              {i < arr.length - 1 && (
                <div className="flex-1 relative h-0.5 rounded-full bg-stone-100 overflow-hidden">
                  <div className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ease-out ${step === 'otp' || step === 'done' ? 'w-full bg-forest-500' : 'w-0'}`} />
                </div>
              )}
            </React.Fragment>
          ))}
        </div>

        {/* ── STEP: form ── */}
        {step === 'form' && (
          <div className="space-y-4 animate-fade-up">

            {/* Name */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-stone-700 font-body">Full Name <span className="text-red-400">*</span></label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                <input
                  type="text"
                  placeholder="Priya Sharma"
                  value={name}
                  onChange={e => { setName(e.target.value); if (nameError) setNameError('') }}
                  className={`w-full pl-10 pr-4 py-3 rounded-xl border text-sm font-body bg-stone-50 outline-none transition focus:bg-white focus:ring-2 focus:ring-forest-400/30
                    ${nameError ? 'border-red-400' : 'border-stone-200 focus:border-forest-500'}`}
                />
              </div>
              {nameError && <p className="text-xs text-red-500 font-body flex items-center gap-1">⚠ {nameError}</p>}
            </div>

            {/* Method toggle */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-stone-700 font-body">Verify with <span className="text-stone-400 font-normal">(choose one)</span></label>
              <div className="relative flex p-1 bg-stone-100 rounded-xl overflow-hidden">
                <div
                  className="absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-[10px] bg-white shadow-sm transition-all duration-300 ease-out"
                  style={{ left: method === 'phone' ? '4px' : 'calc(50%)' }}
                />
                <button
                  type="button"
                  onClick={() => switchMethod('phone')}
                  className={`relative z-10 flex-1 py-2.5 text-sm font-semibold rounded-[10px] font-body flex items-center justify-center gap-2 transition-colors duration-200
                    ${method === 'phone' ? 'text-forest-700' : 'text-stone-500 hover:text-stone-700'}`}
                >
                  <Phone className="w-4 h-4" /> Mobile Number
                </button>
                <button
                  type="button"
                  onClick={() => switchMethod('email')}
                  className={`relative z-10 flex-1 py-2.5 text-sm font-semibold rounded-[10px] font-body flex items-center justify-center gap-2 transition-colors duration-200
                    ${method === 'email' ? 'text-forest-700' : 'text-stone-500 hover:text-stone-700'}`}
                >
                  <Mail className="w-4 h-4" /> Email Address
                </button>
              </div>
            </div>

            {/* Phone or Email input */}
            {method === 'phone' ? (
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-stone-700 font-body">Mobile Number <span className="text-red-400">*</span></label>
                <div className="flex gap-2">
                  <div className="flex items-center gap-1.5 px-3 bg-stone-100 border border-stone-200 rounded-xl text-sm font-body text-stone-600 font-medium flex-shrink-0">
                    🇮🇳 +91
                  </div>
                  <div className="relative flex-1">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                    <input
                      type="tel"
                      placeholder="98765 43210"
                      value={phone}
                      onChange={e => { setPhone(e.target.value); if (identifierError) setIdentifierError(''); setAlreadyRegistered(false) }}
                      onKeyDown={e => e.key === 'Enter' && handleSendOtp()}
                      maxLength={10}
                      className={`w-full pl-10 pr-4 py-3 rounded-xl border text-sm font-body bg-stone-50 outline-none transition focus:bg-white focus:ring-2 focus:ring-forest-400/30
                        ${identifierError ? 'border-red-400' : 'border-stone-200 focus:border-forest-500'}`}
                    />
                  </div>
                </div>
                {identifierError && <p className="text-xs text-red-500 font-body flex items-center gap-1">⚠ {identifierError}</p>}
              </div>
            ) : (
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-stone-700 font-body">Email Address <span className="text-red-400">*</span></label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={e => { setEmail(e.target.value); if (identifierError) setIdentifierError(''); setAlreadyRegistered(false) }}
                    onKeyDown={e => e.key === 'Enter' && handleSendOtp()}
                    className={`w-full pl-10 pr-4 py-3 rounded-xl border text-sm font-body bg-stone-50 outline-none transition focus:bg-white focus:ring-2 focus:ring-forest-400/30
                      ${identifierError ? 'border-red-400' : 'border-stone-200 focus:border-forest-500'}`}
                  />
                </div>
                {identifierError && <p className="text-xs text-red-500 font-body flex items-center gap-1">⚠ {identifierError}</p>}
              </div>
            )}

            {/* Already registered inline error */}
            {alreadyRegistered && (
              <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 space-y-1.5 animate-fade-up">
                <p className="text-sm font-body text-amber-800 font-medium flex items-start gap-2">
                  <span className="text-base leading-none mt-0.5">⚠️</span>
                  <span>
                    {method === 'phone'
                      ? 'This mobile number is already registered. Please log in instead.'
                      : 'This email is already associated with an account. Try logging in.'}
                  </span>
                </p>
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold font-body text-forest-700 hover:text-forest-900 hover:underline transition-colors"
                >
                  Go to Login <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}

            {/* Send OTP button */}
            <button
              onClick={handleSendOtp}
              disabled={sending}
              className="w-full py-3.5 rounded-xl font-body font-semibold text-sm text-white flex items-center justify-center gap-2 transition-all duration-200 hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)', boxShadow: '0 4px 16px rgba(22,163,74,0.40)' }}
            >
              {sending
                ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                : <><span>Send OTP {method === 'phone' ? 'to Mobile' : 'to Email'}</span><ArrowRight className="w-4 h-4" /></>}
            </button>

            <p className="text-center text-sm text-stone-500 font-body">
              Already have an account?{' '}
              <Link to="/login" className="text-forest-700 font-semibold hover:underline">Log in</Link>
            </p>
          </div>
        )}

        {/* ── STEP: otp ── */}
        {step === 'otp' && (
          <div className="space-y-5 animate-fade-up">
            <button onClick={() => { setStep('form'); setOtp('') }} className="flex items-center gap-1 text-sm text-stone-500 hover:text-stone-700 transition font-body">
              <ChevronLeft className="w-4 h-4" /> Back
            </button>

            <div className="text-center space-y-1.5">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3 ${method === 'phone' ? 'bg-forest-50 border border-forest-200' : 'bg-blue-50 border border-blue-200'}`}>
                {method === 'phone'
                  ? <Phone className="w-5 h-5 text-forest-600" />
                  : <Mail className="w-5 h-5 text-blue-600" />}
              </div>
              <p className="font-semibold text-stone-800 font-body">
                Verify your {method === 'phone' ? 'mobile' : 'email'}
              </p>
              <p className="text-sm text-stone-500 font-body">
                OTP sent to{' '}
                <strong className="text-stone-700">
                  {method === 'phone' ? `+91 ${phone}` : email}
                </strong>
              </p>
            </div>

            <OtpInput onChange={setOtp} />

            <button
              onClick={handleVerifyOtp}
              disabled={verifying || otp.length < 6}
              className="w-full py-3.5 rounded-xl font-body font-semibold text-sm text-white flex items-center justify-center gap-2 transition-all duration-200 hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)', boxShadow: '0 4px 16px rgba(22,163,74,0.40)' }}
            >
              {verifying
                ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                : <><CheckCircle2 className="w-4 h-4" /><span>Verify & Create Account</span></>}
            </button>

            <p className="text-center text-sm font-body">
              {resendTimer > 0
                ? <span className="text-stone-500">Resend OTP in <strong>{resendTimer}s</strong></span>
                : <button onClick={handleResendOtp} disabled={sending} className="text-forest-700 font-semibold hover:underline disabled:opacity-60">
                    {sending ? 'Sending…' : 'Resend OTP'}
                  </button>}
            </p>

            <p className="text-center text-sm text-stone-500 font-body">
              Already have an account?{' '}
              <Link to="/login" className="text-forest-700 font-semibold hover:underline">Log in</Link>
            </p>
          </div>
        )}

        {/* Trust badges */}
        <div className="flex items-center justify-center gap-4 mt-6 pt-5 border-t border-stone-100">
          {[
            { icon: <ShieldCheck className="w-3.5 h-3.5 text-forest-600" />, label: 'Direct Farmers' },
            { icon: <Sprout className="w-3.5 h-3.5 text-forest-600" />, label: '100% Organic' },
            { icon: <Truck className="w-3.5 h-3.5 text-forest-600" />, label: 'Same Day' },
          ].map(b => (
            <div key={b.label} className="flex items-center gap-1 text-xs font-body text-stone-400">
              {b.icon}<span>{b.label}</span>
            </div>
          ))}
        </div>

      </AuthLayout>
    </>
  )
}
