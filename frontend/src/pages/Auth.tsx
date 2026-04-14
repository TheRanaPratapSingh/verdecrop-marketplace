import React, { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Leaf, Phone, Mail, ArrowRight, ChevronLeft, CheckCircle2, ShieldCheck, Truck, Sprout, User } from 'lucide-react'
import { authApi, cartApi } from '../services/api'
import { useAuthStore, useCartStore, useGuestCartStore } from '../store'
import { SEO } from '../components/SEO'
import { Button, Input } from '../components/ui'
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
    className="flex-1 relative overflow-hidden flex-col justify-between py-10 px-10 hidden lg:flex"
    style={{ background: 'linear-gradient(150deg, #071c0a 0%, #0d3012 18%, #14532d 48%, #165d2a 75%, #186e30 100%)' }}
  >
    {/* ── Animated mesh blobs ── */}
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      <div
        className="absolute top-[-20%] left-[-10%] w-[72%] h-[72%] rounded-full animate-mesh-1"
        style={{ background: 'radial-gradient(circle, rgba(22,163,74,0.55) 0%, rgba(20,128,61,0.18) 45%, transparent 70%)', filter: 'blur(88px)' }}
      />
      <div
        className="absolute bottom-[-22%] right-[-10%] w-[65%] h-[65%] rounded-full animate-mesh-2"
        style={{ background: 'radial-gradient(circle, rgba(46,160,67,0.48) 0%, rgba(22,101,52,0.18) 45%, transparent 70%)', filter: 'blur(76px)' }}
      />
      <div
        className="absolute top-[38%] right-[12%] w-[42%] h-[42%] rounded-full animate-mesh-3"
        style={{ background: 'radial-gradient(circle, rgba(134,239,172,0.22) 0%, transparent 70%)', filter: 'blur(56px)' }}
      />
    </div>

    {/* ── Logo ── */}
    <Link to="/" className="relative z-10 flex items-center gap-2.5 self-start">
      <div className="w-10 h-10 bg-white/15 rounded-[12px] flex items-center justify-center border border-white/20 backdrop-blur-sm shadow-lg">
        <Leaf className="w-5 h-5 text-white" />
      </div>
      <span className="font-display font-bold text-xl text-white/90 tracking-tight">Graamo</span>
    </Link>

    {/* ── Center content ── */}
    <div className="relative z-10 space-y-7">
      <div>
        <div className="inline-flex items-center gap-2 bg-white/10 border border-white/15 rounded-full px-3.5 py-1.5 mb-5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
          <span className="text-emerald-200/90 text-[11px] font-bold font-body tracking-widest uppercase">Direct Farm-to-Home</span>
        </div>
        <h2 className="text-white font-display text-[3rem] font-bold leading-[1.1] mb-3 drop-shadow-sm">
          गांव से सीधे<br />आपके घर तक
        </h2>
        <p className="text-emerald-200/65 font-body text-sm leading-relaxed max-w-[260px]">
          Pure, organic groceries sourced directly from trusted farmers across India.
        </p>
      </div>

      {/* Floating Graamo order preview card */}
      <div className="bg-white/[0.08] backdrop-blur-xl border border-white/12 rounded-[20px] p-5 shadow-2xl max-w-[268px] ml-auto">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 bg-forest-500/70 rounded-xl flex items-center justify-center border border-white/10">
            <Leaf className="w-4 h-4 text-white" />
          </div>
          <span className="text-white/90 text-sm font-semibold font-body">Graamo</span>
          <span className="ml-auto flex items-center gap-1 text-[10px] text-emerald-300 font-body font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" /> Live
          </span>
        </div>
        <p className="text-white/50 text-[11px] font-body mb-0.5">Today's basket</p>
        <p className="text-white font-display font-bold text-[1.6rem] leading-tight mb-4">₹847.50</p>
        {[
          { emoji: '🥦', name: 'Organic Vegetables', price: '₹340' },
          { emoji: '🥛', name: 'A2 Cow Milk · 1L',  price: '₹180' },
          { emoji: '🍅', name: 'Farm Tomatoes',       price: '₹89' },
        ].map(item => (
          <div key={item.name} className="flex items-center justify-between bg-white/[0.07] rounded-xl px-3 py-2 mb-1.5 last:mb-0">
            <div className="flex items-center gap-2">
              <span className="text-base leading-none">{item.emoji}</span>
              <span className="text-white/80 text-xs font-body">{item.name}</span>
            </div>
            <span className="text-emerald-300 text-xs font-semibold font-body">{item.price}</span>
          </div>
        ))}
        <div className="mt-3 pt-3 border-t border-white/10 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
          <span className="text-emerald-300/75 text-xs font-body">Delivered in 2 hours</span>
        </div>
      </div>
    </div>

    {/* ── Stats + badges ── */}
    <div className="relative z-10">
      <div className="grid grid-cols-3 gap-2 mb-4">
        {[['50+', 'Farmers'], ['2000+', 'Products'], ['500+', 'Families']].map(([n, l]) => (
          <div key={l} className="bg-white/[0.07] backdrop-blur-sm rounded-xl p-3 text-center border border-white/10 hover:bg-white/[0.12] transition-colors duration-200">
            <p className="text-white font-display font-bold text-lg leading-none">{n}</p>
            <p className="text-emerald-200/60 text-[11px] font-body mt-0.5">{l}</p>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-5">
        {[
          { icon: ShieldCheck, text: '100% Organic' },
          { icon: Sprout,      text: 'From Farmers' },
          { icon: Truck,       text: 'Same Day' },
        ].map(b => (
          <div key={b.text} className="flex items-center gap-1.5">
            <b.icon className="w-3.5 h-3.5 text-emerald-300/80" />
            <span className="text-emerald-200/60 text-xs font-body">{b.text}</span>
          </div>
        ))}
      </div>
    </div>
  </div>
)

// ── Auth Layout ───────────────────────────────────────────────────────────────
const AuthLayout: React.FC<{ children: React.ReactNode; title: string; subtitle: string }> = ({ children, title, subtitle }) => (
  <div className="min-h-screen bg-[#E3E3E3] flex items-center justify-center p-3 sm:p-6 lg:p-10">
    <div className="w-full max-w-[1060px] bg-white rounded-[24px] lg:rounded-[28px] shadow-auth overflow-hidden flex flex-col lg:flex-row lg:min-h-[600px]">

      {/* ── LEFT: Form panel ── */}
      <div className="lg:w-[460px] flex-shrink-0 flex flex-col bg-white px-8 py-10 sm:px-12 lg:justify-center">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 mb-10">
          <div className="w-9 h-9 bg-forest-700 rounded-[10px] flex items-center justify-center shadow-sm">
            <Leaf className="w-5 h-5 text-white" />
          </div>
          <span className="font-display font-bold text-xl text-stone-800 tracking-tight">Graamo</span>
        </Link>

        {/* Heading */}
        <div className="mb-8">
          <h1 className="font-display text-[2.15rem] font-bold text-stone-900 leading-tight mb-2">{title}</h1>
          <p className="text-stone-500 font-body text-[15px]">{subtitle}</p>
        </div>

        {children}
      </div>

      {/* ── RIGHT: Animated branding panel ── */}
      <GraamoBrandingPanel />
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
      <AuthLayout title="Welcome back" subtitle="Log in with your phone or email">
      {step === 'input' ? (
        <div className="space-y-4 animate-fade-up">
          <div className="flex gap-2 p-1 bg-gray-100 rounded-xl">
            <button
              onClick={() => { setMethod('phone'); setIdentifier('') }}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition font-body flex items-center justify-center gap-1.5 ${method === 'phone' ? 'bg-white shadow text-forest-700' : 'text-stone-500'}`}
            >
              <Phone className="w-4 h-4" /> Phone
            </button>
            <button
              onClick={() => { setMethod('email'); setIdentifier('') }}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition font-body flex items-center justify-center gap-1.5 ${method === 'email' ? 'bg-white shadow text-forest-700' : 'text-stone-500'}`}
            >
              <Mail className="w-4 h-4" /> Email
            </button>
          </div>

          <Input
            label={method === 'phone' ? 'Phone Number' : 'Email Address'}
            type={method === 'phone' ? 'tel' : 'email'}
            placeholder={method === 'phone' ? '+91 98765 43210' : 'you@example.com'}
            value={identifier}
            onChange={e => setIdentifier(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSendOtp()}
            leftIcon={method === 'phone' ? <Phone className="w-4 h-4" /> : <Mail className="w-4 h-4" />}
          />

          <Button className="w-full" size="lg" loading={loading} onClick={handleSendOtp}>
            Send OTP <ArrowRight className="w-4 h-4" />
          </Button>
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
          <Button className="w-full" size="lg" loading={loading} onClick={handleVerifyOtp}>
            Verify & Login
          </Button>
          <p className="text-center text-sm font-body">
            {resendTimer > 0 ? (
              <span className="text-stone-500">Resend OTP in {resendTimer}s</span>
            ) : (
              <button onClick={handleSendOtp} className="text-forest-700 font-semibold hover:underline">
                Resend OTP
              </button>
            )}
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
      <div className="min-h-screen bg-[#E3E3E3] flex items-center justify-center p-3 sm:p-5 lg:p-8">
        <div className="w-full max-w-[1060px] bg-white rounded-[24px] lg:rounded-[28px] shadow-auth overflow-hidden flex flex-col lg:flex-row lg:min-h-[640px]">

          {/* ── LEFT: Form panel ── */}
          <div className="lg:w-[468px] flex-shrink-0 flex flex-col bg-white px-7 py-8 sm:px-10 overflow-y-auto">

            {/* Logo */}
            <Link to="/" className="flex items-center gap-2.5 mb-7 flex-shrink-0">
              <div className="w-9 h-9 bg-forest-700 rounded-[10px] flex items-center justify-center shadow-sm">
                <Leaf className="w-5 h-5 text-white" />
              </div>
              <span className="font-display font-bold text-xl text-stone-800 tracking-tight">Graamo</span>
            </Link>

            {/* Header */}
            <div className="mb-6">
              <div className="inline-flex items-center gap-1.5 mb-2">
                <div className="w-1.5 h-1.5 rounded-full bg-forest-500" />
                <p className="text-[11px] font-bold font-body text-forest-600 uppercase tracking-[0.15em]">New Account</p>
              </div>
              <h1 className="font-display text-[2rem] font-bold text-stone-900 leading-tight">Create your Graamo account</h1>
              <p className="text-sm text-stone-500 font-body mt-1">Choose how you want to verify</p>
            </div>

            {/* Step indicator */}
            <div className="flex items-center gap-1.5 mb-7">
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

                {/* Method toggle (segmented control) */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-stone-700 font-body">Verify with <span className="text-stone-400 font-normal">(choose one)</span></label>
                  <div className="relative flex p-1 bg-stone-100 rounded-xl overflow-hidden">
                    {/* Animated sliding indicator */}
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
          </div>{/* closes LEFT form panel */}

          {/* ── RIGHT: Animated branding panel ── */}
          <GraamoBrandingPanel />

        </div>{/* closes rounded container */}
      </div>{/* closes min-h-screen */}
    </>
  )
}
