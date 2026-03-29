import React, { useEffect, useMemo, useState } from 'react'
import { PageLayout } from '../components/layout'
import { useAuthStore } from '../store'
import { Button, Input, Textarea, Badge } from '../components/ui'
import toast from 'react-hot-toast'
import { Link } from 'react-router-dom'
import type { User } from '../types'

type SellerStatus = 'pending' | 'approved' | 'rejected'

interface SellerApplication {
  id: number
  userId: number
  userName: string
  email?: string
  farmName: string
  farmLocation: string
  storeDescription: string
  products: string
  status: SellerStatus
  submittedAt: string
  reviewedAt?: string
  reviewComment?: string
  documents: {
    aadhar?: string
    pan?: string
    bank?: string
  }
}

const SELLER_APPLICATION_STORAGE_KEY = 'verdecrop-seller-applications'

const getStoredApps = (): SellerApplication[] => {
  try {
    const raw = localStorage.getItem(SELLER_APPLICATION_STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

const storeApps = (apps: SellerApplication[]) => {
  localStorage.setItem(SELLER_APPLICATION_STORAGE_KEY, JSON.stringify(apps))
}

export const BecomeSellerPage: React.FC = () => {
  const { isAuthenticated, user, setUser } = useAuthStore()

  const [application, setApplication] = useState<SellerApplication | null>(null)
  const [farmName, setFarmName] = useState('')
  const [farmLocation, setFarmLocation] = useState('')
  const [storeDescription, setStoreDescription] = useState('')
  const [products, setProducts] = useState('')
  const [aadhar, setAadhar] = useState<File | null>(null)
  const [pan, setPan] = useState<File | null>(null)
  const [bankProof, setBankProof] = useState<File | null>(null)
  const [adminRequests, setAdminRequests] = useState<SellerApplication[]>([])

  useEffect(() => {
    const apps = getStoredApps()
    setAdminRequests(apps)
    if (user) {
      const existing = apps.find(item => item.userId === user.id)
      setApplication(existing || null)
      if (existing) {
        setFarmName(existing.farmName)
        setFarmLocation(existing.farmLocation)
        setStoreDescription(existing.storeDescription)
        setProducts(existing.products)
      }
    }
  }, [user])

  const existingAadhar = application?.documents?.aadhar || ''
  const existingPan = application?.documents?.pan || ''
  const existingBank = application?.documents?.bank || ''

  const canSubmit = farmName && farmLocation && storeDescription && products && (aadhar || existingAadhar) && (pan || existingPan) && (bankProof || existingBank)

  const handleFileChange = (setter: React.Dispatch<React.SetStateAction<File | null>>) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null
    setter(file)
  }

  const persistApplication = (app: SellerApplication) => {
    const updated = [...getStoredApps().filter(item => item.userId !== app.userId), app]
    storeApps(updated)
    setAdminRequests(updated)
    setApplication(app)
  }

  const submitApplication = () => {
    if (!isAuthenticated || !user) {
      toast.error('Please log in before applying')
      return
    }
    if (!canSubmit) {
      toast.error('Please complete all fields and upload all documents')
      return
    }

    const docNames = {
      aadhar: aadhar?.name || application?.documents.aadhar,
      pan: pan?.name || application?.documents.pan,
      bank: bankProof?.name || application?.documents.bank,
    }

    const newApp: SellerApplication = {
      id: application?.id ?? Date.now(),
      userId: user.id,
      userName: user.name,
      email: user.email,
      farmName: farmName.trim(),
      farmLocation: farmLocation.trim(),
      storeDescription: storeDescription.trim(),
      products: products.trim(),
      documents: docNames,
      status: 'pending',
      submittedAt: new Date().toISOString(),
    }

    persistApplication(newApp)
    toast.success('Seller application submitted for admin approval')
  }

  const setApplicationStatus = (appId: number, status: SellerStatus, reviewComment?: string) => {
    const apps = getStoredApps().map(app => {
      if (app.id !== appId) return app
      const updated = { ...app, status, reviewedAt: new Date().toISOString(), reviewComment }
      return updated
    })
    storeApps(apps)
    setAdminRequests(apps)

    if (user?.id) {
      const own = apps.find(a => a.userId === user.id)
      if (own) setApplication(own)
      if (own?.status === 'approved' && user.role !== 'farmer') {
        setUser({ ...user, role: 'farmer' })
        toast.success('Your seller account has been approved!')
      }
    }
  }

  const renderStatusBadge = (status: SellerStatus) => {
    if (status === 'pending') return <Badge variant="orange">Pending</Badge>
    if (status === 'approved') return <Badge variant="green">Approved</Badge>
    return <Badge variant="red">Rejected</Badge>
  }

  const isAdmin = user?.role === 'admin'

  return (
    <PageLayout>
      <div className="max-w-6xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-display font-bold text-forest-900 mb-4">Seller Onboarding</h1>
        <p className="text-gray-600 font-body mb-8">Join VerdeCrop as a verified farming partner. Manage your farm, products, and order fulfillment once approved by admin.</p>

        {!isAuthenticated ? (
          <div className="bg-white shadow-card rounded-2xl p-8 text-center">
            <p className="text-gray-700 mb-4">Please <Link to="/login" className="text-forest-700 font-semibold">login</Link> or <Link to="/register" className="text-forest-700 font-semibold">register</Link> to start your seller application.</p>
          </div>
        ) : isAdmin ? (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-forest-800">Admin approval queue</h2>
            {adminRequests.length === 0 && <p className="text-stone-500">No seller requests yet.</p>}
            {adminRequests.map(req => (
              <div key={req.id} className="bg-white p-5 rounded-2xl shadow-card border border-stone-100">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold">{req.farmName} ({req.userName})</h3>
                  {renderStatusBadge(req.status)}
                </div>
                <p className="text-sm text-stone-500 mb-2">Location: {req.farmLocation}</p>
                <p className="text-sm text-stone-500 mb-2">Products: {req.products}</p>
                <p className="text-sm text-stone-500 mb-2">Submitted: {new Date(req.submittedAt).toLocaleString()}</p>
                <div className="flex gap-2 mt-3">
                  <Button onClick={() => setApplicationStatus(req.id, 'approved', 'Verified and approved')} variant="primary">Approve</Button>
                  <Button onClick={() => setApplicationStatus(req.id, 'rejected', 'Need more details or documents')} variant="danger">Reject</Button>
                </div>
              </div>
            ))}
          </div>
        ) : application ? (
          <div className="bg-white rounded-2xl shadow-card p-8 border border-stone-100">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-2xl font-semibold text-forest-800">Your Application</h2>
              {renderStatusBadge(application.status)}
            </div>
            <p className="text-sm text-stone-500">Farm name: {application.farmName}</p>
            <p className="text-sm text-stone-500">Location: {application.farmLocation}</p>
            <p className="text-sm text-stone-500">Products: {application.products}</p>
            <p className="text-sm text-stone-500">Submitted: {new Date(application.submittedAt).toLocaleString()}</p>
            {application.reviewedAt && <p className="text-sm text-stone-500">Reviewed: {new Date(application.reviewedAt).toLocaleString()}</p>}
            {application.reviewComment && <p className="text-sm text-gray-700 mt-2">Admin note: {application.reviewComment}</p>}

            {application.status === 'approved' ? (
              <div className="mt-6 bg-forest-50 border border-forest-100 p-4 rounded-xl">
                <h3 className="text-lg font-semibold text-forest-700 mb-2">Seller Dashboard</h3>
                <p className="text-sm text-stone-700">Congratulations! Your account is now active. You can start adding product listings and fulfilling orders.</p>
                <div className="mt-4 space-y-2 text-sm text-stone-700">
                  <p><strong>Farm Name:</strong> {application.farmName}</p>
                  <p><strong>Location:</strong> {application.farmLocation}</p>
                  <p><strong>Products in catalog:</strong> {application.products}</p>
                  <p><strong>Store description:</strong> {application.storeDescription}</p>
                </div>
              </div>
            ) : application.status === 'rejected' ? (
              <div className="mt-6 p-4 bg-red-50 border border-red-100 rounded-xl">
                <p className="text-sm text-red-700">Your application was rejected. Please update the details and resubmit.</p>
                <Button onClick={() => {
                  if (!user) return
                  setApplication(null)
                  setFarmName('')
                  setFarmLocation('')
                  setStoreDescription('')
                  setProducts('')
                  setAadhar(null); setPan(null); setBankProof(null)
                  storeApps(getStoredApps().filter(item => item.userId !== user.id))
                  setAdminRequests(getStoredApps())
                }} variant="outline" size="sm" className="mt-3">Reapply</Button>
              </div>
            ) : (
              <div className="mt-6 p-4 bg-yellow-50 border border-yellow-100 rounded-xl">
                <p className="text-sm text-amber-700">Your application is under review. Please wait for admin approval.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white shadow-card rounded-2xl p-8 border border-stone-100">
            <h2 className="text-2xl font-semibold text-forest-800 mb-5">Seller Registration Form</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Farm Name" value={farmName} onChange={e => setFarmName(e.target.value)} placeholder="e.g. Green Valley Farms" />
              <Input label="Farm Location" value={farmLocation} onChange={e => setFarmLocation(e.target.value)} placeholder="e.g. Village Rampur, Uttarakhand" />
            </div>
            <Textarea label="Store Description" value={storeDescription} onChange={e => setStoreDescription(e.target.value)} placeholder="About your farm, certifications, crop cycles" rows={3} className="mt-4" />
            <Textarea label="Products (comma-separated)" value={products} onChange={e => setProducts(e.target.value)} placeholder="Mustard oil, organic rice, lentils" rows={3} className="mt-4" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Aadhar Proof</label>
                <input type="file" accept="image/*,.pdf" onChange={handleFileChange(setAadhar)} className="block w-full text-sm text-stone-500" />
                {existingAadhar && !aadhar && <p className="text-xs text-stone-500 mt-1">Uploaded: {existingAadhar}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">PAN Proof</label>
                <input type="file" accept="image/*,.pdf" onChange={handleFileChange(setPan)} className="block w-full text-sm text-stone-500" />
                {existingPan && !pan && <p className="text-xs text-stone-500 mt-1">Uploaded: {existingPan}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Bank Proof</label>
                <input type="file" accept="image/*,.pdf" onChange={handleFileChange(setBankProof)} className="block w-full text-sm text-stone-500" />
                {existingBank && !bankProof && <p className="text-xs text-stone-500 mt-1">Uploaded: {existingBank}</p>}
              </div>
            </div>
            <div className="mt-6">
              <Button onClick={submitApplication} variant="primary">Submit Application</Button>
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  )
}
