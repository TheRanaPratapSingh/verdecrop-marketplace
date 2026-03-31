import React, { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ArrowLeft, CheckCircle2, ChevronRight, Clock3, CreditCard, MapPin, PackageCheck } from 'lucide-react'
import { PageLayout } from '../components/layout'
import { Badge, Button, Card, Spinner } from '../components/ui'
import { orderApi } from '../services/api'
import type { Order } from '../types'

const statusColors: Record<string, 'orange' | 'purple' | 'blue' | 'green' | 'gray' | 'red'> = {
  pending: 'orange',
  confirmed: 'blue',
  processing: 'purple',
  shipped: 'blue',
  delivered: 'green',
  cancelled: 'gray',
  refunded: 'gray',
}

const nextStatusMap: Record<string, string | null> = {
  pending: 'confirmed',
  confirmed: 'processing',
  processing: 'shipped',
  shipped: 'delivered',
  delivered: null,
  cancelled: null,
  refunded: null,
}

const STATUS_STEPS = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'] as const
const formatStatus = (status: string) => status.charAt(0).toUpperCase() + status.slice(1)

export const SellerOrderDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    if (!id) return
    orderApi.getById(Number(id))
      .then(setOrder)
      .catch(() => toast.error('Failed to load seller order details'))
      .finally(() => setLoading(false))
  }, [id])

  const sellerSubtotal = useMemo(() => order?.items.reduce((sum, item) => sum + item.totalPrice, 0) ?? 0, [order])
  const nextStatus = order ? nextStatusMap[order.status] : null
  const currentIdx = order ? STATUS_STEPS.indexOf(order.status as typeof STATUS_STEPS[number]) : -1

  const handleStatusUpdate = async () => {
    if (!order || !nextStatus) return
    setUpdating(true)
    try {
      await orderApi.updateStatus(order.id, nextStatus)
      setOrder({ ...order, status: nextStatus as Order['status'] })
      toast.success(`Order marked as ${formatStatus(nextStatus)}`)
    } catch {
      toast.error('Failed to update order status')
    } finally {
      setUpdating(false)
    }
  }

  if (loading) return <PageLayout><div className="flex justify-center py-20"><Spinner size="lg" /></div></PageLayout>
  if (!order) return <PageLayout><div className="max-w-4xl mx-auto px-4 sm:px-6 py-10"><Card className="p-10 text-center rounded-3xl"><p className="text-stone-500 mb-4">Order not found.</p><Link to="/seller/orders"><Button>Back to Seller Dashboard</Button></Link></Card></div></PageLayout>

  return (
    <PageLayout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate('/seller/orders')} className="p-2 hover:bg-stone-100 rounded-xl transition">
            <ArrowLeft className="w-5 h-5 text-stone-500" />
          </button>
          <div className="min-w-0">
            <p className="section-label mb-1">Seller Dashboard</p>
            <h1 className="text-2xl font-display font-bold text-stone-900 truncate">{order.orderNumber}</h1>
            <p className="text-sm text-stone-500 font-body">Placed on {new Date(order.createdAt).toLocaleString()}</p>
          </div>
          <div className="ml-auto">
            <Badge variant={statusColors[order.status] ?? 'gray'}>{formatStatus(order.status)}</Badge>
          </div>
        </div>

        {order.status !== 'cancelled' && (
          <Card className="p-6 mb-5 rounded-3xl">
            <div className="flex items-start gap-2">
              {STATUS_STEPS.map((step, i) => {
                const done = i <= currentIdx && order.status !== 'cancelled'
                return (
                  <React.Fragment key={step}>
                    <div className="flex flex-col items-center gap-1.5 min-w-0">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${done ? 'bg-forest-600 text-white shadow-sm' : 'bg-stone-100 text-stone-400'}`}>
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <span className={`text-[10px] font-body text-center capitalize ${done ? 'text-forest-700 font-semibold' : 'text-stone-400'}`}>{step}</span>
                    </div>
                    {i < STATUS_STEPS.length - 1 && (
                      <div className={`flex-1 h-0.5 mt-4 ${i < currentIdx ? 'bg-forest-500' : 'bg-stone-200'}`} />
                    )}
                  </React.Fragment>
                )
              })}
            </div>
            {order.estimatedDelivery && order.status !== 'delivered' && (
              <p className="text-xs text-stone-500 font-body mt-4 text-center">Expected delivery: <strong className="text-stone-700">{order.estimatedDelivery}</strong></p>
            )}
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
          <Card className="p-5 rounded-3xl bg-white border border-stone-200">
            <div className="flex items-center justify-between mb-2">
              <PackageCheck className="w-5 h-5 text-forest-600" />
              <span className="text-2xl font-display font-bold text-stone-900">{order.items.length}</span>
            </div>
            <p className="text-sm text-stone-600 font-body">Products to fulfill</p>
          </Card>
          <Card className="p-5 rounded-3xl bg-white border border-stone-200">
            <div className="flex items-center justify-between mb-2">
              <CreditCard className="w-5 h-5 text-forest-600" />
              <span className="text-2xl font-display font-bold text-stone-900">₹{sellerSubtotal.toFixed(0)}</span>
            </div>
            <p className="text-sm text-stone-600 font-body">Your order value</p>
          </Card>
          <Card className="p-5 rounded-3xl bg-white border border-stone-200">
            <div className="flex items-center justify-between mb-2">
              <Clock3 className="w-5 h-5 text-forest-600" />
              <span className="text-base font-semibold text-stone-900">{formatStatus(order.status)}</span>
            </div>
            <p className="text-sm text-stone-600 font-body">Current workflow step</p>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-5">
            <Card className="p-5 rounded-3xl bg-white border border-stone-200">
              <h3 className="font-display font-semibold text-stone-900 mb-4">Items to Fulfill</h3>
              <div className="space-y-3">
                {order.items.map(item => (
                  <div key={item.id} className="flex items-center justify-between gap-4 rounded-2xl border border-stone-100 px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-stone-900">{item.productName}</p>
                      <p className="text-xs text-stone-500">{item.quantity} {item.unit} × ₹{item.unitPrice}</p>
                    </div>
                    <p className="text-sm font-semibold text-stone-900">₹{item.totalPrice.toFixed(0)}</p>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-5 rounded-3xl bg-white border border-stone-200">
              <h3 className="font-display font-semibold text-stone-900 mb-4">Status History</h3>
              <div className="space-y-3">
                {order.statusHistory.length === 0 ? (
                  <p className="text-sm text-stone-500">No updates yet.</p>
                ) : (
                  order.statusHistory.map(history => (
                    <div key={history.id} className="flex items-start gap-3 rounded-2xl border border-stone-100 px-4 py-3">
                      <div className="mt-1 w-2.5 h-2.5 rounded-full bg-forest-500 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-stone-900 capitalize">{history.status}</p>
                        {history.note && <p className="text-xs text-stone-500 mt-1">{history.note}</p>}
                        <p className="text-xs text-stone-400 mt-1">{new Date(history.createdAt).toLocaleString()}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>

          <div className="space-y-5">
            <Card className="p-5 rounded-3xl bg-white border border-stone-200">
              <h3 className="font-display font-semibold text-stone-900 mb-3 flex items-center gap-2"><MapPin className="w-4 h-4 text-forest-600" /> Delivery Address</h3>
              <p className="text-sm font-medium text-stone-800">{order.address.fullName}</p>
              <p className="text-sm text-stone-500 mt-1">{order.address.street}</p>
              <p className="text-sm text-stone-500">{order.address.city}, {order.address.state} - {order.address.pinCode}</p>
              <p className="text-sm text-stone-500 mt-1">{order.address.phone}</p>
            </Card>

            <Card className="p-5 rounded-3xl bg-white border border-stone-200">
              <h3 className="font-display font-semibold text-stone-900 mb-3">Order Summary</h3>
              <div className="space-y-2 text-sm font-body">
                <div className="flex justify-between text-stone-600"><span>Status</span><span className="capitalize">{order.status}</span></div>
                <div className="flex justify-between text-stone-600"><span>Payment</span><span className="capitalize">{order.paymentMethod}</span></div>
                <div className="flex justify-between text-stone-600"><span>Payment Status</span><span className="capitalize">{order.paymentStatus}</span></div>
                <div className="flex justify-between font-bold text-stone-900 pt-2 border-t border-stone-100"><span>Your Total</span><span>₹{sellerSubtotal.toFixed(0)}</span></div>
              </div>
            </Card>

            <Card className="p-5 rounded-3xl bg-white border border-stone-200">
              <h3 className="font-display font-semibold text-stone-900 mb-3">Workflow Action</h3>
              {nextStatus ? (
                <Button variant="primary" className="w-full" loading={updating} onClick={handleStatusUpdate}>
                  Mark as {formatStatus(nextStatus)}
                  <ChevronRight className="w-4 h-4" />
                </Button>
              ) : (
                <p className="text-sm text-stone-500">No further action is available for this order.</p>
              )}
              <Link to="/seller/orders" className="block mt-3">
                <Button variant="outline" className="w-full">Back to Seller Dashboard</Button>
              </Link>
            </Card>
          </div>
        </div>
      </div>
    </PageLayout>
  )
}

export default SellerOrderDetailPage
