import React from 'react'
import { PageLayout } from '../components/layout'
import { Button } from '../components/ui'
import { Link } from 'react-router-dom'

export const AboutUsPage: React.FC = () => (
  <PageLayout>
    <div className="max-w-5xl mx-auto px-6 py-16">
      <h1 className="text-4xl font-display font-bold text-forest-900 mb-4">About Graamo</h1>
      <p className="text-gray-600 font-body leading-relaxed mb-6">Graamo is India's community-driven organic marketplace connecting responsible farmers with health-conscious families. We believe in transparency, fair pricing, and farm-to-door delivery of sustainably grown produce.</p>
      <div className="grid gap-6 md:grid-cols-2">
        <div className="bg-white rounded-2xl shadow-card p-6">
          <h2 className="text-xl font-semibold text-forest-900 mb-2">Our Mission</h2>
          <p className="text-gray-600 font-body leading-relaxed">To empower local farmers, promote eco-friendly agriculture, and help customers enjoy fresh, nutritious food without middlemen.</p>
        </div>
        <div className="bg-white rounded-2xl shadow-card p-6">
          <h2 className="text-xl font-semibold text-forest-900 mb-2">Our Commitment</h2>
          <p className="text-gray-600 font-body leading-relaxed">To provide traceable produce, ethical earning opportunities for farmer partners, and a seamless shopping experience backed by quality guarantees.</p>
        </div>
      </div>
      <div className="mt-8">
        <h3 className="text-2xl font-semibold text-forest-900 mb-3">Leading Categories</h3>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {['Vegetables', 'Fruits', 'Grains & Pulses', 'Herbs & Spices', 'Cold Pressed Oils', 'Organic Pulses'].map(item => (
            <li key={item} className="p-4 bg-forest-50 text-forest-700 rounded-xl border border-forest-100">{item}</li>
          ))}
        </ul>
      </div>
      <div className="mt-10">
        <Link to="/products" className="inline-flex items-center gap-2 px-6 py-3 text-white bg-forest-700 hover:bg-forest-600 rounded-xl font-semibold transition">Browse Products</Link>
      </div>
    </div>
  </PageLayout>
)
