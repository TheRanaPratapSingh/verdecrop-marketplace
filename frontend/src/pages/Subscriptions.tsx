import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Package, Calendar, Pause, Play, X, Plus, RefreshCw, ChevronRight, Clock, CheckCircle, XCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { PageLayout } from '../components/layout'
import { Badge, Button, Card, EmptyState, Modal, Spinner } from '../components/ui'
import { subscriptionApi, userApi } from '../services/api'
import { resolveAssetUrl } from '../lib/image'
import type { Subscription, Address } from '../types'

const statusColor: Record<string, 'green' | 'orange' | 'red'> = {
  active: 'green',
  paused: 'orange',
  cancelled: 'red',
}

const StatusIcon: React.FC<{ status: string }> = ({ status }) => {
  if (status === 'active') return <CheckCircle className="w-4 h-4 text-green-600" />
  if (status === 'paused') return <Clock className="w-4 h-4 text-amber-500" />
  return <XCircle className="w-4 h-4 text-red-500" />
}

export const SubscriptionsPage: React.FC = () => {
  const [subs, setSubs] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(true)
  const [actionId, setActionId] = useState<number | null>(null)
  const [cancelId, setCancelId] = useState<number | null>(null)
  const [showCreate, setShowCreate] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const data = await subscriptionApi.getAll()
      setSubs(data)
    } catch {
      toast.error('Failed to load subscriptions')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handlePauseResume = async (sub: Subscription) => {
    const pause = sub.status === 'active'
    setActionId(sub.id)
    try {
      await subscriptionApi.pauseResume(sub.id, pause)
      toast.success(pause ? 'Subscription paused' : 'Subscription resumed!')
      await load()
    } catch {
      toast.error('Action failed')
    } finally {
      setActionId(null)
    }
  }

  const handleCancel = async (id: number) => {
    setActionId(id)
    try {
      await subscriptionApi.cancel(id)
      toast.success('Subscription cancelled')
      setCancelId(null)
      await load()
    } catch {
      toast.error('Failed to cancel')
    } finally {
      setActionId(null)
    }
  }

  const activeSubs = subs.filter(s => s.status !== 'cancelled')
  const cancelledSubs = subs.filter(s => s.status === 'cancelled')

  return (
    <PageLayout>
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Subscriptions</h1>
            <p className="text-gray-500 mt-1 text-sm">Recurring farm-fresh deliveries at your doorstep</p>
          </div>
          <Button onClick={() => setShowCreate(true)} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            New Subscription
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Spinner size="lg" /></div>
        ) : subs.length === 0 ? (
          <EmptyState
            icon={<Package className="w-12 h-12 text-gray-300" />}
            title="No subscriptions yet"
            description="Subscribe to weekly or monthly farm-fresh boxes delivered to your door."
            action={<Button onClick={() => setShowCreate(true)}>Start a Subscription</Button>}
          />
        ) : (
          <div className="space-y-8">
            {/* Active + Paused */}
            {activeSubs.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Active</h2>
                {activeSubs.map(sub => (
                  <SubscriptionCard
                    key={sub.id}
                    sub={sub}
                    actionId={actionId}
                    onPauseResume={() => handlePauseResume(sub)}
                    onCancelClick={() => setCancelId(sub.id)}
                  />
                ))}
              </div>
            )}

            {/* Cancelled */}
            {cancelledSubs.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Cancelled</h2>
                {cancelledSubs.map(sub => (
                  <SubscriptionCard
                    key={sub.id}
                    sub={sub}
                    actionId={actionId}
                    onPauseResume={() => {}}
                    onCancelClick={() => {}}
                    readonly
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Cancel confirm modal */}
      <Modal
        isOpen={cancelId !== null}
        onClose={() => setCancelId(null)}
        title="Cancel Subscription"
        footer={
          <div className="flex gap-3 justify-end">
            <Button variant="ghost" onClick={() => setCancelId(null)}>Keep It</Button>
            <Button
              variant="danger"
              loading={actionId === cancelId}
              onClick={() => cancelId && handleCancel(cancelId)}
            >
              Yes, Cancel
            </Button>
          </div>
        }
      >
        <p className="text-gray-600">Are you sure you want to cancel this subscription? This cannot be undone.</p>
      </Modal>

      {/* Create subscription modal */}
      {showCreate && (
        <CreateSubscriptionModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); load() }}
        />
      )}
    </PageLayout>
  )
}

