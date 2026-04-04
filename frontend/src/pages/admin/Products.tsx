import React, { useEffect, useState } from 'react'
import { AdminLayout } from '../../components/admin/AdminLayout'
import { Card, Button, Badge, Modal, Input, Spinner } from '../../components/ui'
import { Plus, Edit2, Trash2, Clock, CheckCircle2, XCircle, Eye } from 'lucide-react'
import toast from 'react-hot-toast'
import { productApi, categoryApi, farmerApi } from '../../services/api'
import { useAuthStore } from '../../store'
import type { Product, Category, Farmer, SellerProduct } from '../../types'

const emptyFormState = {
  name: '',
  categoryId: 0,
  categoryName: '',
  price: '',
  stock: '',
  status: 'active',
  description: '',
  imageUrl: '',
  imageUrls: [] as string[],
  isOrganic: true,
  isFeatured: false,
}

export const AdminProducts: React.FC = () => {
  const user = useAuthStore(state => state.user)
  const [products, setProducts] = useState<Product[]>([])
  const [pendingProducts, setPendingProducts] = useState<SellerProduct[]>([])
  const [pendingLoading, setPendingLoading] = useState(false)
  const [approvingId, setApprovingId] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState<'all' | 'pending'>('all')
  const [categories, setCategories] = useState<Category[]>([])
  const [sellers, setSellers] = useState<Farmer[]>([])
  const [sellerId, setSellerId] = useState<number | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [currentProductId, setCurrentProductId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState({ ...emptyFormState })
  const [newImageUrl, setNewImageUrl] = useState('')

  const fetchProducts = async () => {
    setLoading(true)
    try {
      const data = await productApi.getAll({ page: 1, pageSize: 100 })
      setProducts(data.items)
    } catch (error) {
      console.error('Could not load products', error)
      toast.error('Failed to fetch products from server')
    } finally {
      setLoading(false)
    }
  }

  const fetchCategories = async () => {
    try {
      const data = await categoryApi.getAll()
      setCategories(data)
    } catch (error) {
      console.error('Could not load categories', error)
      toast.error('Failed to load categories')
    }
  }

  const fetchSellers = async () => {
    try {
      const data = await farmerApi.getAll({ page: 1, pageSize: 200, isApproved: true })
      setSellers(data.items)
      if (!sellerId && data.items.length > 0) {
        setSellerId(data.items[0].id)
      }
    } catch (error) {
      console.error('Could not load sellers', error)
      toast.error('Failed to load sellers')
    }
  }

  useEffect(() => {
    fetchCategories()
    fetchProducts()
    fetchSellers()
    fetchPendingProducts()
  }, [])

  const fetchPendingProducts = async () => {
    setPendingLoading(true)
    try {
      const data = await productApi.getPending({ page: 1, pageSize: 100 })
      setPendingProducts(data.items ?? [])
    } catch {
      // silently fail
    } finally {
      setPendingLoading(false)
    }
  }

  const handleApprove = async (id: number, approve: boolean, name: string) => {
    setApprovingId(id)
    try {
      await productApi.approve(id, approve)
      setPendingProducts(prev => prev.filter(p => p.id !== id))
      if (approve) {
        await fetchProducts()
        toast.success(`✅ "${name}" approved and is now live!`)
      } else {
        toast.success(`"${name}" rejected`)
      }
    } catch {
      toast.error('Failed to update product status')
    } finally {
      setApprovingId(null)
    }
  }

  const resetForm = () => {
    setFormData({ ...emptyFormState })
    setCurrentProductId(null)
    setIsEditing(false)
    setNewImageUrl('')
    if (sellers.length > 0) setSellerId(sellers[0].id)
  }

  const handleSaveProduct = async () => {
    if (!formData.name.trim() || !formData.price.trim() || !formData.stock.trim() || !formData.categoryId) {
      toast.error('Please fill all required fields and select a category')
      return
    }

    if (!(formData.imageUrl || (formData.imageUrls && formData.imageUrls.length > 0))) {
      toast.error('Please add at least one product image URL')
      return
    }

    const targetFarmerId = sellerId || (user?.role === 'farmer' ? user.id : undefined)

    const payload = {
      name: formData.name,
      description: formData.description,
      categoryId: formData.categoryId,
      categoryName: formData.categoryName,
      price: Number(formData.price),
      originalPrice: Number(formData.price),
      unit: 'kg',
      minOrderQty: 1,
      stockQuantity: Number(formData.stock),
      imageUrl: formData.imageUrl || formData.imageUrls?.[0],
      imageUrls: formData.imageUrls || [],
      isActive: formData.status === 'active',
      farmerId: targetFarmerId,
      isOrganic: !!formData.isOrganic,
      isFeatured: !!formData.isFeatured,
    }

    console.log('Creating/Updating product with payload:', JSON.stringify(payload, null, 2))
    console.log('Image count:', formData.imageUrls?.length || 0)

    try {
      let saved: Product
      if (isEditing && currentProductId) {
        saved = await productApi.update(currentProductId, payload)
        setProducts(prev => prev.map(p => (p.id === currentProductId ? saved : p)))
        toast.success('Product updated')
      } else {
        if (targetFarmerId) {
          saved = await productApi.createAdmin(targetFarmerId, payload)
        } else {
          saved = await productApi.create(payload)
        }
        setProducts(prev => [saved, ...prev])
        toast.success('Product created')
      }
      setShowModal(false)
      resetForm()
    } catch (error: any) {
      console.error('Save product failed - Full Error:', error)
      console.error('Error Response:', error?.response?.data)
      console.error('Payload sent:', JSON.stringify(payload, null, 2))
      const message = error?.response?.data?.message || error?.response?.data?.errors?.[0] || error?.message || 'Failed to save product'
      toast.error(message)
    }
  }

  const startEdit = (product: Product) => {
    setCurrentProductId(product.id)
    setIsEditing(true)
    setFormData({
      name: product.name,
      categoryId: product.categoryId,
      categoryName: product.categoryName,
      price: String(product.price),
      stock: String(product.stockQuantity),
      status: product.isActive ? 'active' : 'inactive',
      description: product.description ?? '',
      imageUrl: product.imageUrl ?? '',
      imageUrls: product.imageUrls?.length ? product.imageUrls : (product.imageUrl ? [product.imageUrl] : []),
      isOrganic: product.isOrganic ?? true,
      isFeatured: product.isFeatured ?? false,
    })
    setSellerId(product.farmerId ?? sellerId)
    setNewImageUrl('')
    setShowModal(true)
  }

  const handleDelete = async (id: number) => {
    if (!window.confirm('Confirm delete product?')) return
    try {
      await productApi.delete(id)
      setProducts(prev => prev.filter(p => p.id !== id))
      toast.success('Product deleted')
    } catch (error) {
      console.error('Delete failed', error)
      toast.error('Failed to delete product')
    }
  }

  return (
    <AdminLayout>
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-3xl font-display font-bold text-gray-100 mb-1">Products</h2>
            <p className="text-gray-400">Manage your product inventory and details</p>
          </div>
          <Button variant="primary" className="gap-2 px-6" onClick={() => { resetForm(); setShowModal(true) }}>
            <Plus className="w-5 h-5" /> Add Product
          </Button>
        </div>

        {/* ── Tabs ────────────────────────────────────────────────────────── */}
        <div className="flex gap-2 mb-6">
          <button onClick={() => setActiveTab('all')}
            className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${activeTab === 'all' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}>
            All Products ({products.length})
          </button>
          <button onClick={() => setActiveTab('pending')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${activeTab === 'pending' ? 'bg-amber-500 text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}>
            <Clock className="w-4 h-4" />
            Pending Review
            {pendingProducts.length > 0 && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${activeTab === 'pending' ? 'bg-white/20' : 'bg-amber-500 text-white'}`}>
                {pendingProducts.length}
              </span>
            )}
          </button>
        </div>

        {/* ── Pending Products Section ─────────────────────────────────────── */}
        {activeTab === 'pending' && (
          <div className="space-y-3 mb-8">
            {pendingLoading ? (
              <div className="flex justify-center py-12"><Spinner size="lg" /></div>
            ) : pendingProducts.length === 0 ? (
              <div className="text-center py-16 bg-white/5 rounded-2xl border border-white/10">
                <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-3" />
                <p className="text-gray-300 font-medium">All products reviewed!</p>
                <p className="text-gray-500 text-sm mt-1">No products pending approval</p>
              </div>
            ) : pendingProducts.map(p => (
              <div key={p.id} className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-gray-700 overflow-hidden shrink-0">
                  {p.imageUrl
                    ? <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-gray-500 text-2xl">📦</div>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-gray-100 text-sm truncate">{p.name}</h4>
                    {p.isOrganic && <span className="text-[10px] bg-green-800 text-green-200 px-2 py-0.5 rounded-full">Organic</span>}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{p.categoryName} • ₹{p.price}/{p.unit}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Stock: {p.stockQuantity} • Submitted {new Date(p.createdAt).toLocaleDateString('en-IN')}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button variant="ghost" size="xs" onClick={() => window.open(`/products/${p.id}`, '_blank')}
                    className="text-gray-400 hover:text-gray-200">
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button variant="danger" size="xs" loading={approvingId === p.id}
                    onClick={() => handleApprove(p.id, false, p.name)}
                    disabled={approvingId !== null}>
                    <XCircle className="w-3.5 h-3.5 mr-1" /> Reject
                  </Button>
                  <Button variant="primary" size="xs" loading={approvingId === p.id}
                    onClick={() => handleApprove(p.id, true, p.name)}
                    disabled={approvingId !== null}>
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Approve
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── All Products Table ───────────────────────────────────────────── */}
        {activeTab === 'all' && (
          <Card className="bg-white border border-gray-200 overflow-hidden rounded-2xl shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left py-4 px-6 text-xs font-semibold text-gray-800 uppercase">Product</th>
                  <th className="text-left py-4 px-6 text-xs font-semibold text-gray-800 uppercase">Category</th>
                  <th className="text-left py-4 px-6 text-xs font-semibold text-gray-800 uppercase">Price</th>
                  <th className="text-left py-4 px-6 text-xs font-semibold text-gray-800 uppercase">Stock</th>
                  <th className="text-left py-4 px-6 text-xs font-semibold text-gray-800 uppercase">Featured</th>
                  <th className="text-left py-4 px-6 text-xs font-semibold text-gray-800 uppercase">Status</th>
                  <th className="text-left py-4 px-6 text-xs font-semibold text-gray-800 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-500">
                      <Spinner /> Loading products...
                    </td>
                  </tr>
                ) : products.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-500">
                      No products found
                    </td>
                  </tr>
                ) : (
                  products.map(product => (
                    <tr key={product.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="py-4 px-6 text-sm text-gray-900 font-medium">{product.name}</td>
                      <td className="py-4 px-6 text-sm text-gray-700">{product.categoryName || '-'}</td>
                      <td className="py-4 px-6 text-sm text-gray-900 font-semibold">₹{product.price}</td>
                      <td className="py-4 px-6 text-sm text-gray-900">{product.stockQuantity}</td>
                      <td className="py-4 px-6">
                        <Badge variant={product.isFeatured ? 'orange' : 'gray'}>{product.isFeatured ? 'Yes' : 'No'}</Badge>
                      </td>
                      <td className="py-4 px-6">
                        <Badge variant={product.isActive ? 'green' : 'gray'}>{product.isActive ? 'active' : 'inactive'}</Badge>
                      </td>
                      <td className="py-4 px-6 flex gap-2">
                        <button
                          aria-label="Edit product"
                          className="p-1.5 text-gray-600 hover:text-white hover:bg-green-600 rounded-lg transition-all"
                          onClick={() => startEdit(product)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          aria-label="Delete product"
                          className="p-1.5 text-red-600 hover:text-white hover:bg-red-600 rounded-lg transition-all"
                          onClick={() => handleDelete(product.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
        )}

        {showModal && (
          <Modal isOpen={showModal} onClose={() => { setShowModal(false); resetForm() }}>
            <div className="w-full max-w-md">
              <h3 className="text-lg font-display font-bold text-gray-900 mb-4">
                {isEditing ? 'Edit Product' : 'Add New Product'}
              </h3>
              <div className="space-y-4">
                <Input
                  label="Product Name"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Organic Rice"
                />
                <Input
                  label="Description"
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Product description"
                />
                <div>
                  <label className="block text-sm font-label font-medium text-gray-700 mb-1">Category</label>
                  <select
                    aria-label="Category"
                    value={formData.categoryId}
                    onChange={e => {
                      const catId = Number(e.target.value)
                      const selected = categories.find(c => c.id === catId)
                      setFormData({
                        ...formData,
                        categoryId: catId,
                        categoryName: selected?.name || '',
                      })
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forest-500"
                  >
                    <option value={0}>Select category</option>
                    {categories.map(category => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-label font-medium text-gray-700 mb-1">Image URLs</label>
                  <div className="flex gap-2 mb-2">
                    <Input
                      value={newImageUrl}
                      onChange={e => setNewImageUrl(e.target.value)}
                      placeholder="https://..."
                      className="flex-1"
                    />
                    <Button
                      variant="ghost"
                      className="px-3"
                      onClick={() => {
                        const trimmed = newImageUrl.trim()
                        if (!trimmed) {
                          toast.error('Enter a valid image URL')
                          return
                        }
                        if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
                          toast.error('Image URL must start with http:// or https://')
                          return
                        }
                        if ((formData.imageUrls || []).includes(trimmed)) {
                          toast.error('Image already added')
                          return
                        }
                        const updatedUrls = [...(formData.imageUrls || []), trimmed]
                        setFormData({
                          ...formData,
                          imageUrls: updatedUrls,
                          imageUrl: formData.imageUrl || trimmed,
                        })
                        console.log('Images added:', updatedUrls)
                        setNewImageUrl('')
                      }}
                    >
                      Add
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {(formData.imageUrls || []).map((url, idx) => (
                      <div key={`${url}-${idx}`} className="relative border border-gray-200 rounded-lg overflow-hidden">
                        <img src={url} alt={`Product ${idx + 1}`} className="w-full h-20 object-cover" />
                        <button
                          aria-label={`Remove image ${idx + 1}`}
                          onClick={() => {
                            const updated = (formData.imageUrls || []).filter((_, i) => i !== idx)
                            setFormData({
                              ...formData,
                              imageUrls: updated,
                              imageUrl: updated[0] || '',
                            })
                          }}
                          className="absolute top-1 right-1 text-red-500 bg-white/80 rounded-full p-1"
                        >
                          &times;
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
                <Input
                  label="Price (₹)"
                  type="number"
                  value={formData.price}
                  onChange={e => setFormData({ ...formData, price: e.target.value })}
                  placeholder="e.g., 80"
                />
                <Input
                  label="Stock Quantity"
                  type="number"
                  value={formData.stock}
                  onChange={e => setFormData({ ...formData, stock: e.target.value })}
                  placeholder="e.g., 100"
                />
                <div className="flex items-center gap-3">
                  <input
                    id="isOrganic"
                    type="checkbox"
                    checked={formData.isOrganic}
                    onChange={e => setFormData({ ...formData, isOrganic: e.target.checked })}
                    className="h-4 w-4 text-forest-600 border-gray-300 rounded"
                  />
                  <label htmlFor="isOrganic" className="text-sm font-label font-medium text-gray-700">
                    Organic product
                  </label>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    id="isFeatured"
                    type="checkbox"
                    checked={formData.isFeatured}
                    onChange={e => setFormData({ ...formData, isFeatured: e.target.checked })}
                    className="h-4 w-4 text-forest-600 border-gray-300 rounded"
                  />
                  <label htmlFor="isFeatured" className="text-sm font-label font-medium text-gray-700">
                    Featured product
                  </label>
                </div>
                {(sellers.length > 0) && (
                  <div>
                    <label className="block text-sm font-label font-medium text-gray-700 mb-1">Seller</label>
                    <select
                      aria-label="Seller"
                      value={sellerId || 0}
                      onChange={e => setSellerId(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forest-500"
                    >
                      <option value={0}>Select Seller</option>
                      {sellers.map(seller => (
                        <option key={seller.id} value={seller.id}>{seller.farmName}</option>
                      ))}
                    </select>
                  </div>
                )}                <div>
                  <label className="block text-sm font-label font-medium text-gray-700 mb-1">Status</label>
                  <select
                    aria-label="Product status"
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forest-500"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <Button
                  variant="ghost"
                  className="flex-1"
                  onClick={() => {
                    setShowModal(false)
                    resetForm()
                  }}
                >
                  Cancel
                </Button>
                <Button variant="primary" className="flex-1" onClick={handleSaveProduct}>
                  {isEditing ? 'Update Product' : 'Add Product'}
                </Button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </AdminLayout>
  )
}
