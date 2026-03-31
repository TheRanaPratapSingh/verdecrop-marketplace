import React from 'react'
import { PageLayout } from '../components/layout'
import { Button, Input } from '../components/ui'

export const ContactPage: React.FC = () => (
  <PageLayout>
    <div className="max-w-5xl mx-auto px-6 py-16">
      <h1 className="text-4xl font-display font-bold text-forest-900 mb-4">Contact</h1>
      <p className="text-gray-600 font-body mb-6">Reach out with questions or feedback — we’re here to help.</p>
      <div className="grid gap-6 md:grid-cols-2">
        <div className="bg-white rounded-2xl shadow-card p-6">
          <p className="text-sm text-gray-600 mb-4">Email</p>
          <p className="font-semibold text-forest-900">support@graamo.com</p>
          <p className="text-sm text-gray-600 mt-4">Phone</p>
          <p className="font-semibold text-forest-900">+91 12345 67890</p>
          <p className="text-sm text-gray-600 mt-4">Address</p>
          <p className="font-semibold text-forest-900">123 Green Street, Bangalore, India</p>
        </div>
        <div className="bg-white rounded-2xl shadow-card p-6">
          <form className="space-y-4">
            <Input placeholder="Full Name" />
            <Input placeholder="Email" type="email" />
            <Input placeholder="Subject" />
            <textarea placeholder="Message" className="w-full min-h-[140px] p-3 border border-stone-200 rounded-xl focus:border-forest-500 outline-none" />
            <Button type="submit">Send message</Button>
          </form>
        </div>
      </div>
    </div>
  </PageLayout>
)
