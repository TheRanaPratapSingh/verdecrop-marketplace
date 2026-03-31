import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { MapPin, Star, ShoppingBag } from 'lucide-react'
import { PageLayout } from '../components/layout'
import { Button, Badge, Spinner, EmptyState } from '../components/ui'
import { farmerApi } from '../services/api'
import type { Farmer } from '../types'

export const ShopByFarmsPage: React.FC = () => {
  const [farmers, setFarmers] = useState<Farmer[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    farmerApi.getAll({ page: 1, pageSize: 100, isApproved: true })
      .then(res => setFarmers(res.items ?? []))
      .catch(() => setFarmers([]))
      .finally(() => setLoading(false))
  }, [])

  const sortedFarmers = useMemo(
    () => [...farmers].sort((a, b) => (b.rating || 0) - (a.rating || 0)),
    [farmers],
  )

  return (
    <PageLayout>
      <section className="relative overflow-hidden bg-gradient-to-b from-cream via-stone-50 to-stone-100">
        <div className="absolute inset-0 bg-hero-mesh opacity-60 pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 relative z-10">
          <div className="mb-8">
            <p className="section-label mb-2">Discover Sellers</p>
            <h1 className="text-3xl sm:text-4xl font-display font-semibold text-forest-900 mb-2">Shop By Farms</h1>
            <p className="text-stone-600 font-body max-w-3xl">Browse verified farm partners and shop products directly from each farm.</p>
          </div>

          {loading ? (
            <div className="py-20 flex items-center justify-center">
              <Spinner size="lg" />
            </div>
          ) : sortedFarmers.length === 0 ? (
            <EmptyState title="No farms available" description="Approved farms will appear here once sellers are onboarded." />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {sortedFarmers.map(farmer => (
                <article key={farmer.id} className="rounded-3xl border border-stone-200 bg-white/90 backdrop-blur-sm p-5 shadow-card hover:shadow-modal transition-all duration-200">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-label font-semibold text-stone-900">{farmer.farmName}</h2>
                      <p className="text-sm text-stone-500 mt-1">by {farmer.ownerName}</p>
                    </div>
                    <Badge variant="green">Verified</Badge>
                  </div>

                  <p className="mt-3 text-sm text-stone-600 line-clamp-2">{farmer.description || 'Fresh seasonal produce from this farm.'}</p>

                  <div className="mt-4 space-y-2 text-sm text-stone-600">
                    <p className="flex items-center gap-2"><MapPin className="w-4 h-4 text-stone-400" />{farmer.location}, {farmer.state}</p>
                    <p className="flex items-center gap-2"><Star className="w-4 h-4 text-amber-500" />{(farmer.rating || 0).toFixed(1)} rating • {farmer.reviewCount || 0} reviews</p>
                  </div>

                  <div className="mt-5">
                    <Link to={`/products?farmerId=${farmer.id}&farmerName=${encodeURIComponent(farmer.farmName)}`}>
                      <Button variant="primary" className="w-full justify-center">
                        <ShoppingBag className="w-4 h-4" /> Shop
                      </Button>
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </PageLayout>
  )
}
