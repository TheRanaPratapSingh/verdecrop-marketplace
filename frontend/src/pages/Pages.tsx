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
    return <PageLayout><div className="max-w-2xl mx-auto px-6 py-20 text-center">
      <ShoppingCart className="w-16 h-16 text-gray-200 mx-auto mb-4" />
      <h2 className="text-xl font-display font-bold text-gray-700 mb-2">Your cart is empty</h2>
      <Link to="/products"><Button>Browse Products</Button></Link>
    </div></PageLayout>
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
      trackEvent('coupon_applied', {
        coupon_code: couponCode.trim(),
        discount_amount: res.discountAmount,
        subtotal,
      })
      toast.success(`Coupon applied! You save ₹${res.discountAmount.toFixed(0)}`)
    } catch { toast.error('Invalid or expired coupon') }
    finally { setCouponLoading(false) }
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
            trackEvent('payment_success', {
              order_id: order.id,
              payment_method: 'razorpay',
              total_amount: order.totalAmount,
            })
            navigate(`/orders/${order!.id}?success=1`)
          },
          theme: { color: '#267d39' }
        })
        razorpay.open()
      } else {
        trackEvent('payment_success', {
          order_id: order.id,
          payment_method: paymentMethod,
          total_amount: order.totalAmount,
        })
        navigate(`/orders/${order!.id}?success=1`)
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg ?? 'Failed to place order. Please try again.')
    } finally { setPlacingOrder(false) }
  }

  const steps = [
    { id: 'address', icon: MapPin, label: 'Address' },
    { id: 'payment', icon: CreditCard, label: 'Payment' },
    { id: 'confirm', icon: CheckCircle, label: 'Review' },
  ]
  const stepIdx = steps.findIndex(s => s.id === step)

  return (
    <PageLayout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-2xl font-display font-bold text-gray-900 mb-6">Checkout</h1>

        {/* Progress */}
        <div className="flex items-center gap-0 mb-8">
          {steps.map((s, i) => (
            <React.Fragment key={s.id}>
              <div
                onClick={() => i <= stepIdx && setStep(s.id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium font-body transition cursor-pointer ${
                  step === s.id ? 'bg-leaf-600 text-white shadow-sm' :
                  i < stepIdx ? 'text-leaf-600 hover:bg-leaf-50' : 'text-gray-400 cursor-default'
                }`}
              >
                <s.icon className="w-4 h-4" />{s.label}
              </div>
              {i < steps.length - 1 && <ChevronRight className="w-4 h-4 text-gray-300 mx-1" />}
            </React.Fragment>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left panel */}
          <div className="lg:col-span-2 space-y-4">
            {/* Address Step */}
            {step === 'address' && (
              <Card className="p-6">
                <h2 className="font-display font-semibold text-gray-900 mb-4 flex items-center gap-2"><MapPin className="w-5 h-5 text-leaf-600" /> Delivery Address</h2>
                {addresses.length === 0 ? (
                  <div className="text-center py-8">
                    <MapPin className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                    <p className="text-gray-500 font-body text-sm mb-3">No saved addresses</p>
                    <Link to="/profile"><Button size="sm" variant="outline">Add Address</Button></Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {addresses.map(addr => (
                      <label key={addr.id} className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition ${selectedAddress === addr.id ? 'border-leaf-500 bg-leaf-50' : 'border-gray-200 hover:border-gray-300'}`}>
                        <input type="radio" className="mt-1 accent-leaf-600" checked={selectedAddress === addr.id} onChange={() => setSelectedAddress(addr.id)} />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-gray-800 font-body">{addr.label}</span>
                            {addr.isDefault && <Badge variant="green" size="sm">Default</Badge>}
                          </div>
                          <p className="text-sm text-gray-600 font-body mt-0.5">{addr.fullName} · {addr.phone}</p>
                          <p className="text-sm text-gray-500 font-body">{addr.street}, {addr.city}, {addr.state} – {addr.pinCode}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
                <Button className="mt-4" onClick={() => setStep('payment')} disabled={!selectedAddress}>
                  Continue to Payment <ChevronRight className="w-4 h-4" />
                </Button>
              </Card>
            )}

            {/* Payment Step */}
            {step === 'payment' && (
              <Card className="p-6">
                <h2 className="font-display font-semibold text-gray-900 mb-4 flex items-center gap-2"><CreditCard className="w-5 h-5 text-leaf-600" /> Payment Method</h2>
                <div className="space-y-3 mb-5">
                  {[
                    { id: 'razorpay', label: 'Razorpay', desc: 'Cards, UPI, Net Banking, Wallets', icon: '💳' },
                    { id: 'cod', label: 'Cash on Delivery', desc: 'Pay when your order arrives', icon: '💵' },
                  ].map(opt => (
                    <label key={opt.id} className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition ${paymentMethod === opt.id ? 'border-leaf-500 bg-leaf-50' : 'border-gray-200'}`}>
                      <input type="radio" className="accent-leaf-600" checked={paymentMethod === opt.id} onChange={() => setPaymentMethod(opt.id as any)} />
                      <span className="text-xl">{opt.icon}</span>
                      <div>
                        <p className="text-sm font-semibold text-gray-800 font-body">{opt.label}</p>
                        <p className="text-xs text-gray-500 font-body">{opt.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
                <div className="mb-4">
                  <label className="text-sm font-medium text-gray-700 font-body">Order Notes (optional)</label>
                  <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Any special instructions for delivery…"
                    className="w-full mt-1.5 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-body focus:outline-none focus:border-leaf-400 resize-none"
                    rows={2}
                  />
                </div>
                <Button onClick={() => setStep('confirm')}>
                  Review Order <ChevronRight className="w-4 h-4" />
                </Button>
              </Card>
            )}

            {/* Confirm Step */}
            {step === 'confirm' && (
              <Card className="p-6">
                <h2 className="font-display font-semibold text-gray-900 mb-4 flex items-center gap-2"><CheckCircle className="w-5 h-5 text-leaf-600" /> Review Order</h2>
                <div className="space-y-3 mb-4">
                  {cart.items.map(item => (
                    <div key={item.id} className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0">
                        {item.imageUrl ? <img src={resolveAssetUrl(item.imageUrl)} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-lg">🌿</div>}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-800 font-body">{item.productName}</p>
                        <p className="text-xs text-gray-500 font-body">{item.quantity} {item.unit}</p>
                      </div>
                      <p className="text-sm font-semibold font-body">₹{item.total.toFixed(0)}</p>
                    </div>
                  ))}
                </div>
                <Button className="w-full" size="lg" loading={placingOrder} onClick={handlePlaceOrder}>
                  Place Order · ₹{total.toFixed(0)}
                </Button>
              </Card>
            )}
          </div>

          {/* Order Summary */}
          <div>
            <Card className="p-5 sticky top-20">
              <h3 className="font-display font-semibold text-gray-900 mb-4">Order Summary</h3>
              {/* Coupon */}
              <div className="flex gap-2 mb-4">
                <Input placeholder="VERDE10" value={couponCode} onChange={e => setCouponCode(e.target.value.toUpperCase())} className="text-sm" />
                <Button size="sm" variant="outline" loading={couponLoading} onClick={applyCoupon}>Apply</Button>
              </div>
              <div className="space-y-2 text-sm font-body">
                {[
                  ['Subtotal', `₹${subtotal.toFixed(0)}`],
                  ['Delivery', delivery === 0 ? 'Free' : `₹${delivery}`],
                  ...(discount > 0 ? [['Discount', `-₹${discount.toFixed(0)}`]] : []),
                  ['Tax (5%)', `₹${tax.toFixed(0)}`],
                ].map(([label, value]) => (
                  <div key={label} className={`flex justify-between ${label === 'Discount' ? 'text-leaf-600 font-medium' : 'text-gray-600'}`}>
                    <span>{label}</span><span>{value}</span>
                  </div>
                ))}
                <div className="flex justify-between font-bold text-gray-900 pt-2 border-t border-gray-100 text-base">
                  <span>Total</span><span>₹{total.toFixed(0)}</span>
                </div>
              </div>
              {delivery > 0 && <p className="mt-2 text-xs text-leaf-600 bg-leaf-50 px-3 py-1.5 rounded-lg font-body">Add ₹{(500 - subtotal).toFixed(0)} more for free delivery!</p>}
            </Card>
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

  const TABS = [
    { id: 'profile',   label: 'Profile',   icon: User },
    { id: 'addresses', label: 'Addresses', icon: MapPin },
    { id: 'security',  label: 'Security',  icon: CreditCard },
  ]

  return (
    <PageLayout>
      {/* ── HERO BANNER ────────────────────────────────────────────────────── */}
      <div className="relative w-full overflow-hidden" style={{ background: 'linear-gradient(135deg,#071c0a 0%,#0e3615 45%,#13461b 100%)', minHeight: 220 }}>
        {/* Decorative orbs */}
        <div className="absolute -top-16 -right-16 w-72 h-72 rounded-full pointer-events-none animate-float" style={{ background: 'radial-gradient(circle,rgba(46,139,50,0.28) 0%,transparent 70%)' }} />
        <div className="absolute bottom-0 left-1/3 w-56 h-56 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle,rgba(85,124,73,0.18) 0%,transparent 70%)', animationDelay: '2s' }} />
        <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle,#fff 1px,transparent 1px)', backgroundSize: '24px 24px' }} />

        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-8 py-10 flex flex-col sm:flex-row items-center sm:items-end gap-6">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl overflow-hidden border-2 border-forest-400/40 shadow-2xl" style={{ boxShadow: '0 0 0 4px rgba(46,139,50,0.2), 0 8px 32px rgba(0,0,0,0.5)' }}>
              {user?.avatarUrl
                ? <img src={resolveAssetUrl(user.avatarUrl)} alt={user.name} className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#2d8a32,#175820)' }}>
                    <span className="text-4xl font-display font-bold text-white">{user?.name?.[0]?.toUpperCase()}</span>
                  </div>}
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              className="absolute -bottom-2 -right-2 w-8 h-8 rounded-xl flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-110 active:scale-95"
              style={{ background: 'linear-gradient(135deg,#4ea352,#2d8a32)', boxShadow: '0 4px 12px rgba(46,139,50,0.5)' }}
            >
              <Camera className="w-3.5 h-3.5 text-white" />
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatar} />
          </div>

          {/* Name / meta */}
          <div className="text-center sm:text-left pb-1">
            <p className="text-forest-300 font-label text-xs tracking-widest uppercase mb-1">My Account</p>
            <h1 className="text-white font-display font-semibold leading-tight" style={{ fontSize: 'clamp(1.5rem,3.5vw,2.2rem)' }}>{user?.name}</h1>
            <p className="text-forest-300/80 font-body text-sm mt-0.5">{user?.email || user?.phone}</p>
            <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-forest-400/30 bg-forest-400/10">
              <div className="w-1.5 h-1.5 rounded-full bg-forest-400" />
              <span className="text-forest-300 font-label text-xs tracking-wider uppercase">{user?.role}</span>
            </div>
          </div>

          {/* Quick stats */}
          <div className="sm:ml-auto flex gap-4 sm:gap-6 pb-1">
            {[
              { value: addresses.length.toString(), label: 'Addresses' },
              { value: '—', label: 'Orders' },
            ].map(s => (
              <div key={s.label} className="text-center">
                <p className="text-white font-display font-semibold text-xl">{s.value}</p>
                <p className="text-forest-300/70 font-label text-[10px] tracking-wider uppercase mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── CONTENT ────────────────────────────────────────────────────────── */}
      <div className="max-w-4xl mx-auto px-4 sm:px-8 py-8">

        {/* Premium tab bar */}
        <div className="flex gap-1 p-1 rounded-2xl mb-8 border border-stone-200 bg-white shadow-card" style={{ width: 'fit-content' }}>
          {TABS.map(t => {
            const Icon = t.icon
            const active = tab === t.id
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className="relative flex items-center gap-2 px-5 py-2.5 rounded-xl font-label text-sm font-medium tracking-wide transition-all duration-200"
                style={active ? {
                  background: 'linear-gradient(135deg,#1e6e24,#2d8a32)',
                  color: '#fff',
                  boxShadow: '0 2px 12px rgba(30,110,36,0.35)',
                } : { color: '#6e5844' }}
              >
                <Icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            )
          })}
        </div>

        {/* ── PROFILE TAB ── */}
        {tab === 'profile' && (
          <div className="animate-fade-up">
            <div className="bg-white rounded-3xl border border-stone-100 shadow-card overflow-hidden">
              <div className="px-6 py-5 border-b border-stone-100 flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#f0f7f0,#dceedd)' }}>
                  <User className="w-4 h-4 text-forest-600" />
                </div>
                <div>
                  <p className="font-label font-semibold text-stone-800 text-sm">Personal Information</p>
                  <p className="text-stone-400 text-xs font-body">Update your name, email and phone</p>
                </div>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6">
                  {/* Full Name */}
                  <div className="space-y-1.5">
                    <label className="block font-label text-xs font-semibold text-stone-500 tracking-wider uppercase">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                      <input
                        type="text"
                        value={form.name}
                        onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-stone-200 bg-stone-50 font-body text-sm text-stone-800 placeholder-stone-300 outline-none focus:border-forest-400 focus:bg-white focus:ring-2 focus:ring-forest-400/20 transition-all duration-200"
                        placeholder="Your full name"
                      />
                    </div>
                  </div>
                  {/* Email */}
                  <div className="space-y-1.5">
                    <label className="block font-label text-xs font-semibold text-stone-500 tracking-wider uppercase">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                      <input
                        type="email"
                        value={form.email}
                        onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-stone-200 bg-stone-50 font-body text-sm text-stone-800 placeholder-stone-300 outline-none focus:border-forest-400 focus:bg-white focus:ring-2 focus:ring-forest-400/20 transition-all duration-200"
                        placeholder="you@example.com"
                      />
                    </div>
                  </div>
                  {/* Phone */}
                  <div className="space-y-1.5">
                    <label className="block font-label text-xs font-semibold text-stone-500 tracking-wider uppercase">Phone Number</label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                      <input
                        type="tel"
                        value={form.phone}
                        onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-stone-200 bg-stone-50 font-body text-sm text-stone-800 placeholder-stone-300 outline-none focus:border-forest-400 focus:bg-white focus:ring-2 focus:ring-forest-400/20 transition-all duration-200"
                        placeholder="+91 XXXXX XXXXX"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-stone-100">
                  <p className="text-xs text-stone-400 font-body">Your data is encrypted and secure.</p>
                  <button
                    onClick={saveProfile}
                    disabled={saving}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-label font-semibold text-sm text-white transition-all duration-200 disabled:opacity-60 hover:opacity-90 active:scale-95"
                    style={{ background: 'linear-gradient(135deg,#1e6e24,#2d8a32)', boxShadow: '0 4px 16px rgba(30,110,36,0.35)' }}
                  >
                    {saving ? <Spinner size="sm" /> : <Save className="w-4 h-4" />}
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── ADDRESSES TAB ── */}
        {tab === 'addresses' && (
          <div className="animate-fade-up space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display font-semibold text-stone-800 text-lg">Saved Addresses</h2>
                <p className="text-stone-400 font-body text-xs mt-0.5">{addresses.length} address{addresses.length !== 1 ? 'es' : ''} saved</p>
              </div>
              <button
                onClick={() => { setEditAddr(null); setAddrForm({}); setShowAddrModal(true) }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl font-label font-semibold text-sm text-white transition-all duration-200 hover:opacity-90 active:scale-95"
                style={{ background: 'linear-gradient(135deg,#1e6e24,#2d8a32)', boxShadow: '0 4px 12px rgba(30,110,36,0.3)' }}
              >
                <Plus className="w-4 h-4" /> Add New
              </button>
            </div>

            {addresses.length === 0 && (
              <div className="text-center py-16 bg-white rounded-3xl border border-stone-100 shadow-card">
                <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#f0f7f0,#dceedd)' }}>
                  <MapPin className="w-6 h-6 text-forest-500" />
                </div>
                <p className="font-display font-semibold text-stone-700 mb-1">No addresses yet</p>
                <p className="text-stone-400 font-body text-sm">Add a delivery address to speed up checkout.</p>
              </div>
            )}

            <div className="grid sm:grid-cols-2 gap-4">
              {addresses.map(addr => (
                <div key={addr.id} className={`group relative bg-white rounded-2xl border-2 p-5 transition-all duration-200 hover:shadow-card-hover ${addr.isDefault ? 'border-forest-400' : 'border-stone-100 hover:border-forest-200'}`}>
                  {addr.isDefault && (
                    <div className="absolute top-4 right-4 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-forest-50 border border-forest-200">
                      <div className="w-1.5 h-1.5 rounded-full bg-forest-500" />
                      <span className="text-forest-700 font-label text-[10px] font-semibold tracking-wider uppercase">Default</span>
                    </div>
                  )}
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg,#f0f7f0,#dceedd)' }}>
                      <Home className="w-4 h-4 text-forest-600" />
                    </div>
                    <div>
                      <p className="font-label font-semibold text-stone-800 text-sm">{addr.label} <span className="font-normal text-stone-400">·</span> {addr.fullName}</p>
                      <p className="text-stone-500 font-body text-xs mt-0.5 leading-relaxed">{addr.street}</p>
                      <p className="text-stone-500 font-body text-xs">{addr.city}, {addr.state} – {addr.pinCode}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 pt-3 border-t border-stone-100">
                    <button onClick={() => { setEditAddr(addr); setAddrForm(addr); setShowAddrModal(true) }}
                      className="flex items-center gap-1.5 text-xs font-label font-medium text-stone-500 hover:text-forest-600 transition-colors">
                      <Edit2 className="w-3 h-3" /> Edit
                    </button>
                    <button onClick={async () => { await userApi.deleteAddress(addr.id); setAddresses(a => a.filter(x => x.id !== addr.id)) }}
                      className="flex items-center gap-1.5 text-xs font-label font-medium text-stone-500 hover:text-red-500 transition-colors">
                      <Trash2 className="w-3 h-3" /> Delete
                    </button>
                    {!addr.isDefault && (
                      <button onClick={async () => { await userApi.setDefaultAddress(addr.id); setAddresses(a => a.map(x => ({ ...x, isDefault: x.id === addr.id }))) }}
                        className="ml-auto text-xs font-label font-semibold text-forest-600 hover:text-forest-700 transition-colors">
                        Set Default
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {showAddrModal && (
              <Modal isOpen onClose={() => setShowAddrModal(false)} title={editAddr ? 'Edit Address' : 'Add Address'}>
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

        {/* ── SECURITY TAB ── */}
        {tab === 'security' && (
          <div className="animate-fade-up space-y-4">
            {[
              {
                title: 'OTP Login',
                desc: 'Sign in with a one-time password sent to your registered mobile or email.',
                badge: 'Active',
                badgeColor: '#1e6e24',
                badgeBg: '#f0f7f0',
                dotColor: '#2d8a32',
                icon: Phone,
                iconBg: 'linear-gradient(135deg,#f0f7f0,#dceedd)',
                iconColor: '#1e6e24',
              },
              {
                title: 'Two-Factor Authentication',
                desc: 'Add an extra verification step to protect your account from unauthorised access.',
                badge: 'Off',
                badgeColor: '#9e876c',
                badgeBg: '#faf9f7',
                dotColor: '#b8a48f',
                icon: CreditCard,
                iconBg: 'linear-gradient(135deg,#faf9f7,#f2efe9)',
                iconColor: '#9e876c',
              },
            ].map(item => {
              const Icon = item.icon
              return (
                <div key={item.title} className="flex items-center gap-4 bg-white rounded-2xl border border-stone-100 p-5 shadow-card hover:shadow-card-hover transition-all duration-200">
                  <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: item.iconBg }}>
                    <Icon className="w-5 h-5" style={{ color: item.iconColor }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-label font-semibold text-stone-800 text-sm">{item.title}</p>
                    <p className="text-stone-400 font-body text-xs mt-0.5 leading-relaxed">{item.desc}</p>
                  </div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border flex-shrink-0"
                    style={{ background: item.badgeBg, borderColor: item.badgeColor + '33' }}>
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.dotColor }} />
                    <span className="font-label text-xs font-semibold tracking-wider" style={{ color: item.badgeColor }}>{item.badge}</span>
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