// ── Subscription Card ─────────────────────────────────────────────────────────
const SubscriptionCard: React.FC<{
  sub: Subscription
  actionId: number | null
  onPauseResume: () => void
  onCancelClick: () => void
  readonly?: boolean
}> = ({ sub, actionId, onPauseResume, onCancelClick, readonly }) => {
  const isLoading = actionId === sub.id

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4 flex-1 min-w-0">
          {/* Icon */}
          <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0">
            <Package className="w-6 h-6 text-green-600" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-gray-900 capitalize">
                {sub.boxType} Box
              </span>
              <Badge variant={(statusColor[sub.status] ?? 'green') as 'green' | 'orange' | 'red'} className="capitalize flex items-center gap-1">
                <StatusIcon status={sub.status} />
                {sub.status}
              </Badge>
              <Badge variant="green" size="sm" className="capitalize">
                {sub.frequency}
              </Badge>
            </div>

            <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                Next: {new Date(sub.nextDeliveryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
              <span>₹{sub.price.toFixed(2)} / delivery</span>
              <span>{sub.address.city}, {sub.address.state}</span>
              {sub.items.length > 0 && (
                <span>{sub.items.length} product{sub.items.length > 1 ? 's' : ''}</span>
              )}
            </div>

            {/* Items preview */}
            {sub.items.length > 0 && (
              <div className="mt-3 flex gap-2 flex-wrap">
                {sub.items.map(item => (
                  <div key={item.productId} className="flex items-center gap-1.5 bg-gray-50 rounded-lg px-2.5 py-1 text-xs text-gray-700">
                    {item.imageUrl && (
                      <img
                        src={resolveAssetUrl(item.imageUrl)}
                        alt={item.productName}
                        className="w-5 h-5 rounded object-cover"
                      />
                    )}
                    <span>{item.productName}</span>
                    <span className="text-gray-400">×{item.quantity}{item.unit}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        {!readonly && sub.status !== 'cancelled' && (
          <div className="flex gap-2 flex-shrink-0">
            <Button
              size="sm"
              variant="ghost"
              loading={isLoading}
              onClick={onPauseResume}
              title={sub.status === 'active' ? 'Pause' : 'Resume'}
            >
              {sub.status === 'active'
                ? <Pause className="w-4 h-4" />
                : <Play className="w-4 h-4" />}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={onCancelClick}
              title="Cancel subscription"
              className="text-red-500 hover:bg-red-50"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </Card>
  )
}

// ── Create Subscription Modal ─────────────────────────────────────────────────
const CreateSubscriptionModal: React.FC<{
  onClose: () => void
  onCreated: () => void
}> = ({ onClose, onCreated }) => {
  const [addresses, setAddresses] = useState<Address[]>([])
  const [addressId, setAddressId] = useState<number | ''>('')
  const [boxType, setBoxType] = useState<'vegetable' | 'fruit' | 'custom'>('vegetable')
  const [frequency, setFrequency] = useState<'weekly' | 'monthly'>('weekly')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingAddr, setLoadingAddr] = useState(true)

  useEffect(() => {
    userApi.getAddresses().then(data => {
      setAddresses(data)
      if (data.length > 0) setAddressId(data.find(a => a.isDefault)?.id ?? data[0].id)
    }).catch(() => toast.error('Failed to load addresses')).finally(() => setLoadingAddr(false))
  }, [])

  const handleCreate = async () => {
    if (!addressId) { toast.error('Please select a delivery address'); return }
    setLoading(true)
    try {
      await subscriptionApi.create({ addressId: Number(addressId), boxType, frequency, notes: notes || undefined })
      toast.success('Subscription created! 🌿')
      onCreated()
    } catch {
      toast.error('Failed to create subscription')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Start a New Subscription"
      size="md"
      footer={
        <div className="flex gap-3 justify-end">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button loading={loading} onClick={handleCreate}>Create Subscription</Button>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Box type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Box Type</label>
          <div className="grid grid-cols-3 gap-2">
            {(['vegetable', 'fruit', 'custom'] as const).map(t => (
              <button
                key={t}
                onClick={() => setBoxType(t)}
                className={`px-3 py-2.5 rounded-xl text-sm font-medium border transition-all capitalize ${
                  boxType === t
                    ? 'border-green-600 bg-green-50 text-green-700'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                {t === 'vegetable' ? '🥦 Vegetable' : t === 'fruit' ? '🍎 Fruit' : '📦 Custom'}
              </button>
            ))}
          </div>
        </div>

        {/* Frequency */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Delivery Frequency</label>
          <div className="grid grid-cols-2 gap-2">
            {(['weekly', 'monthly'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFrequency(f)}
                className={`px-3 py-2.5 rounded-xl text-sm font-medium border transition-all capitalize ${
                  frequency === f
                    ? 'border-green-600 bg-green-50 text-green-700'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                {f === 'weekly' ? '📅 Weekly' : '🗓️ Monthly'}
              </button>
            ))}
          </div>
        </div>

        {/* Address */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Delivery Address</label>
          {loadingAddr ? (
            <div className="flex items-center gap-2 text-sm text-gray-500"><Spinner size="sm" /> Loading addresses…</div>
          ) : addresses.length === 0 ? (
            <p className="text-sm text-amber-600">
              No saved addresses.{' '}
              <Link to="/profile" className="underline">Add one in Profile</Link>.
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
            placeholder="E.g. no onions, extra tomatoes..."
            rows={2}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
          />
        </div>

        <p className="text-xs text-gray-400 bg-gray-50 rounded-xl p-3">
          🌱 Your first box will be dispatched within 7 days. You can pause or cancel anytime from this page.
        </p>
      </div>
    </Modal>
  )
}
