import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { MapPin, Star } from 'lucide-react'
import { PageLayout } from '../components/layout'
import { Spinner, EmptyState } from '../components/ui'
import { farmerApi } from '../services/api'
import { resolveAssetUrl } from '../lib/image'
import type { Farmer } from '../types'

export const FarmersPage: React.FC = () => {
  const [farmers, setFarmers] = useState<Farmer[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    farmerApi.getAll({ page: 1, pageSize: 200, isApproved: true })
      .then(res => setFarmers(res.items ?? []))
      .catch(() => setFarmers([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <PageLayout>
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-14">
        <div className="mb-10">
          <p className="section-label mb-2">Our Community</p>
          <h1 className="text-3xl sm:text-4xl font-display font-semibold text-forest-900 mb-3">Know Your Farmers</h1>
          <p className="text-stone-600 font-body max-w-2xl">
            Meet the dedicated farmers behind every product — real people, real farms, real food.
          </p>
        </div>

        {loading ? (
          <div className="py-20 flex items-center justify-center">
            <Spinner size="lg" />
          </div>
        ) : farmers.length === 0 ? (
          <EmptyState title="No farmers yet" description="Farmers will appear here once they are onboarded." />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {farmers.map(farmer => (
              <div key={farmer.id} className="rounded-3xl bg-white border border-stone-200 shadow-card hover:shadow-modal transition-all duration-200 overflow-hidden">
                <div className="h-44 bg-forest-50 flex items-center justify-center overflow-hidden">
                  {farmer.avatarUrl ? (
                    <img
                      src={resolveAssetUrl(farmer.avatarUrl)}
                      alt={farmer.ownerName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-forest-100 flex items-center justify-center">
                      <span className="text-3xl font-display font-bold text-forest-600">
                        {farmer.ownerName?.[0]?.toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
                <div className="p-5">
                  <h2 className="text-base font-label font-semibold text-stone-900">{farmer.ownerName}</h2>
                  <p className="text-sm text-forest-700 font-medium mt-0.5">{farmer.farmName}</p>
                  <div className="flex items-center gap-1.5 mt-2 text-sm text-stone-500">
                    <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="truncate">{farmer.location}, {farmer.state}</span>
                  </div>
                  {farmer.rating > 0 && (
                    <div className="flex items-center gap-1.5 mt-1 text-sm text-stone-500">
                      <Star className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                      <span>{farmer.rating.toFixed(1)} · {farmer.reviewCount} reviews</span>
                    </div>
                  )}
                  <Link
                    to={`/products?farmerId=${farmer.id}&farmerName=${encodeURIComponent(farmer.farmName)}`}
                    className="mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-forest-600 text-white text-sm font-label font-medium rounded-2xl hover:bg-forest-700 active:scale-[0.98] transition-all duration-200"
                  >
                    View Profile
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </PageLayout>
  )
}
