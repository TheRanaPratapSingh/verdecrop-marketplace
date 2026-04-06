import React, { useRef, useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Leaf, Phone, Mail, ArrowRight, ChevronLeft } from 'lucide-react'
import { authApi, cartApi } from '../services/api'
import { useAuthStore, useCartStore, useGuestCartStore } from '../store'
import { SEO } from '../components/SEO'
import { Button, Input } from '../components/ui'
import toast from 'react-hot-toast'
import { trackEvent } from '../lib/analytics'

// ── Shared OTP Input ──────────────────────────────────────────────────────────
const OtpInput: React.FC<{ length?: number; onChange: (val: string) => void }> = ({ length = 6, onChange }) => {
  const [digits, setDigits] = useState<string[]>(Array(length).fill(''))
  const refs = useRef<(HTMLInputElement | null)[]>([])

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
          className={`w-11 h-14 text-center text-lg font-bold border rounded-xl outline-none transition font-body bg-white/90 shadow-sm
            ${d ? 'border-forest-500 bg-forest-50 text-forest-800' : 'border-stone-300 focus:border-forest-500 text-stone-800'}`}
        />
      ))}
    </div>
  )
}

// ── Auth Layout ───────────────────────────────────────────────────────────────
const AuthLayout: React.FC<{ children: React.ReactNode; title: string; subtitle: string }> = ({ children, title, subtitle }) => (
  <div className="min-h-screen bg-cream flex relative overflow-hidden">
    <div className="absolute inset-0 bg-hero-mesh pointer-events-none" />
    <div className="absolute -top-24 right-10 h-80 w-80 rounded-full bg-forest-200/35 blur-3xl pointer-events-none" />
    <div className="absolute -bottom-20 left-20 h-72 w-72 rounded-full bg-stone-200/50 blur-3xl pointer-events-none" />
    {/* Left panel */}
    <div className="hidden lg:flex w-[440px] flex-shrink-0 bg-gradient-to-br from-forest-900 via-forest-800 to-sage-800 flex-col justify-between p-10 relative overflow-hidden border-r border-white/10">
      <div className="absolute -top-20 -right-20 w-80 h-80 bg-forest-400/30 rounded-full blur-3xl" />
      <div className="absolute -bottom-20 -left-10 w-80 h-80 bg-stone-200/20 rounded-full blur-3xl" />
      <Link to="/" className="flex items-center gap-2 relative z-10">
        <div className="w-9 h-9 bg-white/15 rounded-xl flex items-center justify-center border border-white/30">
          <Leaf className="w-5 h-5 text-white" />
        </div>
        <span className="font-display font-bold text-xl text-white">Graamo</span>
      </Link>
      <div className="relative z-10">
        <p className="text-emerald-50/90 text-sm font-body mb-3">Trusted by families across India</p>
        <blockquote className="text-white font-display text-2xl font-semibold leading-relaxed mb-6 drop-shadow-sm">
          "Finally, organic food that's actually organic — and delivered the same day!"
        </blockquote>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold text-white font-body">P</div>
          <div>
            <p className="text-white text-sm font-semibold font-body">Priya Menon</p>
            <p className="text-emerald-50/75 text-xs font-body">Bangalore · Customer since 2022</p>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3 relative z-10">
        {[['50+', 'Farmers'], ['2000+', 'Products'], ['500+', 'Families']].map(([n, l]) => (
          <div key={l} className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center border border-white/20">
            <p className="text-white font-display font-bold text-lg">{n}</p>
            <p className="text-emerald-50/80 text-xs font-body">{l}</p>
          </div>
        ))}
      </div>
    </div>

    {/* Right panel */}
    <div className="flex-1 flex items-center justify-center p-4 sm:p-6 relative z-10">
      <div className="w-full max-w-md lg:max-w-lg">
        <Link to="/" className="lg:hidden flex items-center gap-2 mb-8">
          <div className="w-8 h-8 bg-forest-700 rounded-xl flex items-center justify-center shadow-md">
            <Leaf className="w-5 h-5 text-white" />
          </div>
          <span className="font-display font-bold text-xl text-stone-900">Graamo</span>
        </Link>
        <div className="relative rounded-3xl border border-white/70 bg-white/85 shadow-modal p-6 sm:p-8 backdrop-blur-xl grain">
          <div className="mb-8">
            <p className="section-label mb-2">Secure Access</p>
            <h1 className="font-display text-4xl font-semibold text-stone-900 mb-2 leading-tight">{title}</h1>
            <p className="text-base font-medium text-stone-700 leading-relaxed">{subtitle}</p>
          </div>
          {children}
        </div>
      </div>
    </div>
  </div>
)

