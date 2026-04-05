import React, { useEffect, useState } from 'react'
import { Gift, Users, Wallet, Copy, CheckCircle, Clock, Share2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { PageLayout } from '../components/layout'
import { Badge, Button, Card, EmptyState, Spinner } from '../components/ui'
import { referralApi } from '../services/api'
import type { ReferralCode, ReferralEntry, WalletSummary } from '../types'

export const ReferralPage: React.FC = () => {
  const [code, setCode] = useState<ReferralCode | null>(null)
  const [referrals, setReferrals] = useState<ReferralEntry[]>([])
  const [wallet, setWallet] = useState<WalletSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [applyCode, setApplyCode] = useState('')
  const [applying, setApplying] = useState(false)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const [c, r, w] = await Promise.all([
          referralApi.getMyCode(),
          referralApi.getMyReferrals(),
          referralApi.getWallet(),
        ])
        setCode(c)
        setReferrals(r)
        setWallet(w)
      } catch {
        toast.error('Failed to load referral data')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const copyCode = () => {
    if (!code) return
    navigator.clipboard.writeText(code.code)
    setCopied(true)
    toast.success('Code copied!')
    setTimeout(() => setCopied(false), 2000)
  }

  const shareLink = () => {
    if (!code) return
    const url = `${window.location.origin}/register?ref=${code.code}`
    if (navigator.share) {
      navigator.share({ title: 'Join Graamo!', text: `Use my code ${code.code} to get started!`, url })
    } else {
      navigator.clipboard.writeText(url)
      toast.success('Invite link copied!')
    }
  }

  const handleApply = async () => {
    if (!applyCode.trim()) return
    setApplying(true)
    try {
      await referralApi.applyCode(applyCode.trim())
      toast.success('Referral code applied!')
      setApplyCode('')
    } catch {
      toast.error('Invalid or already used code')
    } finally {
      setApplying(false)
    }
  }

  if (loading) {
    return (
      <PageLayout>
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      </PageLayout>
    )
  }

  return (
    <PageLayout>
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">

        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-50 rounded-2xl mb-4">
            <Gift className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Invite & Earn</h1>
          <p className="text-gray-500 mt-2 text-sm max-w-md mx-auto">
            Share your unique code. When a friend joins and places their first order, you earn <strong>₹50 wallet credits</strong>.
          </p>
        </div>

        {/* Wallet summary */}
        {wallet && (
          <div className="grid grid-cols-3 gap-4">
            <Card className="p-4 text-center">
              <p className="text-xs text-gray-500 mb-1">Total Earned</p>
              <p className="text-xl font-bold text-green-600">₹{wallet.totalEarned.toFixed(0)}</p>
            </Card>
            <Card className="p-4 text-center border-2 border-green-200">
              <p className="text-xs text-gray-500 mb-1">Balance</p>
              <p className="text-2xl font-bold text-green-700">₹{wallet.balance.toFixed(0)}</p>
            </Card>
            <Card className="p-4 text-center">
              <p className="text-xs text-gray-500 mb-1">Redeemed</p>
              <p className="text-xl font-bold text-gray-600">₹{wallet.totalRedeemed.toFixed(0)}</p>
            </Card>
          </div>
        )}

        {/* My invite code */}
        {code && (
          <Card className="p-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <Share2 className="w-4 h-4 text-green-600" />
              Your Invite Code
            </h2>
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-gray-50 rounded-xl px-5 py-3 font-mono text-2xl font-bold tracking-widest text-green-700 text-center border border-green-100">
                {code.code}
              </div>
              <Button variant="ghost" onClick={copyCode} title="Copy code">
                {copied ? <CheckCircle className="w-5 h-5 text-green-600" /> : <Copy className="w-5 h-5" />}
              </Button>
              <Button onClick={shareLink} className="flex items-center gap-2">
                <Share2 className="w-4 h-4" />
                Share
              </Button>
            </div>
            <p className="text-xs text-gray-400 mt-3 text-center">
              Used {code.usageCount} time{code.usageCount !== 1 ? 's' : ''}
            </p>
          </Card>
        )}

        {/* Apply someone's code */}
        <Card className="p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Have a Referral Code?</h2>
          <div className="flex gap-3">
            <input
              value={applyCode}
              onChange={e => setApplyCode(e.target.value.toUpperCase())}
              placeholder="Enter code e.g. VCABC123"
              maxLength={10}
              className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <Button loading={applying} onClick={handleApply}>Apply</Button>
          </div>
        </Card>

        {/* My referrals list */}
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4 flex items-center gap-2">
            <Users className="w-4 h-4" />
            My Referrals ({referrals.length})
          </h2>

          {referrals.length === 0 ? (
            <EmptyState
              icon={<Users className="w-10 h-10 text-gray-300" />}
              title="No referrals yet"
              description="Share your code and start earning when friends place their first order."
            />
          ) : (
            <div className="space-y-3">
              {referrals.map(r => (
                <Card key={r.id} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-green-50 flex items-center justify-center text-green-700 font-bold text-sm">
                      {r.referredUserName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-sm text-gray-900">{r.referredUserName}</p>
                      <p className="text-xs text-gray-400">
                        {new Date(r.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {r.status === 'completed' && (
                      <span className="text-sm font-semibold text-green-600">+₹{r.creditsAwarded}</span>
                    )}
                    <Badge variant={r.status === 'completed' ? 'green' : 'orange'} className="flex items-center gap-1 capitalize">
                      {r.status === 'completed'
                        ? <CheckCircle className="w-3 h-3" />
                        : <Clock className="w-3 h-3" />}
                      {r.status}
                    </Badge>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Wallet transaction history */}
        {wallet && wallet.recent.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4 flex items-center gap-2">
              <Wallet className="w-4 h-4" />
              Wallet History
            </h2>
            <Card className="divide-y divide-gray-50">
              {wallet.recent.map(tx => (
                <div key={tx.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-sm text-gray-800">{tx.description}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(tx.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <span className={`font-semibold text-sm ${tx.type === 'earned' ? 'text-green-600' : 'text-red-500'}`}>
                    {tx.type === 'earned' ? '+' : '-'}₹{tx.amount.toFixed(0)}
                  </span>
                </div>
              ))}
            </Card>
          </div>
        )}

      </div>
    </PageLayout>
  )
}
