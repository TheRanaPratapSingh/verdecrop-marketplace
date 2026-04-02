import React from 'react'
import { PageLayout } from '../components/layout'
import { SEO } from '../components/SEO'

export const FarmerStoriesPage: React.FC = () => (
  <PageLayout>
    <SEO
      title="Farmer Stories"
      description="Read inspiring stories of certified organic farmers across India who have grown their income and community impact through the Graamo marketplace."
      canonical="https://graamo.in/farmer-stories"
    />
    <div className="max-w-5xl mx-auto px-6 py-16">
      <h1 className="text-4xl font-display font-bold text-forest-900 mb-4">Farmer Stories</h1>
      <p className="text-gray-600 font-body mb-6">Read real farmer success stories from our community.</p>
      <div className="space-y-4">
        {[
          { name: 'Radha from Karnataka', story: 'Switched to organic pulses and increased yield by 30%.' },
          { name: 'Amit from Punjab', story: 'Now supplies 200+ families directly through Graamo.' },
          { name: 'Meena from Odisha', story: 'Earned a sustainable livelihood with coriander and herbs.' }
        ].map((farmer, idx) => (
          <article key={idx} className="bg-white rounded-2xl shadow-card p-5">
            <h2 className="text-xl font-semibold text-forest-900">{farmer.name}</h2>
            <p className="text-gray-600 mt-1">{farmer.story}</p>
          </article>
        ))}
      </div>
    </div>
  </PageLayout>
)
