import React, { useState, useRef } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Leaf, Phone, Mail, ArrowRight, ChevronLeft } from 'lucide-react'
import { authApi } from '../services/api'
import { useAuthStore } from '../store'
import { Button, Input } from '../components/ui'
import toast from 'react-hot-toast'

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
          value={d}
          maxLength={1}
          onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKeyDown(i, e)}
          onPaste={handlePaste}
          className={`w-11 h-14 text-center text-lg font-bold border-2 rounded-xl outline-none transition font-body
            ${d ? 'border-leaf-500 bg-leaf-50 text-leaf-700' : 'border-gray-200 focus:border-leaf-400 text-gray-800'}`}
        />
      ))}
    </div>
  )
}

// ── Auth Layout ───────────────────────────────────────────────────────────────
const AuthLayout: React.FC<{ children: React.ReactNode; title: string; subtitle: string }> = ({ children, title, subtitle }) => (
  <div className="min-h-screen bg-cream flex">
    {/* Left panel */}
    <div className="hidden lg:flex w-[420px] flex-shrink-0 bg-gradient-to-br from-leaf-800 to-leaf-600 flex-col justify-between p-10 relative overflow-hidden">
      <div className="absolute -top-20 -right-20 w-80 h-80 bg-leaf-500/30 rounded-full blur-3xl" />
      <div className="absolute -bottom-20 -left-10 w-80 h-80 bg-earth-500/20 rounded-full blur-3xl" />
      <Link to="/" className="flex items-center gap-2 relative z-10">
        <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
          <Leaf className="w-5 h-5 text-white" />
        </div>
        <span className="font-display font-bold text-xl text-white">VerdeCrop</span>
      </Link>
      <div className="relative z-10">
        <p className="text-leaf-100 text-sm font-body mb-3">Trusted by families across India</p>
        <blockquote className="text-white font-display text-xl font-semibold leading-relaxed mb-6">
          "Finally, organic food that's actually organic — and delivered the same day!"
        </blockquote>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold text-white font-body">P</div>
          <div>
            <p className="text-white text-sm font-semibold font-body">Priya Menon</p>
            <p className="text-leaf-200 text-xs font-body">Bangalore · Customer since 2022</p>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3 relative z-10">
        {[['500+', 'Farmers'], ['2000+', 'Products'], ['50k+', 'Families']].map(([n, l]) => (
          <div key={l} className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center">
            <p className="text-white font-display font-bold text-lg">{n}</p>
            <p className="text-leaf-200 text-xs font-body">{l}</p>
          </div>
        ))}
      </div>
    </div>

    {/* Right panel */}
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <Link to="/" className="lg:hidden flex items-center gap-2 mb-8">
          <div className="w-8 h-8 bg-leaf-600 rounded-xl flex items-center justify-center">
            <Leaf className="w-5 h-5 text-white" />
          </div>
          <span className="font-display font-bold text-xl text-gray-900">VerdeCrop</span>
        </Link>
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-gray-900 mb-2">{title}</h1>
          <p className="text-gray-500 font-body">{subtitle}</p>
        </div>
        {children}
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
      toast.success(`Welcome back, ${res.user.name}!`)
      navigate(from, { replace: true })
    } catch { toast.error('Invalid OTP. Please try again.') }
    finally { setLoading(false) }
  }

  return (
    <AuthLayout title="Welcome back" subtitle="Log in with your phone or email">
      {step === 'input' ? (
        <div className="space-y-4 animate-fade-up">
          {/* Method toggle */}
          <div className="flex gap-2 p-1 bg-gray-100 rounded-xl">
            <button
              onClick={() => { setMethod('phone'); setIdentifier('') }}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition font-body flex items-center justify-center gap-1.5 ${method === 'phone' ? 'bg-white shadow text-leaf-700' : 'text-gray-500'}`}
            >
              <Phone className="w-4 h-4" /> Phone
            </button>
            <button
              onClick={() => { setMethod('email'); setIdentifier('') }}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition font-body flex items-center justify-center gap-1.5 ${method === 'email' ? 'bg-white shadow text-leaf-700' : 'text-gray-500'}`}
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
          <p className="text-center text-sm text-gray-500 font-body">
            Don't have an account?{' '}
            <Link to="/register" className="text-leaf-600 font-medium hover:underline">Sign up free</Link>
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
          <Button className="w-full" size="lg" loading={loading} onClick={handleVerifyOtp}>
            Verify & Login
          </Button>
          <p className="text-center text-sm font-body">
            {resendTimer > 0 ? (
              <span className="text-gray-400">Resend OTP in {resendTimer}s</span>
            ) : (
              <button onClick={handleSendOtp} className="text-leaf-600 font-medium hover:underline">
                Resend OTP
              </button>
            )}
          </p>
        </div>
      )}
    </AuthLayout>
  )
}

// ── Register Page ─────────────────────────────────────────────────────────────
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
      const res = await authApi.verifyOtp(identifier, otp, name)
      setAuth(res.user, res.accessToken, res.refreshToken)
      toast.success(`Welcome to VerdeCrop, ${res.user.name}! 🌿`)
      navigate('/')
    } catch { toast.error('Invalid OTP. Please try again.') }
    finally { setLoading(false) }
  }

  return (
    <AuthLayout title="Create account" subtitle="Join thousands of health-conscious families">
      {step === 'info' ? (
        <div className="space-y-4 animate-fade-up">
          <Input label="Full Name" placeholder="Priya Sharma" value={name} onChange={e => setName(e.target.value)} />
          <div className="flex gap-2 p-1 bg-gray-100 rounded-xl">
            <button onClick={() => setMethod('phone')} className={`flex-1 py-2 text-sm font-medium rounded-lg transition font-body flex items-center justify-center gap-1.5 ${method === 'phone' ? 'bg-white shadow text-leaf-700' : 'text-gray-500'}`}>
              <Phone className="w-4 h-4" /> Phone
            </button>
            <button onClick={() => setMethod('email')} className={`flex-1 py-2 text-sm font-medium rounded-lg transition font-body flex items-center justify-center gap-1.5 ${method === 'email' ? 'bg-white shadow text-leaf-700' : 'text-gray-500'}`}>
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
          <p className="text-xs text-gray-500 font-body p-3 bg-gray-50 rounded-xl">
            By signing up, you agree to our Terms of Service and Privacy Policy. Your data is always safe with us.
          </p>
          <Button className="w-full" size="lg" loading={loading} onClick={handleSendOtp}>
            Send OTP <ArrowRight className="w-4 h-4" />
          </Button>
          <p className="text-center text-sm text-gray-500 font-body">
            Already have an account?{' '}
            <Link to="/login" className="text-leaf-600 font-medium hover:underline">Log in</Link>
          </p>
        </div>
      ) : (
        <div className="space-y-6 animate-fade-up">
          <button onClick={() => setStep('info')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 font-body">
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
          <div className="text-center">
            <p className="text-gray-600 font-body">OTP sent to <strong className="text-gray-900">{identifier}</strong></p>
          </div>
          <OtpInput onChange={setOtp} />
          <Button className="w-full" size="lg" loading={loading} onClick={handleVerifyOtp}>
            Create Account
          </Button>
        </div>
      )}
    </AuthLayout>
  )
}
