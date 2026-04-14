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

// ── Shared Animated Branding Panel ───────────────────────────────────────────
const GraamoBrandingPanel: React.FC = () => (
  <div
    className="flex-1 relative overflow-hidden flex-col justify-between py-9 px-9 hidden lg:flex"
    style={{ background: 'linear-gradient(155deg, #78350f 0%, #92400e 12%, #b45309 28%, #d97706 45%, #f59e0b 62%, #fbbf24 78%, #fcd34d 100%)' }}
  >
    {/* ── Layered background: sunrise village fields ── */}
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {/* Warm sunrise glow top */}
      <div
        className="absolute top-[-12%] left-[-5%] w-[70%] h-[60%] rounded-full animate-mesh-1"
        style={{ background: 'radial-gradient(ellipse, rgba(255,255,180,0.25) 0%, rgba(251,191,36,0.35) 30%, rgba(180,83,9,0.18) 55%, transparent 75%)', filter: 'blur(68px)' }}
      />
      {/* Deep earth glow bottom */}
      <div
        className="absolute bottom-[-15%] right-[-5%] w-[60%] h-[60%] rounded-full animate-mesh-2"
        style={{ background: 'radial-gradient(ellipse, rgba(120,53,15,0.55) 0%, rgba(92,40,14,0.35) 45%, transparent 70%)', filter: 'blur(72px)' }}
      />
      {/* Gold accent center */}
      <div
        className="absolute top-[30%] right-[4%] w-[45%] h-[45%] rounded-full animate-mesh-3"
        style={{ background: 'radial-gradient(ellipse, rgba(255,236,153,0.18) 0%, transparent 65%)', filter: 'blur(48px)' }}
      />
      {/* Subtle grain */}
      <div className="absolute inset-0 opacity-[0.04] bg-grain" />
      {/* Horizontal field-row lines */}
      <div
        className="absolute inset-0 opacity-[0.05]"
        style={{ backgroundImage: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.5) 0px, transparent 1px, transparent 28px)', backgroundSize: '100% 28px' }}
      />
    </div>

    {/* ── Logo — glassmorphism badge ── */}
    <Link
      to="/"
      className="relative z-10 self-start flex items-center gap-2.5 bg-black/[0.12] hover:bg-black/[0.20] backdrop-blur-md border border-white/[0.22] rounded-2xl px-3 py-2 shadow-lg transition-all duration-300 group"
    >
      <div className="relative w-8 h-8 flex-shrink-0">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-800/90 to-stone-900/90 flex items-center justify-center shadow-inner border border-white/10">
          <Leaf className="w-4 h-4 text-amber-300 drop-shadow" />
        </div>
        <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-500/90 border border-amber-900 shadow-sm" />
      </div>
      <div>
        <span className="font-display font-bold text-lg text-white leading-none block drop-shadow">Graamo</span>
        <span className="text-amber-200/80 text-[9px] font-body font-semibold tracking-[0.18em] uppercase leading-none">Farm · Home</span>
      </div>
    </Link>

    {/* ── Hero section: woman farmer + headline ── */}
    <div className="relative z-10 flex items-end gap-0">
      {/* Text block (left) */}
      <div className="flex-1 space-y-4 pb-2">
        {/* Direct farm badge */}
        <div className="inline-flex items-center gap-2 bg-black/[0.15] border border-white/[0.22] rounded-full px-3.5 py-1.5">
          <span className="text-base leading-none">🌿</span>
          <span className="text-amber-100/90 text-[10px] font-bold font-body tracking-[0.18em] uppercase">Direct Farm to Home</span>
        </div>

        {/* Hindi headline */}
        <h2
          className="text-white font-display font-bold leading-[1.05] drop-shadow-[0_2px_14px_rgba(0,0,0,0.4)]"
          style={{ fontSize: 'clamp(2rem, 3.5vw, 2.9rem)' }}
        >
          गांव से सीधे<br />आपके घर तक
        </h2>

        {/* Subtext */}
        <p className="text-amber-100/65 font-body text-[13px] leading-relaxed max-w-[220px]">
          Pure, organic groceries sourced directly from trusted farmers across India.
        </p>
      </div>

      {/* Rural woman farmer illustration */}
      <div className="relative flex-shrink-0 w-[140px] self-end">
        <div
          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[130%] h-[85%] rounded-full"
          style={{ background: 'radial-gradient(ellipse, rgba(255,220,100,0.25) 0%, rgba(180,83,9,0.15) 40%, transparent 70%)', filter: 'blur(18px)' }}
        />
        <svg viewBox="0 0 140 220" fill="none" xmlns="http://www.w3.org/2000/svg" className="relative w-full h-auto drop-shadow-[0_8px_24px_rgba(0,0,0,0.3)]">
          <ellipse cx="70" cy="185" rx="36" ry="14" fill="rgba(80,30,5,0.3)" />
          <path d="M44 148 Q50 195 70 198 Q90 195 96 148 Q82 158 70 160 Q58 158 44 148Z" fill="#c2410c" opacity="0.92" />
          <path d="M54 90 Q40 108 36 128 Q34 142 44 148 Q52 140 58 130 Q58 110 62 98Z" fill="#ea580c" opacity="0.85" />
          <path d="M58 88 Q58 110 62 120 Q70 124 78 120 Q82 110 82 88 Q76 84 70 83 Q64 84 58 88Z" fill="#9a3412" opacity="0.9" />
          <path d="M78 92 Q88 100 96 112 Q100 126 96 140 Q100 148 104 148 Q108 138 106 122 Q102 104 94 92Z" fill="#b45309" opacity="0.55" />
          <rect x="66" y="72" width="8" height="14" rx="4" fill="#c2714a" />
          <ellipse cx="70" cy="60" rx="16" ry="18" fill="#c2714a" />
          <ellipse cx="65" cy="55" rx="7" ry="8" fill="rgba(255,180,100,0.22)" />
          <ellipse cx="64" cy="58" rx="2.8" ry="2" fill="#2d1a0e" />
          <ellipse cx="76" cy="58" rx="2.8" ry="2" fill="#2d1a0e" />
          <circle cx="65" cy="57" r="0.8" fill="white" opacity="0.8" />
          <circle cx="77" cy="57" r="0.8" fill="white" opacity="0.8" />
          <path d="M65 66 Q70 70 75 66" stroke="#9a4020" strokeWidth="1.2" strokeLinecap="round" fill="none" />
          <ellipse cx="70" cy="62" rx="1.5" ry="1" fill="rgba(100,40,10,0.3)" />
          <circle cx="70" cy="50" r="2" fill="#dc2626" opacity="0.9" />
          <ellipse cx="70" cy="46" rx="17" ry="12" fill="#1a0f0a" />
          <path d="M53 44 Q55 28 70 26 Q85 28 87 44 Q80 38 70 37 Q60 38 53 44Z" fill="#d97706" opacity="0.88" />
          <path d="M53 44 Q46 52 44 64 Q42 74 46 82 Q50 86 54 84 Q50 74 52 62 Q54 50 58 44Z" fill="#d97706" opacity="0.6" />
          <path d="M58 92 Q44 104 40 118 Q42 124 46 122 Q50 110 60 98Z" fill="#c2714a" />
          <path d="M82 92 Q94 100 96 114 Q94 120 90 118 Q88 106 80 96Z" fill="#c2714a" />
          <ellipse cx="43" cy="120" rx="4" ry="2" fill="none" stroke="#fcd34d" strokeWidth="1.5" opacity="0.8" />
          <ellipse cx="43" cy="123" rx="4" ry="2" fill="none" stroke="#f97316" strokeWidth="1" opacity="0.7" />
          <path d="M100 140 Q108 120 116 110 Q120 106 118 116 Q114 126 108 136 Q106 140 100 140Z" fill="rgba(74,222,128,0.75)" />
          <path d="M100 140 Q112 130 122 126 Q126 124 122 130 Q116 136 108 140 Q104 142 100 140Z" fill="rgba(34,197,94,0.6)" />
          <line x1="100" y1="140" x2="118" y2="112" stroke="rgba(74,222,128,0.5)" strokeWidth="1" />
        </svg>
      </div>
    </div>

    {/* ── Stats grid ── */}
    <div className="relative z-10">
      <div className="grid grid-cols-3 gap-2 mb-4">
        {[
          { num: '50+',   label: 'Farmers',  emoji: '👩‍🌾' },
          { num: '2000+', label: 'Products', emoji: '🌿' },
          { num: '500+',  label: 'Families', emoji: '❤️' },
        ].map(({ num, label, emoji }) => (
          <div
            key={label}
            className="bg-black/[0.12] hover:bg-black/[0.20] backdrop-blur-sm rounded-xl p-3 text-center border border-white/[0.18] transition-all duration-200 hover:border-white/[0.32]"
          >
            <span className="text-base leading-none block mb-0.5">{emoji}</span>
            <p className="text-white font-display font-bold text-base leading-none drop-shadow">{num}</p>
            <p className="text-amber-100/65 text-[10px] font-body mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Trust badges row */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
        {[
          { icon: ShieldCheck, text: '100% Organic' },
          { icon: Users,       text: 'Women Empowered Farming' },
          { icon: Sprout,      text: 'No Middlemen' },
        ].map(b => (
          <div key={b.text} className="flex items-center gap-1.5">
            <b.icon className="w-3 h-3 text-amber-200/80 flex-shrink-0" />
            <span className="text-amber-100/65 text-[10px] font-body whitespace-nowrap">{b.text}</span>
          </div>
        ))}
      </div>
    </div>
  </div>
)

// ── Auth Layout ───────────────────────────────────────────────────────────────
const AuthLayout: React.FC<{ children: React.ReactNode; title: string; subtitle: string; badge?: string }> = ({ children, title, subtitle, badge }) => (
  <div className="min-h-screen bg-stone-200 flex items-center justify-center p-3 sm:p-6 lg:p-10">
    <div className="w-full max-w-[1060px] bg-white rounded-[24px] lg:rounded-[28px] shadow-auth overflow-hidden flex flex-col lg:flex-row lg:min-h-[600px]">

      {/* ── LEFT: Animated branding panel ── */}
      <GraamoBrandingPanel />

      {/* ── RIGHT: Form panel ── */}
      <div className="lg:w-[460px] flex-shrink-0 flex flex-col bg-white px-8 py-10 sm:px-12 lg:justify-center">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 mb-8">
          <div className="w-9 h-9 bg-forest-700 rounded-[10px] flex items-center justify-center shadow-sm">
            <Leaf className="w-5 h-5 text-white" />
          </div>
          <span className="font-display font-bold text-xl text-stone-800 tracking-tight">Graamo</span>
        </Link>

        {/* Badge + Heading */}
        <div className="mb-7">
          {badge && (
            <div className="inline-flex items-center gap-1.5 mb-2">
              <div className="w-1.5 h-1.5 rounded-full bg-forest-500" />
              <p className="text-[11px] font-bold font-body text-forest-600 uppercase tracking-[0.15em]">{badge}</p>
            </div>
          )}
          <h1 className="font-display text-[1.9rem] font-bold text-stone-900 leading-tight mb-1.5">{title}</h1>
          <p className="text-stone-500 font-body text-[14px]">{subtitle}</p>
        </div>

        {children}
      </div>
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
            guestItems.map(i => ({ productId: i.productId, quantity: i.quantity }))
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