// ── Login Page ────────────────────────────────────────────────────────────────
export const LoginPage: React.FC = () => {
  const { setAuth } = useAuthStore()
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
      toast.success(`Welcome back, ${res.user.name}!`)
      // Merge guest cart into user cart if there are guest items
      const guestItems = useGuestCartStore.getState().items
      if (guestItems.length > 0) {
        try {
          const mergedCart = await cartApi.mergeGuestCart(
            guestItems.map(i => ({ productId: i.productId, quantity: i.quantity }))
          )
          useCartStore.getState().setCart(mergedCart)
          useGuestCartStore.getState().clearGuestCart()
          toast.success(`${guestItems.length} cart item(s) saved to your cart!`)
        } catch { /* merge failed silently — login still succeeds */ }
      }
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

// ── Register Page
export const RegisterPage: React.FC = () => {
  const { setAuth } = useAuthStore()
  const navigate = useNavigate()

  const [step, setStep] = useState<'info' | 'otp'>('info')
  const [name, setName] = useState('')
  const [identifier, setIdentifier] = useState('')
  const [method, setMethod] = useState<'phone' | 'email'>('phone')
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSendOtp = async () => {
    if (!name.trim()) { toast.error('Enter your name'); return }
    if (!identifier.trim()) { toast.error('Enter your phone or email'); return }
    setLoading(true)
    try {
      await authApi.sendOtp(identifier, 'register')
      setStep('otp')
      toast.success('OTP sent!')
    } catch { toast.error('Failed to send OTP') }
    finally { setLoading(false) }
  }

  const handleVerifyOtp = async () => {
    if (otp.length < 6) { toast.error('Enter the 6-digit OTP'); return }
    setLoading(true)
    try {
      const res = await authApi.verifyOtp(identifier, otp, name) as {
        user?: { name?: string; role?: string }
        accessToken?: string
        refreshToken?: string
      }
      const userName = res?.user?.name || name.trim() || 'there'
      const welcomeMessage = `Registration successful! Welcome to Graamo, ${userName}!`

      if (res?.user && res?.accessToken && res?.refreshToken) {
        setAuth(res.user as any, res.accessToken, res.refreshToken)
      }

      trackEvent('register_success', {
        method,
        user_role: res?.user?.role ?? 'user',
      })
      toast.success(welcomeMessage)
      sessionStorage.setItem('postRegisterSuccess', welcomeMessage)

      navigate('/', {
        replace: true,
        state: {
          registrationSuccess: true,
          welcomeMessage,
        },
      })

      setTimeout(() => {
        if (window.location.pathname !== '/') {
          window.location.assign('/')
        }
      }, 150)
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(message || 'Invalid OTP. Please try again.')
    }
    finally { setLoading(false) }
  }

  return (
    <>
      <SEO title="Create Account" description="Join Graamo to shop fresh certified organic produce directly from Indian farmers." noIndex />
      <AuthLayout title="Create account" subtitle="Join thousands of health-conscious families">
      {step === 'info' ? (
        <div className="space-y-4 animate-fade-up">
          <Input label="Full Name" placeholder="Priya Sharma" value={name} onChange={e => setName(e.target.value)} />
          <div className="flex gap-2 p-1 bg-stone-100 rounded-xl border border-stone-200">
            <button onClick={() => setMethod('phone')} className={`flex-1 py-2 text-sm font-medium rounded-lg transition font-body flex items-center justify-center gap-1.5 ${method === 'phone' ? 'bg-white shadow text-stone-900' : 'text-stone-600'}`}>
              <Phone className="w-4 h-4" /> Phone
            </button>
            <button onClick={() => setMethod('email')} className={`flex-1 py-2 text-sm font-medium rounded-lg transition font-body flex items-center justify-center gap-1.5 ${method === 'email' ? 'bg-white shadow text-stone-900' : 'text-stone-600'}`}>
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
          />
          <p className="text-xs text-stone-700 font-body p-3 bg-stone-50 border border-stone-200 rounded-xl">
            By signing up, you agree to our Terms of Service and Privacy Policy. Your data is always safe with us.
          </p>
          <Button className="w-full" size="lg" loading={loading} onClick={handleSendOtp}>
            Send OTP <ArrowRight className="w-4 h-4" />
          </Button>
          <p className="text-center text-sm text-stone-700 font-body">
            Already have an account?{' '}
            <Link to="/login" className="text-forest-700 font-semibold hover:underline">Log in</Link>
          </p>
        </div>
      ) : (
        <div className="space-y-6 animate-fade-up">
          <button onClick={() => setStep('info')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 font-body">
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
          <div className="text-center">
            <p className="text-stone-700 font-medium font-body">OTP sent to <strong className="text-stone-900">{identifier}</strong></p>
          </div>
          <OtpInput onChange={setOtp} />
          <Button className="w-full" size="lg" loading={loading} onClick={handleVerifyOtp}>
            Create Account
          </Button>
        </div>
      )}
    </AuthLayout>
    </>
  )
}
