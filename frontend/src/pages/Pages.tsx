import React, { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
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

      if (paymentMethod === 'razorpay') {
        const rpOrder = await paymentApi.createRazorpayOrder(order!.id)
        const razorpay = new (window as any).Razorpay({
          key: rpOrder.keyId,
          amount: rpOrder.amount * 100,
          currency: rpOrder.currency,
          order_id: rpOrder.razorpayOrderId,
          name: 'VerdeCrop',
          description: `Order #${order!.orderNumber}`,
          handler: async (response: any) => {
            await paymentApi.verifyRazorpay({
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
              orderId: order!.id
            })
            navigate(`/orders/${order!.id}?success=1`)
          },
          theme: { color: '#267d39' }
        })
        razorpay.open()
      } else {
        navigate(`/orders/${order!.id}?success=1`)
      }
    } catch { toast.error('Failed to place order. Please try again.') }
    finally { setPlacingOrder(false) }
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
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-2xl font-display font-bold text-gray-900 mb-6">My Orders</h1>
        {orders.length === 0 ? (
          <EmptyState icon={<Package className="w-12 h-12 text-gray-300" />} title="No orders yet"
            description="Start shopping and your orders will appear here."
            action={<Link to="/products"><Button>Shop Now</Button></Link>} />
        ) : (
          <div className="space-y-4">
            {orders.map(order => (
              <Link key={order.id} to={`/orders/${order.id}`}>
                <Card hover className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-sm font-bold text-gray-900 font-body">{order.orderNumber}</p>
                      <p className="text-xs text-gray-500 font-body mt-0.5">
                        {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        {' · '}{order.itemCount} item{(order.itemCount ?? 0) > 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-base font-bold text-gray-900 font-body">₹{order.totalAmount.toFixed(0)}</p>
                      <StatusBadge status={order.status} />
                    </div>
                  </div>
                  {/* Mini tracker */}
                  <div className="flex items-center gap-1 mt-3">
                    {STATUS_STEPS.map((s, i) => {
                      const idx = STATUS_STEPS.indexOf(order.status)
                      const done = i <= idx && order.status !== 'cancelled'
                      const Icon = STATUS_ICONS[s]
                      return (
                        <React.Fragment key={s}>
                          <div className={`flex items-center justify-center w-6 h-6 rounded-full transition-colors ${done ? 'bg-leaf-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
                            <Icon className="w-3 h-3" />
                          </div>
                          {i < STATUS_STEPS.length - 1 && (
                            <div className={`flex-1 h-0.5 ${i < idx ? 'bg-leaf-500' : 'bg-gray-200'}`} />
                          )}
                        </React.Fragment>
                      )
                    })}
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </PageLayout>
  )
}

export const OrderDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    if (!id) return
    orderApi.getById(Number(id)).then(o => { setOrder(o); setLoading(false) }).catch(() => setLoading(false))
  }, [id])

  const handleCancel = async () => {
    if (!order || !confirm('Cancel this order?')) return
    setCancelling(true)
    try {
      await orderApi.cancel(order.id)
      setOrder({ ...order, status: 'cancelled' })
      toast.success('Order cancelled')
    } catch { toast.error('Could not cancel order') }
    finally { setCancelling(false) }
  }

  if (loading) return <PageLayout><div className="flex justify-center py-20"><Spinner size="lg" /></div></PageLayout>
  if (!order) return <PageLayout><EmptyState title="Order not found" action={<Link to="/orders"><Button>My Orders</Button></Link>} /></PageLayout>

  const currentIdx = STATUS_STEPS.indexOf(order.status)

  return (
    <PageLayout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate('/orders')} className="p-2 hover:bg-gray-100 rounded-xl transition">
            <ChevronRight className="w-5 h-5 text-gray-500 rotate-180" />
          </button>
          <div>
            <h1 className="text-xl font-display font-bold text-gray-900">{order.orderNumber}</h1>
            <p className="text-sm text-gray-500 font-body">{new Date(order.createdAt).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          </div>
          <StatusBadge status={order.status} />
        </div>

        {/* Tracker */}
        {order.status !== 'cancelled' && (
          <Card className="p-6 mb-5">
            <div className="flex items-start gap-2">
              {STATUS_STEPS.map((s, i) => {
                const done = i <= currentIdx
                const Icon = STATUS_ICONS[s]
                return (
                  <React.Fragment key={s}>
                    <div className="flex flex-col items-center gap-1.5 min-w-0">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${done ? 'bg-leaf-600 text-white shadow-sm' : 'bg-gray-100 text-gray-400'}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className={`text-[10px] font-body text-center capitalize ${done ? 'text-leaf-700 font-semibold' : 'text-gray-400'}`}>{s}</span>
                    </div>
                    {i < STATUS_STEPS.length - 1 && (
                      <div className={`flex-1 h-0.5 mt-4 ${i < currentIdx ? 'bg-leaf-500' : 'bg-gray-200'}`} />
                    )}
                  </React.Fragment>
                )
              })}
            </div>
            {order.estimatedDelivery && order.status !== 'delivered' && (
              <p className="text-xs text-gray-500 font-body mt-4 text-center">Expected delivery: <strong className="text-gray-700">{order.estimatedDelivery}</strong></p>
            )}
          </Card>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
          {/* Items */}
          <Card className="p-5 sm:col-span-2">
            <h3 className="font-display font-semibold text-gray-800 mb-3">Items ({order.items.length})</h3>
            <div className="space-y-3">
              {order.items.map(item => (
                <div key={item.id} className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0">
                    {item.imageUrl ? <img src={resolveAssetUrl(item.imageUrl)} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-lg">🌿</div>}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800 font-body">{item.productName}</p>
                    <p className="text-xs text-gray-500 font-body">{item.quantity} {item.unit} × ₹{item.unitPrice}</p>
                  </div>
                  <p className="text-sm font-bold font-body">₹{item.totalPrice.toFixed(0)}</p>
                </div>
              ))}
            </div>
          </Card>

          {/* Address */}
          <Card className="p-5">
            <h3 className="font-display font-semibold text-gray-800 mb-2 flex items-center gap-1.5"><MapPin className="w-4 h-4 text-leaf-600" /> Delivery Address</h3>
            <p className="text-sm font-medium text-gray-700 font-body">{order.address.fullName}</p>
            <p className="text-sm text-gray-500 font-body">{order.address.street}</p>
            <p className="text-sm text-gray-500 font-body">{order.address.city}, {order.address.state} – {order.address.pinCode}</p>
          </Card>

          {/* Bill */}
          <Card className="p-5">
            <h3 className="font-display font-semibold text-gray-800 mb-3 flex items-center gap-1.5"><CreditCard className="w-4 h-4 text-leaf-600" /> Bill Summary</h3>
            <div className="space-y-1.5 text-sm font-body">
              {[['Subtotal', `₹${order.subtotal.toFixed(0)}`], ['Delivery', order.deliveryCharge === 0 ? 'Free' : `₹${order.deliveryCharge}`],
                ...(order.discountAmount > 0 ? [['Discount', `-₹${order.discountAmount.toFixed(0)}`]] : []),
                ['Tax', `₹${order.taxAmount.toFixed(0)}`]].map(([l, v]) => (
                <div key={l} className="flex justify-between text-gray-600"><span>{l}</span><span>{v}</span></div>
              ))}
              <div className="flex justify-between font-bold text-gray-900 pt-2 border-t border-gray-100">
                <span>Total</span><span>₹{order.totalAmount.toFixed(0)}</span>
              </div>
            </div>
          </Card>
        </div>

        {order.status === 'pending' && (
          <Button variant="danger" loading={cancelling} onClick={handleCancel}>
            <X className="w-4 h-4" /> Cancel Order
          </Button>
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
