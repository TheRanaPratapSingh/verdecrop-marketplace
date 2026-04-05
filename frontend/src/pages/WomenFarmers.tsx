import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { MapPin, Star, ShoppingBag, Heart, Sprout } from 'lucide-react'
import { PageLayout } from '../components/layout'
import { SEO } from '../components/SEO'
import { Button, Spinner } from '../components/ui'
import { farmerApi } from '../services/api'
import { resolveAssetUrl } from '../lib/image'
import type { Farmer } from '../types'

export const WomenFarmersPage: React.FC = () => {
  const [farmers, setFarmers] = useState<Farmer[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    farmerApi.getWomenLed()
      .then(setFarmers)
      .catch(() => setFarmers([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <PageLayout>
      <SEO
        title="Women Farmers of Graamo"
        description="Meet the inspiring women farmers behind Graamo — growing organic produce, sustaining communities, and empowering rural India one harvest at a time."
        canonical="https://graamo.in/women-farmers"
      />

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-pink-50 via-rose-50 to-orange-50">
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(244,114,182,0.12) 0%, transparent 60%), radial-gradient(circle at 80% 20%, rgba(251,146,60,0.10) 0%, transparent 50%)' }} />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-24 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-pink-100 border border-pink-200 text-pink-700 text-xs font-label font-semibold mb-6">
            <Heart className="w-3.5 h-3.5 fill-pink-500 text-pink-500" /> Women Empowerment
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold text-stone-900 leading-tight mb-6">
            Women Farmers<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-600 to-orange-500">of Graamo</span>
          </h1>
          <p className="text-lg sm:text-xl text-stone-600 font-body max-w-2xl mx-auto leading-relaxed mb-8">
            Behind every harvest is a woman who woke before dawn, tended her fields with care, and fed
            a family — sometimes a village. Meet the farmers who are the backbone of rural India.
          </p>
          <div className="flex flex-wrap justify-center gap-6 text-sm font-body text-stone-600">
            {[
              { icon: '👩‍🌾', label: 'Women-led farms' },
              { icon: '🌱', label: '100% Organic' },
              { icon: '🤝', label: 'Direct from source' },
            ].map(stat => (
              <div key={stat.label} className="flex items-center gap-2 px-4 py-2 bg-white/70 rounded-full border border-pink-100 shadow-sm">
                <span>{stat.icon}</span>
                <span className="font-medium">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Story cards ── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-14">
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="section-label mb-1">Their Stories</p>
            <h2 className="text-2xl sm:text-3xl font-display font-semibold text-stone-900">Faces Behind Your Food</h2>
          </div>
          {!loading && farmers.length > 0 && (
            <span className="text-sm text-stone-500 font-body">{farmers.length} women farmers</span>
          )}
        </div>

        {loading ? (
          <div className="py-24 flex items-center justify-center">
            <Spinner size="lg" />
          </div>
        ) : farmers.length === 0 ? (
          <div className="py-20 text-center">
            <div className="text-6xl mb-5">👩‍🌾</div>
            <h3 className="text-xl font-display font-semibold text-stone-800 mb-2">Stories Coming Soon</h3>
            <p className="text-stone-500 font-body max-w-sm mx-auto">
              We are onboarding women farmers every week. Check back soon to read their inspiring journeys.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-7">
            {farmers.map(farmer => (
              <article
                key={farmer.id}
                className="group bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-card hover:shadow-modal hover:-translate-y-1 transition-all duration-300"
              >
                {/* Photo banner */}
                <div className="relative h-44 bg-gradient-to-br from-pink-100 via-rose-50 to-orange-100 flex items-center justify-center overflow-hidden">
                  {farmer.avatarUrl ? (
                    <img
                      src={resolveAssetUrl(farmer.avatarUrl)}
                      alt={farmer.ownerName}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-20 h-20 rounded-full bg-white/80 border-4 border-pink-200 flex items-center justify-center text-4xl font-bold text-pink-600 shadow-sm">
                        {farmer.ownerName?.[0]?.toUpperCase() || '👩'}
                      </div>
                    </div>
                  )}
                  {/* Women-led badge overlay */}
                  <div className="absolute top-3 left-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/90 backdrop-blur-sm border border-pink-200 text-pink-700 text-xs font-label font-bold shadow-sm">
                    <Heart className="w-3 h-3 fill-pink-500 text-pink-500" /> Women-Led
                  </div>
                  {farmer.isPremium && (
                    <div className="absolute top-3 right-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-400/90 backdrop-blur-sm text-white text-xs font-label font-bold shadow-sm">
                      ⭐ Premium
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-5">
                  <div className="mb-3">
                    <h3 className="text-lg font-display font-semibold text-stone-900 group-hover:text-pink-700 transition-colors">
                      {farmer.ownerName}
                    </h3>
                    <p className="text-sm font-medium text-stone-600">{farmer.farmName}</p>
                    <div className="flex items-center gap-1.5 mt-1.5 text-xs text-stone-400 font-body">
                      <MapPin className="w-3.5 h-3.5" />
                      {farmer.location}, {farmer.state}
                    </div>
                  </div>

                  {/* Story */}
                  {farmer.womenStory ? (
                    <blockquote className="relative mt-3 mb-4 pl-4 border-l-2 border-pink-300">
                      <span className="absolute -top-1 -left-1 text-pink-300 text-2xl font-serif leading-none">"</span>
                      <p className="text-sm text-stone-600 font-body italic leading-relaxed line-clamp-3">
                        {farmer.womenStory}
                      </p>
                    </blockquote>
                  ) : (
                    <p className="mt-3 mb-4 text-sm text-stone-500 font-body line-clamp-2">
                      {farmer.description || 'Growing fresh organic produce with love and dedication for her community.'}
                    </p>
                  )}

                  {/* Rating */}
                  {farmer.reviewCount > 0 && (
                    <div className="flex items-center gap-1.5 mb-4 text-xs text-stone-500">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      <span className="font-semibold text-stone-700">{farmer.rating.toFixed(1)}</span>
                      <span>· {farmer.reviewCount} reviews</span>
                    </div>
                  )}

                  <Link to={`/products?farmerId=${farmer.id}&farmerName=${encodeURIComponent(farmer.farmName)}`}>
                    <Button variant="primary" size="sm" className="w-full justify-center bg-gradient-to-r from-pink-600 to-rose-500 hover:from-pink-700 hover:to-rose-600 border-0">
                      <ShoppingBag className="w-3.5 h-3.5" /> Shop Her Produce
                    </Button>
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* ── Mission strip ── */}
      <section className="bg-gradient-to-r from-pink-700 via-rose-600 to-orange-500 py-14">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center text-white">
          <Sprout className="w-10 h-10 mx-auto mb-4 opacity-80" />
          <h2 className="text-2xl sm:text-3xl font-display font-bold mb-3">Every Purchase Empowers a Woman</h2>
          <p className="text-white/80 font-body text-base max-w-xl mx-auto mb-6 leading-relaxed">
            When you buy from a women-led farm on Graamo, 100% of the revenue goes directly to her.
            No middlemen. No cuts. Just fair trade, rooted in dignity.
          </p>
          <Link to="/products?isOrganic=true">
            <Button variant="outline" className="border-white text-white hover:bg-white hover:text-pink-700 transition-all font-label font-semibold">
              Shop Organic Produce
            </Button>
          </Link>
        </div>
      </section>
    </PageLayout>
  )
}
