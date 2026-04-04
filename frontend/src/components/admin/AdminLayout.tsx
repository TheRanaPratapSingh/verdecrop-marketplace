import React, { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  Menu, X, LogOut, Bell, Settings, Leaf, ChevronDown,
  LayoutDashboard, Package, Tag, Users, ShoppingCart, UserCheck,
} from 'lucide-react'
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

export const AdminLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuthStore()

  // Mobile: drawer closed by default. Desktop: always open (via CSS, not state).
  const [drawerOpen, setDrawerOpen]   = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  const location  = useLocation()
  const navigate  = useNavigate()

  const isActive = (path: string) => location.pathname === path

  // Close drawer on route change (mobile nav tap)
  useEffect(() => { setDrawerOpen(false) }, [location.pathname])

  // Prevent body scroll when mobile drawer is open
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [drawerOpen])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const SidebarContent = () => (
    <>
      {/* Logo row */}
      <div className="flex items-center justify-between p-5 border-b border-stone-800 flex-shrink-0">
        <Link to="/" className="flex items-center gap-2.5" onClick={() => setDrawerOpen(false)}>
          <div className="w-8 h-8 bg-forest-600 rounded-xl flex items-center justify-center flex-shrink-0">
            <Leaf className="w-5 h-5 text-white" strokeWidth={2} />
          </div>
          <span className="text-white font-display font-bold text-lg">Graamo</span>
        </Link>
        {/* Close button — visible only on mobile */}
        <button
          onClick={() => setDrawerOpen(false)}
          className="md:hidden p-1.5 hover:bg-stone-800 rounded-lg transition text-stone-400"
          aria-label="Close sidebar"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
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
            <span className="text-sm font-medium">{item.label}</span>
          </Link>
        ))}
      </nav>

      {/* User info — bottom */}
      <div className="border-t border-stone-800 p-4 flex-shrink-0">
        <p className="text-xs text-stone-500 uppercase tracking-wider font-semibold mb-2">Admin</p>
        <p className="text-sm text-stone-200 font-medium truncate">{user?.name}</p>
        <p className="text-xs text-stone-500 truncate mt-0.5">{user?.email}</p>
        <button
          onClick={handleLogout}
          className="mt-3 w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-stone-800 rounded-xl transition"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </>
  )

  return (
    <div className="flex h-screen bg-stone-900 overflow-hidden">

      {/* ?? MOBILE OVERLAY ??????????????????????????????????????????????????? */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setDrawerOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ?? SIDEBAR — mobile: fixed drawer, desktop: static ?????????????????? */}
      {/* Desktop static sidebar */}
      <aside className="hidden md:flex w-64 flex-shrink-0 bg-stone-950 border-r border-stone-800 flex-col">
        <SidebarContent />
      </aside>

      {/* Mobile slide-in drawer */}
      <aside
        className={`
          fixed top-0 left-0 h-full w-72 z-50 bg-stone-950 border-r border-stone-800
          flex flex-col md:hidden
          transition-transform duration-300 ease-in-out
          ${drawerOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
        aria-label="Sidebar navigation"
      >
        <SidebarContent />
      </aside>

      {/* ?? MAIN CONTENT ????????????????????????????????????????????????????? */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Top Navbar */}
        <header className="h-14 md:h-16 bg-stone-900 border-b border-stone-800 flex items-center justify-between px-4 md:px-6 flex-shrink-0">
          <div className="flex items-center gap-3">
            {/* Hamburger — mobile only */}
            <button
              onClick={() => setDrawerOpen(true)}
              className="md:hidden p-2 text-stone-400 hover:text-white hover:bg-stone-800 rounded-lg transition"
              aria-label="Open sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-white font-display font-bold text-lg md:text-xl truncate">
              {getPageTitle(location.pathname)}
            </h1>
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            {/* Notifications */}
            <button className="relative p-2 text-stone-400 hover:text-white hover:bg-stone-800 rounded-lg transition">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
            </button>

            {/* Settings — hide on very small screens */}
            <button className="hidden sm:block p-2 text-stone-400 hover:text-white hover:bg-stone-800 rounded-lg transition">
              <Settings className="w-5 h-5" />
            </button>

            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(o => !o)}
                className="flex items-center gap-1.5 px-2 py-1.5 text-stone-200 hover:bg-stone-800 rounded-lg transition"
              >
                <div className="w-7 h-7 rounded-full bg-forest-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                  {user?.name?.[0]?.toUpperCase()}
                </div>
                <ChevronDown className={`w-4 h-4 transition-transform hidden sm:block ${userMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {userMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                  <div className="absolute right-0 top-11 w-48 bg-stone-800 border border-stone-700 rounded-xl shadow-xl py-2 z-50">
                    <div className="px-4 py-2 border-b border-stone-700">
                      <p className="text-sm font-semibold text-white truncate">{user?.name}</p>
                      <p className="text-xs text-stone-400 capitalize">{user?.role}</p>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-stone-700 transition"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto bg-stone-900 p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
