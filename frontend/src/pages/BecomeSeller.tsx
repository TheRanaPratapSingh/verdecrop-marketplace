import React, { useEffect, useRef, useState } from 'react'
import { PageLayout } from '../components/layout'
import { SEO } from '../components/SEO'
import { useAuthStore } from '../store'
import { Button, Input, Textarea, Badge } from '../components/ui'
import toast from 'react-hot-toast'
import { Link, useNavigate } from 'react-router-dom'
import type { Farmer, User } from '../types'
import { farmerApi, authApi } from '../services/api'
import {
  ShieldCheck, FileCheck2, Store, MapPin, Building2, CreditCard,
  User as UserIcon, Phone, Mail, ArrowLeft, CheckCircle2,
} from 'lucide-react'
import { trackEvent } from '../lib/analytics'

// ── Guest: combined user-account + farmer-profile registration ─────────────────
interface SellerRegForm {
  name: string; email: string; phone: string
  farmName: string; description: string
  location: string; state: string; pinCode: string
  certificationNumber: string; bankAccountNumber: string; bankIfsc: string
}

const emptyRegForm = (): SellerRegForm => ({
  name: '', email: '', phone: '',
  farmName: '', description: '',
  location: '', state: '', pinCode: '',
  certificationNumber: '', bankAccountNumber: '', bankIfsc: ''
})

// ── Authenticated: register farmer profile (account already exists) ────────────
interface FarmerForm {
  farmName: string; description: string
  location: string; state: string; pinCode: string
  certificationNumber: string; bankAccountNumber: string; bankIfsc: string
}

const emptyForm = (): FarmerForm => ({
  farmName: '', description: '',
  location: '', state: '', pinCode: '',
  certificationNumber: '', bankAccountNumber: '', bankIfsc: '',
})

