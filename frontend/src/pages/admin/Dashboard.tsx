import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AdminLayout } from '../../components/admin/AdminLayout'
import {
  Package, Users, ShoppingCart, IndianRupee, TrendingUp, TrendingDown,
  Clock, CheckCircle2, AlertTriangle, Sprout, ArrowRight,
  BarChart3, RefreshCw,
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { adminApi, orderApi, productApi } from '../../services/api'
import type { DashboardStats } from '../../types'

// ── Types for secondary data (admin order list DTO shape) ─────────────────────
interface AdminOrderRow {
  id: number
  orderNumber: string
  customerName?: string        // flat field from OrderListDto
  status: string
  paymentStatus: string
  totalAmount: number
  itemCount?: number
  createdAt: string
}

interface LowStockRow {
  id: number
  name: string
  stockQuantity: number
  price: number
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  n >= 100000 ? `₹${(n / 100000).toFixed(1)}L` :
  n >= 1000   ? `₹${(n / 1000).toFixed(1)}k`   :
  `₹${n.toLocaleString()}`

const statusMeta: Record<string, { label: string; dot: string; text: string; bg: string }> = {
  pending:    { label: 'Pending',    dot: 'bg-amber-400',  text: 'text-amber-300',  bg: 'bg-amber-400/10 border-amber-400/20' },
  confirmed:  { label: 'Confirmed',  dot: 'bg-blue-400',   text: 'text-blue-300',   bg: 'bg-blue-400/10 border-blue-400/20' },
  processing: { label: 'Processing', dot: 'bg-violet-400', text: 'text-violet-300', bg: 'bg-violet-400/10 border-violet-400/20' },
  shipped:    { label: 'Shipped',    dot: 'bg-sky-400',    text: 'text-sky-300',    bg: 'bg-sky-400/10 border-sky-400/20' },
  delivered:  { label: 'Delivered',  dot: 'bg-emerald-400',text: 'text-emerald-300',bg: 'bg-emerald-400/10 border-emerald-400/20' },
  cancelled:  { label: 'Cancelled',  dot: 'bg-red-400',    text: 'text-red-300',    bg: 'bg-red-400/10 border-red-400/20' },
  refunded:   { label: 'Refunded',   dot: 'bg-stone-400',  text: 'text-stone-300',  bg: 'bg-stone-400/10 border-stone-400/20' },
}

// ── Custom Tooltip for charts ─────────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string }[]; label?: string }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-stone-800 border border-stone-600 rounded-xl px-4 py-3 shadow-xl text-xs">
      <p className="text-stone-300 mb-1.5 font-semibold">{label}</p>
      {payload.map(p => (
        <p key={p.name} className="text-white font-bold">
          {p.name === 'revenue' ? fmt(p.value) : p.value.toLocaleString()}
          <span className="text-stone-400 font-normal ml-1">{p.name}</span>
        </p>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
export const AdminDashboard: React.FC = () => {
  const [stats, setStats]           = useState<DashboardStats | null>(null)
  const [orders, setOrders]         = useState<AdminOrderRow[]>([])
  const [lowStock, setLowStock]     = useState<LowStockRow[]>([])
  const [statsError, setStatsError] = useState(false)
  const [loading, setLoading]       = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    setLoading(true)
    setStatsError(false)

    const p1 = adminApi.getDashboard().then(d => setStats(d)).catch(() => setStatsError(true))

    const p2 = orderApi.getAllAdmin({ page: 1, pageSize: 8 }).then(page => {
      // admin DTO is OrderListDto — fields: id, orderNumber, status, paymentStatus,
      // totalAmount, itemCount, createdAt, customerName  (all flat)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rows: AdminOrderRow[] = (page?.items ?? []).map((o: any) => ({
        id:           o.id,
        orderNumber:  o.orderNumber ?? `#${o.id}`,
        customerName: o.customerName ?? o.address?.fullName ?? '—',
        status:       o.status ?? 'pending',
        paymentStatus:o.paymentStatus ?? '',
        totalAmount:  o.totalAmount ?? 0,
        itemCount:    o.itemCount ?? o.items?.length ?? 0,
        createdAt:    o.createdAt,
      }))
      setOrders(rows)
    }).catch(() => { /* orders panel just stays empty */ })

    const p3 = productApi.getAll({ page: 1, pageSize: 100 }).then(page => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const low: LowStockRow[] = (page?.items ?? [])
        .filter((p: any) => (p.stockQuantity ?? p.stock ?? 999) <= 20)
        .slice(0, 6)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((p: any) => ({
          id:            p.id,
          name:          p.name,
          stockQuantity: p.stockQuantity ?? p.stock ?? 0,
          price:         p.price ?? 0,
        }))
      setLowStock(low)
    }).catch(() => { /* low-stock panel stays empty */ })

    Promise.all([p1, p2, p3]).finally(() => setLoading(false))
  }, [refreshKey])

  // ── Skeleton ─────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <AdminLayout>
        <div className="space-y-6 animate-pulse">
          <div className="h-8 w-56 bg-stone-700 rounded-xl" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-28 bg-stone-800 rounded-2xl border border-stone-700" />
            ))}
          </div>
          <div className="grid lg:grid-cols-2 gap-4">
            <div className="h-72 bg-stone-800 rounded-2xl border border-stone-700" />
            <div className="h-72 bg-stone-800 rounded-2xl border border-stone-700" />
          </div>
        </div>
      </AdminLayout>
    )
  }

  // ── Stat cards data ───────────────────────────────────────────────────────
  const statCards = [
    {
      label: 'Total Revenue',
      value: stats ? fmt(stats.totalRevenue) : '—',
      sub: stats ? `${fmt(stats.monthlyRevenue)} this month` : 'Loading…',
      Icon: IndianRupee,
      gradient: 'from-emerald-500/20 to-emerald-600/5',
      ring: 'ring-emerald-500/30',
      iconBg: 'bg-emerald-500/20',
      iconColor: 'text-emerald-400',
      trend: null,
    },
    {
      label: 'Total Orders',
      value: stats ? stats.totalOrders.toLocaleString() : '—',
      sub: stats ? `${stats.pendingOrders} pending` : 'Loading…',
      Icon: ShoppingCart,
      gradient: 'from-blue-500/20 to-blue-600/5',
      ring: 'ring-blue-500/30',
      iconBg: 'bg-blue-500/20',
      iconColor: 'text-blue-400',
      trend: null,
    },
    {
      label: 'Total Products',
      value: stats ? stats.totalProducts.toLocaleString() : '—',
      sub: `${lowStock.length} low stock`,
      Icon: Package,
      gradient: 'from-violet-500/20 to-violet-600/5',
      ring: 'ring-violet-500/30',
      iconBg: 'bg-violet-500/20',
      iconColor: 'text-violet-400',
      trend: null,
    },
    {
      label: 'Total Users',
      value: stats ? stats.totalUsers.toLocaleString() : '—',
      sub: stats ? `${stats.totalFarmers} farmers` : 'Loading…',
      Icon: Users,
      gradient: 'from-amber-500/20 to-amber-600/5',
      ring: 'ring-amber-500/30',
      iconBg: 'bg-amber-500/20',
      iconColor: 'text-amber-400',
      trend: null,
    },
    {
      label: 'Pending Orders',
      value: stats ? stats.pendingOrders.toString() : '—',
      sub: 'Awaiting processing',
      Icon: Clock,
      gradient: 'from-orange-500/20 to-orange-600/5',
      ring: 'ring-orange-500/30',
      iconBg: 'bg-orange-500/20',
      iconColor: 'text-orange-400',
      trend: null,
    },
    {
      label: 'Farmer Approvals',
      value: stats ? stats.pendingFarmerApprovals.toString() : '—',
      sub: 'Pending verification',
      Icon: Sprout,
      gradient: 'from-teal-500/20 to-teal-600/5',
      ring: 'ring-teal-500/30',
      iconBg: 'bg-teal-500/20',
      iconColor: 'text-teal-400',
      trend: null,
    },
    {
      label: 'Monthly Revenue',
      value: stats ? fmt(stats.monthlyRevenue) : '—',
      sub: 'Current month',
      Icon: TrendingUp,
      gradient: 'from-pink-500/20 to-pink-600/5',
      ring: 'ring-pink-500/30',
      iconBg: 'bg-pink-500/20',
      iconColor: 'text-pink-400',
      trend: null,
    },
    {
      label: 'Active Farmers',
      value: stats ? stats.totalFarmers.toLocaleString() : '—',
      sub: `${stats ? stats.pendingFarmerApprovals : 0} pending`,
      Icon: CheckCircle2,
      gradient: 'from-lime-500/20 to-lime-600/5',
      ring: 'ring-lime-500/30',
      iconBg: 'bg-lime-500/20',
      iconColor: 'text-lime-400',
      trend: null,
    },
  ]

  const chartData = stats?.revenueChart?.length
    ? stats.revenueChart.map(r => ({
        label: r.label.replace(/^\d{4}-/, '').replace(/^0/, ''),
        revenue: r.revenue,
        orders:  r.orders,
      }))
    : []

  return (
    <AdminLayout>
      <div className="space-y-6">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-white">Dashboard</h1>
            <p className="text-stone-400 text-sm mt-0.5">
              {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <button
            onClick={() => setRefreshKey(k => k + 1)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-stone-800 border border-stone-700 text-stone-300 hover:text-white hover:bg-stone-700 transition-all text-sm font-medium"
          >
            <RefreshCw className="w-4 h-4" />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>

        {/* ── Stats error banner ───────────────────────────────────────────── */}
        {statsError && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            Dashboard stats failed to load. Other data may still be available.
          </div>
        )}

        {/* ── Stat Cards ───────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {statCards.map(({ label, value, sub, Icon, gradient, ring, iconBg, iconColor }) => (
            <div
              key={label}
              className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${gradient} border border-stone-700/60 ring-1 ${ring} p-4 sm:p-5`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${iconColor}`} strokeWidth={1.8} />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-display font-bold text-white leading-none mb-1">{value}</p>
              <p className="text-xs text-stone-400 font-medium mt-1 truncate">{label}</p>
              <p className="text-[11px] text-stone-500 mt-0.5 truncate">{sub}</p>
            </div>
          ))}
        </div>

        {/* ── Charts Row ───────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Revenue Area Chart */}
          <div className="lg:col-span-2 bg-stone-800/80 border border-stone-700 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-base font-semibold text-white">Revenue Trend</h3>
                <p className="text-xs text-stone-400 mt-0.5">Last 6 months</p>
              </div>
              <BarChart3 className="w-5 h-5 text-stone-500" />
            </div>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#4ade80" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#4ade80" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" vertical={false} />
                  <XAxis dataKey="label" stroke="#71717a" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis stroke="#71717a" tick={{ fontSize: 11 }} tickLine={false} axisLine={false}
                    tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : String(v)} />
                  <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#52525b', strokeWidth: 1 }} />
                  <Area type="monotone" dataKey="revenue" stroke="#4ade80" strokeWidth={2}
                    fill="url(#revGrad)" dot={false} activeDot={{ r: 5, fill: '#4ade80' }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex flex-col items-center justify-center gap-2 text-stone-500">
                <TrendingDown className="w-8 h-8 opacity-40" />
                <p className="text-sm">No revenue data yet</p>
              </div>
            )}
          </div>

          {/* Orders Bar Chart */}
          <div className="bg-stone-800/80 border border-stone-700 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-base font-semibold text-white">Orders / Month</h3>
                <p className="text-xs text-stone-400 mt-0.5">Last 6 months</p>
              </div>
            </div>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" vertical={false} />
                  <XAxis dataKey="label" stroke="#71717a" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis stroke="#71717a" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                  <Bar dataKey="orders" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={32} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex flex-col items-center justify-center gap-2 text-stone-500">
                <TrendingDown className="w-8 h-8 opacity-40" />
                <p className="text-sm">No order data yet</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Bottom Row ───────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Recent Orders */}
          <div className="lg:col-span-2 bg-stone-800/80 border border-stone-700 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-stone-700">
              <h3 className="text-base font-semibold text-white">Recent Orders</h3>
              <Link
                to="/admin/orders"
                className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 transition-colors font-medium"
              >
                View all <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            {orders.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-14 text-stone-500">
                <ShoppingCart className="w-8 h-8 opacity-40" />
                <p className="text-sm">No orders yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-stone-700/60">
                      <th className="text-left py-3 px-5 text-[11px] font-semibold text-stone-500 uppercase tracking-wider">Order</th>
                      <th className="text-left py-3 px-4 text-[11px] font-semibold text-stone-500 uppercase tracking-wider">Customer</th>
                      <th className="text-left py-3 px-4 text-[11px] font-semibold text-stone-500 uppercase tracking-wider">Amount</th>
                      <th className="text-left py-3 px-4 text-[11px] font-semibold text-stone-500 uppercase tracking-wider">Status</th>
                      <th className="text-left py-3 px-4 text-[11px] font-semibold text-stone-500 uppercase tracking-wider">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-700/40">
                    {orders.map(o => {
                      const meta = statusMeta[o.status] ?? statusMeta['pending']
                      return (
                        <tr key={o.id} className="hover:bg-stone-700/30 transition-colors">
                          <td className="py-3 px-5 font-mono text-xs text-stone-300">{o.orderNumber}</td>
                          <td className="py-3 px-4 text-stone-200 max-w-[120px] truncate">{o.customerName}</td>
                          <td className="py-3 px-4 font-semibold text-white">{fmt(o.totalAmount)}</td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${meta.bg} ${meta.text}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                              {meta.label}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-stone-400 text-xs whitespace-nowrap">
                            {new Date(o.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Low Stock + Quick Actions */}
          <div className="flex flex-col gap-4">

            {/* Low Stock */}
            <div className="flex-1 bg-stone-800/80 border border-stone-700 rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-stone-700">
                <h3 className="text-base font-semibold text-white">Low Stock</h3>
                <Link
                  to="/admin/products"
                  className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 transition-colors font-medium"
                >
                  Manage <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
              {lowStock.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-10 text-stone-500">
                  <CheckCircle2 className="w-7 h-7 opacity-40" />
                  <p className="text-xs">All products well-stocked</p>
                </div>
              ) : (
                <div className="divide-y divide-stone-700/40">
                  {lowStock.map(p => (
                    <div key={p.id} className="flex items-center justify-between px-5 py-3 hover:bg-stone-700/30 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-stone-200 truncate">{p.name}</p>
                        <p className="text-xs text-stone-500 mt-0.5">₹{p.price.toLocaleString()}</p>
                      </div>
                      <span className={`ml-3 flex-shrink-0 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                        p.stockQuantity === 0
                          ? 'bg-red-500/15 border-red-500/30 text-red-400'
                          : 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                      }`}>
                        {p.stockQuantity === 0 ? 'Out' : `${p.stockQuantity} left`}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="bg-stone-800/80 border border-stone-700 rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-stone-300 mb-3">Quick Actions</h3>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Add Product',  to: '/admin/products',   bg: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300 hover:bg-emerald-500/20' },
                  { label: 'Add Category', to: '/admin/categories', bg: 'bg-violet-500/10 border-violet-500/20 text-violet-300 hover:bg-violet-500/20' },
                  { label: 'View Orders',  to: '/admin/orders',     bg: 'bg-blue-500/10 border-blue-500/20 text-blue-300 hover:bg-blue-500/20' },
                  { label: 'View Sellers', to: '/admin/sellers',    bg: 'bg-amber-500/10 border-amber-500/20 text-amber-300 hover:bg-amber-500/20' },
                ].map(a => (
                  <Link
                    key={a.label}
                    to={a.to}
                    className={`flex items-center justify-center py-2.5 px-3 rounded-xl border text-xs font-semibold transition-all ${a.bg}`}
                  >
                    {a.label}
                  </Link>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
