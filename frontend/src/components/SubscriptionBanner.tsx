import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Sparkles } from 'lucide-react'
import toast from 'react-hot-toast'
import { Modal, Button, Spinner } from './ui'
import { subscriptionApi, userApi } from '../services/api'
import { useAuthStore } from '../store'
import type { Address } from '../types'

// ── Types ─────────────────────────────────────────────────────────────────────
type BoxType = 'vegetable' | 'fruit' | 'custom'

interface BannerOption {
  type: BoxType
  emoji: string
  label: string
  sublabel: string
  hoverGrad: string
  activeRing: string
}

const OPTIONS: BannerOption[] = [
  {
    type: 'vegetable',
    emoji: '🥦',
    label: 'Vegetables',
    sublabel: 'Seasonal & Organic',
    hoverGrad: 'hover:bg-emerald-700/30',
    activeRing: 'ring-emerald-300',
  },
  {
    type: 'fruit',
    emoji: '🍎',
    label: 'Fruits',
    sublabel: 'Farm-fresh & Sweet',
    hoverGrad: 'hover:bg-orange-500/20',
    activeRing: 'ring-orange-300',
  },
  {
    type: 'custom',
    emoji: '📦',
    label: 'Custom Box',
    sublabel: 'You pick what you love',
    hoverGrad: 'hover:bg-white/10',
    activeRing: 'ring-white/50',
  },
]

// ── Main Banner ───────────────────────────────────────────────────────────────
export const SubscriptionBanner: React.FC = () => {
  const { isAuthenticated } = useAuthStore()
  const navigate = useNavigate()
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedType, setSelectedType] = useState<BoxType>('vegetable')

  const handleOptionClick = (type: BoxType) => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: '/' } })
      return
    }
    setSelectedType(type)
    setModalOpen(true)
  }

  return (
    <>
      {/* ── Banner ─────────────────────────────────────────────────────── */}
      <section
        aria-label="Subscribe and save on organic groceries"
        className="relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #14532d 0%, #166534 35%, #15803d 65%, #16a34a 100%)',
        }}
      >
        {/* Decorative blobs */}
        <div className="pointer-events-none absolute -top-20 -left-20 w-72 h-72 rounded-full bg-emerald-400/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 right-10 w-64 h-64 rounded-full bg-lime-300/10 blur-3xl" />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '22px 22px' }}
        />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-8 lg:px-10 py-10 sm:py-14">
          <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-16">

            {/* ── Left: copy ─────────────────────────────────────────── */}
            <div className="flex-1 text-center lg:text-left">
              {/* Pill badge */}
              <div className="inline-flex items-center gap-1.5 bg-white/10 border border-white/20 rounded-full px-3 py-1 mb-4">
                <Sparkles className="w-3.5 h-3.5 text-lime-300" />
                <span className="text-xs font-semibold text-lime-200 tracking-wide uppercase">Subscribe &amp; Save</span>
              </div>

              <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold text-white leading-tight mb-3">
                🥕 Subscribe &amp; Save More on
                <span className="block text-lime-300"> Fresh Organic Groceries</span>
              </h2>

              <p className="text-emerald-100/80 text-sm sm:text-base font-body leading-relaxed max-w-lg mx-auto lg:mx-0">
                Get farm-fresh vegetables &amp; fruits delivered weekly&nbsp;/&nbsp;monthly — no chemicals, no middlemen.
              </p>

              {/* Small trust chips */}
              <div className="mt-5 flex flex-wrap justify-center lg:justify-start gap-2">
                {['✅ Cancel anytime', '📦 Free delivery on ₹500+', '🌿 100% Organic'].map(chip => (
                  <span
                    key={chip}
                    className="text-xs text-emerald-100/70 bg-white/8 border border-white/10 rounded-full px-3 py-1"
                  >
                    {chip}
                  </span>
                ))}
              </div>
            </div>

            {/* ── Right: option cards ────────────────────────────────── */}
            <div className="w-full lg:w-auto flex-shrink-0">
              <p className="text-center text-white/60 text-xs font-semibold uppercase tracking-widest mb-4">
                Choose your box
              </p>

              <div className="grid grid-cols-3 gap-3 sm:gap-4">
                {OPTIONS.map(opt => (
                  <button
                    key={opt.type}
                    onClick={() => handleOptionClick(opt.type)}
                    className={`
                      group relative flex flex-col items-center gap-2 rounded-2xl border border-white/20
                      bg-white/10 backdrop-blur-sm px-4 sm:px-6 py-5 sm:py-6
                      transition-all duration-200
                      hover:bg-white/20 hover:border-white/40 hover:-translate-y-1 hover:shadow-xl
                      active:scale-[0.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60
                    `}
                    aria-label={`Subscribe to ${opt.label}`}
                  >
                    {/* Glow on hover */}
                    <span className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-gradient-to-b from-white/5 to-transparent" />

                    <span className="text-3xl sm:text-4xl drop-shadow-sm group-hover:scale-110 transition-transform duration-200">
                      {opt.emoji}
                    </span>
                    <span className="font-label font-bold text-white text-sm sm:text-base leading-tight">
                      {opt.label}
                    </span>
                    <span className="text-[11px] text-white/55 font-body leading-tight text-center">
                      {opt.sublabel}
                    </span>

                    <span className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-lime-300 group-hover:gap-2 transition-all duration-150">
                      Subscribe <ArrowRight className="w-3 h-3" />
                    </span>
                  </button>
                ))}
              </div>

              {/* Already subscribed link */}
              {isAuthenticated && (
                <p className="mt-4 text-center text-xs text-white/40">
                  Already subscribed?{' '}
                  <Link to="/subscriptions" className="text-lime-300 hover:text-lime-200 underline underline-offset-2 transition-colors">
                    Manage subscriptions
                  </Link>
                </p>
              )}
            </div>

          </div>
        </div>
      </section>

      {/* ── Modal ──────────────────────────────────────────────────────── */}
      {modalOpen && (
        <SubscriptionModal
          initialBoxType={selectedType}
          onClose={() => setModalOpen(false)}
          onCreated={() => {
            setModalOpen(false)
            toast.success('Subscription created! 🌿 Your first box ships in 7 days.')
            navigate('/subscriptions')
          }}
        />
      )}
    </>
  )
}

