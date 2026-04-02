import React, { useEffect, useState } from 'react'
import { AdminLayout } from '../../components/admin/AdminLayout'
import { Card, Button, Badge, Spinner, Modal, Input } from '../../components/ui'
import { Edit2, Trash2, Eye, ToggleLeft, ToggleRight, Upload } from 'lucide-react'
import toast from 'react-hot-toast'
import { farmerApi } from '../../services/api'
import { resolveAssetUrl } from '../../lib/image'
import type { Farmer } from '../../types'

const emptyForm = {
  ownerName: '',
  farmName: '',
  description: '',
  location: '',
  state: '',
  pinCode: '',
  isApproved: true,
}

export const AdminFarmers: React.FC = () => {
  const [farmers, setFarmers] = useState<Farmer[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [viewMode, setViewMode] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [current, setCurrent] = useState<Farmer | null>(null)
  const [formData, setFormData] = useState({ ...emptyForm })
  const [toggling, setToggling] = useState<number | null>(null)
  const [uploadingFor, setUploadingFor] = useState<number | null>(null)

  const fetchFarmers = async () => {
    setLoading(true)
    try {
      const data = await farmerApi.getAll({ page: 1, pageSize: 200 })
      setFarmers(data.items)
    } catch {
      toast.error('Failed to load farmers')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchFarmers() }, [])

  const openAdd = () => {
    setFormData({ ...emptyForm })
    setIsEditing(false)
    setViewMode(false)
    setCurrent(null)
    setModalOpen(true)
  }

  const openEdit = (f: Farmer) => {
    setFormData({
      ownerName: f.ownerName,
      farmName: f.farmName,
      description: f.description || '',
      location: f.location,
      state: f.state,
      pinCode: f.pinCode || '',
      isApproved: f.isApproved,
    })
    setCurrent(f)
    setIsEditing(true)
    setViewMode(false)
    setModalOpen(true)
  }

  const openView = (f: Farmer) => {
    setFormData({
      ownerName: f.ownerName,
      farmName: f.farmName,
      description: f.description || '',
      location: f.location,
      state: f.state,
      pinCode: f.pinCode || '',
      isApproved: f.isApproved,
    })
    setCurrent(f)
    setIsEditing(false)
    setViewMode(true)
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setCurrent(null)
    setViewMode(false)
    setIsEditing(false)
  }

  const handleSave = async () => {
    if (!formData.ownerName.trim() || !formData.farmName.trim() || !formData.location.trim() || !formData.state.trim()) {
      toast.error('Owner name, farm name, location and state are required')
      return
    }
    try {
      if (isEditing && current) {
        const updated = await farmerApi.update(current.id, formData)
        setFarmers(prev => prev.map(f => f.id === current.id ? updated : f))
        toast.success('Farmer updated')
      } else {
        const created = await farmerApi.create(formData)
        setFarmers(prev => [created, ...prev])
        toast.success('Farmer added')
      }
      closeModal()
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to save farmer')
    }
  }

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this farmer?')) return
    try {
      await farmerApi.delete(id)
      setFarmers(prev => prev.filter(f => f.id !== id))
      toast.success('Farmer deleted')
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to delete farmer')
    }
  }

  const handleToggle = async (farmer: Farmer) => {
    setToggling(farmer.id)
    try {
      await farmerApi.approve(farmer.id, !farmer.isApproved)
      setFarmers(prev => prev.map(f => f.id === farmer.id ? { ...f, isApproved: !f.isApproved } : f))
      toast.success(farmer.isApproved ? 'Farmer deactivated' : 'Farmer activated')
    } catch {
      toast.error('Failed to update status')
    } finally {
      setToggling(null)
    }
  }

  const handlePhotoUpload = async (farmer: Farmer, file: File) => {
    const form = new FormData()
    form.append('file', file)
    setUploadingFor(farmer.id)
    try {
      const result = await farmerApi.uploadPhoto(farmer.id, form)
      setFarmers(prev => prev.map(f => f.id === farmer.id ? { ...f, avatarUrl: result.url } : f))
      if (current?.id === farmer.id) setCurrent(prev => prev ? { ...prev, avatarUrl: result.url } : prev)
      toast.success('Profile photo updated')
    } catch {
      toast.error('Failed to upload photo')
    } finally {
      setUploadingFor(null)
    }
  }

  const activeCount = farmers.filter(f => f.isApproved).length

  return (
    <AdminLayout>
      <div>
        <div className="flex flex-col gap-4 mb-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-3xl font-display font-bold text-gray-100 mb-1">Know Your Farmers</h2>
            <p className="text-gray-300">Manage farmers displayed on the public farmers page.</p>
          </div>
          <Button variant="primary" className="gap-2 px-6 py-3" onClick={openAdd}>+ Add Farmer</Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          <div className="bg-white/10 border border-white/15 p-4 rounded-xl shadow-sm">
            <p className="text-xs text-gray-300 uppercase tracking-wide">Total Farmers</p>
            <p className="text-2xl font-bold text-white">{farmers.length}</p>
          </div>
          <div className="bg-white/10 border border-white/15 p-4 rounded-xl shadow-sm">
            <p className="text-xs text-gray-300 uppercase tracking-wide">Active</p>
            <p className="text-2xl font-bold text-lime-300">{activeCount}</p>
          </div>
          <div className="bg-white/10 border border-white/15 p-4 rounded-xl shadow-sm">
            <p className="text-xs text-gray-300 uppercase tracking-wide">Inactive</p>
            <p className="text-2xl font-bold text-orange-300">{farmers.length - activeCount}</p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <Spinner size="lg" />
          </div>
        ) : farmers.length === 0 ? (
          <Card className="bg-white/10 border border-dashed border-gray-300 p-12 text-center rounded-2xl">
            <p className="text-gray-300 text-lg">No farmers added yet</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {farmers.map(farmer => (
              <Card key={farmer.id} className="bg-white border border-gray-200 p-6 rounded-2xl hover:shadow-lg transition-all duration-300">
                <div className="flex items-start gap-4 mb-4">
                  <div className="relative flex-shrink-0">
                    <div className="w-16 h-16 rounded-2xl overflow-hidden bg-forest-50 flex items-center justify-center border border-stone-200">
                      {uploadingFor === farmer.id ? (
                        <Spinner size="sm" />
                      ) : farmer.avatarUrl ? (
                        <img src={resolveAssetUrl(farmer.avatarUrl)} alt={farmer.ownerName} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-2xl font-bold text-forest-600">{farmer.ownerName?.[0]?.toUpperCase()}</span>
                      )}
                    </div>
                    <label className="absolute -bottom-1.5 -right-1.5 w-6 h-6 bg-forest-600 rounded-full flex items-center justify-center cursor-pointer hover:bg-forest-700 transition-colors" title="Upload profile photo">
                      <Upload className="w-3 h-3 text-white" />
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={e => { const f = e.target.files?.[0]; if (f) handlePhotoUpload(farmer, f) }}
                      />
                    </label>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-bold text-gray-900 truncate">{farmer.ownerName}</h3>
                    <p className="text-sm text-gray-600 truncate">{farmer.farmName}</p>
                    <p className="text-xs text-gray-500 mt-0.5">?? {farmer.location}, {farmer.state}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between mb-4">
                  <Badge variant={farmer.isApproved ? 'green' : 'orange'}>
                    {farmer.isApproved ? 'Active' : 'Inactive'}
                  </Badge>
                  <span className="text-xs text-gray-400">ID #{farmer.id}</span>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" size="sm" className="flex-1" onClick={() => openView(farmer)}>
                    <Eye className="w-4 h-4" /> View
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => openEdit(farmer)}>
                    <Edit2 className="w-4 h-4" /> Edit
                  </Button>
                  <Button variant="danger" size="sm" className="flex-1" onClick={() => handleDelete(farmer.id)}>
                    <Trash2 className="w-4 h-4" /> Delete
                  </Button>
                </div>

                <Button
                  variant={farmer.isApproved ? 'outline' : 'primary'}
                  size="sm"
                  className="w-full mt-2"
                  onClick={() => handleToggle(farmer)}
                  disabled={toggling === farmer.id}
                >
                  {toggling === farmer.id ? (
                    <Spinner size="sm" />
                  ) : farmer.isApproved ? (
                    <><ToggleRight className="w-4 h-4" /> Deactivate</>
                  ) : (
                    <><ToggleLeft className="w-4 h-4" /> Activate</>
                  )}
                </Button>
              </Card>
            ))}
          </div>
        )}

        <Modal isOpen={modalOpen} onClose={closeModal}>
          <div className="w-full max-w-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-display font-bold text-gray-900">
                {viewMode ? 'Farmer Details' : isEditing ? 'Edit Farmer' : 'Add Farmer'}
              </h3>
              {viewMode && current?.avatarUrl && (
                <div className="w-14 h-14 rounded-2xl overflow-hidden bg-forest-50 border border-stone-200">
                  <img src={resolveAssetUrl(current.avatarUrl)} alt={current.ownerName} className="w-full h-full object-cover" />
                </div>
              )}
            </div>
            <div className="space-y-3">
              <Input label="Owner Name" value={formData.ownerName} onChange={e => setFormData({ ...formData, ownerName: e.target.value })} disabled={viewMode} />
              <Input label="Farm Name" value={formData.farmName} onChange={e => setFormData({ ...formData, farmName: e.target.value })} disabled={viewMode} />
              <Input label="Location" value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} disabled={viewMode} />
              <Input label="State" value={formData.state} onChange={e => setFormData({ ...formData, state: e.target.value })} disabled={viewMode} />
              <Input label="Pin Code" value={formData.pinCode} onChange={e => setFormData({ ...formData, pinCode: e.target.value })} disabled={viewMode} />
              <Input label="Description" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} disabled={viewMode} />
              {!viewMode && (
                <div className="flex items-center gap-3 p-3 bg-stone-50 rounded-xl">
                  <input
                    type="checkbox"
                    id="farmerIsApproved"
                    checked={formData.isApproved}
                    onChange={e => setFormData({ ...formData, isApproved: e.target.checked })}
                    className="w-4 h-4 accent-forest-600"
                  />
                  <label htmlFor="farmerIsApproved" className="text-sm font-medium text-gray-700">
                    Active (visible on Know Your Farmers page)
                  </label>
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-5">
              <Button variant="ghost" className="flex-1" onClick={closeModal}>Cancel</Button>
              {!viewMode && (
                <Button variant="primary" className="flex-1" onClick={handleSave}>
                  {isEditing ? 'Update Farmer' : 'Add Farmer'}
                </Button>
              )}
            </div>
          </div>
        </Modal>
      </div>
    </AdminLayout>
  )
}