export const BecomeSellerPage: React.FC = () => {
  const { isAuthenticated, user, setAuth } = useAuthStore()
  const isAdmin = user?.role === 'admin'
  const navigate = useNavigate()

  // Authenticated user's farmer profile
  const [myProfile, setMyProfile] = useState<Farmer | null>(null)
  const [profileLoading, setProfileLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState<FarmerForm>(emptyForm())

  // Admin queue
  const [adminFarmers, setAdminFarmers] = useState<Farmer[]>([])
  const [adminLoading, setAdminLoading] = useState(false)

  // Guest seller registration
  const [showSellerReg, setShowSellerReg] = useState(false)
  const [regStep, setRegStep] = useState<'details' | 'otp'>('details')
  const [regForm, setRegForm] = useState<SellerRegForm>(emptyRegForm())
  const [regOtp, setRegOtp] = useState('')
  const [regSubmitting, setRegSubmitting] = useState(false)
  const otpInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!isAuthenticated || !user) {
      setProfileLoading(false)
      return
    }
    if (isAdmin) {
      setAdminLoading(true)
      farmerApi.getAll({ pageSize: 100 })
        .then(res => setAdminFarmers(res.items ?? []))
        .catch(() => setAdminFarmers([]))
        .finally(() => setAdminLoading(false))
      setProfileLoading(false)
    } else {
      farmerApi.getMyProfile()
        .then(profile => {
          setMyProfile(profile)
          setForm({
            farmName: profile.farmName,
            description: profile.description ?? '',
            location: profile.location,
            state: profile.state,
            pinCode: profile.pinCode ?? '',
            certificationNumber: profile.certificationNumber ?? '',
            bankAccountNumber: profile.bankAccountNumber ?? '',
            bankIfsc: profile.bankIfsc ?? '',
          })
        })
        .catch(() => setMyProfile(null))
        .finally(() => setProfileLoading(false))
    }
  }, [isAuthenticated, user, isAdmin])

  // ── Authenticated farmer form helpers ────────────────────────────────────────
  const handleChange = (field: keyof FarmerForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(prev => ({ ...prev, [field]: e.target.value }))

  const canSubmit = !!(form.farmName.trim() && form.location.trim() && form.state.trim() && form.pinCode.trim())

  const handleSubmit = async () => {
    if (!canSubmit) { toast.error('Please fill all required fields'); return }
    setSubmitting(true)
    try {
      const profile = await farmerApi.register({
        farmName: form.farmName.trim(),
        description: form.description.trim() || undefined,
        location: form.location.trim(),
        state: form.state.trim(),
        pinCode: form.pinCode.trim(),
        certificationNumber: form.certificationNumber.trim() || undefined,
        bankAccountNumber: form.bankAccountNumber.trim() || undefined,
        bankIfsc: form.bankIfsc.trim() || undefined,
      })
      setMyProfile(profile)
      toast.success('Seller registration submitted! Awaiting admin approval.')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg ?? 'Failed to submit. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Admin approval helpers ────────────────────────────────────────────────────
  const handleApprove = async (id: number, approve: boolean) => {
    try {
      await farmerApi.approve(id, approve)
      setAdminFarmers(prev => prev.map(f => f.id === id ? { ...f, isApproved: approve } : f))
      toast.success(approve ? 'Seller approved!' : 'Seller approval revoked')
    } catch {
      toast.error('Action failed. Please try again.')
    }
  }

  // ── Guest registration helpers ────────────────────────────────────────────────
  const regIdentifier = regForm.email.trim() || regForm.phone.trim()

  const canProceed = !!(
    regForm.name.trim() && regIdentifier &&
    regForm.farmName.trim() && regForm.location.trim() &&
    regForm.state.trim() && regForm.pinCode.trim()
  )

  const handleRegChange = (field: keyof SellerRegForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setRegForm(prev => ({ ...prev, [field]: e.target.value }))

  const handleCancelReg = () => {
    setShowSellerReg(false)
    setRegStep('details')
    setRegForm(emptyRegForm())
    setRegOtp('')
  }

  const handleSendOtp = async () => {
    if (!canProceed) { toast.error('Please fill all required fields'); return }
    setRegSubmitting(true)
    try {
      await authApi.sendOtp(regIdentifier, 'register')
      trackEvent('seller_registration_otp_sent', {
        identifier_type: regForm.email.trim() ? 'email' : 'phone',
      })
      setRegStep('otp')
      toast.success(`OTP sent to ${regIdentifier}`)
      setTimeout(() => otpInputRef.current?.focus(), 100)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg ?? 'Failed to send OTP. Please try again.')
    } finally {
      setRegSubmitting(false)
    }
  }

  const handleRegisterAndSubmit = async () => {
    if (!regOtp.trim()) { toast.error('Please enter the OTP'); return }
    setRegSubmitting(true)
    try {
      const authResult = await authApi.verifyOtp(
        regIdentifier,
        regOtp.trim(),
        regForm.name.trim(),
        regForm.email.trim() || undefined,
        regForm.phone.trim() || undefined,
      )
      const { user: newUser, accessToken, refreshToken } = authResult as unknown as {
        user: User; accessToken: string; refreshToken: string
      }

      if (newUser && accessToken && refreshToken) {
        localStorage.setItem('accessToken', accessToken)
        localStorage.setItem('refreshToken', refreshToken)
        setAuth(newUser, accessToken, refreshToken)
      }

      const profile = await farmerApi.register({
        farmName: regForm.farmName.trim(),
        description: regForm.description.trim() || undefined,
        location: regForm.location.trim(),
        state: regForm.state.trim(),
        pinCode: regForm.pinCode.trim(),
        certificationNumber: regForm.certificationNumber.trim() || undefined,
        bankAccountNumber: regForm.bankAccountNumber.trim() || undefined,
        bankIfsc: regForm.bankIfsc.trim() || undefined,
      })

      trackEvent('seller_registration_completed', {
        farm_name: profile.farmName,
        state: profile.state,
      })
      setMyProfile(profile)
      setShowSellerReg(false)
      setRegStep('details')
      setRegOtp('')
      toast.success(`Welcome ${regForm.name}! Your seller application is under review.`)
      navigate('/become-a-seller', { replace: true })
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg ?? 'Registration failed. Please try again.')
    } finally {
      setRegSubmitting(false)
    }
  }

  // ────────────────────────────────────────────────────────────────────────────
  return (
    <PageLayout>
      <SEO
        title="Become a Seller"
        description="Join Graamo's verified organic seller network. Register your farm, list products, and start selling to thousands of health-conscious families across India."
        canonical="https://graamo.in/become-a-seller"
      />
      <section className="relative overflow-hidden bg-gradient-to-b from-cream via-stone-50 to-stone-100">
        <div className="absolute inset-0 bg-hero-mesh opacity-60 pointer-events-none" />
        <div className="absolute top-10 -left-20 w-80 h-80 rounded-full bg-forest-200/35 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-10 w-80 h-80 rounded-full bg-sage-200/30 blur-3xl pointer-events-none" />

        <div className="max-w-6xl mx-auto px-6 py-14 relative z-10">
          {/* Hero header */}
          <div className="mb-8">
            <p className="section-label mb-2">Seller Program</p>
            <h1 className="text-4xl md:text-5xl font-display font-semibold text-forest-900 mb-3">Seller Onboarding</h1>
            <p className="text-stone-700 font-body max-w-3xl text-lg leading-relaxed">
              Join Graamo as a verified farming partner. Manage your farm, products, and order fulfillment once approved by admin.
            </p>
          </div>

          {/* Feature highlight cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {[
              { icon: ShieldCheck, title: 'Verified Network', desc: 'KYC + document checks keep buyers and sellers protected.' },
              { icon: Store,       title: 'Seller Dashboard', desc: 'Get onboarded and start managing listings and orders.' },
              { icon: FileCheck2,  title: 'Fast Approval',    desc: 'Simple review flow with clear status and admin notes.' },
            ].map(item => (
              <div key={item.title} className="bg-white/80 backdrop-blur-sm border border-white rounded-3xl p-5 shadow-card">
                <div className="w-11 h-11 rounded-2xl bg-forest-50 text-forest-700 flex items-center justify-center mb-3">
                  <item.icon className="w-5 h-5" />
                </div>
                <h3 className="font-label font-semibold text-stone-900 mb-1">{item.title}</h3>
                <p className="text-sm text-stone-600 font-body leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>

          {/* ── Main content panel ── */}

          {!isAuthenticated ? (
            !showSellerReg ? (
              /* Unauthenticated CTA */
              <div className="bg-white/90 backdrop-blur-md shadow-modal rounded-3xl border border-white p-8 text-center max-w-2xl mx-auto">
                <h2 className="text-2xl font-display font-semibold text-stone-900 mb-2">Start Your Seller Journey</h2>
                <p className="text-stone-600 font-body mb-6">
                  Register as a seller or log in if you already have an account.
                </p>
                <div className="flex items-center justify-center gap-3">
                  <Link to="/login"><Button variant="outline">Log in</Button></Link>
                  <Button variant="primary" onClick={() => setShowSellerReg(true)}>Register as Seller</Button>
                </div>
              </div>
            ) : (
              /* ── Inline Seller Registration Form ── */
              <div className="bg-white/90 shadow-modal rounded-3xl border border-stone-200 overflow-hidden">

                {/* Header */}
                <div className="px-8 py-6 border-b border-stone-100 flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-display font-semibold text-forest-900">Seller Registration</h2>
                    <p className="text-stone-500 text-sm font-body mt-0.5">
                      {regStep === 'details'
                        ? 'Fill in your account and farm details below.'
                        : `Enter the OTP sent to ${regIdentifier}`}
                    </p>
                  </div>
                  <button
                    onClick={handleCancelReg}
                    className="flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-700 transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" /> Back
                  </button>
                </div>

                {/* Step indicator */}
                <div className="px-8 pt-5 pb-2 flex items-center gap-3">
                  <div className={`flex items-center gap-2 text-sm font-medium ${regStep === 'details' ? 'text-forest-700' : 'text-stone-400'}`}>
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                      ${regStep === 'otp' ? 'bg-forest-100 text-forest-600' : 'bg-forest-600 text-white'}`}>
                      {regStep === 'otp' ? <CheckCircle2 className="w-4 h-4" /> : '1'}
                    </span>
                    Registration Details
                  </div>
                  <div className="flex-1 h-px bg-stone-200" />
                  <div className={`flex items-center gap-2 text-sm font-medium ${regStep === 'otp' ? 'text-forest-700' : 'text-stone-400'}`}>
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                      ${regStep === 'otp' ? 'bg-forest-600 text-white' : 'bg-stone-200 text-stone-500'}`}>
                      2
                    </span>
                    Verify OTP
                  </div>
                </div>

                <div className="px-8 pb-8 pt-4">
                  {regStep === 'details' ? (
                    <>
                      {/* Section 1 — Account Details → Users table */}
                      <div className="mb-6">
                        <div className="flex items-center gap-2 mb-4">
                          <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                            <UserIcon className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-xs font-label font-semibold uppercase tracking-wider text-stone-500">Account Details</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <Input
                            label="Full Name *"
                            value={regForm.name}
                            onChange={handleRegChange('name')}
                            placeholder="e.g. Rajesh Kumar"
                            leftIcon={<UserIcon className="w-4 h-4" />}
                          />
                          <Input
                            label="Email Address"
                            type="email"
                            value={regForm.email}
                            onChange={handleRegChange('email')}
                            placeholder="e.g. rajesh@farm.com"
                            leftIcon={<Mail className="w-4 h-4" />}
                            hint="Email or Phone is required"
                          />
                          <Input
                            label="Phone Number"
                            type="tel"
                            value={regForm.phone}
                            onChange={handleRegChange('phone')}
                            placeholder="e.g. 9876543210"
                            leftIcon={<Phone className="w-4 h-4" />}
                            hint="Email or Phone is required"
                          />
                        </div>
                      </div>

                      <hr className="border-stone-100 mb-6" />

                      {/* Section 2 — Farm Details → FarmerProfiles table */}
                      <div className="mb-6">
                        <div className="flex items-center gap-2 mb-4">
                          <div className="w-8 h-8 rounded-xl bg-forest-50 text-forest-600 flex items-center justify-center flex-shrink-0">
                            <Store className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-xs font-label font-semibold uppercase tracking-wider text-stone-500">Farm Details</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <Input
                            label="Farm Name *"
                            value={regForm.farmName}
                            onChange={handleRegChange('farmName')}
                            placeholder="e.g. Green Valley Farms"
                          />
                          <Input
                            label="Location *"
                            value={regForm.location}
                            onChange={handleRegChange('location')}
                            placeholder="e.g. Village Rampur, Uttarakhand"
                            leftIcon={<MapPin className="w-4 h-4" />}
                          />
                          <Input
                            label="State *"
                            value={regForm.state}
                            onChange={handleRegChange('state')}
                            placeholder="e.g. Uttarakhand"
                          />
                          <Input
                            label="Pin Code *"
                            value={regForm.pinCode}
                            onChange={handleRegChange('pinCode')}
                            placeholder="e.g. 249205"
                            maxLength={6}
                          />
                        </div>
                        <Textarea
                          label="Description"
                          value={regForm.description}
                          onChange={handleRegChange('description')}
                          placeholder="About your farm, crops, organic certifications…"
                          rows={3}
                          className="mt-4"
                        />
                      </div>

                      <hr className="border-stone-100 mb-6" />

                      {/* Section 3 — Bank & Certification → FarmerProfiles table */}
                      <div className="mb-7">
                        <div className="flex items-center gap-2 mb-4">
                          <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
                            <CreditCard className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-xs font-label font-semibold uppercase tracking-wider text-stone-500">
                              Bank &amp; Certification{' '}
                              <span className="normal-case font-normal text-stone-400">(optional)</span>
                            </p>

                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <Input
                            label="Certification Number"
                            value={regForm.certificationNumber}
                            onChange={handleRegChange('certificationNumber')}
                            placeholder="e.g. NPOP-2024-001"
                            leftIcon={<Building2 className="w-4 h-4" />}
                          />
                          <Input
                            label="Bank Account Number"
                            value={regForm.bankAccountNumber}
                            onChange={handleRegChange('bankAccountNumber')}
                            placeholder="e.g. 123456789012"
                          />
                          <Input
                            label="Bank IFSC Code"
                            value={regForm.bankIfsc}
                            onChange={handleRegChange('bankIfsc')}
                            placeholder="e.g. SBIN0001234"
                            maxLength={11}
                          />
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-stone-100">
                        <Button
                          onClick={handleSendOtp}
                          variant="primary"
                          disabled={!canProceed || regSubmitting}
                          loading={regSubmitting}
                        >
                          Send OTP &amp; Continue
                        </Button>
                        <Button onClick={handleCancelReg} variant="ghost" size="sm">Cancel</Button>
                        {!canProceed && (
                          <p className="text-xs text-stone-400">
                            Name, Email/Phone, Farm Name, Location, State and Pin Code are required.
                          </p>
                        )}
                      </div>
                    </>
                  ) : (
                    /* Step 2 — OTP verification */
                    <div className="max-w-md mx-auto py-6">
                      <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-forest-50 text-forest-600 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Mail className="w-7 h-7" />
                        </div>
                        <h3 className="text-lg font-display font-semibold text-stone-900 mb-1">
                          Check your {regForm.email.trim() ? 'email' : 'phone'}
                        </h3>
                        <p className="text-sm text-stone-500">
                          We sent a verification code to{' '}
                          <strong className="text-stone-700">{regIdentifier}</strong>
                        </p>
                      </div>

                      <Input
                        ref={otpInputRef}
                        label="Verification Code"
                        value={regOtp}
                        onChange={e => setRegOtp(e.target.value)}
                        placeholder="Enter 6-digit OTP"
                        maxLength={6}
                        className="text-center text-lg tracking-widest font-semibold"
                      />

                      <div className="mt-6 flex flex-col gap-3">
                        <Button
                          onClick={handleRegisterAndSubmit}
                          variant="primary"
                          disabled={!regOtp.trim() || regSubmitting}
                          loading={regSubmitting}
                          className="w-full"
                        >
                          Verify &amp; Register
                        </Button>
                        <button
                          onClick={() => { setRegStep('details'); setRegOtp('') }}
                          className="text-sm text-stone-500 hover:text-forest-700 transition-colors text-center"
                        >
                          ← Go back &amp; edit details
                        </button>
                        <button
                          onClick={handleSendOtp}
                          disabled={regSubmitting}
                          className="text-sm text-forest-600 hover:text-forest-800 transition-colors text-center disabled:opacity-50"
                        >
                          Resend OTP
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )

          ) : isAdmin ? (
            /* Admin approval queue */
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-2xl font-display font-semibold text-forest-900">Admin approval queue</h2>
                <Badge variant="blue" size="md">
                  {adminFarmers.length} request{adminFarmers.length === 1 ? '' : 's'}
                </Badge>
              </div>
              {adminLoading && <p className="text-stone-500 text-sm py-4">Loading requests…</p>}
              {!adminLoading && adminFarmers.length === 0 && (
                <div className="bg-white/85 rounded-3xl border border-stone-200 p-8 text-center text-stone-500">
                  No seller requests yet.
                </div>
              )}
              {adminFarmers.map(farmer => (
                <div key={farmer.id} className="bg-white/90 backdrop-blur-sm p-6 rounded-3xl shadow-card border border-stone-200">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                    <h3 className="text-xl font-label font-semibold text-stone-900">
                      {farmer.farmName}{' '}
                      <span className="text-stone-500 font-normal">({farmer.ownerName})</span>
                    </h3>
                    {farmer.isApproved
                      ? <Badge variant="green">Approved</Badge>
                      : <Badge variant="orange">Pending</Badge>}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-stone-700">
                    <p className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-stone-400" />
                      {farmer.location}, {farmer.state} — {farmer.pinCode}
                    </p>
                    {farmer.certificationNumber && (
                      <p><Building2 className="inline w-4 h-4 mr-1 text-stone-400" />Cert: {farmer.certificationNumber}</p>
                    )}
                    {farmer.bankAccountNumber && (
                      <p><CreditCard className="inline w-4 h-4 mr-1 text-stone-400" />A/c: {farmer.bankAccountNumber}</p>
                    )}
                    {farmer.description && (
                      <p className="md:col-span-3 text-stone-500 italic">{farmer.description}</p>
                    )}
                  </div>
                  <div className="flex gap-2 mt-4">
                    {!farmer.isApproved && (
                      <Button onClick={() => handleApprove(farmer.id, true)} variant="primary" size="sm">Approve</Button>
                    )}
                    {farmer.isApproved && (
                      <Button onClick={() => handleApprove(farmer.id, false)} variant="danger" size="sm">Revoke</Button>
                    )}
                  </div>
                </div>
              ))}
            </div>

          ) : profileLoading ? (
            <div className="bg-white/90 rounded-3xl p-8 text-center text-stone-500">Loading…</div>

          ) : myProfile ? (
            /* Application status for authenticated user */
            <div className="bg-white/90 rounded-3xl shadow-card p-8 border border-stone-200">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                <h2 className="text-2xl font-display font-semibold text-forest-900">Your Application</h2>
                {myProfile.isApproved
                  ? <Badge variant="green">Approved</Badge>
                  : <Badge variant="orange">Pending Review</Badge>}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm font-body text-stone-700">
                <p><strong className="font-semibold">Farm name:</strong> {myProfile.farmName}</p>
                <p><strong className="font-semibold">Location:</strong> {myProfile.location}, {myProfile.state} — {myProfile.pinCode}</p>
                {myProfile.certificationNumber && (
                  <p><strong className="font-semibold">Certification No:</strong> {myProfile.certificationNumber}</p>
                )}
                {myProfile.bankAccountNumber && (
                  <p><strong className="font-semibold">Bank A/c:</strong> {myProfile.bankAccountNumber}</p>
                )}
                {myProfile.description && (
                  <p className="md:col-span-2 text-stone-600">{myProfile.description}</p>
                )}
              </div>
              {myProfile.isApproved ? (
                <div className="mt-6 bg-forest-50 border border-forest-100 p-5 rounded-2xl">
                  <h3 className="text-lg font-label font-semibold text-forest-800 mb-2">Seller Dashboard Ready</h3>
                  <p className="text-sm text-stone-700">
                    Congratulations! Your account is now active. You can start adding product listings and fulfilling orders.
                  </p>
                </div>
              ) : (
                <div className="mt-6 p-5 bg-amber-50 border border-amber-100 rounded-2xl">
                  <p className="text-sm text-amber-700">Your application is under review. Please wait for admin approval.</p>
                </div>
              )}
            </div>

          ) : (
            /* Authenticated user: register their farmer profile */
            <div className="bg-white/90 shadow-modal rounded-3xl p-8 border border-stone-200">
              <div className="mb-7">
                <h2 className="text-2xl font-display font-semibold text-forest-900">Seller Registration Form</h2>
                <p className="text-stone-600 text-sm font-body mt-1">
                  Fill in your farm details to submit a seller request for admin approval.
                </p>
              </div>

              <fieldset className="mb-6">
                <legend className="text-xs font-label font-semibold uppercase tracking-wider text-stone-400 mb-4">Farm Details</legend>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input label="Farm Name *" value={form.farmName} onChange={handleChange('farmName')} placeholder="e.g. Green Valley Farms" />
                  <Input label="Location *" value={form.location} onChange={handleChange('location')} placeholder="e.g. Village Rampur, Uttarakhand" />
                  <Input label="State *" value={form.state} onChange={handleChange('state')} placeholder="e.g. Uttarakhand" />
                  <Input label="Pin Code *" value={form.pinCode} onChange={handleChange('pinCode')} placeholder="e.g. 249205" maxLength={6} />
                </div>
                <Textarea label="Description" value={form.description} onChange={handleChange('description')} placeholder="About your farm, crops, certifications…" rows={3} className="mt-4" />
              </fieldset>

              <hr className="border-stone-200 mb-6" />

              <fieldset className="mb-7">
                <legend className="text-xs font-label font-semibold uppercase tracking-wider text-stone-400 mb-4">
                  Bank &amp; Certification <span className="normal-case font-normal text-stone-400">(optional)</span>
                </legend>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Input label="Certification Number" value={form.certificationNumber} onChange={handleChange('certificationNumber')} placeholder="e.g. NPOP-2024-001" />
                  <Input label="Bank Account Number" value={form.bankAccountNumber} onChange={handleChange('bankAccountNumber')} placeholder="e.g. 123456789012" />
                  <Input label="Bank IFSC Code" value={form.bankIfsc} onChange={handleChange('bankIfsc')} placeholder="e.g. SBIN0001234" maxLength={11} />
                </div>
              </fieldset>

              <div className="flex items-center gap-3">
                <Button onClick={handleSubmit} variant="primary" disabled={!canSubmit || submitting} loading={submitting}>
                  Submit Application
                </Button>
                {!canSubmit && <p className="text-xs text-stone-500">Farm Name, Location, State and Pin Code are required.</p>}
              </div>
            </div>
          )}
        </div>
      </section>
    </PageLayout>
  )
}
