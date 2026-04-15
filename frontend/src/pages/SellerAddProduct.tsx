import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { PageLayout } from '../components/layout'
import { Button, Input, Textarea, Spinner } from '../components/ui'
import { categoryApi, farmerApi, productApi } from '../services/api'
import { useAuthStore } from '../store'
import type { Category, Farmer, SellerProductDetail } from '../types'
import toast from 'react-hot-toast'
import { compressImage } from '../lib/imageCompressor'
import {
  Package, Leaf, ImageIcon, Truck, Star, ChevronRight,
  X, Plus, Upload, Check, AlertCircle, Save, ArrowLeft,
  Calendar, Clock, Sparkles
} from 'lucide-react'

// ── Types ────────────────────────────────────────────────────────────────────
interface ImageFile {
  file?: File
  preview: string
  uploaded?: string
}

interface FormData {
  name: string; description: string; categoryId: number; subcategory: string; tags: string[]
  farmName: string; farmerName: string; village: string; state: string
  organicCertified: boolean; certificationType: string
  price: string; originalPrice: string; unit: string; quantityOptions: string[]
  stockQuantity: string; minOrderQty: string
  harvestDate: string; shelfLifeDays: string; freshnessGuarantee: string
  deliveryTime: string; availableCities: string[]
  isFeatured: boolean; isFarmToHome: boolean
}

const DRAFT_KEY = 'vc_seller_product_draft'
const UNITS = ['kg', 'g', 'ml', 'litre', 'piece', 'dozen', 'bundle']
const DELIVERY_TIMES = ['Same Day', '1-2 days', '3-5 days', '5-7 days']
const CERT_TYPES = ['None', 'FSSAI', 'PGS', 'India Organic', 'USDA Organic']

const SECTIONS = [
  { id: 'basic', label: 'Basic Details', icon: Package },
  { id: 'farm', label: 'Farm Details', icon: Leaf },
  { id: 'product', label: 'Product Details', icon: Star },
  { id: 'harvest', label: 'Harvest Details', icon: Calendar },
  { id: 'images', label: 'Images', icon: ImageIcon },
  { id: 'delivery', label: 'Delivery', icon: Truck },
  { id: 'extra', label: 'Extra', icon: Sparkles },
]

const initialForm: FormData = {
  name: '', description: '', categoryId: 0, subcategory: '', tags: [],
  farmName: '', farmerName: '', village: '', state: '',
  organicCertified: true, certificationType: 'None',
  price: '', originalPrice: '', unit: 'kg', quantityOptions: [],
  stockQuantity: '', minOrderQty: '1',
  harvestDate: '', shelfLifeDays: '', freshnessGuarantee: '',
  deliveryTime: '1-2 days', availableCities: [],
  isFeatured: false, isFarmToHome: false,
}

