import React, { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Menu, X, LogOut, Bell, Settings, Leaf, ChevronDown, LayoutDashboard, Package, Tag, Users, ShoppingCart, UserCheck } from 'lucide-react'
import { useAuthStore } from '../../store'

interface NavItem {
  label: string
  path: string
  icon: React.ReactNode
}

const navItems: NavItem[] = [
  { label: 'Dashboard',  path: '/admin',            icon: <LayoutDashboard className="w-5 h-5" /> },
  { label: 'Products',   path: '/admin/products',   icon: <Package         className="w-5 h-5" /> },
  { label: 'Categories', path: '/admin/categories', icon: <Tag             className="w-5 h-5" /> },
  { label: 'Sellers',    path: '/admin/sellers',    icon: <Users           className="w-5 h-5" /> },
  { label: 'Orders',     path: '/admin/orders',     icon: <ShoppingCart    className="w-5 h-5" /> },
  { label: 'Users',      path: '/admin/users',      icon: <UserCheck       className="w-5 h-5" /> },
]

export const AdminLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuthStore()
  // desktop: collapsed/expanded; mobile: open/closed overlay
  const [sidebarOpen, setSidebarOpen]   = useState(true)
  const [mobileOpen,  setMobileOpen]    = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const location  = useLocation()
  const navigate  = useNavigate()

  // Close mobile drawer on route change
  useEffect(() => { setMobileOpen(false) }, [location.pathname])
  // Close user menu on outside click
  useEffect(() => {
    if (!userMenuOpen) return
    const close = () => setUserMenuOpen(false)
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [userMenuOpen])

  const isActive = (path: string) => location.pathname === path
  const handleLogout = () => { logout(); navigate('/login') }

  // ── Sidebar inner content (shared between desktop & mobile drawer) ──────────
  const SidebarContent = ({ onClose }: { onClose?: () => void }) => (
    <div className="flex flex-col h-full bg-stone-950">
      {/* Logo row */}
      <div className="flex items-center justify-between p-5 border-b border-stone-800 flex-shrink-0">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-forest-600 rounded-xl flex items-center justify-center flex-shrink-0">
            <Leaf className="w-5 h-5 text-white" strokeWidth={2} />
          </div>
          {(sidebarOpen || onClose) && (
            <span className="text-white font-display font-bold text-lg">VC</span>
          )}
        </Link>
        {/* On mobile drawer show X; on desktop show collapse toggle */}
        {onClose ? (
          <button onClick={onClose} className="p-1.5 hover:bg-stone-800 rounded-lg transition text-stone-400">
            <X className="w-5 h-5" />
          </button>
        ) : (
          <button onClick={() => setSidebarOpen(o => !o)} className="p-1.5 hover:bg-stone-800 rounded-lg transition text-stone-400">
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        )}
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
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
            <span className="flex-shrink-0">{item.icon}</span>
            {(sidebarOpen || onClose) && (
              <span className="text-sm font-medium whitespace-nowrap">{item.label}</span>
            )}
          </Link>
        ))}
      </nav>

      {/* User info */}
      {(sidebarOpen || onClose) && (
        <div className="border-t border-stone-800 p-4 flex-shrink-0">
          <p className="text-xs text-stone-400 uppercase tracking-wider font-semibold mb-2">Admin</p>
          <p className="text-sm text-stone-200 font-medium truncate">{user?.name}</p>
          <p className="text-xs text-stone-500 truncate mt-0.5">{user?.email}</p>
        </div>
      )}
    </div>
  )

  return (
    <div className="flex h-screen bg-stone-900 overflow-hidden">

      {/* ── DESKTOP SIDEBAR (hidden on mobile) ──────────────────────────────── */}
      <aside
        className={`hidden lg:flex flex-col flex-shrink-0 border-r border-stone-800 transition-all duration-300 ${
          sidebarOpen ? 'w-64' : 'w-[72px]'
        }`}
      >
        <SidebarContent />
      </aside>

      {/* ── MOBILE OVERLAY DRAWER ────────────────────────────────────────────── */}
      {/* Backdrop */}
      <div
        className={`lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
          mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setMobileOpen(false)}
        aria-hidden="true"
      />
      {/* Drawer panel — slides from left */}
      <aside
        className={`lg:hidden fixed top-0 left-0 h-full w-72 z-50 shadow-2xl transition-transform duration-300 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <SidebarContent onClose={() => setMobileOpen(false)} />
      </aside>

      {/* ── MAIN CONTENT AREA ────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Top Navbar */}
        <nav className="h-14 sm:h-16 bg-stone-900 border-b border-stone-800 flex items-center justify-between px-4 sm:px-6 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {/* Hamburger — mobile only */}
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 text-stone-400 hover:text-white hover:bg-stone-800 rounded-lg transition flex-shrink-0"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-white font-display font-bold text-base sm:text-xl truncate">
              {getPageTitle(location.pathname)}
            </h1>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            {/* Notifications */}
            <button className="relative p-2 text-stone-400 hover:text-white hover:bg-stone-800 rounded-lg transition">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
            </button>
            {/* Settings — hidden on very small screens */}
            <button className="hidden sm:flex p-2 text-stone-400 hover:text-white hover:bg-stone-800 rounded-lg transition">
              <Settings className="w-5 h-5" />
            </button>
            {/* User menu */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(o => !o)}
                className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 text-stone-200 hover:bg-stone-800 rounded-lg transition"
              >
                <div className="w-6 h-6 rounded-full bg-forest-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                  {user?.name?.[0]?.toUpperCase()}
                </div>
                <ChevronDown className={`w-4 h-4 transition-transform hidden sm:block ${userMenuOpen ? 'rotate-180' : ''}`} />
              </button>
              {userMenuOpen && (
                <div className="absolute right-0 top-11 w-48 bg-stone-800 border border-stone-700 rounded-xl shadow-modal py-2 z-50">
                  <div className="px-4 py-2 border-b border-stone-700">
                    <p className="text-sm font-semibold text-white truncate">{user?.name}</p>
                    <p className="text-xs text-stone-400 capitalize">{user?.role}</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-stone-700 transition"
                  >
                    <LogOut className="w-4 h-4" /> Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </nav>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden bg-stone-900 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}

function getPageTitle(pathname: string): string {
  const titles: Record<string, string> = {
    '/admin':            'Dashboard',
    '/admin/products':   'Products',
    '/admin/categories': 'Categories',
    '/admin/sellers':    'Sellers',
    '/admin/orders':     'Orders',
    '/admin/users':      'Users',
  }
  return titles[pathname] || 'Admin Panel'
}
