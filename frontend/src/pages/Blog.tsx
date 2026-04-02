import React from 'react'
import { PageLayout } from '../components/layout'
import { SEO } from '../components/SEO'

export const BlogPage: React.FC = () => (
  <PageLayout>
    <SEO
      title="Blog"
      description="Organic living tips, seasonal recipe ideas, farmer success stories, and sustainability guides from the Graamo community."
      canonical="https://graamo.in/blog"
    />
    <div className="max-w-5xl mx-auto px-6 py-16">
      <h1 className="text-4xl font-display font-bold text-forest-900 mb-4">Blog</h1>
      <p className="text-gray-600 font-body mb-8">Latest updates, recipes, and stories from the organic community.</p>
      <div className="grid gap-6 md:grid-cols-2">
        {[
          { title: '7 Ways to Reduce Food Waste', desc: 'Smart planning and storage methods for sustainable kitchens.' },
          { title: 'Seasonal Vegetables Guide', desc: 'What to buy each season for freshness and nutrition.' },
          { title: 'Organic Pantry Essentials', desc: 'Healthy staple ingredients for daily cooking.' },
          { title: 'Eco-friendly Packaging', desc: 'How Graamo supports low-waste delivery solutions.' }
        ].map((item, idx) => (
          <article key={idx} className="bg-white rounded-2xl p-5 shadow-card">
            <h2 className="text-xl font-semibold text-forest-900 mb-2">{item.title}</h2>
            <p className="text-sm text-gray-600">{item.desc}</p>
          </article>
        ))}
      </div>
    </div>
  </PageLayout>
)
