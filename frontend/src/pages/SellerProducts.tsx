import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageLayout } from '../components/layout'
import { Button, Card, Spinner } from '../components/ui'
import { productApi } from '../services/api'
import type { SellerProduct, ProductStatus } from '../types'
import toast from 'react-hot-toast'
import {
  Plus, Edit2, Trash2, Eye, EyeOff, Package, Clock, CheckCircle2,
  XCircle, Search, RefreshCw, BarChart3, TrendingUp
} from 'lucide-react'
import { resolveAssetUrl } from '../lib/image'

// ── Status config ────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.FC<{ className?: string }> }> = {
  pending:  { label: 'Pending Review', color: 'text-amber-700',  bg: 'bg-amber-50  border-amber-200',  icon: Clock },
  approved: { label: 'Approved',       color: 'text-green-700',  bg: 'bg-green-50  border-green-200',  icon: CheckCircle2 },
  rejected: { label: 'Rejected',       color: 'text-red-700',    bg: 'bg-red-50    border-red-200',    icon: XCircle },
}

const FILTER_TABS: { key: string; label: string }[] = [
  { key: 'all',      label: 'All Products' },
  { key: 'pending',  label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'inactive', label: 'Inactive' },
]

// ── Component ─────────────────────────────────────────────────────────────────
export const SellerProductsPage: React.FC = () => {
  const [products, setProducts] = useState<SellerProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [togglingId, setTogglingId] = useState<number | null>(null)

  const fetchProducts = async () => {
    setLoading(true)
    try {
      const data = await productApi.getMyProducts({ page: 1, pageSize: 200 })
      setProducts(data.items ?? [])
    } catch {
      toast.error('Failed to load your products')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchProducts() }, [])

  // ── Stats ──────────────────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    total:    products.length,
    pending:  products.filter(p => p.status === 'pending').length,
    approved: products.filter(p => p.status === 'approved').length,
    rejected: products.filter(p => p.status === 'rejected').length,
    inactive: products.filter(p => !p.isActive && p.status !== 'pending').length,
  }), [products])

  // ── Filtered list ──────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = products
    if (filter === 'pending')  list = list.filter(p => p.status === 'pending')
    else if (filter === 'approved') list = list.filter(p => p.status === 'approved')
    else if (filter === 'rejected') list = list.filter(p => p.status === 'rejected')
    else if (filter === 'inactive') list = list.filter(p => !p.isActive && p.status !== 'pending')
    if (search.trim()) list = list.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.categoryName.toLowerCase().includes(search.toLowerCase()))
    return list
  }, [products, filter, search])

  const handleDelete = async (p: SellerProduct) => {
    if (!window.confirm(`Delete "${p.name}"? This cannot be undone.`)) return
    setDeletingId(p.id)
    try {
      await productApi.delete(p.id)
      setProducts(prev => prev.filter(x => x.id !== p.id))
      toast.success('Product deleted')
    } catch { toast.error('Failed to delete product') }
    finally { setDeletingId(null) }
  }

  const handleToggleActive = async (p: SellerProduct) => {
    if (p.status !== 'approved') {
      toast.error('Only approved products can be toggled'); return
    }
    setTogglingId(p.id)
    try {
      await productApi.update(p.id, { isActive: !p.isActive })
      setProducts(prev => prev.map(x => x.id === p.id ? { ...x, isActive: !x.isActive } : x))
      toast.success(p.isActive ? 'Product hidden from store' : 'Product is now live!')
    } catch { toast.error('Failed to update product') }
    finally { setTogglingId(null) }
  }

  return (
    <PageLayout>
      <div className="max-w-6xl mx-auto px-4 py-6">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 font-heading">My Products</h1>
            <p className="text-sm text-gray-500 mt-0.5">Manage your product listings</p>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={fetchProducts}>
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Link to="/seller/products/new">
              <Button variant="primary" size="sm">
                <Plus className="w-4 h-4 mr-1.5" /> Add Product
              </Button>
            </Link>
          </div>
        </div>

        {/* ── Stats ───────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <StatCard icon={Package} label="Total" value={stats.total} color="blue" />
          <StatCard icon={Clock} label="Pending" value={stats.pending} color="amber" />
          <StatCard icon={CheckCircle2} label="Approved" value={stats.approved} color="green" />
          <StatCard icon={XCircle} label="Rejected" value={stats.rejected} color="red" />
        </div>

        {/* ── Pending Info Banner ──────────────────────────────────────────── */}
        {stats.pending > 0 && (
          <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
            <Clock className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-800">
                {stats.pending} product{stats.pending > 1 ? 's' : ''} pending review
              </p>
              <p className="text-xs text-amber-600 mt-0.5">
                Admin will review and approve within 24–48 hours. You'll be notified once approved.
              </p>
            </div>
          </div>
        )}

        {/* ── Filters + Search ──────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm mb-4">
          <div className="flex gap-1 overflow-x-auto p-2 border-b border-gray-100">
            {FILTER_TABS.map(t => (
              <button key={t.key} onClick={() => setFilter(t.key)}
                className={`whitespace-nowrap px-4 py-2 rounded-xl text-sm font-medium transition-all
                  ${filter === t.key ? 'bg-green-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
                {t.label}
                {t.key !== 'all' && stats[t.key as keyof typeof stats] > 0 && (
                  <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full
                    ${filter === t.key ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'}`}>
                    {stats[t.key as keyof typeof stats]}
                  </span>
                )}
              </button>
            ))}
          </div>
          <div className="p-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input placeholder="Search products..."
                value={search} onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500" />
            </div>
          </div>
        </div>

        {/* ── Product List ─────────────────────────────────────────────────── */}
        {loading ? (
          <div className="flex items-center justify-center py-20"><Spinner size="lg" /></div>
        ) : filtered.length === 0 ? (
          <EmptyState filter={filter} />
        ) : (
          <div className="space-y-3">
            {filtered.map(product => (
              <ProductRow key={product.id} product={product}
                onDelete={handleDelete} onToggle={handleToggleActive}
                isDeleting={deletingId === product.id}
                isToggling={togglingId === product.id} />
            ))}
          </div>
        )}
      </div>
    </PageLayout>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────
const StatCard: React.FC<{
  icon: React.FC<{ className?: string }>;
  label: string; value: number; color: 'blue' | 'amber' | 'green' | 'red'
}> = ({ icon: Icon, label, value, color }) => {
  const colors = {
    blue:  'bg-blue-50  text-blue-600',
    amber: 'bg-amber-50 text-amber-600',
    green: 'bg-green-50 text-green-600',
    red:   'bg-red-50   text-red-600',
  }
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2 ${colors[color]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500 font-medium mt-0.5">{label}</p>
    </div>
  )
}

const ProductRow: React.FC<{
  product: SellerProduct
  onDelete: (p: SellerProduct) => void
  onToggle: (p: SellerProduct) => void
  isDeleting: boolean
  isToggling: boolean
}> = ({ product, onDelete, onToggle, isDeleting, isToggling }) => {
  const st = STATUS_CONFIG[product.status] || STATUS_CONFIG['approved']
  const StatusIcon = st.icon

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-4">
      <div className="flex items-center gap-4">
        {/* Image */}
        <div className="w-16 h-16 rounded-xl bg-gray-100 overflow-hidden shrink-0 border border-gray-200">
          {product.imageUrl ? (
            <img src={resolveAssetUrl(product.imageUrl)} alt={product.name}
              className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package className="w-6 h-6 text-gray-300" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 flex-wrap">
            <h3 className="font-semibold text-gray-900 text-sm truncate">{product.name}</h3>
            {product.isOrganic && (
              <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 bg-green-100 text-green-700 rounded-full border border-green-200">🌿 ORGANIC</span>
            )}
            {product.isFeatured && (
              <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full border border-amber-200">⭐ FEATURED</span>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-0.5">{product.categoryName}</p>
          <div className="flex items-center gap-3 mt-1.5">
            <span className="text-sm font-bold text-gray-900">₹{product.price}<span className="text-xs font-normal text-gray-400">/{product.unit}</span></span>
            <span className="text-xs text-gray-500">Stock: {product.stockQuantity}</span>
          </div>
        </div>

        {/* Status + Actions */}
        <div className="flex flex-col items-end gap-2 shrink-0">
          <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${st.bg} ${st.color}`}>
            <StatusIcon className="w-3 h-3" />
            {st.label}
          </span>
          {product.status === 'approved' ? (
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${product.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
              {product.isActive ? 'Live' : 'Hidden'}
            </span>
          ) : null}
          <div className="flex items-center gap-1.5 mt-1">
            {product.status === 'approved' && (
              <button onClick={() => onToggle(product)} disabled={isToggling}
                title={product.isActive ? 'Hide from store' : 'Make live'}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50">
                {isToggling ? <Spinner size="sm" /> : product.isActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            )}
            <Link to={`/seller/products/${product.id}/edit`}>
              <button className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors" title="Edit">
                <Edit2 className="w-4 h-4" />
              </button>
            </Link>
            <button onClick={() => onDelete(product)} disabled={isDeleting}
              className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50" title="Delete">
              {isDeleting ? <Spinner size="sm" /> : <Trash2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

const EmptyState: React.FC<{ filter: string }> = ({ filter }) => (
  <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
      {filter === 'pending' ? <Clock className="w-8 h-8 text-gray-300" /> :
       filter === 'rejected' ? <XCircle className="w-8 h-8 text-gray-300" /> :
       <Package className="w-8 h-8 text-gray-300" />}
    </div>
    <h3 className="text-base font-semibold text-gray-600 mb-1">
      {filter === 'all' ? 'No products yet' :
       filter === 'pending' ? 'No pending products' :
       filter === 'rejected' ? 'No rejected products' :
       filter === 'approved' ? 'No approved products' : 'No inactive products'}
    </h3>
    <p className="text-sm text-gray-400 mb-5">
      {filter === 'all' ? 'Start by adding your first product listing' :
       filter === 'rejected' ? 'Good news! All your products have been approved or are pending review' :
       'Products in this category will appear here'}
    </p>
    {filter === 'all' && (
      <Link to="/seller/products/new">
        <Button variant="primary" size="sm">
          <Plus className="w-4 h-4 mr-1.5" /> Add First Product
        </Button>
      </Link>
    )}
  </div>
)
