import React from 'react'
import { PageLayout } from '../components/layout'

export const CareersPage: React.FC = () => (
  <PageLayout>
    <div className="max-w-5xl mx-auto px-6 py-16">
      <h1 className="text-4xl font-display font-bold text-forest-900 mb-4">Careers</h1>
      <p className="text-gray-600 font-body mb-6">Join the VerdeCrop team and help us build a healthier food future.</p>
      <div className="space-y-4">
        {[
          { role: 'Product Manager', desc: 'Lead product strategy and drive marketplace features.' },
          { role: 'Marketing Specialist', desc: 'Promote farmer stories and organic living to our audience.' },
          { role: 'Customer Support', desc: 'Help customers with orders and product inquiries.' },
          { role: 'Data Engineer', desc: 'Build modern systems that power our recommendation engine.' }
        ].map((job, idx) => (
          <div key={idx} className="bg-white rounded-2xl shadow-card p-5">
            <h2 className="text-xl font-semibold text-forest-900">{job.role}</h2>
            <p className="text-sm text-gray-600 mt-1">{job.desc}</p>
            <button className="mt-3 px-4 py-2 bg-forest-600 text-white rounded-xl hover:bg-forest-500 transition">Apply now</button>
          </div>
        ))}
      </div>
    </div>
  </PageLayout>
)
