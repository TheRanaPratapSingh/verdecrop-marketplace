import React from 'react'
import { PageLayout } from '../components/layout'

export const CertificationsPage: React.FC = () => (
  <PageLayout>
    <div className="max-w-5xl mx-auto px-6 py-16">
      <h1 className="text-4xl font-display font-bold text-forest-900 mb-4">Certifications</h1>
      <p className="text-gray-600 font-body mb-8">Every product is verified and tracked with recognized standards.</p>
      <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-700 font-body">
        {[
          'USDA Organic', 'India Organic', 'FSSAI Certified', 'Non-GMO', 'Fair Trade', 'Sustainable Packaging'
        ].map((cert, idx) => (
          <li key={idx} className="bg-white rounded-2xl shadow-card px-5 py-4">{cert}</li>
        ))}
      </ul>
    </div>
  </PageLayout>
)
