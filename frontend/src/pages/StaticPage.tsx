import React from 'react'
import { PageLayout } from '../components/layout'
import { useLocation } from 'react-router-dom'

const pageData: Record<string, { title: string; subtitle: string; content: string[] }> = {
  '/about-us': {
    title: 'About Us',
    subtitle: 'Know Graamo',
    content: [
      'Graamo connects certified organic farmers directly with consumers for fresher produce and fair pricing.',
      'We are committed to transparency, seasonal goodness, and sustainability across our supply chain.',
      'Join us in supporting smallholder farmers and choosing eco-friendly food choices.',
    ]
  },
  '/blog': {
    title: 'Blog',
    subtitle: 'Latest Articles & Updates',
    content: [
      'Stay informed with tips on organic living, sustainable farming, and recipe inspiration.',
      'Our blog is updated regularly with stories from the farm and healthy eating advice.',
    ]
  },
  '/careers': {
    title: 'Careers',
    subtitle: 'Grow with Graamo',
    content: [
      'We’re building a team passionate about food quality, farmer empowerment, and eco-conscious commerce.',
      'Explore open roles and make an impact in the organic marketplace.',
    ]
  },
  '/contact': {
    title: 'Contact',
    subtitle: 'We’d love to hear from you',
    content: [
      'For support, partnerships, or feedback, please get in touch with our team.',
      'Email: support@graamo.com | Phone: +91 12345 67890',
    ]
  },
  '/become-a-seller': {
    title: 'Become a Seller',
    subtitle: 'Join Graamo as a Farmer Partner',
    content: [
      'Create your seller profile and reach thousands of customers across cities.',
      'We handle logistics, payments, and promotion so you can focus on harvesting quality produce.',
    ]
  },
  '/farmer-stories': {
    title: 'Farmer Stories',
    subtitle: 'Real voices from our fields',
    content: [
      'Read stories of farmers who are transforming communities through organic farming.',
      'Get inspired by their journey, innovations, and sustainable practices.',
    ]
  },
  '/certifications': {
    title: 'Certifications',
    subtitle: 'Quality & Trust',
    content: [
      'All products are traced and third-party certified as organic wherever possible.',
      'We follow strict quality checks to ensure the food on your table is safe and nutritious.',
    ]
  }
}

export const StaticPage: React.FC = () => {
  const { pathname } = useLocation()
  const page = pageData[pathname] || pageData['/about-us']

  return (
    <PageLayout>
      <div className="max-w-5xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-display font-bold text-forest-900 mb-3">{page.title}</h1>
        <p className="text-lg font-medium text-stone-600 mb-6">{page.subtitle}</p>
        <div className="space-y-4 text-stone-700 font-body">
          {page.content.map((line, index) => <p key={index}>{line}</p>)}
        </div>
      </div>
    </PageLayout>
  )
}
