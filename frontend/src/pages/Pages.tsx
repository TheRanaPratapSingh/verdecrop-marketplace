import React, { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  Package, MapPin, CreditCard, CheckCircle, Clock, Truck, Home, Bell,
  Heart, Trash2, ShoppingCart, Plus, Edit2, Save, X, ChevronRight,
  User, Phone, Mail, Camera, Star, BellOff
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
  const [paymentMethod, setPaymentMethod] = useState<'razorpay' | 'cod'>('razorpay')
  const [couponCode, setCouponCode] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState('')
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

  if (!cart?.items?.length) {
    return (
      <PageLayout>
        <div className="min-h-[60vh] flex flex-col items-center justify-center px-6 py-20 text-center">
          <div className="w-24 h-24 rounded-3xl bg-stone-100 flex items-center justify-center mb-6 shadow-card">
            <ShoppingCart className="w-10 h-10 text-stone-300" strokeWidth={1.5} />
          </div>
          <h2 className="text-2xl font-display font-bold text-stone-800 mb-2">Your cart is empty</h2>
          <p className="text-stone-400 font-body text-sm mb-8">Add some fresh organic produce to get started</p>
          <Link to="/products">
            <Button size="lg" className="gap-2">Browse Products <ChevronRight className="w-4 h-4" /></Button>
          </Link>
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
      setAppliedCoupon(couponCode.trim())
      trackEvent('coupon_applied', { coupon_code: couponCode.trim(), discount_amount: res.discountAmount, subtotal })
      toast.success(`Coupon applied! You save ₹${res.discountAmount.toFixed(0)}`)
    } catch { toast.error('Invalid or expired coupon') }
    finally { setCouponLoading(false) }
  }

  const removeCoupon = () => {
    setDiscount(0)
    setAppliedCoupon('')
    setCouponCode('')
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
        order_id: order.id,
        order_number: order.orderNumber,
        payment_method: paymentMethod,
        total_amount: order.totalAmount,
        item_count: order.items.length,
      })

      if (paymentMethod === 'razorpay') {
        const rpOrder = await paymentApi.createRazorpayOrder(order!.id)
        const razorpay = new (window as any).Razorpay({
          key: rpOrder.keyId,
          amount: rpOrder.amount * 100,
          currency: rpOrder.currency,
          order_id: rpOrder.razorpayOrderId,
          name: 'Graamo',
          description: `Order #${order!.orderNumber}`,
          handler: async (response: any) => {
            await paymentApi.verifyRazorpay({
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
              orderId: order!.id
            })
            trackEvent('payment_success', { order_id: order.id, payment_method: 'razorpay', total_amount: order.totalAmount })
            navigate(`/orders/${order!.id}?success=1`)
          },
          theme: { color: '#267d39' }
        })
        razorpay.open()
      } else {
        trackEvent('payment_success', { order_id: order.id, payment_method: paymentMethod, total_amount: order.totalAmount })
        navigate(`/orders/${order!.id}?success=1`)
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg ?? 'Failed to place order. Please try again.')
    } finally { setPlacingOrder(false) }
  }

  const steps = [
    { id: 'address', icon: MapPin, label: 'Address', num: 1 },
    { id: 'payment', icon: CreditCard, label: 'Payment', num: 2 },
    { id: 'confirm', icon: CheckCircle, label: 'Review', num: 3 },
  ]
  const stepIdx = steps.findIndex(s => s.id === step)
  const selectedAddr = addresses.find(a => a.id === selectedAddress)

  return (
    <PageLayout>
      {/* Page background */}
      <div className="min-h-screen bg-gradient-to-b from-stone-50 to-cream">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

          {/* Header */}
          <div className="mb-10">
            <p className="text-xs font-label font-semibold tracking-widest text-forest-500 uppercase mb-1">Graamo</p>
            <h1 className="text-3xl sm:text-4xl font-display font-bold text-stone-900 tracking-tight">Checkout</h1>
          </div>

          {/* Step Progress Bar */}
          <div className="flex items-center mb-10">
            {steps.map((s, i) => {
              const done = i < stepIdx
              const active = i === stepIdx
              return (
                <React.Fragment key={s.id}>
                  <button
                    onClick={() => i <= stepIdx && setStep(s.id as any)}
                    disabled={i > stepIdx}
                    className="flex items-center gap-3 group disabled:cursor-not-allowed"
                  >
                    <div className={`w-9 h-9 rounded-2xl flex items-center justify-center text-sm font-label font-bold transition-all duration-300 ${
                      done ? 'bg-forest-500 text-white shadow-btn' :
                      active ? 'bg-forest-600 text-white shadow-btn ring-4 ring-forest-100 scale-110' :
                      'bg-stone-200 text-stone-400'
                    }`}>
                      {done ? <CheckCircle className="w-4 h-4" /> : s.num}
                    </div>
                    <span className={`text-sm font-label font-semibold hidden sm:block transition-colors ${
                      active ? 'text-stone-900' : done ? 'text-forest-600 group-hover:text-forest-700' : 'text-stone-400'
                    }`}>{s.label}</span>
                  </button>
                  {i < steps.length - 1 && (
                    <div className="flex-1 mx-3 sm:mx-4 h-px relative overflow-hidden rounded-full bg-stone-200">
                      <div className={`absolute inset-y-0 left-0 bg-forest-400 transition-all duration-500 ${i < stepIdx ? 'w-full' : 'w-0'}`} />
                    </div>
                  )}
                </React.Fragment>
              )
            })}
          </div>

          {/* Main 2-col grid */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">

            {/* ── LEFT: Steps ─────────────────────────────────────── */}
            <div className="lg:col-span-3 space-y-4">

              {/* ── STEP 1: Address ── */}
              {step === 'address' && (
                <div className="bg-white rounded-3xl shadow-card border border-stone-100 overflow-hidden animate-fade-up">
                  <div className="px-7 pt-7 pb-5 border-b border-stone-50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-forest-50 flex items-center justify-center">
                        <MapPin className="w-5 h-5 text-forest-600" />
                      </div>
                      <div>
                        <h2 className="text-lg font-display font-bold text-stone-900">Delivery Address</h2>
                        <p className="text-xs text-stone-400 font-body mt-0.5">Where should we deliver your order?</p>
                      </div>
                    </div>
                  </div>
                  <div className="px-7 py-6">
                    {addresses.length === 0 ? (
                      <div className="text-center py-10">
                        <div className="w-16 h-16 rounded-3xl bg-stone-100 flex items-center justify-center mx-auto mb-4">
                          <MapPin className="w-7 h-7 text-stone-300" strokeWidth={1.5} />
                        </div>
                        <p className="text-stone-600 font-body font-medium mb-1">No saved addresses</p>
                        <p className="text-stone-400 font-body text-sm mb-5">Add an address to your profile to continue</p>
                        <Link to="/profile">
                          <Button size="sm" variant="outline" className="gap-2"><Plus className="w-4 h-4" /> Add Address</Button>
                        </Link>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {addresses.map(addr => (
                          <label
                            key={addr.id}
                            className={`flex items-start gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all duration-200 ${
                              selectedAddress === addr.id
                                ? 'border-forest-400 bg-gradient-to-r from-forest-50 to-sage-50 shadow-sm'
                                : 'border-stone-100 hover:border-stone-200 hover:bg-stone-50/60'
                            }`}
                          >
                            <div className="mt-0.5 flex-shrink-0">
                              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                                selectedAddress === addr.id ? 'border-forest-500 bg-forest-500' : 'border-stone-300'
                              }`}>
                                {selectedAddress === addr.id && <div className="w-2 h-2 rounded-full bg-white" />}
                              </div>
                            </div>
                            <input type="radio" className="sr-only" checked={selectedAddress === addr.id} onChange={() => setSelectedAddress(addr.id)} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-label font-bold text-stone-800">{addr.label}</span>
                                {addr.isDefault && (
                                  <span className="text-[10px] font-label font-semibold tracking-wide uppercase px-2 py-0.5 rounded-full bg-forest-100 text-forest-700">Default</span>
                                )}
                              </div>
                              <p className="text-sm text-stone-600 font-body mt-1 font-medium">{addr.fullName}</p>
                              <p className="text-sm text-stone-500 font-body">{addr.phone}</p>
                              <p className="text-sm text-stone-400 font-body mt-0.5">{addr.street}, {addr.city}, {addr.state} – {addr.pinCode}</p>
                            </div>
                          </label>
                        ))}
                      </div>
                    )}
                    {addresses.length > 0 && (
                      <button
                        onClick={() => setStep('payment')}
                        disabled={!selectedAddress}
                        className="mt-6 w-full flex items-center justify-center gap-2 py-4 px-6 rounded-2xl bg-gradient-to-r from-forest-600 to-forest-500 text-white font-label font-semibold text-sm shadow-btn hover:shadow-btn-hover hover:from-forest-700 hover:to-forest-600 active:scale-[0.98] transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
                      >
                        Continue to Payment <ChevronRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* ── STEP 2: Payment ── */}
              {step === 'payment' && (
                <div className="space-y-4 animate-fade-up">
                  {/* Selected address recap */}
                  {selectedAddr && (
                    <div className="bg-white rounded-2xl border border-stone-100 shadow-card px-5 py-4 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-forest-50 flex items-center justify-center flex-shrink-0">
                        <MapPin className="w-4 h-4 text-forest-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-label font-semibold text-stone-400 uppercase tracking-wide">Delivering to</p>
                        <p className="text-sm font-body font-semibold text-stone-800 truncate">{selectedAddr.fullName} · {selectedAddr.street}, {selectedAddr.city}</p>
                      </div>
                      <button onClick={() => setStep('address')} className="text-xs font-label font-semibold text-forest-600 hover:text-forest-700 flex-shrink-0">Change</button>
                    </div>
                  )}

                  <div className="bg-white rounded-3xl shadow-card border border-stone-100 overflow-hidden">
                    <div className="px-7 pt-7 pb-5 border-b border-stone-50">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-forest-50 flex items-center justify-center">
                          <CreditCard className="w-5 h-5 text-forest-600" />
                        </div>
                        <div>
                          <h2 className="text-lg font-display font-bold text-stone-900">Payment Method</h2>
                          <p className="text-xs text-stone-400 font-body mt-0.5">Choose how you'd like to pay</p>
                        </div>
                      </div>
                    </div>
                    <div className="px-7 py-6 space-y-3">
                      {[
                        { id: 'razorpay', label: 'Pay Online', desc: 'Cards, UPI, Net Banking & Wallets', icon: '⚡', tag: 'Recommended' },
                        { id: 'cod', label: 'Cash on Delivery', desc: 'Pay when your order arrives', icon: '🪙', tag: '' },
                      ].map(opt => (
                        <label
                          key={opt.id}
                          className={`flex items-center gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all duration-200 ${
                            paymentMethod === opt.id
                              ? 'border-forest-400 bg-gradient-to-r from-forest-50 to-sage-50 shadow-sm'
                              : 'border-stone-100 hover:border-stone-200 hover:bg-stone-50/60'
                          }`}
                        >
                          <div className="mt-0.5 flex-shrink-0">
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                              paymentMethod === opt.id ? 'border-forest-500 bg-forest-500' : 'border-stone-300'
                            }`}>
                              {paymentMethod === opt.id && <div className="w-2 h-2 rounded-full bg-white" />}
                            </div>
                          </div>
                          <input type="radio" className="sr-only" checked={paymentMethod === opt.id} onChange={() => setPaymentMethod(opt.id as any)} />
                          <div className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center text-xl flex-shrink-0">{opt.icon}</div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-label font-bold text-stone-800">{opt.label}</p>
                              {opt.tag && <span className="text-[10px] font-label font-semibold tracking-wide uppercase px-2 py-0.5 rounded-full bg-forest-100 text-forest-700">{opt.tag}</span>}
                            </div>
                            <p className="text-xs text-stone-400 font-body mt-0.5">{opt.desc}</p>
                          </div>
                        </label>
                      ))}

                      {/* Notes */}
                      <div className="pt-2">
                        <label className="text-xs font-label font-semibold text-stone-500 uppercase tracking-wide block mb-2">Delivery Instructions (optional)</label>
                        <textarea
                          value={notes}
                          onChange={e => setNotes(e.target.value)}
                          placeholder="e.g. Leave at the door, ring the bell twice…"
                          className="w-full border border-stone-200 bg-stone-50/60 rounded-2xl px-4 py-3 text-sm font-body text-stone-700 placeholder:text-stone-300 focus:outline-none focus:border-forest-300 focus:bg-white focus:ring-2 focus:ring-forest-100 resize-none transition-all"
                          rows={2}
                        />
                      </div>

                      <button
                        onClick={() => setStep('confirm')}
                        className="w-full flex items-center justify-center gap-2 py-4 px-6 rounded-2xl bg-gradient-to-r from-forest-600 to-forest-500 text-white font-label font-semibold text-sm shadow-btn hover:shadow-btn-hover hover:from-forest-700 hover:to-forest-600 active:scale-[0.98] transition-all duration-200"
                      >
                        Review Order <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ── STEP 3: Review ── */}
              {step === 'confirm' && (
                <div className="space-y-4 animate-fade-up">
                  {/* Address + Payment recaps */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white rounded-2xl border border-stone-100 shadow-card px-4 py-3.5">
                      <p className="text-[10px] font-label font-semibold text-stone-400 uppercase tracking-widest mb-1.5">Delivering to</p>
                      {selectedAddr && (
                        <>
                          <p className="text-sm font-label font-bold text-stone-800">{selectedAddr.fullName}</p>
                          <p className="text-xs text-stone-500 font-body mt-0.5 leading-relaxed">{selectedAddr.street}, {selectedAddr.city}, {selectedAddr.state} – {selectedAddr.pinCode}</p>
                        </>
                      )}
                      <button onClick={() => setStep('address')} className="text-xs font-label font-semibold text-forest-600 hover:text-forest-700 mt-2 block">Change</button>
                    </div>
                    <div className="bg-white rounded-2xl border border-stone-100 shadow-card px-4 py-3.5">
                      <p className="text-[10px] font-label font-semibold text-stone-400 uppercase tracking-widest mb-1.5">Payment via</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-lg">{paymentMethod === 'razorpay' ? '⚡' : '🪙'}</span>
                        <p className="text-sm font-label font-bold text-stone-800">{paymentMethod === 'razorpay' ? 'Online Payment' : 'Cash on Delivery'}</p>
                      </div>
                      <button onClick={() => setStep('payment')} className="text-xs font-label font-semibold text-forest-600 hover:text-forest-700 mt-2 block">Change</button>
                    </div>
                  </div>

                  {/* Items review */}
                  <div className="bg-white rounded-3xl shadow-card border border-stone-100 overflow-hidden">
                    <div className="px-7 pt-7 pb-5 border-b border-stone-50">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-forest-50 flex items-center justify-center">
                          <Package className="w-5 h-5 text-forest-600" />
                        </div>
                        <div>
                          <h2 className="text-lg font-display font-bold text-stone-900">Order Items</h2>
                          <p className="text-xs text-stone-400 font-body mt-0.5">{cart.items.length} item{cart.items.length !== 1 ? 's' : ''} in your order</p>
                        </div>
                      </div>
                    </div>
                    <div className="px-7 py-5 space-y-4">
                      {cart.items.map((item, idx) => (
                        <div key={item.id} className={`flex items-center gap-4 ${idx < cart.items.length - 1 ? 'pb-4 border-b border-stone-50' : ''}`}>
                          <div className="w-14 h-14 rounded-2xl bg-stone-100 overflow-hidden flex-shrink-0 shadow-sm">
                            {item.imageUrl
                              ? <img src={resolveAssetUrl(item.imageUrl)} alt={item.productName} className="w-full h-full object-cover" />
                              : <div className="w-full h-full flex items-center justify-center text-xl">🌿</div>}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-label font-semibold text-stone-800 truncate">{item.productName}</p>
                            <p className="text-xs text-stone-400 font-body mt-0.5">{item.quantity} {item.unit} × ₹{item.price.toFixed(0)}</p>
                          </div>
                          <p className="text-sm font-display font-bold text-stone-900 flex-shrink-0">₹{item.total.toFixed(0)}</p>
                        </div>
                      ))}
                    </div>
                    <div className="px-7 pb-7">
                      <button
                        onClick={handlePlaceOrder}
                        disabled={placingOrder}
                        className="w-full flex items-center justify-center gap-2 py-4 px-6 rounded-2xl bg-gradient-to-r from-forest-600 to-forest-500 text-white font-label font-semibold text-base shadow-btn hover:shadow-btn-hover hover:from-forest-700 hover:to-forest-600 active:scale-[0.98] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {placingOrder ? <Spinner size="sm" /> : null}
                        {placingOrder ? 'Placing Order…' : `Place Order · ₹${total.toFixed(0)}`}
                      </button>
                      <p className="text-center text-xs text-stone-400 font-body mt-3 flex items-center justify-center gap-1">
                        <span>🔒</span> Secure & encrypted checkout
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ── RIGHT: Sticky Order Summary ─────────────────────── */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-3xl shadow-card border border-stone-100 overflow-hidden sticky top-24">
                {/* Summary header */}
                <div className="px-6 pt-6 pb-4 bg-gradient-to-br from-forest-600 to-forest-700 text-white rounded-t-3xl">
                  <h3 className="font-display font-bold text-xl">Order Summary</h3>
                  <p className="text-forest-200 text-xs font-body mt-0.5">{cart.items.length} item{cart.items.length !== 1 ? 's' : ''}</p>
                </div>

                <div className="px-6 py-5 space-y-5">
                  {/* Cart items preview */}
                  <div className="space-y-3">
                    {cart.items.slice(0, 3).map(item => (
                      <div key={item.id} className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-stone-100 overflow-hidden flex-shrink-0">
                          {item.imageUrl
                            ? <img src={resolveAssetUrl(item.imageUrl)} alt={item.productName} className="w-full h-full object-cover" />
                            : <div className="w-full h-full flex items-center justify-center text-sm">🌿</div>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-label font-semibold text-stone-700 truncate">{item.productName}</p>
                          <p className="text-[11px] text-stone-400 font-body">{item.quantity} {item.unit}</p>
                        </div>
                        <p className="text-xs font-label font-bold text-stone-800 flex-shrink-0">₹{item.total.toFixed(0)}</p>
                      </div>
                    ))}
                    {cart.items.length > 3 && (
                      <p className="text-xs text-stone-400 font-body text-center">+{cart.items.length - 3} more item{cart.items.length - 3 !== 1 ? 's' : ''}</p>
                    )}
                  </div>

                  {/* Divider */}
                  <div className="h-px bg-stone-100" />

                  {/* Coupon */}
                  {!appliedCoupon ? (
                    <div>
                      <label className="text-[10px] font-label font-semibold text-stone-400 uppercase tracking-widest block mb-2">Promo Code</label>
                      <div className="flex gap-2">
                        <input
                          placeholder="e.g. VERDE10"
                          value={couponCode}
                          onChange={e => setCouponCode(e.target.value.toUpperCase())}
                          className="flex-1 border border-stone-200 bg-stone-50 rounded-xl px-3 py-2.5 text-sm font-label font-semibold text-stone-800 placeholder:font-body placeholder:text-stone-300 focus:outline-none focus:border-forest-300 focus:bg-white focus:ring-2 focus:ring-forest-100 transition-all tracking-widest"
                        />
                        <button
                          onClick={applyCoupon}
                          disabled={couponLoading || !couponCode.trim()}
                          className="px-4 py-2.5 rounded-xl border-2 border-forest-500 text-forest-600 font-label font-semibold text-sm hover:bg-forest-50 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
                        >
                          {couponLoading ? <Spinner size="sm" /> : 'Apply'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-forest-50 border border-forest-200">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">🎟️</span>
                        <div>
                          <p className="text-xs font-label font-bold text-forest-700 tracking-widest">{appliedCoupon}</p>
                          <p className="text-[11px] text-forest-600 font-body">–₹{discount.toFixed(0)} saved</p>
                        </div>
                      </div>
                      <button onClick={removeCoupon} className="text-stone-400 hover:text-red-400 transition-colors"><X className="w-3.5 h-3.5" /></button>
                    </div>
                  )}

                  {/* Divider */}
                  <div className="h-px bg-stone-100" />

                  {/* Price breakdown */}
                  <div className="space-y-2.5">
                    <div className="flex justify-between text-sm font-body text-stone-500">
                      <span>Subtotal</span>
                      <span className="font-semibold text-stone-700">₹{subtotal.toFixed(0)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-body text-stone-500">
                      <span>Delivery</span>
                      <span className={delivery === 0 ? 'font-bold text-forest-600' : 'font-semibold text-stone-700'}>
                        {delivery === 0 ? '🎉 Free' : `₹${delivery}`}
                      </span>
                    </div>
                    {discount > 0 && (
                      <div className="flex justify-between text-sm font-body text-forest-600 font-semibold">
                        <span>Discount</span>
                        <span>–₹{discount.toFixed(0)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm font-body text-stone-500">
                      <span>Tax (5%)</span>
                      <span className="font-semibold text-stone-700">₹{tax.toFixed(0)}</span>
                    </div>
                  </div>

                  {/* Total */}
                  <div className="rounded-2xl bg-gradient-to-r from-stone-50 to-sage-50 border border-stone-100 px-4 py-3.5 flex items-center justify-between">
                    <span className="font-label font-bold text-stone-900 text-base">Total</span>
                    <span className="font-display font-bold text-2xl text-stone-900">₹{total.toFixed(0)}</span>
                  </div>

                  {/* Free delivery nudge */}
                  {delivery > 0 && (
                    <div className="rounded-xl bg-amber-50 border border-amber-100 px-3.5 py-2.5">
                      <p className="text-xs font-body text-amber-700">
                        🚀 Add <span className="font-bold">₹{(500 - subtotal).toFixed(0)}</span> more for <span className="font-bold">free delivery</span>
                      </p>
                      <div className="mt-1.5 h-1 bg-amber-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-400 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, (subtotal / 500) * 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>
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

  return (
    <PageLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-leaf-700 to-leaf-500 rounded-3xl p-6 mb-6 flex items-center gap-5 text-white relative overflow-hidden">
          <div className="absolute -right-10 -top-10 w-48 h-48 bg-white/10 rounded-full" />
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl bg-white/20 border-2 border-white/30 overflow-hidden flex items-center justify-center">
              {user?.avatarUrl
                ? <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                : <span className="text-3xl font-bold font-display">{user?.name?.[0]?.toUpperCase()}</span>}
            </div>
            <button onClick={() => fileRef.current?.click()} className="absolute -bottom-1 -right-1 bg-white text-leaf-600 rounded-full p-1.5 shadow hover:shadow-md transition">
              <Camera className="w-3.5 h-3.5" />
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatar} />
          </div>
          <div className="relative z-10">
            <h1 className="text-2xl font-display font-bold">{user?.name}</h1>
            <p className="text-leaf-100 text-sm font-body">{user?.email || user?.phone}</p>
            <Badge variant="green" className="mt-1 capitalize">{user?.role}</Badge>
          </div>
        </div>

        <TabGroup tabs={[{id:'profile',label:'Profile'},{id:'addresses',label:'Addresses'},{id:'security',label:'Security'}]} active={tab} onChange={setTab} className="mb-6" />

        {tab === 'profile' && (
          <Card className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <Input label="Full Name" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} leftIcon={<User className="w-4 h-4" />} />
              <Input label="Email" type="email" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} leftIcon={<Mail className="w-4 h-4" />} />
              <Input label="Phone" value={form.phone} onChange={e => setForm(f => ({...f, phone: e.target.value}))} leftIcon={<Phone className="w-4 h-4" />} />
            </div>
            <Button onClick={saveProfile} loading={saving}><Save className="w-4 h-4" /> Save Changes</Button>
          </Card>
        )}

        {tab === 'addresses' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-display font-semibold text-gray-900">Saved Addresses</h2>
              <Button size="sm" onClick={() => { setEditAddr(null); setAddrForm({}); setShowAddrModal(true) }}>
                <Plus className="w-4 h-4" /> Add New
              </Button>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              {addresses.map(addr => (
                <Card key={addr.id} className={`p-4 border-2 ${addr.isDefault ? 'border-leaf-400' : 'border-transparent'}`}>
                  {addr.isDefault && <Badge variant="green" size="sm" className="mb-2">Default</Badge>}
                  <p className="font-semibold text-sm text-gray-800 font-body">{addr.label} · {addr.fullName}</p>
                  <p className="text-sm text-gray-500 font-body">{addr.street}</p>
                  <p className="text-sm text-gray-500 font-body">{addr.city}, {addr.state} – {addr.pinCode}</p>
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => { setEditAddr(addr); setAddrForm(addr); setShowAddrModal(true) }} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                      <Edit2 className="w-3 h-3" /> Edit
                    </button>
                    <button onClick={async () => { await userApi.deleteAddress(addr.id); setAddresses(a => a.filter(x => x.id !== addr.id)) }} className="text-xs text-red-500 hover:underline flex items-center gap-1">
                      <Trash2 className="w-3 h-3" /> Delete
                    </button>
                    {!addr.isDefault && (
                      <button onClick={async () => { await userApi.setDefaultAddress(addr.id); setAddresses(a => a.map(x => ({...x, isDefault: x.id === addr.id}))) }} className="text-xs text-leaf-600 hover:underline ml-auto">
                        Set Default
                      </button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
            {showAddrModal && (
              <Modal isOpen onClose={() => setShowAddrModal(false)} title={editAddr ? 'Edit Address' : 'Add Address'}>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <Input label="Label" placeholder="Home" value={addrForm.label||''} onChange={e => setAddrForm(f => ({...f, label: e.target.value}))} />
                    <Input label="Full Name" value={addrForm.fullName||''} onChange={e => setAddrForm(f => ({...f, fullName: e.target.value}))} />
                  </div>
                  <Input label="Phone" value={addrForm.phone||''} onChange={e => setAddrForm(f => ({...f, phone: e.target.value}))} />
                  <Input label="Street / Area" value={addrForm.street||''} onChange={e => setAddrForm(f => ({...f, street: e.target.value}))} />
                  <div className="grid grid-cols-2 gap-3">
                    <Input label="City" value={addrForm.city||''} onChange={e => setAddrForm(f => ({...f, city: e.target.value}))} />
                    <Input label="State" value={addrForm.state||''} onChange={e => setAddrForm(f => ({...f, state: e.target.value}))} />
                  </div>
                  <Input label="Pincode" value={addrForm.pinCode||''} onChange={e => setAddrForm(f => ({...f, pinCode: e.target.value}))} />
                  <div className="flex gap-3 pt-1">
                    <Button variant="outline" className="flex-1" onClick={() => setShowAddrModal(false)}>Cancel</Button>
                    <Button className="flex-1" onClick={saveAddress}><Save className="w-4 h-4" /> Save</Button>
                  </div>
                </div>
              </Modal>
            )}
          </div>
        )}

        {tab === 'security' && (
          <Card className="p-6 space-y-4">
            {[
              { title: 'OTP Login', desc: 'Login via OTP on registered mobile/email', badge: 'Active', variant: 'green' as const },
              { title: 'Two-Factor Auth', desc: 'Extra security layer', badge: 'Off', variant: 'gray' as const },
            ].map(item => (
              <div key={item.title} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div>
                  <p className="font-semibold text-gray-800 font-body text-sm">{item.title}</p>
                  <p className="text-xs text-gray-500 font-body">{item.desc}</p>
                </div>
                <Badge variant={item.variant}>{item.badge}</Badge>
              </div>
            ))}
          </Card>
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

  const TYPE_ICONS: Record<string, { icon: React.ElementType; bg: string; color: string }> = {
    order:    { icon: Package,   bg: 'bg-blue-100',   color: 'text-blue-600' },
    promo:    { icon: Star,      bg: 'bg-orange-100', color: 'text-orange-600' },
    system:   { icon: Bell,      bg: 'bg-leaf-100',   color: 'text-leaf-600' },
    announce: { icon: BellOff,   bg: 'bg-purple-100', color: 'text-purple-600' },
  }

  if (loading) return <PageLayout><div className="flex justify-center py-20"><Spinner size="lg" /></div></PageLayout>

  return (
    <PageLayout>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-display font-bold text-gray-900 flex items-center gap-3">
            Notifications
            {unread > 0 && <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{unread}</span>}
          </h1>
          {unread > 0 && (
            <Button size="sm" variant="ghost" onClick={() => { markAllRead(); notificationApi.markAllRead() }}>
              Mark all read
            </Button>
          )}
        </div>

        <div className="flex gap-2 mb-5">
          {[['all', 'All'], ['unread', `Unread (${unread})`]].map(([id, label]) => (
            <button key={id} onClick={() => setFilter(id as any)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition font-body ${filter === id ? 'bg-leaf-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {label}
            </button>
          ))}
        </div>

        {displayed.length === 0 ? (
          <EmptyState icon={<Bell className="w-12 h-12 text-gray-200" />}
            title={filter === 'unread' ? 'No unread notifications' : 'No notifications'}
            description="We'll notify you about orders, offers, and more." />
        ) : (
          <div className="space-y-2">
            {displayed.map(n => {
              const cfg = TYPE_ICONS[n.type] || TYPE_ICONS.system
              const Icon = cfg.icon
              return (
                <div
                  key={n.id}
                  onClick={() => { if (!n.isRead) { markRead(n.id); notificationApi.markRead(n.id) } }}
                  className={`flex gap-3 p-4 rounded-2xl border transition cursor-pointer hover:shadow-sm ${
                    n.isRead ? 'bg-white border-gray-100' : 'bg-leaf-50 border-leaf-100'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
                    <Icon className={`w-5 h-5 ${cfg.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${n.isRead ? 'font-normal text-gray-700' : 'font-semibold text-gray-900'} font-body`}>{n.title}</p>
                    <p className="text-xs text-gray-500 font-body mt-0.5 line-clamp-2">{n.body}</p>
                    <p className="text-[10px] text-gray-400 font-body mt-1">{new Date(n.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    {!n.isRead && <div className="w-2 h-2 rounded-full bg-leaf-500 mt-1" />}
                    <button onClick={e => { e.stopPropagation(); remove(n.id); notificationApi.delete(n.id) }} className="text-gray-300 hover:text-red-400 transition">
                      <X className="w-4 h-4" />
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
