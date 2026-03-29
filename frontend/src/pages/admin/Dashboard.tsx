import React, { useEffect, useState } from 'react'
import { AdminLayout } from '../../components/admin/AdminLayout'
import { Card, Badge, Spinner } from '../../components/ui'
import { Package, Users, ShoppingCart, AlertTriangle, DollarSign } from 'lucide-react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { adminApi, orderApi, productApi } from '../../services/api'
import type { DashboardStats, Product, Order } from '../../types'

interface RecentOrder {
  id: number
  orderNumber: string
  customer: string
  status: 'pending' | 'processing' | 'shipped' | 'delivered'
  amount: number
  date: string
}

interface LowStockProduct {
  id: number
  name: string
  stock: number
  minStock: number
  price: number
}

const COLORS = ['#1e6e24', '#4ea352', '#85c487', '#dceedd']

const statusColors: Record<string, 'orange' | 'purple' | 'green' | 'blue'> = {
  pending: 'orange',
  processing: 'purple',
  shipped: 'blue',
  delivered: 'green',
}

export const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([])
  const [lowStock, setLowStock] = useState<LowStockProduct[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true)
      try {
        const dashboard = await adminApi.getDashboard()
        setStats(dashboard)

        // Recent orders from admin endpoint, first 5 by createdAt desc
        const orderPage = await orderApi.getAllAdmin({ page: 1, pageSize: 5 })
        const recent: RecentOrder[] = orderPage.items.map((o: Order) => ({
          id: o.id,
          orderNumber: o.orderNumber,
          customer: o.address?.fullName || o.items[0]?.productName || 'N/A',
          status: o.status === 'cancelled' ? 'pending' : o.status === 'delivered' ? 'delivered' : 'processing',
          amount: o.totalAmount,
          date: new Date(o.createdAt).toLocaleDateString(),
        }))
        setRecentOrders(recent)

        // low stock products from product listing
        const productPage = await productApi.getAll({ page: 1, pageSize: 100 })
        const low = productPage.items
          .filter((p: Product) => p.stockQuantity !== undefined && p.stockQuantity <= 20)
          .slice(0, 5)
          .map(p => ({ id: p.id, name: p.name, stock: p.stockQuantity, minStock: 20, price: p.price }))
        setLowStock(low)
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <Spinner size="lg" />
        </div>
      </AdminLayout>
    )
  }

  if (!stats) {
    return (
      <AdminLayout>
        <div className="text-center text-stone-400">Failed to load dashboard data</div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="space-y-8">
        <h2 className="text-3xl font-display font-bold text-white">Dashboard Overview</h2>

        {/* Key Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          {[
            { label: 'Total Products', value: stats.totalProducts.toLocaleString(), icon: Package, color: 'forest' },
            { label: 'Total Orders', value: stats.totalOrders.toLocaleString(), icon: ShoppingCart, color: 'blue' },
            { label: 'Total Users', value: stats.totalUsers.toLocaleString(), icon: Users, color: 'purple' },
            { label: 'Total Farmers', value: stats.totalFarmers.toLocaleString(), icon: Users, color: 'orange' },
            { label: 'Total Revenue', value: `₹${(stats.totalRevenue / 100000).toFixed(1)}L`, icon: DollarSign, color: 'green' },
          ].map((stat, i) => {
            const Icon = stat.icon
            const colorClasses: Record<string, string> = {
              forest: 'bg-forest-600/20 text-forest-400',
              blue: 'bg-blue-600/20 text-blue-400',
              purple: 'bg-purple-600/20 text-purple-400',
              orange: 'bg-orange-600/20 text-orange-400',
              green: 'bg-green-600/20 text-green-400',
            }
            return (
              <Card key={i} className="bg-stone-800 border border-stone-700 p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-stone-400 text-sm font-medium mb-1">{stat.label}</p>
                    <p className="text-3xl font-display font-bold text-white">{stat.value}</p>
                  </div>
                  <div className={`p-3 rounded-xl ${colorClasses[stat.color]}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                </div>
              </Card>
            )
          })}
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue Trend */}
          <Card className="bg-stone-800 border border-stone-700 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Revenue Trend</h3>
            {stats.revenueChart && stats.revenueChart.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={stats.revenueChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                  <XAxis stroke="#a1a1aa" dataKey="label" />
                  <YAxis stroke="#a1a1aa" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#27272a', border: '1px solid #3f3f46', borderRadius: '8px' }}
                    labelStyle={{ color: '#fff' }}
                  />
                  <Line type="monotone" dataKey="revenue" stroke="#1e6e24" strokeWidth={2} dot={{ fill: '#4ea352' }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-stone-400 text-center py-8">No revenue data available</p>
            )}
          </Card>

          {/* Pending Items */}
          <Card className="bg-stone-800 border border-stone-700 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Pending Reviews</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-orange-600/10 border border-orange-600/20 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-orange-300">Pending Orders</p>
                  <p className="text-xs text-stone-400">Orders awaiting processing</p>
                </div>
                <p className="text-2xl font-display font-bold text-orange-400">{stats.pendingOrders}</p>
              </div>
              <div className="flex items-center justify-between p-3 bg-purple-600/10 border border-purple-600/20 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-purple-300">Pending Approvals</p>
                  <p className="text-xs text-stone-400">Farmers awaiting verification</p>
                </div>
                <p className="text-2xl font-display font-bold text-purple-400">{stats.pendingFarmerApprovals}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Recent Orders */}
        <Card className="bg-stone-800 border border-stone-700 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Recent Orders</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-stone-700">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-stone-400 uppercase">Order ID</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-stone-400 uppercase">Customer</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-stone-400 uppercase">Amount</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-stone-400 uppercase">Status</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-stone-400 uppercase">Date</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map(order => (
                  <tr key={order.id} className="border-b border-stone-700 hover:bg-stone-700/50 transition">
                    <td className="py-3 px-4 text-sm text-white font-medium">{order.orderNumber}</td>
                    <td className="py-3 px-4 text-sm text-stone-300">{order.customer}</td>
                    <td className="py-3 px-4 text-sm text-white font-semibold">₹{order.amount.toLocaleString()}</td>
                    <td className="py-3 px-4">
                      <Badge variant={statusColors[order.status]}>{order.status}</Badge>
                    </td>
                    <td className="py-3 px-4 text-sm text-stone-400">{order.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </AdminLayout>
  )
}