// ── Subscription Modal ────────────────────────────────────────────────────────
// Standalone — can be used from banner or from SubscriptionsPage
export const SubscriptionModal: React.FC<{
  initialBoxType?: BoxType
  onClose: () => void
  onCreated: () => void
}> = ({ initialBoxType = 'vegetable', onClose, onCreated }) => {
  const [addresses, setAddresses] = useState<Address[]>([])
  const [addressId, setAddressId] = useState<number | ''>('')
  const [boxType, setBoxType] = useState<BoxType>(initialBoxType)
  const [frequency, setFrequency] = useState<'weekly' | 'monthly'>('weekly')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [loadingAddr, setLoadingAddr] = useState(true)

  // Sync if parent changes initialBoxType after mount
  useEffect(() => { setBoxType(initialBoxType) }, [initialBoxType])

  useEffect(() => {
    userApi
      .getAddresses()
      .then(data => {
        setAddresses(data)
        if (data.length > 0) {
          setAddressId(data.find(a => a.isDefault)?.id ?? data[0].id)
        }
      })
      .catch(() => toast.error('Failed to load addresses'))
      .finally(() => setLoadingAddr(false))
  }, [])

  const handleCreate = async () => {
    if (!addressId) {
      toast.error('Please select a delivery address')
      return
    }
    setSubmitting(true)
    try {
      await subscriptionApi.create({
        addressId: Number(addressId),
        boxType,
        frequency,
        notes: notes.trim() || undefined,
      })
      onCreated()
    } catch {
      toast.error('Failed to create subscription — please try again')
    } finally {
      setSubmitting(false)
    }
  }

  const BOX_OPTIONS = [
    { value: 'vegetable' as BoxType, label: '🥦 Vegetables' },
    { value: 'fruit'    as BoxType, label: '🍎 Fruits'     },
    { value: 'custom'   as BoxType, label: '📦 Custom'     },
  ]

  const FREQ_OPTIONS = [
    { value: 'weekly'  as const, label: '📅 Weekly'  },
    { value: 'monthly' as const, label: '🗓️ Monthly' },
  ]

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Start a New Subscription"
      size="md"
      footer={
        <div className="flex gap-3 justify-end">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button loading={submitting} onClick={handleCreate}>
            Create Subscription
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Box type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Box Type</label>
          <div className="grid grid-cols-3 gap-2">
            {BOX_OPTIONS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setBoxType(value)}
                className={`px-3 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                  boxType === value
                    ? 'border-green-600 bg-green-50 text-green-700'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Frequency */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Delivery Frequency</label>
          <div className="grid grid-cols-2 gap-2">
            {FREQ_OPTIONS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setFrequency(value)}
                className={`px-3 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                  frequency === value
                    ? 'border-green-600 bg-green-50 text-green-700'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Address */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Delivery Address</label>
          {loadingAddr ? (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Spinner size="sm" /> Loading addresses…
            </div>
          ) : addresses.length === 0 ? (
            <p className="text-sm text-amber-600">
              No saved addresses.{' '}
              <Link to="/profile" className="underline" onClick={onClose}>
                Add one in Profile
              </Link>
              .
            </p>
          ) : (
            <select
              value={addressId}
              onChange={e => setAddressId(Number(e.target.value))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              {addresses.map(a => (
                <option key={a.id} value={a.id}>
                  {a.label} — {a.street}, {a.city}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Notes (optional)</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="E.g. no onions, extra tomatoes…"
            rows={2}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
          />
        </div>

        <p className="text-xs text-gray-400 bg-gray-50 rounded-xl p-3">
          🌱 Your first box will be dispatched within 7 days. You can pause or cancel anytime from the <strong>Subscriptions</strong> page.
        </p>
      </div>
    </Modal>
  )
}
