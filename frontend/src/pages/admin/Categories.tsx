import React, { useEffect, useState } from 'react'
import { AdminLayout } from '../../components/admin/AdminLayout'
import { Card, Button, Badge, Modal, Input, Spinner } from '../../components/ui'
import { Plus, Edit2, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { categoryApi } from '../../services/api'
import type { Category } from '../../types'

const emptyFormState = { name: '', description: '', icon: '', isActive: true, showOnHome: false }

export const AdminCategories: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formData, setFormData] = useState({ ...emptyFormState })

  const fetchCategories = async () => {
    setLoading(true)
    try {
      const data = await categoryApi.getAll()
      setCategories(data)
    } catch (error) {
      console.error('Failed to load categories', error)
      toast.error('Failed to fetch categories')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCategories()
  }, [])

  const resetForm = () => {
    setFormData({ ...emptyFormState })
    setEditingId(null)
    setIsEditing(false)
  }

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('Category name is required')
      return
    }

    const payload = {
      name: formData.name,
      description: formData.description,
      iconUrl: formData.icon.trim() || undefined,
      isActive: formData.isActive,
      showOnHome: formData.showOnHome,
    }

    try {
      if (isEditing && editingId) {
        await categoryApi.update(editingId, payload)
        setCategories(prev => prev.map(c => (c.id === editingId ? { ...c, ...payload } : c)))
        toast.success('Category updated')
      } else {
        const newCat = await categoryApi.create(payload)
        setCategories(prev => [newCat, ...prev])
        toast.success('Category created')
      }
      setShowModal(false)
      resetForm()
    } catch (error) {
      console.error('Save failed', error)
      toast.error('Failed to save category')
    }
  }

  const startEdit = (cat: Category) => {
    setEditingId(cat.id)
    setIsEditing(true)
    setFormData({
      name: cat.name,
      description: cat.description || '',
      icon: cat.iconUrl || '',
      isActive: cat.isActive ?? true,
      showOnHome: cat.showOnHome ?? false,
    })
    setShowModal(true)
  }

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this category?')) return
    try {
      await categoryApi.delete(id)
      setCategories(prev => prev.filter(c => c.id !== id))
      toast.success('Category deleted')
    } catch (error) {
      console.error('Delete failed', error)
      toast.error('Failed to delete category')
    }
  }

  const toggleShowOnHome = async (cat: Category) => {
    const updatedStatus = !cat.showOnHome
    try {
      await categoryApi.update(cat.id, { showOnHome: updatedStatus })
      setCategories(prev => prev.map(c => (c.id === cat.id ? { ...c, showOnHome: updatedStatus } : c)))
      toast.success(`Category ${cat.name} ${updatedStatus ? 'now shows' : 'removed from'} homepage`)
    } catch (error) {
      console.error('Toggle showOnHome failed', error)
      toast.error('Could not update homepage visibility')
    }
  }

  return (
    <AdminLayout>
      <div>
        <div className="flex items-center justify-between mb-12">
          <div>
            <h2 className="text-3xl font-display font-bold text-gray-100 mb-1">Categories</h2>
            <p className="text-gray-400">Manage your product categories</p>
          </div>
          <Button variant="primary" className="gap-2 px-6" onClick={() => { resetForm(); setShowModal(true) }}>
            <Plus className="w-5 h-5" /> Add Category
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <Spinner size="lg" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {categories.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <p className="text-gray-500 text-lg">No categories found</p>
              </div>
            ) : (
              categories.map(cat => (
                <Card key={cat.id} className="bg-white border border-gray-200 p-6 rounded-2xl hover:shadow-xl hover:border-green-300 transition-all duration-300 hover:-translate-y-1 group overflow-hidden">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-green-50 to-blue-50 rounded-xl flex items-center justify-center overflow-hidden border border-green-100 group-hover:border-green-400 transition-colors">
                      {cat.iconUrl ? (
                        <img
                          src={cat.iconUrl}
                          alt={`${cat.name} icon`}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                          onError={e => {
                            ;(e.target as HTMLImageElement).src = 'https://via.placeholder.com/64?text=%F0%9F%93%A6'
                          }}
                        />
                      ) : (
                        <span className="text-3xl">📦</span>
                      )}
                    </div>
                    <Badge variant="green" className="font-semibold">{cat.productCount || 0} products</Badge>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-green-700 transition-colors">{cat.name}</h3>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant={cat.showOnHome ? 'green' : 'gray'}>
                      {cat.showOnHome ? 'Shown on Home' : 'Hidden on Home'}
                    </Badge>
                    <span className="text-xs text-gray-400">{cat.productCount || 0} products</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-6 line-clamp-2">{cat.description || 'No description'}</p>
                  <div className="flex gap-2 pt-4 border-t border-gray-100">
                    <button
                      onClick={() => toggleShowOnHome(cat)}
                      className={`flex-1 p-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${cat.showOnHome ? 'text-gray-700 bg-gray-100 hover:bg-gray-200' : 'text-blue-700 bg-blue-50 hover:bg-blue-100'}`}
                    >
                      {cat.showOnHome ? 'Hide from Home' : 'Show on Home'}
                    </button>
                    <button
                      onClick={() => startEdit(cat)}
                      className="flex-1 p-2.5 text-sm font-medium text-green-700 hover:text-white hover:bg-green-600 bg-green-50 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 group/btn"
                    >
                      <Edit2 className="w-4 h-4 group-hover/btn:scale-110 transition-transform" /> Edit
                    </button>
                    <button
                      onClick={() => handleDelete(cat.id)}
                      className="flex-1 p-2.5 text-sm font-medium text-red-700 hover:text-white hover:bg-red-600 bg-red-50 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 group/btn"
                    >
                      <Trash2 className="w-4 h-4 group-hover/btn:scale-110 transition-transform" /> Delete
                    </button>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}

        {showModal && (
          <Modal isOpen={showModal} onClose={() => { setShowModal(false); resetForm() }}>
            <div className="w-full max-w-md">
              <h3 className="text-xl font-display font-bold text-gray-900 mb-1">
                {isEditing ? 'Edit Category' : 'Add New Category'}
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                {isEditing ? 'Update your category details' : 'Create a new product category'}
              </p>
              <div className="space-y-4">
                <Input
                  label="Category Name"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Grains"
                />
                <Input
                  label="Description"
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe your category"
                />
                <Input
                  label="Icon URL"
                  value={formData.icon}
                  onChange={e => setFormData({ ...formData, icon: e.target.value })}
                  placeholder="https://example.com/icon.png"
                />
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.showOnHome}
                    onChange={e => setFormData({ ...formData, showOnHome: e.target.checked })}
                    className="h-4 w-4 accent-green-600"
                  />
                  <span className="text-sm text-gray-600">Show this category in homepage cards</span>
                </label>
              </div>
              <div className="flex gap-3 mt-8">
                <Button variant="ghost" className="flex-1" onClick={() => { setShowModal(false); resetForm() }}>
                  Cancel
                </Button>
                <Button variant="primary" className="flex-1" onClick={handleSave}>
                  {isEditing ? 'Update Category' : 'Create Category'}
                </Button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </AdminLayout>
  )
}
