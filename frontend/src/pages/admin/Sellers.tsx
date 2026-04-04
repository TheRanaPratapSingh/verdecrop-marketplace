import React, { useEffect, useState } from 'react'
import { AdminLayout } from '../../components/admin/AdminLayout'
import { Card, Button, Badge, Spinner, Modal, Input } from '../../components/ui'
import { CheckCircle, Clock, Edit2, Trash2, Eye } from 'lucide-react'
import toast from 'react-hot-toast'
import { farmerApi } from '../../services/api'
import type { Farmer } from '../../types'

const statusIcon: Record<string, React.ReactNode> = {
  true: <CheckCircle className="w-5 h-5 text-green-400" />,
  false: <Clock className="w-5 h-5 text-orange-400" />,
}

const emptySellerForm = {
  farmName: '',
  ownerName: '',
  description: '',
  location: '',
  state: '',
  pinCode: '',
  certificationNumber: '',
  bankAccountNumber: '',
  bankIfsc: '',
  isApproved: false,
}

export const AdminSellers: React.FC = () => {
  const [sellers, setSellers] = useState<Farmer[]>([])
  const [loading, setLoading] = useState(true)
  const [approving, setApproving] = useState<number | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [viewMode, setViewMode] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [currentSeller, setCurrentSeller] = useState<Farmer | null>(null)
  const [formData, setFormData] = useState({ ...emptySellerForm })
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'approved' | 'pending'>('all')

  const fetchSellers = async () => {
    setLoading(true)
    try {
      const data = await farmerApi.getAll({ page: 1, pageSize: 100, isApproved: undefined })
      setSellers(data.items)
    } catch (error) {
      console.error('Failed to load sellers', error)
      toast.error('Failed to fetch sellers')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSellers()
  }, [])

  const openAddModal = () => {
    setFormData({ ...emptySellerForm })
    setIsEditing(false)
    setViewMode(false)
    setCurrentSeller(null)
    setModalOpen(true)
  }

  const openEditModal = (seller: Farmer) => {
    setFormData({
      farmName: seller.farmName,
      ownerName: seller.ownerName,
      description: seller.description || '',
      location: seller.location,
      state: seller.state,
      pinCode: seller.pinCode || '',
      certificationNumber: seller.certificationNumber || '',
      bankAccountNumber: seller.bankAccountNumber || '',
      bankIfsc: seller.bankIfsc || '',
      isApproved: seller.isApproved,
    })
    setCurrentSeller(seller)
    setIsEditing(true)
    setViewMode(false)
    setModalOpen(true)
  }

  const openViewModal = (seller: Farmer) => {
    setFormData({
      farmName: seller.farmName,
      ownerName: seller.ownerName,
      description: seller.description || '',
      location: seller.location,
      state: seller.state,
      pinCode: seller.pinCode || '',
      certificationNumber: seller.certificationNumber || '',
      bankAccountNumber: seller.bankAccountNumber || '',
      bankIfsc: seller.bankIfsc || '',
      isApproved: seller.isApproved,
    })
    setCurrentSeller(seller)
    setIsEditing(false)
    setViewMode(true)
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setViewMode(false)
    setIsEditing(false)
    setCurrentSeller(null)
    setFormData({ ...emptySellerForm })
  }

  const handleSaveSeller = async () => {
    if (!formData.farmName.trim() || !formData.ownerName.trim() || !formData.location.trim() || !formData.state.trim()) {
      toast.error('Farm name, owner, location and state are required')
      return
    }

    const payload = {
      farmName: formData.farmName,
      ownerName: formData.ownerName,
      description: formData.description,
      location: formData.location,
      state: formData.state,
      pinCode: formData.pinCode,
      certificationNumber: formData.certificationNumber,
      bankAccountNumber: formData.bankAccountNumber,
      bankIfsc: formData.bankIfsc,
      isApproved: formData.isApproved,
    }

    try {
      let result: Farmer
      if (isEditing && currentSeller) {
        const updated = await farmerApi.update(currentSeller.id, payload)
        setSellers(prev => prev.map(s => (s.id === currentSeller.id ? updated : s)))
        toast.success('Seller updated')
      } else {
        result = await farmerApi.create(payload)
        setSellers(prev => [result, ...prev])
        toast.success('Seller added')
      }
      closeModal()
    } catch (error: any) {
      console.error('Seller save failed', error)
      const message = error?.response?.data?.message || error?.response?.data?.errors?.[0] || error?.message || 'Failed to save seller'
      toast.error(message)
    }
  }

  const handleDeleteSeller = async (sellerId: number) => {
    if (!window.confirm('Confirm delete seller?')) return
    try {
      await farmerApi.delete(sellerId)
      setSellers(prev => prev.filter(s => s.id !== sellerId))
      toast.success('Seller deleted')
    } catch (error: any) {
      if (error?.response?.status === 405) {
        toast.error('Delete is not supported by current API endpoint (405). Backend route /api/farmers/{id} required.')
      } else {
        console.error('Delete seller failed', error)
        toast.error('Failed to delete seller')
      }
    }
  }

  const handleApprove = async (farmerId: number) => {
    setApproving(farmerId)
    try {
      await farmerApi.approve(farmerId, true)
      setSellers(prev => prev.map(s => (s.id === farmerId ? { ...s, isApproved: true } : s)))
      toast.success('Farmer approved!')
    } catch (error) {
      console.error('Approval failed', error)
      toast.error('Failed to approve farmer')
    } finally {
      setApproving(null)
    }
  }

  const handleReject = async (farmerId: number) => {
    setApproving(farmerId)
    try {
      await farmerApi.approve(farmerId, false)
      setSellers(prev => prev.filter(s => s.id !== farmerId))
      toast.success('Farmer rejected')
    } catch (error) {
      console.error('Rejection failed', error)
      toast.error('Failed to reject farmer')
    } finally {
      setApproving(null)
    }
  }

  const filteredSellers = sellers.filter(seller => {
    const query = searchQuery.toLowerCase()
    const matchesText =
      seller.farmName.toLowerCase().includes(query) ||
      seller.ownerName.toLowerCase().includes(query) ||
      seller.location.toLowerCase().includes(query) ||
      seller.state.toLowerCase().includes(query) ||
      (seller.pinCode || '').toLowerCase().includes(query)

    const matchesStatus =
      filterStatus === 'all' ||
      (filterStatus === 'approved' && seller.isApproved) ||
      (filterStatus === 'pending' && !seller.isApproved)

    return matchesText && matchesStatus
  })

  const totalSellers = sellers.length
  const approvedCount = sellers.filter(s => s.isApproved).length
  const pendingCount = totalSellers - approvedCount

  return (
    <AdminLayout>
      <div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <h2 className="text-2xl sm:text-3xl font-display font-bold text-gray-100 mb-1">Seller Management</h2>
            <p className="text-gray-300 text-sm">Modern dashboard for premium partner onboarding.</p>
          </div>
          <Button variant="primary" className="gap-2 px-5 self-start sm:self-auto" onClick={openAddModal}>
            + Add Seller
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          <div className="bg-white/10 border border-white/15 p-4 rounded-xl shadow-sm">
            <p className="text-xs text-gray-300 uppercase tracking-wide">Total Sellers</p>
            <p className="text-2xl font-bold text-white">{totalSellers}</p>
          </div>
          <div className="bg-white/10 border border-white/15 p-4 rounded-xl shadow-sm">
            <p className="text-xs text-gray-300 uppercase tracking-wide">Approved</p>
            <p className="text-2xl font-bold text-lime-300">{approvedCount}</p>
          </div>
          <div className="bg-white/10 border border-white/15 p-4 rounded-xl shadow-sm">
            <p className="text-xs text-gray-300 uppercase tracking-wide">Pending Review</p>
            <p className="text-2xl font-bold text-orange-300">{pendingCount}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-7">
          <Input
            label="Search by name, location, pin code"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search sellers..."
            className="md:col-span-2"
          />
          <div className="flex flex-col gap-2">
            <label className="text-sm font-label font-medium text-gray-300">Status filter</label>
            <select
              className="h-12 px-3 rounded-lg border border-white/20 bg-slate-900 text-white"
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value as 'all' | 'approved' | 'pending')}
            >
              <option value="all">All Sellers</option>
              <option value="approved">Approved</option>
              <option value="pending">Pending</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <Spinner size="lg" />
          </div>
        ) : filteredSellers.length === 0 ? (
          <Card className="bg-white/10 border border-dashed border-gray-300 p-12 text-center rounded-2xl">
            <p className="text-gray-300 text-lg">No sellers match your search or filter criteria</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredSellers.map(seller => (
              <Card key={seller.id} className="bg-white border border-gray-200 p-6 rounded-2xl hover:shadow-lg transition-all duration-300">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{seller.farmName}</h3>
                    <p className="text-sm text-gray-600">Owner: {seller.ownerName}</p>
                  </div>
                  {statusIcon[String(seller.isApproved)]}
                </div>

                <div className="mb-4">
                  <Badge variant={seller.isApproved ? 'green' : 'orange'}>
                    {seller.isApproved ? 'Approved' : 'Pending'}
                  </Badge>
                </div>

                <p className="text-sm text-gray-700 mb-2">📍 Location: {seller.location}</p>
                <p className="text-sm text-gray-700 mb-2">🏡 State: {seller.state}</p>
                <p className="text-sm text-gray-700 mb-2">📮 Pin Code: {seller.pinCode || 'N/A'}</p>

                <div className="border-t border-white/15 pt-4 flex flex-wrap gap-2">
                  <Button variant="secondary" size="sm" className="flex-1" onClick={() => openViewModal(seller)}>
                    <Eye className="w-4 h-4" /> View
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => openEditModal(seller)}>
                    <Edit2 className="w-4 h-4" /> Edit
                  </Button>
                  <Button variant="danger" size="sm" className="flex-1" onClick={() => handleDeleteSeller(seller.id)}>
                    <Trash2 className="w-4 h-4" /> Delete
                  </Button>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <span className="text-xs uppercase tracking-wider font-medium text-gray-400">
                    {seller.isApproved ? 'Live Partner' : 'Review pending'}
                  </span>
                  <span className="text-xs text-gray-400">ID #{seller.id}</span>
                </div>

                <div className="mt-3 flex gap-2">
                  {!seller.isApproved ? (
                    <>
                      <Button
                        variant="primary"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleApprove(seller.id)}
                        disabled={approving === seller.id}
                      >
                        {approving === seller.id ? 'Approving...' : 'Approve'}
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleReject(seller.id)}
                        disabled={approving === seller.id}
                      >
                        {approving === seller.id ? 'Rejecting...' : 'Reject'}
                      </Button>
                    </>
                  ) : null}
                </div>
              </Card>
            ))}
          </div>
        )}

        <Modal isOpen={modalOpen} onClose={closeModal}>
          <div className="w-full max-w-lg">
            <h3 className="text-lg font-display font-bold text-gray-900 mb-4">
              {viewMode ? 'Seller Details' : isEditing ? 'Edit Seller' : 'Add New Seller'}
            </h3>
            <div className="space-y-3">
              <Input
                label="Farm Name"
                value={formData.farmName}
                onChange={e => setFormData({ ...formData, farmName: e.target.value })}
                disabled={viewMode}
              />
              <Input
                label="Owner Name"
                value={formData.ownerName}
                onChange={e => setFormData({ ...formData, ownerName: e.target.value })}
                disabled={viewMode}
              />
              <Input
                label="Location"
                value={formData.location}
                onChange={e => setFormData({ ...formData, location: e.target.value })}
                disabled={viewMode}
              />
              <Input
                label="State"
                value={formData.state}
                onChange={e => setFormData({ ...formData, state: e.target.value })}
                disabled={viewMode}
              />
              <Input
                label="Pin Code"
                value={formData.pinCode}
                onChange={e => setFormData({ ...formData, pinCode: e.target.value })}
                disabled={viewMode}
              />
              <Input
                label="Certification Number"
                value={formData.certificationNumber}
                onChange={e => setFormData({ ...formData, certificationNumber: e.target.value })}
                disabled={viewMode}
              />
              <Input
                label="Bank Account Number"
                value={formData.bankAccountNumber}
                onChange={e => setFormData({ ...formData, bankAccountNumber: e.target.value })}
                disabled={viewMode}
              />
              <Input
                label="Bank IFSC"
                value={formData.bankIfsc}
                onChange={e => setFormData({ ...formData, bankIfsc: e.target.value })}
                disabled={viewMode}
              />
              <Input
                label="Description"
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                disabled={viewMode}
              />
              {!viewMode && (
                <div className="flex items-center gap-3">
                  <input
                    id="isApproved"
                    type="checkbox"
                    checked={formData.isApproved}
                    onChange={e => setFormData({ ...formData, isApproved: e.target.checked })}
                    className="h-4 w-4 text-forest-600 border-gray-300 rounded"
                  />
                  <label htmlFor="isApproved" className="text-sm font-label font-medium text-gray-700">
                    Approved
                  </label>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <Button variant="ghost" className="flex-1" onClick={closeModal}>
                Close
              </Button>
              {!viewMode && (
                <Button variant="primary" className="flex-1" onClick={handleSaveSeller}>
                  {isEditing ? 'Update Seller' : 'Create Seller'}
                </Button>
              )}
            </div>
          </div>
        </Modal>
      </div>
    </AdminLayout>
  )
}

