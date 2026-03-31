import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageLayout } from '../components/layout'
import { Badge, Button, Card, Spinner } from '../components/ui'
import { orderApi } from '../services/api'
import type { Order } from '../types'
import toast from 'react-hot-toast'
import { Clock3, CreditCard, MapPin, PackageCheck } from 'lucide-react'

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

const formatStatus = (status: string) => status.charAt(0).toUpperCase() + status.slice(1)

export const SellerOrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [updatingId, setUpdatingId] = useState<number | null>(null)

  const fetchOrders = async (status?: string) => {
    setLoading(true)
    try {
      const data = await orderApi.getSellerOrders({ page: 1, pageSize: 50, status })
      setOrders(data.items ?? [])
    } catch (error) {
      console.error('Failed to load seller orders', error)
      toast.error('Failed to fetch seller orders')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrders(statusFilter === 'all' ? undefined : statusFilter)
  }, [statusFilter])

  const summary = useMemo(() => ({
    total: orders.length,
    pending: orders.filter(o => o.status === 'pending').length,
    processing: orders.filter(o => o.status === 'processing').length,
    shipped: orders.filter(o => o.status === 'shipped').length,
  }), [orders])

  const handleStatusUpdate = async (order: Order, newStatus: string) => {
    setUpdatingId(order.id)
    try {
      await orderApi.updateStatus(order.id, newStatus)
      setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: newStatus as Order['status'] } : o))
      toast.success(`Order marked as ${formatStatus(newStatus)}`)
    } catch (error) {
      console.error('Failed to update seller order status', error)
      toast.error('Failed to update order status')
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <PageLayout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="section-label mb-2">Seller Dashboard</p>
            <h1 className="text-3xl font-display font-bold text-stone-900 mb-2">Order Fulfillment</h1>
            <p className="text-stone-600 font-body">Manage the orders that include your products and move them through the delivery workflow.</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {['all', 'pending', 'confirmed', 'processing', 'shipped', 'delivered'].map(status => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition ${statusFilter === status ? 'bg-forest-600 text-white' : 'bg-white text-stone-600 border border-stone-200 hover:border-stone-300'}`}
              >
                {status === 'all' ? 'All' : formatStatus(status)}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Orders', value: summary.total, icon: PackageCheck },
            { label: 'Pending', value: summary.pending, icon: Clock3 },
            { label: 'Processing', value: summary.processing, icon: CreditCard },
            { label: 'Shipped', value: summary.shipped, icon: MapPin },
          ].map(item => (
            <Card key={item.label} className="p-5 bg-white border border-stone-200 rounded-3xl">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-2xl bg-forest-50 text-forest-700 flex items-center justify-center">
                  <item.icon className="w-5 h-5" />
                </div>
                <span className="text-2xl font-display font-bold text-stone-900">{item.value}</span>
              </div>
              <p className="text-sm text-stone-600 font-body">{item.label}</p>
            </Card>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Spinner size="lg" /></div>
        ) : orders.length === 0 ? (
          <Card className="p-12 text-center bg-white border border-stone-200 rounded-3xl">
            <p className="text-stone-500">No seller orders found for this status.</p>
          </Card>
        ) : (
          <div className="space-y-5">
            {orders.map(order => {
              const nextStatus = nextStatusMap[order.status]
              const sellerSubtotal = order.items.reduce((sum, item) => sum + item.totalPrice, 0)

              return (
                <Card key={order.id} className="p-6 bg-white border border-stone-200 rounded-3xl shadow-sm">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between mb-5">
                    <div>
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <h2 className="text-lg font-display font-semibold text-stone-900">{order.orderNumber}</h2>
                        <Badge variant={statusColors[order.status] ?? 'gray'}>{formatStatus(order.status)}</Badge>
                      </div>
                      <p className="text-sm text-stone-500 font-body">Placed on {new Date(order.createdAt).toLocaleString()}</p>
                      {order.estimatedDelivery && (
                        <p className="text-sm text-stone-500 font-body mt-1">Expected delivery: {order.estimatedDelivery}</p>
                      )}
                    </div>
                    <div className="text-left lg:text-right">
                      <p className="text-xs uppercase tracking-wider text-stone-400 font-semibold">Your Items Total</p>
                      <p className="text-2xl font-display font-bold text-stone-900">₹{sellerSubtotal.toFixed(0)}</p>
                      <Link to={`/seller/orders/${order.id}`} className="inline-block mt-2 text-sm font-medium text-forest-700 hover:text-forest-800">
                        View details →
                      </Link>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    <div className="lg:col-span-2">
                      <div className="border border-stone-100 rounded-2xl overflow-hidden">
                        <div className="px-4 py-3 bg-stone-50 border-b border-stone-100 text-sm font-semibold text-stone-700">Products to Fulfill</div>
                        <div className="divide-y divide-stone-100">
                          {order.items.map(item => (
                            <div key={item.id} className="px-4 py-3 flex items-center justify-between gap-4">
                              <div>
                                <p className="text-sm font-medium text-stone-900">{item.productName}</p>
                                <p className="text-xs text-stone-500">{item.quantity} {item.unit} × ₹{item.unitPrice}</p>
                              </div>
                              <p className="text-sm font-semibold text-stone-900">₹{item.totalPrice.toFixed(0)}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <Card className="p-4 border border-stone-100 rounded-2xl shadow-none">
                        <h3 className="text-sm font-semibold text-stone-800 mb-2">Delivery Address</h3>
                        <p className="text-sm text-stone-700 font-medium">{order.address.fullName}</p>
                        <p className="text-sm text-stone-500">{order.address.street}</p>
                        <p className="text-sm text-stone-500">{order.address.city}, {order.address.state} - {order.address.pinCode}</p>
                        <p className="text-sm text-stone-500 mt-1">{order.address.phone}</p>
                      </Card>

                      <Card className="p-4 border border-stone-100 rounded-2xl shadow-none">
                        <h3 className="text-sm font-semibold text-stone-800 mb-2">Workflow Action</h3>
                        {nextStatus ? (
                          <Button
                            variant="primary"
                            className="w-full"
                            loading={updatingId === order.id}
                            onClick={() => handleStatusUpdate(order, nextStatus)}
                          >
                            Mark as {formatStatus(nextStatus)}
                          </Button>
                        ) : (
                          <p className="text-sm text-stone-500">No further action available for this order.</p>
                        )}
                      </Card>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </PageLayout>
  )
}

export default SellerOrdersPage
