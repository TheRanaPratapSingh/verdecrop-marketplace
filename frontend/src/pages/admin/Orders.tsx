import React, { useEffect, useState } from 'react'
import { AdminLayout } from '../../components/admin/AdminLayout'
import { Card, Badge, Spinner } from '../../components/ui'
import { Eye } from 'lucide-react'
import toast from 'react-hot-toast'
import { orderApi } from '../../services/api'
import type { Order } from '../../types'

const statusColors: Record<string, 'orange' | 'purple' | 'blue' | 'green' | 'gray' | 'red'> = {
  pending: 'orange',
  confirmed: 'blue',
  processing: 'purple',
  shipped: 'blue',
  delivered: 'green',
  cancelled: 'gray',
  refunded: 'gray',
}

export const AdminOrders: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  const fetchOrders = async () => {
    setLoading(true)
    try {
      const data = await orderApi.getAllAdmin({ page: 1, pageSize: 50 })
      setOrders(data.items)
    } catch (error) {
      console.error('Failed to load orders', error)
      toast.error('Failed to fetch orders')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrders()
  }, [])

  const handleStatusChange = async (orderId: number, newStatus: string) => {
    try {
      await orderApi.updateStatus(orderId, newStatus)
      setOrders(prev => prev.map(o => (o.id === orderId ? { ...o, status: newStatus as any } : o)))
      toast.success('Order status updated')
    } catch (error) {
      console.error('Update failed', error)
      toast.error('Failed to update order status')
    }
  }

  return (
    <AdminLayout>
      <div>
        <div className="mb-8">
          <h2 className="text-3xl font-display font-bold text-gray-100 mb-1">Orders</h2>
          <p className="text-gray-400">Manage and track all customer orders</p>
        </div>

        <Card className="bg-white border border-gray-200 overflow-hidden rounded-2xl shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left py-4 px-6 text-xs font-semibold text-gray-800 uppercase">Order ID</th>
                  <th className="text-left py-4 px-6 text-xs font-semibold text-gray-800 uppercase">Customer</th>
                  <th className="text-left py-4 px-6 text-xs font-semibold text-gray-800 uppercase">Amount</th>
                  <th className="text-left py-4 px-6 text-xs font-semibold text-gray-800 uppercase">Status</th>
                  <th className="text-left py-4 px-6 text-xs font-semibold text-gray-800 uppercase">Date</th>
                  <th className="text-left py-4 px-6 text-xs font-semibold text-gray-800 uppercase">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-500">
                      <Spinner /> Loading orders...
                    </td>
                  </tr>
                ) : orders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-500">
                      No orders found
                    </td>
                  </tr>
                ) : (
                  orders.map(order => (
                    <tr key={order.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="py-4 px-6 text-sm text-gray-900 font-medium">{order.orderNumber}</td>
                      <td className="py-4 px-6 text-sm text-gray-700">{order.address?.fullName || 'N/A'}</td>
                      <td className="py-4 px-6 text-sm text-gray-900 font-semibold">₹{order.totalAmount}</td>
                      <td className="py-4 px-6">
                        <select
                          aria-label="Order status"
                          value={order.status}
                          onChange={e => handleStatusChange(order.id, e.target.value)}
                          className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 hover:border-gray-400 transition-colors"
                        >
                          <option value="pending">Pending</option>
                          <option value="confirmed">Confirmed</option>
                          <option value="processing">Processing</option>
                          <option value="shipped">Shipped</option>
                          <option value="delivered">Delivered</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </td>
                      <td className="py-4 px-6 text-sm text-gray-600">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-4 px-6">
                        <button aria-label="View order details" className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all">
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </AdminLayout>
  )
}