// ── Main Component ────────────────────────────────────────────────────────────
export const SellerAddProductPage: React.FC = () => {
  const { id } = useParams<{ id?: string }>()
  const navigate = useNavigate()
  const user = useAuthStore(s => s.user)
  const isEdit = Boolean(id)

  const [form, setForm] = useState<FormData>(initialForm)
  const [images, setImages] = useState<ImageFile[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [farmerProfile, setFarmerProfile] = useState<Farmer | null>(null)
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [activeSection, setActiveSection] = useState('basic')
  const [errors, setErrors] = useState<Partial<Record<keyof FormData | 'images', string>>>({})
  const [tagInput, setTagInput] = useState('')
  const [cityInput, setCityInput] = useState('')
  const [qtyInput, setQtyInput] = useState('')
  const [hasDraft, setHasDraft] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [isCompressing, setIsCompressing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Load data ──────────────────────────────────────────────────────────────
  useEffect(() => {
    categoryApi.getAll().then(setCategories).catch(() => {})
    farmerApi.getMyProfile().then(fp => {
      setFarmerProfile(fp)
      if (!isEdit) setForm(f => ({ ...f, farmName: fp.farmName, state: fp.state || '' }))
    }).catch(() => {})

    if (!isEdit) {
      const saved = localStorage.getItem(DRAFT_KEY)
      if (saved) {
        try { setHasDraft(true) } catch { }
      }
    }
  }, [isEdit])

  useEffect(() => {
    if (isEdit && id) {
      setLoading(true)
      productApi.getSellerById(Number(id)).then(p => {
        const detail = p as SellerProductDetail
        setForm({
          name: detail.name, description: detail.description || '', categoryId: detail.categoryId,
          subcategory: detail.subcategory || '', tags: detail.tags || [],
          farmName: detail.farmerName, farmerName: '', village: detail.village || '',
          state: detail.farmLocation || '', organicCertified: detail.isOrganic,
          certificationType: detail.certificationType || 'None',
          price: String(detail.price), originalPrice: detail.originalPrice ? String(detail.originalPrice) : '',
          unit: detail.unit, quantityOptions: detail.quantityOptions || [],
          stockQuantity: String(detail.stockQuantity), minOrderQty: String(detail.minOrderQty),
          harvestDate: detail.harvestDate ? detail.harvestDate.split('T')[0] : '',
          shelfLifeDays: detail.shelfLifeDays ? String(detail.shelfLifeDays) : '',
          freshnessGuarantee: detail.freshnessGuarantee || '',
          deliveryTime: detail.deliveryTime || '1-2 days',
          availableCities: detail.availableCities || [],
          isFeatured: detail.isFeatured, isFarmToHome: detail.isFarmToHome,
        })
        if (detail.imageUrls?.length) {
          setImages(detail.imageUrls.map(url => ({ preview: url, uploaded: url })))
        }
      }).catch(() => toast.error('Failed to load product'))
        .finally(() => setLoading(false))
    }
  }, [isEdit, id])

  // ── Auto-save draft ────────────────────────────────────────────────────────
  useEffect(() => {
    if (isEdit) return
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    autoSaveTimer.current = setTimeout(() => {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(form))
    }, 2000)
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current) }
  }, [form, isEdit])

  // ── Scroll spy ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) setActiveSection(e.target.id) })
    }, { threshold: 0.4 })
    Object.values(sectionRefs.current).forEach(el => { if (el) observer.observe(el) })
    return () => observer.disconnect()
  }, [loading])

  // ── Helpers ────────────────────────────────────────────────────────────────
  const setF = (patch: Partial<FormData>) => setForm(f => ({ ...f, ...patch }))
  const clearError = (k: keyof FormData) => setErrors(e => ({ ...e, [k]: undefined }))

  const validate = (): boolean => {
    const e: typeof errors = {}
    if (!form.name.trim()) e.name = 'Product name is required'
    if (!form.categoryId) e.categoryId = 'Please select a category'
    if (!form.price || isNaN(+form.price) || +form.price <= 0) e.price = 'Valid price is required'
    if (!form.stockQuantity || isNaN(+form.stockQuantity)) e.stockQuantity = 'Stock quantity is required'
    if (!form.unit) e.unit = 'Unit is required'
    if (images.length === 0) e.images = 'At least one product image is required'
    setErrors(e)
    if (Object.keys(e).length > 0) {
      const firstErr = Object.keys(e)[0]
      const sectionMap: Record<string, string> = {
        name: 'basic', description: 'basic', categoryId: 'basic',
        price: 'product', stockQuantity: 'product', unit: 'product', images: 'images',
      }
      setActiveSection(sectionMap[firstErr] || 'basic')
      sectionRefs.current[sectionMap[firstErr]]?.scrollIntoView({ behavior: 'smooth' })
      toast.error('Please fix the errors before submitting')
    }
    return Object.keys(e).length === 0
  }

  // ── Image Handling ─────────────────────────────────────────────────────────
  const addImageFiles = async (files: FileList | File[]) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
    const MAX_MB = 2
    for (const rawFile of Array.from(files).slice(0, 8 - images.length)) {
      if (!allowed.includes(rawFile.type)) {
        toast.error(`${rawFile.name}: only JPEG/PNG/WebP allowed`)
        continue
      }
      let file = rawFile
      try {
        if (rawFile.size > MAX_MB * 1024 * 1024) setIsCompressing(true)
        file = await compressImage(rawFile)
        setIsCompressing(false)
        const before = (rawFile.size / 1024 / 1024).toFixed(1)
        const after  = (file.size  / 1024 / 1024).toFixed(1)
        if (parseFloat(before) > parseFloat(after))
          toast.success(`"${rawFile.name}" compressed ${before}MB → ${after}MB`, { duration: 2500 })
      } catch {
        setIsCompressing(false)
        toast.error(`${rawFile.name}: compression failed`)
        continue
      }
      if (file.size > MAX_MB * 1024 * 1024) {
        toast.error(`${rawFile.name}: could not compress below ${MAX_MB}MB`)
        continue
      }
      const preview = URL.createObjectURL(file)
      setImages(prev => [...prev, { file, preview }])
    }
  }

  const removeImage = (i: number) => setImages(prev => {
    URL.revokeObjectURL(prev[i].preview)
    return prev.filter((_, idx) => idx !== i)
  })

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false)
    if (e.dataTransfer.files.length) addImageFiles(e.dataTransfer.files)
  }, [images.length])

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!validate()) return
    if (!farmerProfile?.isApproved) { toast.error('Your seller profile is not yet approved'); return }
    setSaving(true)
    try {
      const existingUrls = images.filter(i => i.uploaded).map(i => i.uploaded!)
      const payload = {
        name: form.name.trim(), description: form.description.trim() || undefined,
        categoryId: form.categoryId,
        price: parseFloat(form.price),
        originalPrice: form.originalPrice ? parseFloat(form.originalPrice) : undefined,
        unit: form.unit, minOrderQty: parseFloat(form.minOrderQty) || 1,
        stockQuantity: parseInt(form.stockQuantity),
        isOrganic: form.organicCertified, isFeatured: form.isFeatured,
        imageUrl: existingUrls[0] || undefined, imageUrls: existingUrls,
        subcategory: form.subcategory || undefined, tags: form.tags,
        village: form.village || undefined, certificationType: form.certificationType !== 'None' ? form.certificationType : undefined,
        quantityOptions: form.quantityOptions,
        harvestDate: form.harvestDate || undefined,
        shelfLifeDays: form.shelfLifeDays ? parseInt(form.shelfLifeDays) : undefined,
        freshnessGuarantee: form.freshnessGuarantee || undefined,
        deliveryTime: form.deliveryTime || undefined,
        availableCities: form.availableCities, isFarmToHome: form.isFarmToHome,
      }

      let productId: number
      if (isEdit && id) {
        const updated = await productApi.update(Number(id), payload)
        productId = (updated as { id: number }).id
      } else {
        const created = await productApi.create(payload)
        productId = (created as { id: number }).id
      }

      // Upload new file images
      const newImages = images.filter(i => i.file && !i.uploaded)
      const uploadedUrls: string[] = [...existingUrls]
      for (const img of newImages) {
        if (!img.file) continue
        const fd = new FormData()
        fd.append('file', img.file)
        try {
          const res = await productApi.uploadImage(productId, fd)
          uploadedUrls.push(res.url)
        } catch { toast.error(`Failed to upload ${img.file.name}`) }
      }

      if (uploadedUrls.length > 0 && (newImages.length > 0 || !existingUrls.length)) {
        await productApi.update(productId, { imageUrl: uploadedUrls[0], imageUrls: uploadedUrls })
      }

      localStorage.removeItem(DRAFT_KEY)
      toast.success(isEdit ? 'Product updated successfully' : '🎉 Product submitted for review!')
      navigate('/seller/products')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg || 'Failed to save product')
    } finally {
      setSaving(false)
    }
  }

  const restoreDraft = () => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY)
      if (saved) { setForm(JSON.parse(saved)); setHasDraft(false); toast.success('Draft restored') }
    } catch { }
  }

  const addChip = (val: string, list: string[], setter: (v: string[]) => void, inputSetter: (v: string) => void) => {
    const trimmed = val.trim()
    if (trimmed && !list.includes(trimmed)) setter([...list, trimmed])
    inputSetter('')
  }

  const removeChip = (val: string, list: string[], setter: (v: string[]) => void) =>
    setter(list.filter(i => i !== val))

  if (loading) return (
    <PageLayout>
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner size="lg" />
      </div>
    </PageLayout>
  )

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <PageLayout>
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate('/seller/products')}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 font-heading">
              {isEdit ? 'Edit Product' : 'Add New Product'}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {isEdit ? 'Update your product details' : 'Fill in details — admin will review before going live'}
            </p>
          </div>
          {!isEdit && (
            <div className="ml-auto flex gap-2">
              {hasDraft && (
                <Button variant="ghost" size="sm" onClick={restoreDraft}>
                  <Save className="w-4 h-4 mr-1.5" /> Restore Draft
                </Button>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-6">
          {/* ── Sidebar Nav ─────────────────────────────────────────────── */}
          <aside className="hidden lg:block w-52 shrink-0">
            <div className="sticky top-6 bg-white rounded-2xl border border-gray-200 p-3 shadow-sm">
              {SECTIONS.map(s => {
                const Icon = s.icon
                const active = activeSection === s.id
                return (
                  <button key={s.id}
                    onClick={() => {
                      sectionRefs.current[s.id]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                      setActiveSection(s.id)
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all mb-1
                      ${active ? 'bg-green-50 text-green-700' : 'text-gray-600 hover:bg-gray-50'}`}>
                    <Icon className={`w-4 h-4 ${active ? 'text-green-600' : 'text-gray-400'}`} />
                    {s.label}
                    {active && <ChevronRight className="w-3.5 h-3.5 ml-auto text-green-500" />}
                  </button>
                )
              })}
            </div>
          </aside>

          {/* ── Form Sections ────────────────────────────────────────────── */}
          <div className="flex-1 space-y-6 pb-24">

            {/* ① Basic Details */}
            <Section id="basic" title="Basic Details" icon={Package} ref={el => sectionRefs.current['basic'] = el}>
              <div className="space-y-4">
                <Input label="Product Name *" placeholder="e.g., Organic Alphonso Mangoes"
                  value={form.name} error={errors.name}
                  onChange={e => { setF({ name: e.target.value }); clearError('name') }} />
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">Description</label>
                  <textarea rows={4} placeholder="Describe your product — freshness, taste, growing method..."
                    value={form.description}
                    onChange={e => setF({ description: e.target.value })}
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500 resize-none placeholder:text-gray-400" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1.5 block">Category *</label>
                    <select value={form.categoryId} aria-label="Category"
                      onChange={e => { setF({ categoryId: Number(e.target.value) }); clearError('categoryId') }}
                      className={`w-full border rounded-xl px-4 py-2.5 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500
                        ${errors.categoryId ? 'border-red-400' : 'border-gray-300'}`}>
                      <option value={0}>Select category</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    {errors.categoryId && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.categoryId}</p>}
                  </div>
                  <Input label="Subcategory (optional)" placeholder="e.g., Alphonso, Kesar"
                    value={form.subcategory} onChange={e => setF({ subcategory: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">Tags</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {form.tags.map(tag => (
                      <span key={tag} className="inline-flex items-center gap-1 bg-green-50 text-green-700 text-xs font-medium px-3 py-1 rounded-full border border-green-200">
                        {tag}
                        <button onClick={() => removeChip(tag, form.tags, v => setF({ tags: v }))} className="hover:text-red-500"><X className="w-3 h-3" /></button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input placeholder="Add a tag (e.g. sweet, summer, raw)..."
                      value={tagInput} onChange={e => setTagInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addChip(tagInput, form.tags, v => setF({ tags: v }), setTagInput))}
                      className="flex-1 border border-gray-300 rounded-xl px-4 py-2.5 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500" />
                    <Button variant="outline" size="sm" onClick={() => addChip(tagInput, form.tags, v => setF({ tags: v }), setTagInput)}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Press Enter to add</p>
                </div>
              </div>
            </Section>

            {/* ② Farm Details */}
            <Section id="farm" title="Farm Details" icon={Leaf} ref={el => sectionRefs.current['farm'] = el}>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input label="Farm Name" value={form.farmName}
                    hint="Auto-filled from your seller profile"
                    onChange={e => setF({ farmName: e.target.value })} />
                  <Input label="Farmer Name (optional)" placeholder="e.g., Ramesh Patel"
                    value={form.farmerName} onChange={e => setF({ farmerName: e.target.value })} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input label="Village / Location" placeholder="e.g., Ratnagiri village"
                    value={form.village} onChange={e => setF({ village: e.target.value })} />
                  <Input label="State" placeholder="e.g., Maharashtra"
                    value={form.state} onChange={e => setF({ state: e.target.value })} />
                </div>
                <div className="flex items-start gap-4 p-4 bg-green-50 rounded-xl border border-green-200">
                  <input type="checkbox" id="organicCertified" checked={form.organicCertified}
                    onChange={e => setF({ organicCertified: e.target.checked })}
                    className="h-4 w-4 mt-0.5 text-green-600 border-gray-300 rounded focus:ring-green-500" />
                  <div>
                    <label htmlFor="organicCertified" className="font-medium text-gray-800 text-sm cursor-pointer">
                      🌿 Organic Certified Product
                    </label>
                    <p className="text-xs text-gray-500 mt-0.5">Check if this product is organically grown or certified</p>
                  </div>
                </div>
                {form.organicCertified && (
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1.5 block">Certification Type</label>
                    <div className="flex flex-wrap gap-2">
                      {CERT_TYPES.map(c => (
                        <button key={c} onClick={() => setF({ certificationType: c })}
                          className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all
                            ${form.certificationType === c ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-600 border-gray-300 hover:border-green-400'}`}>
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Section>

            {/* ③ Product Details */}
            <Section id="product" title="Product Details" icon={Star} ref={el => sectionRefs.current['product'] = el}>
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <Input label="Price (₹) *" type="number" min="0" placeholder="e.g., 250"
                    value={form.price} error={errors.price}
                    onChange={e => { setF({ price: e.target.value }); clearError('price') }} />
                  <Input label="MRP / Original Price (₹)" type="number" min="0" placeholder="e.g., 300"
                    value={form.originalPrice} hint="Optional"
                    onChange={e => setF({ originalPrice: e.target.value })} />
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1.5 block">Unit *</label>
                    <select value={form.unit} aria-label="Unit"
                      onChange={e => { setF({ unit: e.target.value }); clearError('unit') }}
                      className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500">
                      {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Stock Quantity *" type="number" min="0" placeholder="e.g., 500"
                    value={form.stockQuantity} error={errors.stockQuantity}
                    onChange={e => { setF({ stockQuantity: e.target.value }); clearError('stockQuantity') }} />
                  <Input label="Min. Order Quantity" type="number" min="0.1" step="0.1" placeholder="e.g., 0.5"
                    value={form.minOrderQty} hint={`Minimum ${form.unit} per order`}
                    onChange={e => setF({ minOrderQty: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">Quantity Options</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {form.quantityOptions.map(q => (
                      <span key={q} className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-xs font-medium px-3 py-1 rounded-full border border-blue-200">
                        {q}
                        <button onClick={() => removeChip(q, form.quantityOptions, v => setF({ quantityOptions: v }))}><X className="w-3 h-3 hover:text-red-500" /></button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input placeholder="e.g., 250g, 500g, 1kg..."
                      value={qtyInput} onChange={e => setQtyInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addChip(qtyInput, form.quantityOptions, v => setF({ quantityOptions: v }), setQtyInput))}
                      className="flex-1 border border-gray-300 rounded-xl px-4 py-2.5 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500" />
                    <Button variant="outline" size="sm" onClick={() => addChip(qtyInput, form.quantityOptions, v => setF({ quantityOptions: v }), setQtyInput)}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Dynamic quantity packs buyers can choose</p>
                </div>
              </div>
            </Section>

            {/* ④ Harvest Details */}
            <Section id="harvest" title="Harvest Details" icon={Calendar} ref={el => sectionRefs.current['harvest'] = el}>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input label="Date of Harvest" type="date"
                    value={form.harvestDate} onChange={e => setF({ harvestDate: e.target.value })} />
                  <Input label="Shelf Life (days)" type="number" min="1" placeholder="e.g., 7"
                    value={form.shelfLifeDays} onChange={e => setF({ shelfLifeDays: e.target.value })} />
                </div>
                <Input label="Freshness Guarantee" placeholder="e.g., Guaranteed fresh for 5 days from delivery"
                  value={form.freshnessGuarantee} onChange={e => setF({ freshnessGuarantee: e.target.value })} />
              </div>
            </Section>

            {/* ⑤ Image Upload */}
            <Section id="images" title="Product Images" icon={ImageIcon} ref={el => sectionRefs.current['images'] = el}>
              <div className="space-y-4">
                {errors.images && (
                  <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 rounded-xl px-4 py-2.5 border border-red-200">
                    <AlertCircle className="w-4 h-4" />{errors.images}
                  </div>
                )}
                {/* Dropzone */}
                <div
                  onDrop={onDrop}
                  onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
                  onDragLeave={() => setIsDragging(false)}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all
                    ${isDragging ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-green-400 hover:bg-gray-50'}
                    ${images.length >= 8 ? 'opacity-50 pointer-events-none' : ''}`}>
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    {isCompressing
                      ? <span className="animate-spin w-6 h-6 border-2 border-green-600 border-t-transparent rounded-full inline-block" />
                      : <Upload className="w-6 h-6 text-green-600" />}
                  </div>
                  <p className="text-gray-700 font-medium text-sm">
                    {isCompressing ? 'Optimizing image...' : 'Drag & drop images here'}
                  </p>
                  <p className="text-gray-400 text-xs mt-1">or click to browse • JPEG, PNG, WebP • auto-compressed to 2MB</p>
                  <p className="text-gray-400 text-xs mt-0.5">{images.length}/8 images</p>
                  <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden"
                    onChange={e => e.target.files && addImageFiles(e.target.files)} />
                </div>

                {/* Previews */}
                {images.length > 0 && (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                    {images.map((img, i) => (
                      <div key={i} className="relative group rounded-xl overflow-hidden border border-gray-200 aspect-square">
                        <img src={img.preview} alt={`Preview ${i + 1}`}
                          className="w-full h-full object-cover" />
                        {img.uploaded && (
                          <div className="absolute top-1.5 left-1.5 bg-green-500 rounded-full p-0.5">
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        )}
                        {i === 0 && (
                          <div className="absolute bottom-0 left-0 right-0 bg-green-600/80 text-white text-[10px] text-center py-0.5">Cover</div>
                        )}
                        <button onClick={() => removeImage(i)}
                          className="absolute top-1.5 right-1.5 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-xs text-gray-500">First image will be used as cover photo</p>
              </div>
            </Section>

            {/* ⑥ Delivery Details */}
            <Section id="delivery" title="Delivery Details" icon={Truck} ref={el => sectionRefs.current['delivery'] = el}>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Delivery Time</label>
                  <div className="flex flex-wrap gap-2">
                    {DELIVERY_TIMES.map(t => (
                      <button key={t} onClick={() => setF({ deliveryTime: t })}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all
                          ${form.deliveryTime === t ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-600 border-gray-300 hover:border-green-400'}`}>
                        <Clock className="w-3.5 h-3.5" />{t}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">Available Cities / Pincodes</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {form.availableCities.map(c => (
                      <span key={c} className="inline-flex items-center gap-1 bg-orange-50 text-orange-700 text-xs font-medium px-3 py-1 rounded-full border border-orange-200">
                        {c}
                        <button onClick={() => removeChip(c, form.availableCities, v => setF({ availableCities: v }))}><X className="w-3 h-3 hover:text-red-500" /></button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input placeholder="e.g., Mumbai, 400001, Pune..."
                      value={cityInput} onChange={e => setCityInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addChip(cityInput, form.availableCities, v => setF({ availableCities: v }), setCityInput))}
                      className="flex-1 border border-gray-300 rounded-xl px-4 py-2.5 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500" />
                    <Button variant="outline" size="sm" onClick={() => addChip(cityInput, form.availableCities, v => setF({ availableCities: v }), setCityInput)}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Leave empty to deliver everywhere</p>
                </div>
              </div>
            </Section>

            {/* ⑦ Extra Features */}
            <Section id="extra" title="Extra Features" icon={Sparkles} ref={el => sectionRefs.current['extra'] = el}>
              <div className="space-y-3">
                <ToggleCard
                  id="isFeatured" checked={form.isFeatured}
                  onChange={v => setF({ isFeatured: v })}
                  label="⭐ Featured Product"
                  description="Highlight this product on the homepage and featured sections"
                />
                <ToggleCard
                  id="isFarmToHome" checked={form.isFarmToHome}
                  onChange={v => setF({ isFarmToHome: v })}
                  label="🚜 Farm to Home"
                  description="Tag this product as directly sourced from the farm"
                />
                {form.organicCertified && (
                  <div className="flex items-center gap-3 p-4 bg-green-50 rounded-xl border border-green-200">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-base">🌿</div>
                    <div>
                      <p className="text-sm font-semibold text-green-800">Organic Badge</p>
                      <p className="text-xs text-green-600">Auto-displayed since you marked this as organic</p>
                    </div>
                    <Check className="w-5 h-5 text-green-600 ml-auto" />
                  </div>
                )}
              </div>
            </Section>

          </div>
        </div>

        {/* ── Sticky Submit Bar ──────────────────────────────────────────────── */}
        <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-gray-200 px-4 py-3 z-50">
          <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
            <div className="hidden sm:flex items-center gap-2 text-sm text-gray-500">
              <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              {isEdit ? 'Editing product' : 'Draft saved automatically'}
            </div>
            <div className="flex gap-3 ml-auto">
              <Button variant="ghost" onClick={() => navigate('/seller/products')} disabled={saving}>
                Cancel
              </Button>
              {!isEdit && (
                <Button variant="outline" onClick={() => {
                  localStorage.setItem(DRAFT_KEY, JSON.stringify(form))
                  toast.success('Draft saved!')
                }} disabled={saving}>
                  <Save className="w-4 h-4 mr-1.5" /> Save Draft
                </Button>
              )}
              <Button variant="primary" onClick={handleSubmit} loading={saving} className="min-w-[160px]">
                {saving ? 'Submitting...' : isEdit ? 'Update Product' : '🚀 Submit for Review'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────
interface SectionProps {
  id: string; title: string; icon: React.FC<{ className?: string }>
  children: React.ReactNode
}
const Section = React.forwardRef<HTMLDivElement, SectionProps>(({ id, title, icon: Icon, children }, ref) => (
  <div id={id} ref={ref} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden scroll-mt-4">
    <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 bg-gray-50/60">
      <div className="w-8 h-8 rounded-xl bg-green-100 flex items-center justify-center">
        <Icon className="w-4 h-4 text-green-700" />
      </div>
      <h2 className="font-semibold text-gray-800">{title}</h2>
    </div>
    <div className="p-6">{children}</div>
  </div>
))
Section.displayName = 'Section'

interface ToggleCardProps {
  id: string; checked: boolean; onChange: (v: boolean) => void
  label: string; description: string
}
const ToggleCard: React.FC<ToggleCardProps> = ({ id, checked, onChange, label, description }) => (
  <div className={`flex items-start gap-4 p-4 rounded-xl border transition-all cursor-pointer
    ${checked ? 'bg-green-50 border-green-300' : 'bg-white border-gray-200 hover:border-gray-300'}`}
    onClick={() => onChange(!checked)}>
    <input type="checkbox" id={id} checked={checked} onChange={e => onChange(e.target.checked)}
      className="h-4 w-4 mt-0.5 text-green-600 border-gray-300 rounded focus:ring-green-500" onClick={e => e.stopPropagation()} />
    <div>
      <label htmlFor={id} className="font-medium text-gray-800 text-sm cursor-pointer">{label}</label>
      <p className="text-xs text-gray-500 mt-0.5">{description}</p>
    </div>
  </div>
)
