import React, { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  Package, MapPin, CreditCard, CheckCircle, Clock, Truck, Home, Bell,
  Heart, Trash2, ShoppingCart, Plus, Edit2, Save, X, ChevronRight,
  User, Phone, Mail, Camera, Star, BellOff, ShieldCheck, Leaf, Tag,
  Banknote, BadgeCheck, QrCode, Timer, Copy
} from 'lucide-react'
import { orderApi, paymentApi, userApi, cartApi, notificationApi } from '../services/api'
import { useAuthStore, useCartStore, useNotifStore } from '../store'
import { PageLayout } from '../components/layout'
import { Button, Input, Modal, Spinner, Badge, StatusBadge, StarRating, EmptyState, Card, TabGroup } from '../components/ui'
import type { Order, Address, Notification } from '../types'
import toast from 'react-hot-toast'
import { resolveAssetUrl } from '../lib/image'
import { trackEvent } from '../lib/analytics'

// ─────────────────────────────────────────────────────────────────────────────
// CHECKOUT PAGE
// ─────────────────────────────────────────────────────────────────────────────
export const CheckoutPage: React.FC = () => {
  const { cart } = useCartStore()
  const navigate = useNavigate()
  const [step, setStep] = useState<'address' | 'payment' | 'confirm'>('address')
  const [addresses, setAddresses] = useState<Address[]>([])
  const [selectedAddress, setSelectedAddress] = useState<number | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'cod'>('upi')
  const [upiQr, setUpiQr] = useState<{ qrCodeImage: string; upiString: string; amount: number; orderNumber: string; expiresAt: string } | null>(null)
  const [upiOrderId, setUpiOrderId] = useState<number | null>(null)
  const [upiPolling, setUpiPolling] = useState(false)
  const [upiPaid, setUpiPaid] = useState(false)
  const [upiTxnRef, setUpiTxnRef] = useState('')
  const [showTxnInput, setShowTxnInput] = useState(false)
  const [confirmingUpi, setConfirmingUpi] = useState(false)
  const [qrTimeLeft, setQrTimeLeft] = useState(600)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [couponCode, setCouponCode] = useState('')
  const [couponApplied, setCouponApplied] = useState(false)
  const [discount, setDiscount] = useState(0)
  const [couponLoading, setCouponLoading] = useState(false)
  const [placingOrder, setPlacingOrder] = useState(false)
  const [notes, setNotes] = useState('')

  useEffect(() => {
    userApi.getAddresses().then(addrs => {
      setAddresses(addrs)
      const def = addrs.find(a => a.isDefault)
      if (def) setSelectedAddress(def.id)
    })
  }, [])

  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  if (!cart?.items?.length) {
    return (
      <PageLayout>
        <div className="max-w-2xl mx-auto px-6 py-24 text-center">
          <div className="w-20 h-20 rounded-full bg-stone-100 flex items-center justify-center mx-auto mb-5">
            <ShoppingCart className="w-9 h-9 text-stone-300" />
          </div>
          <h2 className="text-xl font-display font-bold text-stone-800 mb-2">Your cart is empty</h2>
          <p className="text-stone-500 font-body text-sm mb-6">Add some fresh organic products to get started</p>
          <Link to="/products"><Button>Browse Products</Button></Link>
        </div>
      </PageLayout>
    )
  }

  const subtotal = cart.subtotal
  const delivery = subtotal >= 500 ? 0 : 49
  const tax = Math.round((subtotal - discount) * 0.05)
  const total = subtotal + delivery - discount + tax

  const applyCoupon = async () => {
    if (!couponCode.trim()) return
    setCouponLoading(true)
    try {
      const res = await orderApi.applyCoupon(couponCode, subtotal)
      setDiscount(res.discountAmount)
      setCouponApplied(true)
      trackEvent('coupon_applied', { coupon_code: couponCode.trim(), discount_amount: res.discountAmount, subtotal })
      toast.success(`Coupon applied! You save ₹${res.discountAmount.toFixed(0)}`)
    } catch { toast.error('Invalid or expired coupon') }
    finally { setCouponLoading(false) }
  }

  const removeCoupon = () => {
    setCouponCode('')
    setDiscount(0)
    setCouponApplied(false)
  }

  const startUpiPolling = (orderId: number) => {
    setUpiPolling(true)
    pollingRef.current = setInterval(async () => {
      try {
        const status = await paymentApi.getUpiStatus(orderId)
        if (status.status === 'paid') {
          if (pollingRef.current) clearInterval(pollingRef.current)
          if (timerRef.current) clearInterval(timerRef.current)
          setUpiPaid(true)
          setUpiPolling(false)
          trackEvent('payment_success', { order_id: orderId, payment_method: 'upi' })
          setTimeout(() => navigate(`/orders/${orderId}?success=1`), 1500)
        }
      } catch { /* ignore polling errors */ }
    }, 5000)
  }

  const startCountdown = () => {
    setQrTimeLeft(600)
    timerRef.current = setInterval(() => {
      setQrTimeLeft(t => {
        if (t <= 1) {
          if (timerRef.current) clearInterval(timerRef.current)
          if (pollingRef.current) clearInterval(pollingRef.current)
          return 0
        }
        return t - 1
      })
    }, 1000)
  }

  const handleConfirmUpiManual = async () => {
    if (!upiTxnRef.trim() || !upiOrderId) return
    setConfirmingUpi(true)
    try {
      await paymentApi.confirmUpiPayment(upiOrderId, upiTxnRef.trim())
      if (pollingRef.current) clearInterval(pollingRef.current)
      if (timerRef.current) clearInterval(timerRef.current)
      setUpiPaid(true)
      trackEvent('payment_success', { order_id: upiOrderId, payment_method: 'upi_manual' })
      setTimeout(() => navigate(`/orders/${upiOrderId}?success=1`), 1500)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg ?? 'Could not verify payment. Check your transaction ID.')
    } finally { setConfirmingUpi(false) }
  }

  const handlePlaceOrder = async () => {
    if (!selectedAddress) { toast.error('Select a delivery address'); return }
    setPlacingOrder(true)
    try {
      const order = await orderApi.place({
        addressId: selectedAddress,
        paymentMethod,
        couponCode: couponCode || undefined,
        notes: notes || undefined
      })
      trackEvent('place_order', {
        order_id: order.id, order_number: order.orderNumber,
        payment_method: paymentMethod, total_amount: order.totalAmount, item_count: order.items.length,
      })
      if (paymentMethod === 'upi') {
        const qrData = await paymentApi.generateUpiQr(order.id)
        setUpiQr(qrData)
        setUpiOrderId(order.id)
        startCountdown()
        startUpiPolling(order.id)
      } else {
        trackEvent('payment_success', { order_id: order.id, payment_method: paymentMethod, total_amount: order.totalAmount })
        navigate(`/orders/${order.id}?success=1`)
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg ?? 'Failed to place order. Please try again.')
    } finally { setPlacingOrder(false) }
  }

  const steps = [
    { id: 'address', icon: MapPin,      label: 'Address', emoji: '📍' },
    { id: 'payment', icon: CreditCard,  label: 'Payment', emoji: '💳' },
    { id: 'confirm', icon: BadgeCheck,  label: 'Review',  emoji: '✅' },
  ] as const
  const stepIdx = steps.findIndex(s => s.id === step)
  const selectedAddr = addresses.find(a => a.id === selectedAddress)

  // Items to show in mini preview (up to 3)
  const previewItems = cart.items.slice(0, 3)

  return (
    <PageLayout>
      {/* Page background */}
      <div className="min-h-screen bg-stone-50/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-28 lg:pb-12">

          {/* ── Page header ── */}
          <div className="mb-8">
            <h1 className="text-3xl font-display font-bold text-stone-900 tracking-tight">Checkout</h1>
            <p className="text-stone-500 font-body text-sm mt-1">{cart.items.length} item{cart.items.length !== 1 ? 's' : ''} · ₹{total.toFixed(0)}</p>
          </div>

          {/* ── Step progress bar ── */}
          <div className="relative flex items-center justify-between mb-10 max-w-md">
            {/* connector line */}
            <div className="absolute left-0 right-0 top-5 h-0.5 bg-stone-200 z-0" />
            <div
              className="absolute left-0 top-5 h-0.5 bg-forest-500 z-0 transition-all duration-500"
              style={{ width: stepIdx === 0 ? '0%' : stepIdx === 1 ? '50%' : '100%' }}
            />
            {steps.map((s, i) => {
              const done = i < stepIdx
              const active = i === stepIdx
              return (
                <button
                  key={s.id}
                  onClick={() => i <= stepIdx && setStep(s.id)}
                  disabled={i > stepIdx}
                  className="relative z-10 flex flex-col items-center gap-1.5 group disabled:cursor-default"
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 shadow-sm
                    ${done  ? 'bg-forest-500 text-white shadow-[0_0_0_3px_rgba(45,138,50,0.18)]'  : ''}
                    ${active ? 'bg-forest-500 text-white shadow-[0_0_0_4px_rgba(45,138,50,0.22)] scale-110' : ''}
                    ${!done && !active ? 'bg-white text-stone-400 border-2 border-stone-200' : ''}`}
                  >
                    {done ? <CheckCircle className="w-5 h-5" /> : <s.icon className="w-4.5 h-4.5" />}
                  </div>
                  <span className={`text-xs font-body font-semibold whitespace-nowrap transition-colors
                    ${active ? 'text-forest-700' : done ? 'text-forest-600' : 'text-stone-400'}`}>
                    {s.label}
                  </span>
                </button>
              )
            })}
          </div>

          {/* ── 2-column grid ── */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 items-start">

            {/* ════════════════════ LEFT PANEL ════════════════════ */}
            <div className="space-y-4 animate-fade-up">

              {/* ── ADDRESS STEP ── */}
              {step === 'address' && (
                <div className="bg-white rounded-2xl shadow-card border border-stone-100 overflow-hidden">
                  {/* Card header */}
                  <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-stone-100">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-forest-50 flex items-center justify-center">
                        <MapPin className="w-4.5 h-4.5 text-forest-600" />
                      </div>
                      <div>
                        <h2 className="font-display font-bold text-stone-900 text-base">Delivery Address</h2>
                        <p className="text-xs text-stone-500 font-body">Choose where to deliver</p>
                      </div>
                    </div>
                    <Link to="/profile" className="text-xs font-semibold text-forest-600 font-body hover:text-forest-700 flex items-center gap-1 transition-colors">
                      <Plus className="w-3.5 h-3.5" /> Add New
                    </Link>
                  </div>

                  <div className="px-6 py-5">
                    {addresses.length === 0 ? (
                      <div className="text-center py-10">
                        <div className="w-14 h-14 rounded-2xl bg-stone-100 flex items-center justify-center mx-auto mb-3">
                          <MapPin className="w-6 h-6 text-stone-300" />
                        </div>
                        <p className="text-stone-600 font-body font-medium text-sm mb-1">No saved addresses</p>
                        <p className="text-stone-400 font-body text-xs mb-4">Add a delivery address to continue</p>
                        <Link to="/profile">
                          <button className="px-5 py-2 rounded-xl border-2 border-forest-400 text-forest-600 text-sm font-semibold font-body hover:bg-forest-50 transition-colors">
                            + Add Address
                          </button>
                        </Link>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {addresses.map(addr => (
                          <div
                            key={addr.id}
                            onClick={() => setSelectedAddress(addr.id)}
                            className={`relative flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200
                              ${selectedAddress === addr.id
                                ? 'border-forest-400 bg-forest-50/70 shadow-[0_0_0_1px_rgba(45,138,50,0.12),0_2px_12px_rgba(45,138,50,0.10)]'
                                : 'border-stone-200 bg-white hover:border-stone-300 hover:shadow-sm'}`}
                          >
                            {/* Radio indicator */}
                            <div className={`mt-0.5 w-4.5 h-4.5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all
                              ${selectedAddress === addr.id ? 'border-forest-500 bg-forest-500' : 'border-stone-300'}`}>
                              {selectedAddress === addr.id && <div className="w-2 h-2 rounded-full bg-white" />}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <span className="font-semibold text-stone-900 font-body text-sm">{addr.fullName}</span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full font-body
                                  ${addr.label?.toLowerCase() === 'home' ? 'bg-blue-100 text-blue-700' :
                                    addr.label?.toLowerCase() === 'office' ? 'bg-amber-100 text-amber-700' :
                                    'bg-stone-100 text-stone-600'}`}>
                                  {addr.label || 'Address'}
                                </span>
                                {addr.isDefault && (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-forest-100 text-forest-700 font-body">Default</span>
                                )}
                              </div>
                              <p className="text-sm text-stone-600 font-body leading-snug">
                                {addr.street}, {addr.city}, {addr.state} – {addr.pinCode}
                              </p>
                              {addr.phone && (
                                <p className="text-xs text-stone-400 font-body mt-1 flex items-center gap-1">
                                  <Phone className="w-3 h-3" /> {addr.phone}
                                </p>
                              )}
                            </div>

                            {/* Selected checkmark */}
                            {selectedAddress === addr.id && (
                              <div className="flex-shrink-0">
                                <BadgeCheck className="w-5 h-5 text-forest-500" />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* CTA */}
                    <button
                      onClick={() => selectedAddress && setStep('payment')}
                      disabled={!selectedAddress}
                      className={`mt-5 w-full py-3.5 rounded-xl font-body font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-200
                        ${selectedAddress
                          ? 'text-white hover:opacity-90 active:scale-[0.98] shadow-btn hover:shadow-btn-hover'
                          : 'bg-stone-100 text-stone-400 cursor-not-allowed'}`}
                      style={selectedAddress ? { background: 'linear-gradient(135deg, #2d8a32 0%, #1e6e24 100%)' } : {}}
                    >
                      Continue to Payment <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* ── PAYMENT STEP ── */}
              {step === 'payment' && (
                <div className="bg-white rounded-2xl shadow-card border border-stone-100 overflow-hidden">
                  <div className="flex items-center gap-3 px-6 pt-6 pb-4 border-b border-stone-100">
                    <div className="w-9 h-9 rounded-xl bg-forest-50 flex items-center justify-center">
                      <CreditCard className="w-4.5 h-4.5 text-forest-600" />
                    </div>
                    <div>
                      <h2 className="font-display font-bold text-stone-900 text-base">Payment Method</h2>
                      <p className="text-xs text-stone-500 font-body">Choose how to pay</p>
                    </div>
                  </div>

                  <div className="px-6 py-5 space-y-5">
                    {/* Delivering to summary chip */}
                    {selectedAddr && (
                      <div className="flex items-center gap-2 bg-forest-50 border border-forest-200/60 rounded-xl px-4 py-2.5">
                        <MapPin className="w-4 h-4 text-forest-600 flex-shrink-0" />
                        <p className="text-sm font-body text-forest-800 truncate">
                          Delivering to <strong>{selectedAddr.fullName}</strong> · {selectedAddr.city}
                        </p>
                        <button onClick={() => setStep('address')} className="ml-auto text-xs text-forest-600 font-semibold font-body hover:underline flex-shrink-0">Change</button>
                      </div>
                    )}

                    {/* Payment options */}
                    <div className="space-y-3">
                      {[
                        { id: 'upi' as const, label: 'Pay by Scan (UPI)', desc: 'GPay, PhonePe, Paytm & all UPI apps', icon: '📱', badge: 'Recommended' },
                        { id: 'cod' as const, label: 'Cash on Delivery', desc: 'Pay when your order arrives', icon: '💵', badge: null },
                      ].map(opt => (
                        <div
                          key={opt.id}
                          onClick={() => setPaymentMethod(opt.id)}
                          className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200
                            ${paymentMethod === opt.id
                              ? 'border-forest-400 bg-forest-50/70 shadow-[0_0_0_1px_rgba(45,138,50,0.12)]'
                              : 'border-stone-200 hover:border-stone-300 hover:shadow-sm'}`}
                        >
                          <div className={`w-4.5 h-4.5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all
                            ${paymentMethod === opt.id ? 'border-forest-500 bg-forest-500' : 'border-stone-300'}`}>
                            {paymentMethod === opt.id && <div className="w-2 h-2 rounded-full bg-white" />}
                          </div>
                          <span className="text-2xl leading-none">{opt.icon}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold text-stone-800 font-body">{opt.label}</p>
                              {opt.badge && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-forest-100 text-forest-700 font-body">{opt.badge}</span>
                              )}
                            </div>
                            <p className="text-xs text-stone-500 font-body mt-0.5">{opt.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Order notes */}
                    <div>
                      <label className="text-sm font-semibold text-stone-700 font-body block mb-1.5">Order Notes <span className="font-normal text-stone-400">(optional)</span></label>
                      <textarea
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        placeholder="Any special instructions for delivery…"
                        className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm font-body bg-stone-50 focus:outline-none focus:border-forest-400 focus:bg-white focus:ring-2 focus:ring-forest-400/20 resize-none transition"
                        rows={2}
                      />
                    </div>

                    <button
                      onClick={() => setStep('confirm')}
                      className="w-full py-3.5 rounded-xl font-body font-semibold text-sm text-white flex items-center justify-center gap-2 transition-all duration-200 hover:opacity-90 active:scale-[0.98] shadow-btn hover:shadow-btn-hover"
                      style={{ background: 'linear-gradient(135deg, #2d8a32 0%, #1e6e24 100%)' }}
                    >
                      Review Order <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* ── REVIEW STEP ── */}
              {step === 'confirm' && (
                <div className="bg-white rounded-2xl shadow-card border border-stone-100 overflow-hidden">
                  <div className="flex items-center gap-3 px-6 pt-6 pb-4 border-b border-stone-100">
                    <div className="w-9 h-9 rounded-xl bg-forest-50 flex items-center justify-center">
                      <BadgeCheck className="w-4.5 h-4.5 text-forest-600" />
                    </div>
                    <div>
                      <h2 className="font-display font-bold text-stone-900 text-base">Review Order</h2>
                      <p className="text-xs text-stone-500 font-body">Confirm everything looks right</p>
                    </div>
                  </div>

                  <div className="px-6 py-5 space-y-5">
                    {/* Delivery + payment summary chips */}
                    <div className="grid grid-cols-2 gap-3">
                      {selectedAddr && (
                        <div className="bg-stone-50 border border-stone-100 rounded-xl p-3">
                          <p className="text-[10px] font-bold text-stone-500 uppercase tracking-wider font-body mb-1">Delivering to</p>
                          <p className="text-sm font-semibold text-stone-800 font-body">{selectedAddr.fullName}</p>
                          <p className="text-xs text-stone-500 font-body leading-snug">{selectedAddr.city}, {selectedAddr.state}</p>
                        </div>
                      )}
                      <div className="bg-stone-50 border border-stone-100 rounded-xl p-3">
                        <p className="text-[10px] font-bold text-stone-500 uppercase tracking-wider font-body mb-1">Payment</p>
                        <p className="text-sm font-semibold text-stone-800 font-body">{paymentMethod === 'upi' ? 'Pay by Scan (UPI)' : 'Cash on Delivery'}</p>
                        <p className="text-xs text-stone-500 font-body">{paymentMethod === 'upi' ? 'GPay / PhonePe / Paytm' : 'Pay on delivery'}</p>
                      </div>
                    </div>

                    {/* Items list */}
                    <div className="divide-y divide-stone-100">
                      {cart.items.map(item => (
                        <div key={item.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                          <div className="w-12 h-12 rounded-xl bg-stone-100 overflow-hidden flex-shrink-0 border border-stone-100">
                            {item.imageUrl
                              ? <img src={resolveAssetUrl(item.imageUrl)} alt="" className="w-full h-full object-cover" />
                              : <div className="w-full h-full flex items-center justify-center text-lg">🌿</div>}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-stone-800 font-body truncate">{item.productName}</p>
                            <p className="text-xs text-stone-400 font-body">Qty: {item.quantity} {item.unit}</p>
                          </div>
                          <p className="text-sm font-bold text-stone-900 font-body flex-shrink-0">₹{item.total.toFixed(0)}</p>
                        </div>
                      ))}
                    </div>

                    {/* Place order CTA */}
                    <button
                      onClick={handlePlaceOrder}
                      disabled={placingOrder}
                      className="w-full py-4 rounded-xl font-body font-bold text-base text-white flex items-center justify-center gap-2 transition-all duration-200 hover:opacity-90 active:scale-[0.98] disabled:opacity-60 shadow-btn hover:shadow-btn-hover"
                      style={{ background: 'linear-gradient(135deg, #2d8a32 0%, #1e6e24 100%)' }}
                    >
                      {placingOrder
                        ? <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Placing Order…</>
                        : <>Place Order · ₹{total.toFixed(0)}</>}
                    </button>

                    {/* Back link */}
                    <button onClick={() => setStep('payment')} className="w-full text-center text-sm text-stone-400 font-body hover:text-stone-600 transition-colors flex items-center justify-center gap-1">
                      ← Back to Payment
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* ════════════════════ RIGHT PANEL — ORDER SUMMARY ════════════════════ */}
            <div className="lg:sticky lg:top-6 space-y-4 animate-fade-up" style={{ animationDelay: '0.08s' }}>

              {/* Summary card */}
              <div className="bg-white rounded-2xl shadow-card border border-stone-100 overflow-hidden">
                <div className="px-5 pt-5 pb-4 border-b border-stone-100">
                  <h3 className="font-display font-bold text-stone-900 text-base">Order Summary</h3>
                  <p className="text-xs text-stone-500 font-body mt-0.5">{cart.items.length} item{cart.items.length !== 1 ? 's' : ''}</p>
                </div>

                {/* Mini product preview */}
                <div className="px-5 py-4 space-y-3 border-b border-stone-100">
                  {previewItems.map(item => (
                    <div key={item.id} className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-stone-100 overflow-hidden flex-shrink-0 border border-stone-100">
                        {item.imageUrl
                          ? <img src={resolveAssetUrl(item.imageUrl)} alt="" className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center text-sm">🌿</div>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-stone-800 font-body truncate">{item.productName}</p>
                        <p className="text-[10px] text-stone-400 font-body">×{item.quantity}</p>
                      </div>
                      <p className="text-xs font-bold text-stone-900 font-body flex-shrink-0">₹{item.total.toFixed(0)}</p>
                    </div>
                  ))}
                  {cart.items.length > 3 && (
                    <p className="text-xs text-stone-400 font-body text-center">+{cart.items.length - 3} more item{cart.items.length - 3 > 1 ? 's' : ''}</p>
                  )}
                </div>

                {/* Coupon section */}
                <div className="px-5 py-4 border-b border-stone-100">
                  {couponApplied ? (
                    <div className="flex items-center justify-between bg-forest-50 border border-forest-200 rounded-xl px-3.5 py-2.5">
                      <div className="flex items-center gap-2">
                        <Tag className="w-4 h-4 text-forest-600" />
                        <span className="text-sm font-semibold text-forest-700 font-body">{couponCode}</span>
                        <span className="text-xs text-forest-600 font-body">- ₹{discount.toFixed(0)} saved</span>
                      </div>
                      <button onClick={removeCoupon} className="w-5 h-5 rounded-full bg-forest-200/60 flex items-center justify-center hover:bg-red-100 group transition-colors">
                        <X className="w-3 h-3 text-forest-700 group-hover:text-red-500 transition-colors" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400" />
                        <input
                          placeholder="Coupon code"
                          value={couponCode}
                          onChange={e => setCouponCode(e.target.value.toUpperCase())}
                          onKeyDown={e => e.key === 'Enter' && applyCoupon()}
                          className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-stone-200 text-sm font-body bg-stone-50 focus:outline-none focus:border-forest-400 focus:bg-white focus:ring-2 focus:ring-forest-400/20 transition"
                        />
                      </div>
                      <button
                        onClick={applyCoupon}
                        disabled={couponLoading || !couponCode.trim()}
                        className="px-4 py-2.5 rounded-xl border-2 border-forest-400 text-forest-600 text-sm font-semibold font-body hover:bg-forest-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                      >
                        {couponLoading ? <span className="w-3.5 h-3.5 border-2 border-forest-400/30 border-t-forest-500 rounded-full animate-spin inline-block" /> : 'Apply'}
                      </button>
                    </div>
                  )}
                </div>

                {/* Price breakdown */}
                <div className="px-5 py-4 space-y-2.5">
                  {[
                    { label: 'Subtotal', value: `₹${subtotal.toFixed(0)}`, style: 'text-stone-600' },
                    { label: 'Delivery', value: delivery === 0 ? 'Free' : `₹${delivery}`, style: delivery === 0 ? 'text-forest-600 font-semibold' : 'text-stone-600' },
                    ...(discount > 0 ? [{ label: 'Discount', value: `-₹${discount.toFixed(0)}`, style: 'text-forest-600 font-semibold' }] : []),
                    { label: 'Tax (5%)', value: `₹${tax.toFixed(0)}`, style: 'text-stone-600' },
                  ].map(row => (
                    <div key={row.label} className="flex items-center justify-between text-sm font-body">
                      <span className="text-stone-500">{row.label}</span>
                      <span className={row.style}>{row.value}</span>
                    </div>
                  ))}

                  <div className="h-px bg-stone-100 my-1" />

                  <div className="flex items-center justify-between">
                    <span className="text-base font-bold text-stone-900 font-body">Total</span>
                    <span className="text-xl font-bold text-stone-900 font-display">₹{total.toFixed(0)}</span>
                  </div>

                  {delivery > 0 && (
                    <div className="flex items-center gap-2 bg-amber-50 border border-amber-200/60 rounded-xl px-3 py-2 mt-1">
                      <Truck className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                      <p className="text-xs text-amber-700 font-body">Add ₹{(500 - subtotal).toFixed(0)} more for free delivery!</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Trust badges */}
              <div className="bg-white rounded-2xl border border-stone-100 shadow-card px-5 py-4">
                <div className="space-y-2.5">
                  {[
                    { icon: ShieldCheck, text: 'Secure Checkout',      sub: '256-bit SSL encrypted',    color: 'text-forest-600', bg: 'bg-forest-50' },
                    { icon: Truck,       text: 'Same Day Delivery',     sub: 'Order before 2PM',         color: 'text-blue-600',   bg: 'bg-blue-50'   },
                    { icon: Leaf,        text: '100% Organic',          sub: 'Certified fresh produce',  color: 'text-amber-600',  bg: 'bg-amber-50'  },
                  ].map(t => (
                    <div key={t.text} className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-xl ${t.bg} flex items-center justify-center flex-shrink-0`}>
                        <t.icon className={`w-4 h-4 ${t.color}`} />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-stone-800 font-body leading-tight">{t.text}</p>
                        <p className="text-[10px] text-stone-400 font-body">{t.sub}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── UPI QR Payment Overlay ── */}
        {upiQr && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden">
              {upiPaid ? (
                <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                  <div className="w-20 h-20 rounded-full bg-forest-100 flex items-center justify-center mb-4 animate-bounce">
                    <CheckCircle className="w-10 h-10 text-forest-600" />
                  </div>
                  <h3 className="text-xl font-display font-bold text-stone-900 mb-1">Payment Received!</h3>
                  <p className="text-stone-500 font-body text-sm">Redirecting to your order…</p>
                </div>
              ) : (
                <>
                  <div className="bg-gradient-to-r from-forest-700 to-forest-500 px-5 py-4 flex items-center justify-between">
                    <div>
                      <p className="text-white/70 text-xs font-body">Order #{upiQr.orderNumber}</p>
                      <p className="text-white text-xl font-display font-bold">₹{upiQr.amount.toFixed(0)}</p>
                    </div>
                    <div className="flex items-center gap-2 bg-white/20 rounded-xl px-3 py-1.5">
                      <Timer className="w-4 h-4 text-white" />
                      <span className="text-white font-body text-sm font-semibold">
                        {Math.floor(qrTimeLeft / 60)}:{String(qrTimeLeft % 60).padStart(2, '0')}
                      </span>
                    </div>
                  </div>

                  <div className="px-6 py-5 text-center">
                    <p className="text-xs text-stone-500 font-body mb-3">Scan with any UPI app to pay</p>
                    <div className="inline-block p-3 border-2 border-stone-100 rounded-2xl shadow-inner bg-stone-50 mb-4">
                      <img src={upiQr.qrCodeImage} alt="UPI QR Code" className="w-52 h-52 object-contain" />
                    </div>

                    <div className="flex items-center gap-2 bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 mb-4">
                      <QrCode className="w-4 h-4 text-stone-400 flex-shrink-0" />
                      <p className="text-xs text-stone-600 font-body truncate flex-1">{upiQr.upiString}</p>
                      <button
                        onClick={() => { navigator.clipboard.writeText(upiQr.upiString); toast.success('UPI ID copied!') }}
                        className="flex-shrink-0 p-1 hover:bg-stone-200 rounded-lg transition-colors"
                        title="Copy UPI string"
                      >
                        <Copy className="w-3.5 h-3.5 text-stone-500" />
                      </button>
                    </div>

                    {upiPolling && !showTxnInput && (
                      <div className="flex items-center justify-center gap-2 text-sm text-stone-500 font-body mb-4">
                        <span className="w-3.5 h-3.5 border-2 border-forest-400/30 border-t-forest-500 rounded-full animate-spin" />
                        Waiting for payment…
                      </div>
                    )}

                    {qrTimeLeft === 0 && (
                      <p className="text-xs text-red-500 font-body mb-3">QR expired. Please go back and retry.</p>
                    )}

                    {!showTxnInput ? (
                      <button
                        onClick={() => setShowTxnInput(true)}
                        className="w-full py-2.5 rounded-xl border-2 border-forest-400 text-forest-600 text-sm font-semibold font-body hover:bg-forest-50 transition-colors mb-2"
                      >
                        I have paid — Enter Transaction ID
                      </button>
                    ) : (
                      <div className="space-y-2 mb-2">
                        <input
                          type="text"
                          placeholder="UPI Transaction ID (e.g. 123456789012)"
                          value={upiTxnRef}
                          onChange={e => setUpiTxnRef(e.target.value)}
                          className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm font-body bg-stone-50 focus:outline-none focus:border-forest-400 focus:ring-2 focus:ring-forest-400/20 transition"
                        />
                        <button
                          onClick={handleConfirmUpiManual}
                          disabled={!upiTxnRef.trim() || confirmingUpi}
                          className="w-full py-2.5 rounded-xl font-body font-semibold text-sm text-white flex items-center justify-center gap-2 transition-all duration-200 hover:opacity-90 disabled:opacity-50 shadow-btn"
                          style={{ background: 'linear-gradient(135deg, #2d8a32 0%, #1e6e24 100%)' }}
                        >
                          {confirmingUpi
                            ? <><span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />Verifying…</>
                            : 'Confirm Payment'}
                        </button>
                        <button onClick={() => setShowTxnInput(false)} className="w-full text-center text-xs text-stone-400 font-body hover:text-stone-600 transition-colors">Cancel</button>
                      </div>
                    )}

                    <p className="text-[10px] text-stone-400 font-body">
                      Supported: GPay · PhonePe · Paytm · BHIM · Any UPI App
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* ── Mobile sticky bottom CTA ── */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-stone-200 px-4 py-3 shadow-[0_-4px_24px_rgba(0,0,0,0.10)]">
          <button
            onClick={() => {
              if (step === 'address' && selectedAddress) setStep('payment')
              else if (step === 'payment') setStep('confirm')
              else if (step === 'confirm') handlePlaceOrder()
            }}
            disabled={step === 'address' && !selectedAddress || placingOrder}
            className="w-full py-3.5 rounded-xl font-body font-bold text-sm text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-btn"
            style={{ background: 'linear-gradient(135deg, #2d8a32 0%, #1e6e24 100%)' }}
          >
            {placingOrder
              ? <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Placing…</>
              : step === 'confirm'
              ? <>Place Order · ₹{total.toFixed(0)}</>
              : <>Continue · ₹{total.toFixed(0)} <ChevronRight className="w-4 h-4" /></>}
          </button>
        </div>
      </div>
    </PageLayout>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ORDERS PAGE
// ─────────────────────────────────────────────────────────────────────────────
const STATUS_STEPS = ['pending', 'confirmed', 'processing', 'shipped', 'delivered']
const STATUS_ICONS: Record<string, React.ElementType> = {
  pending: Clock, confirmed: CheckCircle, processing: Package, shipped: Truck, delivered: Home
}

export const OrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    orderApi.getAll().then(res => { setOrders(res.items); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return <PageLayout><div className="flex justify-center py-20"><Spinner size="lg" /></div></PageLayout>

  return (
    <PageLayout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold text-gray-900 tracking-tight">My Orders</h1>
          <p className="text-sm text-gray-500 font-body mt-1">{orders.length} order{orders.length !== 1 ? 's' : ''} placed</p>
        </div>

        {orders.length === 0 ? (
          <EmptyState icon={<Package className="w-12 h-12 text-gray-300" />} title="No orders yet"
            description="Start shopping and your orders will appear here."
            action={<Link to="/products"><Button>Shop Now</Button></Link>} />
        ) : (
          <div className="space-y-4">
            {orders.map(order => {
              const idx = STATUS_STEPS.indexOf(order.status)
              const cancelled = order.status === 'cancelled'
              const delivered = order.status === 'delivered'
              const accentColor = cancelled ? 'border-l-red-400' : delivered ? 'border-l-leaf-500' : 'border-l-amber-400'

              return (
                <Link key={order.id} to={`/orders/${order.id}`} className="block group">
                  <div className={`bg-white rounded-2xl shadow-card hover:shadow-card-hover transition-all duration-200 border-l-4 ${accentColor} overflow-hidden`}>

                    {/* Top row */}
                    <div className="px-5 pt-4 pb-3 flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-bold text-gray-900 font-body tracking-wide">{order.orderNumber}</p>
                          <StatusBadge status={order.status} />
                        </div>
                        <p className="text-xs text-gray-500 font-body mt-1">
                          {new Date(order.createdAt).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                          <span className="mx-1.5 text-gray-300">·</span>
                          {order.itemCount} item{(order.itemCount ?? 0) > 1 ? 's' : ''}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-lg font-bold text-gray-900 font-body leading-tight">₹{order.totalAmount.toFixed(0)}</p>
                        <p className="text-[11px] text-gray-400 font-body mt-0.5">Total paid</p>
                      </div>
                    </div>

                    {/* Divider */}
                    <div className="mx-5 border-t border-gray-100" />

                    {/* Mini tracker */}
                    <div className="px-5 py-3.5">
                      {cancelled ? (
                        <div className="flex items-center gap-2 text-red-500">
                          <X className="w-4 h-4 flex-shrink-0" />
                          <span className="text-xs font-semibold font-body">Order Cancelled</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          {STATUS_STEPS.map((s, i) => {
                            const reached = i <= idx
                            const Icon = STATUS_ICONS[s]
                            return (
                              <React.Fragment key={s}>
                                <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
                                  <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                                    reached
                                      ? 'bg-forest-700 text-white shadow-sm'
                                      : 'bg-white text-red-400 border-2 border-red-300'
                                  }`}>
                                    <Icon className="w-3 h-3" />
                                  </div>
                                  <span className={`text-[9px] font-body capitalize text-center leading-tight ${
                                    reached ? 'text-forest-800 font-semibold' : 'text-red-400'
                                  }`}>{s}</span>
                                </div>
                                {i < STATUS_STEPS.length - 1 && (
                                  <div className="flex-1 h-0.5 mb-3 rounded-full overflow-hidden bg-red-200">
                                    <div className={`h-full bg-forest-700 rounded-full transition-all duration-500 ${i < idx ? 'w-full' : 'w-0'}`} />
                                  </div>
                                )}
                              </React.Fragment>
                            )
                          })}
                        </div>
                      )}
                    </div>

                    {/* Footer CTA */}
                    <div className="px-5 pb-3.5 flex items-center justify-end">
                      <span className="text-xs font-semibold text-leaf-600 font-body group-hover:text-leaf-700 flex items-center gap-1 transition-colors">
                        View Details <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </span>
                    </div>

                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </PageLayout>
  )
}

export const OrderDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState(false)
  const [now, setNow] = useState(Date.now())
  const navigate = useNavigate()

  useEffect(() => {
    if (!id) return
    orderApi.getById(Number(id)).then(o => { setOrder(o); setLoading(false) }).catch(() => setLoading(false))
  }, [id])

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!id) return
    if (searchParams.get('success') === '1') {
      toast.success('Order placed successfully!')
      navigate(`/orders/${id}`, { replace: true })
    }
  }, [id, navigate, searchParams])

  const handleCancel = async () => {
    if (!order || !confirm('Cancel this order?')) return
    setCancelling(true)
    try {
      await orderApi.cancel(order.id)
      setOrder({ ...order, status: 'cancelled' })
      toast.success('Order cancelled')
    } catch {
      toast.error('Could not cancel order')
    } finally {
      setCancelling(false)
    }
  }

  if (loading) return <PageLayout><div className="flex justify-center py-20"><Spinner size="lg" /></div></PageLayout>
  if (!order) return <PageLayout><EmptyState title="Order not found" action={<Link to="/orders"><Button>My Orders</Button></Link>} /></PageLayout>

  const currentIdx = STATUS_STEPS.indexOf(order.status)
  const cancelDeadline = new Date(order.createdAt).getTime() + 5 * 60 * 1000
  const canCancelOrder = order.status === 'pending' && now <= cancelDeadline
  const cancelMinutesLeft = Math.max(0, Math.ceil((cancelDeadline - now) / 60000))
  const deliveryDate = order.estimatedDelivery
    ? new Date(order.estimatedDelivery).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : null

  return (
    <PageLayout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-4">

        {/* ── Header ── */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/orders')}
            aria-label="Back to orders"
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 shadow-sm transition-all group"
          >
            <ChevronRight className="w-4 h-4 text-gray-500 rotate-180 group-hover:-translate-x-0.5 transition-transform" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl font-display font-bold text-gray-900 tracking-tight">{order.orderNumber}</h1>
              <StatusBadge status={order.status} />
            </div>
            <p className="text-sm text-gray-500 font-body mt-0.5">
              {new Date(order.createdAt).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>

        {/* ── Status Tracker ── */}
        {order.status !== 'cancelled' && (
          <div className="bg-white rounded-2xl shadow-card overflow-hidden">
            <div className="bg-gradient-to-r from-forest-50 to-sage-50 px-5 pt-5 pb-6">
              <div className="flex items-start">
                {STATUS_STEPS.map((s, i) => {
                  const reached = i <= currentIdx
                  const Icon = STATUS_ICONS[s]
                  return (
                    <React.Fragment key={s}>
                      <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                          reached
                            ? 'bg-forest-700 text-white shadow-sm'
                            : 'bg-white text-red-400 border-2 border-red-300'
                        }`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className={`text-[10px] font-body text-center capitalize leading-tight select-none ${
                          reached ? 'text-forest-800 font-semibold' : 'text-red-400 font-medium'
                        }`}>{s}</span>
                      </div>
                      {i < STATUS_STEPS.length - 1 && (
                        <div className="flex-1 h-0.5 mt-5 mx-0.5 rounded-full overflow-hidden bg-red-200">
                          <div className={`h-full bg-forest-700 rounded-full transition-all duration-700 ${i < currentIdx ? 'w-full' : 'w-0'}`} />
                        </div>
                      )}
                    </React.Fragment>
                  )
                })}
              </div>
            </div>
            {deliveryDate && order.status !== 'delivered' && (
              <div className="flex items-center justify-center gap-2 px-5 py-3 border-t border-gray-100">
                <Truck className="w-4 h-4 text-forest-700 flex-shrink-0" />
                <p className="text-sm text-gray-600 font-body">
                  Expected by <strong className="text-gray-900">{deliveryDate}</strong>
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── Items ── */}
        <div className="bg-white rounded-2xl shadow-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 bg-leaf-50 rounded-lg flex items-center justify-center flex-shrink-0">
              <Package className="w-3.5 h-3.5 text-leaf-600" />
            </div>
            <h3 className="font-display font-semibold text-gray-800">Items</h3>
            <span className="ml-0.5 text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-body font-medium">{order.items.length}</span>
          </div>
          <div className="divide-y divide-gray-50">
            {order.items.map(item => (
              <div key={item.id} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0 group">
                <div className="w-14 h-14 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0 ring-1 ring-gray-200 group-hover:ring-leaf-200 transition-all">
                  {item.imageUrl
                    ? <img src={resolveAssetUrl(item.imageUrl)} alt={item.productName} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-2xl">🌿</div>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 font-body truncate">{item.productName}</p>
                  <p className="text-xs text-gray-500 font-body mt-0.5">{item.quantity} {item.unit} × ₹{item.unitPrice}</p>
                </div>
                <p className="text-sm font-bold text-gray-900 font-body">₹{item.totalPrice.toFixed(0)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Address + Bill ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Delivery Address */}
          <div className="bg-white rounded-2xl shadow-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 bg-leaf-50 rounded-lg flex items-center justify-center flex-shrink-0">
                <MapPin className="w-3.5 h-3.5 text-leaf-600" />
              </div>
              <h3 className="font-display font-semibold text-gray-800">Delivery Address</h3>
            </div>
            <div className="space-y-0.5 pl-9">
              <p className="text-sm font-semibold text-gray-900 font-body">{order.address.fullName}</p>
              <p className="text-sm text-gray-500 font-body leading-snug">{order.address.street}</p>
              <p className="text-sm text-gray-500 font-body">{order.address.city}, {order.address.state}</p>
              <p className="text-sm font-medium text-gray-600 font-body">{order.address.pinCode}</p>
            </div>
          </div>

          {/* Bill Summary */}
          <div className="bg-white rounded-2xl shadow-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 bg-leaf-50 rounded-lg flex items-center justify-center flex-shrink-0">
                <CreditCard className="w-3.5 h-3.5 text-leaf-600" />
              </div>
              <h3 className="font-display font-semibold text-gray-800">Bill Summary</h3>
            </div>
            <div className="space-y-2 text-sm font-body pl-9">
              <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>₹{order.subtotal.toFixed(0)}</span></div>
              <div className="flex justify-between text-gray-600">
                <span>Delivery</span>
                <span className={order.deliveryCharge === 0 ? 'text-leaf-600 font-medium' : ''}>
                  {order.deliveryCharge === 0 ? 'Free' : `₹${order.deliveryCharge}`}
                </span>
              </div>
              {order.discountAmount > 0 && (
                <div className="flex justify-between text-leaf-600 font-medium"><span>Discount</span><span>−₹{order.discountAmount.toFixed(0)}</span></div>
              )}
              <div className="flex justify-between text-gray-600"><span>Tax</span><span>₹{order.taxAmount.toFixed(0)}</span></div>
              <div className="flex justify-between font-bold text-gray-900 border-t border-gray-100 pt-2.5 mt-1">
                <span className="text-[15px]">Total</span>
                <span className="text-[15px]">₹{order.totalAmount.toFixed(0)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Payment strip ── */}
        <div className="bg-white rounded-2xl shadow-card px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-600 font-body">
            <CreditCard className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <span>Paid via <span className="font-semibold text-gray-800">
              {order.paymentMethod === 'cod' ? 'Cash on Delivery' : order.paymentMethod.charAt(0).toUpperCase() + order.paymentMethod.slice(1)}
            </span></span>
          </div>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full font-body capitalize ${
            order.paymentStatus === 'paid'    ? 'bg-green-50 text-green-700' :
            order.paymentStatus === 'pending' ? 'bg-amber-50 text-amber-700' :
            order.paymentStatus === 'failed'  ? 'bg-red-50 text-red-600' :
            'bg-gray-100 text-gray-600'
          }`}>
            {order.paymentStatus}
          </span>
        </div>

        {/* ── Cancel ── */}
        {order.status === 'pending' && (
          <div className="space-y-2 pt-1">
            {canCancelOrder ? (
              <>
                <Button variant="danger" loading={cancelling} onClick={handleCancel} className="w-full sm:w-auto">
                  <X className="w-4 h-4" /> Cancel Order
                </Button>
                <p className="text-xs text-gray-500 font-body">
                  You can cancel for the next {cancelMinutesLeft} minute{cancelMinutesLeft === 1 ? '' : 's'}.
                </p>
              </>
            ) : (
              <p className="text-sm text-gray-500 font-body bg-gray-50 rounded-xl px-4 py-3">
                This order can only be cancelled within 5 minutes of placing it.
              </p>
            )}
          </div>
        )}

      </div>
    </PageLayout>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// PROFILE PAGE
// ─────────────────────────────────────────────────────────────────────────────
export const ProfilePage: React.FC = () => {
  const { user, setUser } = useAuthStore()
  const fileRef = React.useRef<HTMLInputElement>(null)
  const [tab, setTab] = useState('profile')
  const [form, setForm] = useState({ name: user?.name || '', email: user?.email || '', phone: user?.phone || '' })
  const [saving, setSaving] = useState(false)
  const [addresses, setAddresses] = useState<Address[]>([])
  const [showAddrModal, setShowAddrModal] = useState(false)
  const [editAddr, setEditAddr] = useState<Address | null>(null)
  const [addrForm, setAddrForm] = useState<Partial<Address>>({})

  useEffect(() => { userApi.getAddresses().then(setAddresses) }, [])

  const saveProfile = async () => {
    setSaving(true)
    try {
      const updated = await userApi.updateProfile(form)
      setUser({ ...user!, ...updated })
      toast.success('Profile updated!')
    } finally { setSaving(false) }
  }

  const handleAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const fd = new FormData(); fd.append('file', file)
    try {
      const res = await userApi.uploadAvatar(fd)
      setUser({ ...user!, avatarUrl: res.url })
      toast.success('Avatar updated!')
    } catch { toast.error('Upload failed') }
  }

  const saveAddress = async () => {
    if (editAddr?.id) {
      const updated = await userApi.updateAddress(editAddr.id, addrForm as any)
      setAddresses(a => a.map(x => x.id === editAddr.id ? updated : x))
    } else {
      const created = await userApi.createAddress(addrForm as any)
      setAddresses(a => [...a, created])
    }
    setShowAddrModal(false)
  }

  const initials = user?.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?'
  const TABS = [
    { id: 'profile',   label: 'Profile',   icon: User },
    { id: 'addresses', label: 'Addresses', icon: MapPin },
    { id: 'security',  label: 'Security',  icon: CreditCard },
  ]

  return (
    <PageLayout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-6">

        {/* ── Hero Header Card ─────────────────────────────────────────── */}
        <div className="relative bg-gradient-to-br from-forest-800 via-forest-700 to-forest-600 rounded-3xl p-6 sm:p-8 overflow-hidden shadow-xl">
          {/* decorative blobs */}
          <div className="absolute -top-12 -right-12 w-56 h-56 bg-white/5 rounded-full pointer-events-none" />
          <div className="absolute -bottom-8 -left-8 w-40 h-40 bg-white/5 rounded-full pointer-events-none" />
          <div className="absolute top-1/2 right-24 -translate-y-1/2 w-20 h-20 bg-white/5 rounded-full pointer-events-none" />

          <div className="relative flex flex-col sm:flex-row sm:items-center gap-5">
            {/* Avatar */}
            <div className="relative self-start sm:self-auto flex-shrink-0">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white/15 border-2 border-white/25 overflow-hidden flex items-center justify-center shadow-lg">
                {user?.avatarUrl
                  ? <img src={resolveAssetUrl(user.avatarUrl)} alt={user.name} className="w-full h-full object-cover" />
                  : <span className="text-3xl sm:text-4xl font-bold font-display text-white">{initials}</span>
                }
              </div>
              <button
                onClick={() => fileRef.current?.click()}
                className="absolute -bottom-1.5 -right-1.5 bg-white text-forest-700 rounded-full p-1.5 shadow-md hover:shadow-lg hover:scale-110 active:scale-95 transition-all"
                title="Change photo"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatar} />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-display font-bold text-white leading-tight truncate">{user?.name || 'Your Name'}</h1>
              <p className="text-forest-200 text-sm font-body mt-0.5 truncate">{user?.email || user?.phone || '—'}</p>
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/15 border border-white/20 rounded-full text-xs font-label font-semibold text-white capitalize tracking-wide">
                  <span className="w-1.5 h-1.5 rounded-full bg-forest-300" />
                  {user?.role || 'Customer'}
                </span>
                {user?.phone && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 rounded-full text-xs font-body text-forest-100">
                    <Phone className="w-3 h-3" /> {user.phone}
                  </span>
                )}
              </div>
            </div>

            {/* Edit hint */}
            <button
              onClick={() => setTab('profile')}
              className="hidden sm:flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-sm font-label font-medium text-white transition-all active:scale-95 self-start"
            >
              <Edit2 className="w-3.5 h-3.5" /> Edit Profile
            </button>
          </div>

          {/* Stats strip */}
          <div className="relative mt-6 grid grid-cols-3 divide-x divide-white/10 bg-white/10 rounded-2xl overflow-hidden">
            {[
                { label: 'Addresses', value: addresses.length },
                { label: 'Account Type', value: user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : '—' },
                { label: 'Status', value: 'Verified' },
              ].map(stat => (
              <div key={stat.label} className="flex flex-col items-center py-3 px-2">
                <span className="text-lg font-display font-bold text-white">{stat.value}</span>
                <span className="text-[11px] text-forest-200 font-body mt-0.5 text-center">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Pill Tabs ────────────────────────────────────────────────── */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-label font-semibold whitespace-nowrap transition-all duration-200 ${
                tab === id
                  ? 'bg-forest-700 text-white shadow-md'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200 hover:text-stone-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* ── Profile Tab ──────────────────────────────────────────────── */}
        {tab === 'profile' && (
          <div className="bg-white rounded-3xl shadow-sm border border-stone-100 overflow-hidden">
            <div className="px-6 py-5 border-b border-stone-100 flex items-center gap-3">
              <div className="w-9 h-9 bg-forest-50 rounded-xl flex items-center justify-center">
                <User className="w-4.5 h-4.5 text-forest-700" />
              </div>
              <div>
                <h2 className="font-label font-bold text-stone-900 text-base">Personal Information</h2>
                <p className="text-xs text-stone-400 font-body">Update your name, email and phone</p>
              </div>
            </div>
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Full Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-label font-semibold text-stone-500 uppercase tracking-wide flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" /> Full Name
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Your full name"
                    className="w-full px-4 py-3 border border-stone-200 rounded-xl text-sm font-body text-stone-800 placeholder-stone-300 bg-stone-50 focus:bg-white focus:border-forest-500 focus:ring-2 focus:ring-forest-100 outline-none transition-all"
                  />
                </div>
                {/* Email */}
                <div className="space-y-1.5">
                  <label className="text-xs font-label font-semibold text-stone-500 uppercase tracking-wide flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5" /> Email Address
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="you@email.com"
                    className="w-full px-4 py-3 border border-stone-200 rounded-xl text-sm font-body text-stone-800 placeholder-stone-300 bg-stone-50 focus:bg-white focus:border-forest-500 focus:ring-2 focus:ring-forest-100 outline-none transition-all"
                  />
                </div>
                {/* Phone */}
                <div className="space-y-1.5">
                  <label className="text-xs font-label font-semibold text-stone-500 uppercase tracking-wide flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5" /> Phone Number
                  </label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    placeholder="+91 XXXXX XXXXX"
                    className="w-full px-4 py-3 border border-stone-200 rounded-xl text-sm font-body text-stone-800 placeholder-stone-300 bg-stone-50 focus:bg-white focus:border-forest-500 focus:ring-2 focus:ring-forest-100 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={saveProfile}
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-3 bg-forest-700 hover:bg-forest-600 active:scale-95 disabled:opacity-60 text-white text-sm font-label font-semibold rounded-xl shadow-md hover:shadow-lg transition-all duration-200"
                >
                  {saving ? <Spinner size="sm" /> : <Save className="w-4 h-4" />}
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Addresses Tab ────────────────────────────────────────────── */}
        {tab === 'addresses' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="font-label font-bold text-stone-900 text-lg">Saved Addresses</h2>
                <p className="text-xs text-stone-400 font-body mt-0.5">{addresses.length} address{addresses.length !== 1 ? 'es' : ''} saved</p>
              </div>
              <button
                onClick={() => { setEditAddr(null); setAddrForm({}); setShowAddrModal(true) }}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-forest-700 hover:bg-forest-600 active:scale-95 text-white text-sm font-label font-semibold rounded-xl shadow-sm transition-all"
              >
                <Plus className="w-4 h-4" /> Add New
              </button>
            </div>

            {addresses.length === 0 ? (
              <div className="bg-white rounded-3xl border border-stone-100 shadow-sm p-12 flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-stone-50 rounded-2xl flex items-center justify-center mb-4">
                  <MapPin className="w-7 h-7 text-stone-300" strokeWidth={1.5} />
                </div>
                <p className="font-display text-lg text-stone-600 mb-1">No addresses yet</p>
                <p className="text-sm text-stone-400 font-body mb-5">Add a delivery address to speed up checkout</p>
                <button
                  onClick={() => { setEditAddr(null); setAddrForm({}); setShowAddrModal(true) }}
                  className="flex items-center gap-1.5 px-5 py-2.5 bg-forest-700 text-white text-sm font-label font-semibold rounded-xl shadow-sm hover:bg-forest-600 transition-all"
                >
                  <Plus className="w-4 h-4" /> Add Address
                </button>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {addresses.map(addr => (
                  <div
                    key={addr.id}
                    className={`relative bg-white rounded-2xl border-2 p-5 shadow-sm transition-all hover:shadow-md ${
                      addr.isDefault ? 'border-forest-400 bg-forest-50/30' : 'border-stone-100'
                    }`}
                  >
                    {addr.isDefault && (
                      <span className="absolute top-4 right-4 inline-flex items-center gap-1 px-2 py-0.5 bg-forest-100 text-forest-700 text-[10px] font-label font-bold rounded-full uppercase tracking-wide">
                        <CheckCircle className="w-3 h-3" /> Default
                      </span>
                    )}
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-9 h-9 bg-forest-50 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Home className="w-4 h-4 text-forest-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-label font-bold text-stone-800 text-sm capitalize">{addr.label}</p>
                        <p className="text-sm font-body text-stone-600 mt-0.5">{addr.fullName}</p>
                      </div>
                    </div>
                    <div className="space-y-0.5 ml-12">
                      <p className="text-sm text-stone-500 font-body">{addr.street}</p>
                      <p className="text-sm text-stone-500 font-body">{addr.city}, {addr.state} – {addr.pinCode}</p>
                      {addr.phone && <p className="text-sm text-stone-400 font-body">{addr.phone}</p>}
                    </div>
                    <div className="flex items-center gap-3 mt-4 pt-3 border-t border-stone-100">
                      <button
                        onClick={() => { setEditAddr(addr); setAddrForm(addr); setShowAddrModal(true) }}
                        className="flex items-center gap-1 text-xs font-label font-semibold text-forest-700 hover:text-forest-600 transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" /> Edit
                      </button>
                      <button
                        onClick={async () => { await userApi.deleteAddress(addr.id); setAddresses(a => a.filter(x => x.id !== addr.id)) }}
                        className="flex items-center gap-1 text-xs font-label font-semibold text-red-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </button>
                      {!addr.isDefault && (
                        <button
                          onClick={async () => { await userApi.setDefaultAddress(addr.id); setAddresses(a => a.map(x => ({ ...x, isDefault: x.id === addr.id }))) }}
                          className="ml-auto text-xs font-label font-semibold text-stone-400 hover:text-forest-700 transition-colors"
                        >
                          Set Default
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {showAddrModal && (
              <Modal isOpen onClose={() => setShowAddrModal(false)} title={editAddr ? 'Edit Address' : 'Add New Address'}>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <Input label="Label" placeholder="Home / Work" value={addrForm.label || ''} onChange={e => setAddrForm(f => ({ ...f, label: e.target.value }))} />
                    <Input label="Full Name" value={addrForm.fullName || ''} onChange={e => setAddrForm(f => ({ ...f, fullName: e.target.value }))} />
                  </div>
                  <Input label="Phone" value={addrForm.phone || ''} onChange={e => setAddrForm(f => ({ ...f, phone: e.target.value }))} />
                  <Input label="Street / Area" value={addrForm.street || ''} onChange={e => setAddrForm(f => ({ ...f, street: e.target.value }))} />
                  <div className="grid grid-cols-2 gap-3">
                    <Input label="City" value={addrForm.city || ''} onChange={e => setAddrForm(f => ({ ...f, city: e.target.value }))} />
                    <Input label="State" value={addrForm.state || ''} onChange={e => setAddrForm(f => ({ ...f, state: e.target.value }))} />
                  </div>
                  <Input label="Pincode" value={addrForm.pinCode || ''} onChange={e => setAddrForm(f => ({ ...f, pinCode: e.target.value }))} />
                  <div className="flex gap-3 pt-1">
                    <Button variant="outline" className="flex-1" onClick={() => setShowAddrModal(false)}>Cancel</Button>
                    <Button className="flex-1" onClick={saveAddress}><Save className="w-4 h-4" /> Save</Button>
                  </div>
                </div>
              </Modal>
            )}
          </div>
        )}

        {/* ── Security Tab ─────────────────────────────────────────────── */}
        {tab === 'security' && (
          <div className="bg-white rounded-3xl shadow-sm border border-stone-100 overflow-hidden">
            <div className="px-6 py-5 border-b border-stone-100 flex items-center gap-3">
              <div className="w-9 h-9 bg-forest-50 rounded-xl flex items-center justify-center">
                <CreditCard className="w-4.5 h-4.5 text-forest-700" />
              </div>
              <div>
                <h2 className="font-label font-bold text-stone-900 text-base">Security Settings</h2>
                <p className="text-xs text-stone-400 font-body">Manage how you access your account</p>
              </div>
            </div>
            <div className="divide-y divide-stone-100">
              {[
                {
                  title: 'OTP Login',
                  desc: 'Sign in using a one-time password on your registered phone or email',
                  badge: 'Active',
                  badgeColor: 'bg-forest-100 text-forest-700',
                  icon: Phone,
                },
                {
                  title: 'Two-Factor Authentication',
                  desc: 'Add an extra layer of security to your account',
                  badge: 'Off',
                  badgeColor: 'bg-stone-100 text-stone-500',
                  icon: CreditCard,
                },
              ].map(item => {
                const Icon = item.icon
                return (
                  <div key={item.title} className="flex items-center gap-4 px-6 py-5 hover:bg-stone-50 transition-colors">
                    <div className="w-10 h-10 bg-forest-50 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Icon className="w-4.5 h-4.5 text-forest-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-label font-semibold text-stone-800 text-sm">{item.title}</p>
                      <p className="text-xs text-stone-400 font-body mt-0.5">{item.desc}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-label font-bold ${item.badgeColor}`}>
                      {item.badge}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

      </div>
    </PageLayout>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICATIONS PAGE
// ─────────────────────────────────────────────────────────────────────────────
export const NotificationsPage: React.FC = () => {
  const { notifications, setNotifications, markRead, markAllRead, remove } = useNotifStore()
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')

  useEffect(() => {
    notificationApi.getAll().then(n => { setNotifications(n); setLoading(false) })
  }, [])

  const displayed = filter === 'unread' ? notifications.filter(n => !n.isRead) : notifications
  const unread = notifications.filter(n => !n.isRead).length

  const TYPE_CONFIG: Record<string, { icon: React.ElementType; bg: string; color: string; label: string }> = {
    order:    { icon: Package,  bg: 'bg-blue-100',   color: 'text-blue-600',   label: 'Order' },
    promo:    { icon: Star,     bg: 'bg-amber-100',  color: 'text-amber-600',  label: 'Offer' },
    system:   { icon: Bell,     bg: 'bg-forest-100', color: 'text-forest-600', label: 'System' },
    announce: { icon: BellOff,  bg: 'bg-purple-100', color: 'text-purple-600', label: 'News' },
  }

  const formatTime = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'Just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    const days = Math.floor(hrs / 24)
    if (days === 1) return 'Yesterday'
    if (days < 7) return `${days}d ago`
    return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
  }

  const handleClearAll = () => {
    notifications.forEach(n => notificationApi.delete(n.id).catch(() => {}))
    setNotifications([])
  }

  if (loading) return (
    <PageLayout>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex flex-col gap-3 mt-16">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex gap-3.5 p-4 rounded-2xl bg-white border border-stone-100 animate-pulse">
              <div className="w-10 h-10 rounded-2xl bg-stone-100 flex-shrink-0" />
              <div className="flex-1 space-y-2 py-0.5">
                <div className="h-3.5 bg-stone-100 rounded-full w-2/5" />
                <div className="h-2.5 bg-stone-100 rounded-full w-4/5" />
                <div className="h-2 bg-stone-100 rounded-full w-1/4 mt-1" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageLayout>
  )

  return (
    <PageLayout>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">

        {/* ── Header ── */}
        <div className="mb-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <div className="w-10 h-10 bg-forest-50 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <Bell className="w-5 h-5 text-forest-600" strokeWidth={2} />
                </div>
                <h1 className="text-2xl font-display font-bold text-stone-900 flex items-center gap-2.5">
                  Notifications
                  {unread > 0 && (
                    <span className="inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 bg-red-500 text-white text-[11px] font-label font-bold rounded-full leading-none">
                      {unread}
                    </span>
                  )}
                </h1>
              </div>
              <p className="text-sm font-body text-stone-400 ml-[52px]">Stay updated with your orders and activity</p>
            </div>

            {notifications.length > 0 && (
              <div className="flex items-center gap-2 flex-shrink-0 mt-1">
                {unread > 0 && (
                  <button
                    onClick={() => { markAllRead(); notificationApi.markAllRead() }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-label font-semibold text-forest-700 bg-forest-50 hover:bg-forest-100 rounded-xl border border-forest-200 transition-all duration-150"
                  >
                    <CheckCircle className="w-3.5 h-3.5" strokeWidth={2} />
                    Mark all read
                  </button>
                )}
                <button
                  onClick={handleClearAll}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-label font-semibold text-stone-500 bg-stone-50 hover:bg-red-50 hover:text-red-500 rounded-xl border border-stone-200 hover:border-red-200 transition-all duration-150"
                >
                  <Trash2 className="w-3.5 h-3.5" strokeWidth={2} />
                  Clear all
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── Filter pills ── */}
        <div className="flex gap-2 mb-6">
          {(['all', 'unread'] as const).map(id => {
            const count = id === 'all' ? notifications.length : unread
            return (
              <button
                key={id}
                onClick={() => setFilter(id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-label font-semibold transition-all duration-200 ${
                  filter === id
                    ? 'bg-forest-600 text-white shadow-sm'
                    : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
                }`}
              >
                {id === 'all' ? 'All' : 'Unread'}
                {count > 0 && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none ${
                    filter === id ? 'bg-white/25 text-white' : 'bg-stone-200 text-stone-500'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* ── Notification list / empty state ── */}
        {displayed.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-20 h-20 bg-stone-100 rounded-3xl flex items-center justify-center">
              <Bell className="w-9 h-9 text-stone-300" strokeWidth={1.5} />
            </div>
            <div className="text-center">
              <p className="text-base font-label font-semibold text-stone-600 mb-1">
                {filter === 'unread' ? 'All caught up!' : 'No notifications yet'}
              </p>
              <p className="text-sm font-body text-stone-400 max-w-xs">
                {filter === 'unread'
                  ? 'You have no unread notifications right now.'
                  : "We'll notify you about orders, offers, and more."}
              </p>
            </div>
            {filter === 'unread' && notifications.length > 0 && (
              <button
                onClick={() => setFilter('all')}
                className="text-xs font-label font-semibold text-forest-600 hover:underline mt-1"
              >
                View all notifications
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {displayed.map(n => {
              const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG.system
              const Icon = cfg.icon
              return (
                <div
                  key={n.id}
                  onClick={() => { if (!n.isRead) { markRead(n.id); notificationApi.markRead(n.id) } }}
                  className={`group relative flex gap-3.5 p-4 rounded-2xl border transition-all duration-200 cursor-pointer select-none ${
                    n.isRead
                      ? 'bg-white border-stone-100 hover:border-stone-200 hover:shadow-sm'
                      : 'bg-forest-50 border-forest-100 hover:border-forest-200 hover:shadow-sm'
                  }`}
                >
                  {/* Type icon */}
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
                    <Icon className={`w-5 h-5 ${cfg.color}`} strokeWidth={2} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 pr-8">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <p className={`text-sm leading-snug font-body ${n.isRead ? 'font-normal text-stone-700' : 'font-semibold text-stone-900'}`}>
                        {n.title}
                      </p>
                      <span className={`text-[9px] font-label font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide leading-none flex-shrink-0 ${cfg.bg} ${cfg.color}`}>
                        {cfg.label}
                      </span>
                    </div>
                    <p className="text-xs font-body text-stone-500 line-clamp-2 leading-relaxed">{n.body}</p>
                    <p className="text-[11px] font-body text-stone-400 mt-1.5">{formatTime(n.createdAt)}</p>
                  </div>

                  {/* Unread dot + delete (hover-only) */}
                  <div className="absolute top-4 right-4 flex flex-col items-center gap-2">
                    {!n.isRead && <div className="w-2 h-2 rounded-full bg-forest-500 mt-0.5" />}
                    <button
                      onClick={e => { e.stopPropagation(); remove(n.id); notificationApi.delete(n.id) }}
                      className="opacity-0 group-hover:opacity-100 p-1 text-stone-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition-all duration-150"
                      aria-label="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" strokeWidth={2} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

      </div>
    </PageLayout>
  )
}
