import React, { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Menu, X, LogOut, Bell, Settings, Leaf, ChevronDown } from 'lucide-react'
import { useAuthStore } from '../../store'
import { Spinner } from '../ui'

interface NavItem {
  label: string
  path: string
  icon: React.ReactNode
}

const navItems: NavItem[] = [
  { label: 'Dashboard', path: '/admin', icon: <LayoutDashboard className="w-5 h-5" /> },
  { label: 'Products', path: '/admin/products', icon: <Package className="w-5 h-5" /> },
  { label: 'Categories', path: '/admin/categories', icon: <Tag className="w-5 h-5" /> },
  { label: 'Sellers', path: '/admin/sellers', icon: <Users className="w-5 h-5" /> },
  { label: 'Orders', path: '/admin/orders', icon: <ShoppingCart className="w-5 h-5" /> },
  { label: 'Users', path: '/admin/users', icon: <UserCheck className="w-5 h-5" /> },
  { label: 'Farmers', path: '/admin/farmers', icon: <Sprout className="w-5 h-5" /> },
]

import { LayoutDashboard, Package, Tag, Users, ShoppingCart, UserCheck, Sprout } from 'lucide-react'

export const AdminLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuthStore()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  const isActive = (path: string) => location.pathname === path

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="flex h-screen bg-stone-900">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'w-64' : 'w-20'
        } bg-stone-950 border-r border-stone-800 transition-all duration-300 flex flex-col overflow-y-auto`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between p-5 border-b border-stone-800">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-forest-600 rounded-xl flex items-center justify-center">
              <Leaf className="w-5 h-5 text-white" strokeWidth={2} />
            </div>
            {sidebarOpen && <span className="text-white font-display font-bold text-lg">VC</span>}
          </Link>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1 hover:bg-stone-800 rounded-lg transition text-stone-400"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-6 space-y-2">
          {navItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                isActive(item.path)
                  ? 'bg-forest-600 text-white'
                  : 'text-stone-400 hover:text-white hover:bg-stone-800'
              }`}
            >
              {item.icon}
              {sidebarOpen && <span className="text-sm font-medium">{item.label}</span>}
            </Link>
          ))}
        </nav>

        {/* User Info (bottom) */}
        {sidebarOpen && (
          <div className="border-t border-stone-800 p-4">
            <p className="text-xs text-stone-400 uppercase tracking-wider font-semibold mb-2">Admin</p>
            <p className="text-sm text-stone-200 font-medium truncate">{user?.name}</p>
            <p className="text-xs text-stone-500 truncate mt-0.5">{user?.email}</p>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden text-black">
        {/* Top Navbar */}
        <nav className="h-16 bg-stone-900 border-b border-stone-800 flex items-center justify-between px-8">
          <h1 className="text-white font-display font-bold text-xl">{getPageTitle(location.pathname)}</h1>

          <div className="flex items-center gap-4">
            {/* Notifications */}
            <button className="relative p-2 text-stone-400 hover:text-white hover:bg-stone-800 rounded-lg transition">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
            </button>

            {/* Settings */}
            <button className="p-2 text-stone-400 hover:text-white hover:bg-stone-800 rounded-lg transition">
              <Settings className="w-5 h-5" />
            </button>

            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 px-3 py-1.5 text-stone-200 hover:bg-stone-800 rounded-lg transition"
              >
                <div className="w-6 h-6 rounded-full bg-forest-600 flex items-center justify-center text-xs font-bold text-white">
                  {user?.name?.[0]?.toUpperCase()}
                </div>
                <ChevronDown className={`w-4 h-4 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 top-12 w-48 bg-stone-800 border border-stone-700 rounded-xl shadow-modal py-2 z-50">
                  <div className="px-4 py-2 border-b border-stone-700">
                    <p className="text-sm font-semibold text-white">{user?.name}</p>
                    <p className="text-xs text-stone-400">{user?.role}</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-stone-700 transition"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </nav>

        {/* Page Content */}
        <main className="flex-1 overflow-auto bg-stone-900 p-8">
          {children}
        </main>
      </div>
    </div>
  )
}

function getPageTitle(pathname: string): string {
  const titles: Record<string, string> = {
    '/admin': 'Dashboard',
    '/admin/products': 'Products',
    '/admin/categories': 'Categories',
    '/admin/sellers': 'Sellers',
    '/admin/orders': 'Orders',
    '/admin/users': 'Users',
  }
  return titles[pathname] || 'Admin Panel'
}
