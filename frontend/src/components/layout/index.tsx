import React, { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { ShoppingCart, Search, Menu, X, LogOut, Package, Heart, Settings, LayoutDashboard, Bell, ChevronDown, Leaf, ArrowRight, User, Sprout, Plus } from 'lucide-react'
import { useAuthStore, useCartStore, useNotifStore, useGuestCartStore } from '../../store'
import { cartApi } from '../../services/api'
import { Spinner, Button } from '../ui'
import { resolveAssetUrl } from '../../lib/image'

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuthStore()
  const { cart, setCart, openCart, itemCount } = useCartStore()
  const { unreadCount } = useNotifStore()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQ, setSearchQ] = useState('')
  const [scrolled, setScrolled] = useState(false)
  const [cartBump, setCartBump] = useState(false)
  const prevItemCount = useRef(0)
  const navigate = useNavigate()
  const location = useLocation()
  const userMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => { if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setUserMenuOpen(false) }
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h)
  }, [])

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 12)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  useEffect(() => { if (isAuthenticated) cartApi.get().then(setCart).catch(() => {}) }, [isAuthenticated])
  useEffect(() => { setMobileOpen(false); setUserMenuOpen(false) }, [location.pathname])

  // Cart badge bump animation when item is added (authenticated only)
  useEffect(() => {
    const count = itemCount()
    if (count > prevItemCount.current) {
      setCartBump(true)
      setTimeout(() => setCartBump(false), 400)
    }
    prevItemCount.current = count
  }, [itemCount()])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQ.trim()) { navigate(`/products?search=${encodeURIComponent(searchQ.trim())}`); setSearchOpen(false); setSearchQ('') }
  }

  const isAdmin = user?.role?.toString().trim().toLowerCase() === 'admin'
  const isFarmer = user?.role?.toString().trim().toLowerCase() === 'farmer'

  const navLinks = isFarmer
    ? [
        { to: '/seller/products', label: 'My Products' },
        { to: '/seller/orders', label: 'Orders' },
      ]
    : [
        { to: '/products', label: 'Shop' },
        { to: '/products?isOrganic=true', label: 'Organic' },
        { to: '/products?isFeatured=true', label: 'Featured' },
        { to: '/shop-by-farms', label: 'Shop by Farms' },
      ]

  const isActive = (to: string) => {
    if (to.includes('?')) return location.pathname + location.search === to || location.search === to.slice(to.indexOf('?'))
    return location.pathname === to || (to !== '/' && location.pathname.startsWith(to))
  }

  return (
    <>
      {/* ── Main navbar ── */}
      <nav
        className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
          scrolled
            ? 'bg-white/90 backdrop-blur-xl border-b border-stone-200/60 shadow-[0_2px_20px_rgba(0,0,0,0.08)]'
            : 'bg-white/80 backdrop-blur-md border-b border-stone-100'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-[70px] flex items-center gap-4">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 flex-shrink-0 group mr-2">
            <div className="relative w-9 h-9 bg-forest-700 rounded-[14px] flex items-center justify-center shadow-[0_2px_8px_rgba(30,110,36,0.35)] group-hover:bg-forest-600 group-hover:shadow-[0_4px_16px_rgba(30,110,36,0.45)] group-hover:scale-105 transition-all duration-200">
              <Leaf className="w-[18px] h-[18px] text-white" strokeWidth={2} />
            </div>
            <span className="font-display text-[23px] font-semibold text-stone-900 tracking-tight group-hover:text-forest-700 transition-colors duration-200">Graamo</span>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden lg:flex items-center gap-0.5 flex-1">
            {navLinks.map(l => (
              <Link
                key={l.to}
                to={l.to}
                className={`relative px-4 py-2 text-[13px] font-label font-semibold tracking-wide rounded-xl transition-all duration-200 group/link ${
                  isActive(l.to)
                    ? 'text-forest-700'
                    : 'text-stone-500 hover:text-stone-900'
                }`}
              >
                {l.label}
                {/* animated underline */}
                <span
                  className={`absolute bottom-0.5 left-4 right-4 h-[2px] rounded-full bg-forest-600 transition-all duration-250 ${
                    isActive(l.to) ? 'opacity-100 scale-x-100' : 'opacity-0 scale-x-0 group-hover/link:opacity-60 group-hover/link:scale-x-100'
                  }`}
                  style={{ transformOrigin: 'left' }}
                />
              </Link>
            ))}

            {/* Admin pill — separate visual identity */}
            {isAdmin && (
              <Link
                to="/admin"
                className={`ml-2 flex items-center gap-1.5 px-3.5 py-1.5 text-[12px] font-label font-bold tracking-wide rounded-full border transition-all duration-200 ${
                  location.pathname.startsWith('/admin')
                    ? 'bg-amber-500 border-amber-500 text-white shadow-[0_2px_8px_rgba(245,158,11,0.4)]'
                    : 'border-amber-300 text-amber-700 bg-amber-50 hover:bg-amber-100 hover:border-amber-400'
                }`}
              >
                <Settings className="w-3 h-3" strokeWidth={2.2} />
                Admin
              </Link>
            )}
          </div>

          {/* Right action cluster */}
          <div className="flex items-center gap-1 ml-auto">

            {/* CTA buttons — unauthenticated, desktop only */}
            {!isAuthenticated && (
              <div className="hidden lg:flex items-center gap-2 mr-1">
                <Link to="/shop-by-farms" className="flex items-center gap-1.5 px-4 py-2 text-[13px] font-label font-semibold text-forest-700 border border-forest-300 rounded-xl hover:bg-forest-50 hover:border-forest-400 transition-all duration-200">
                  <Sprout className="w-3.5 h-3.5" strokeWidth={2} />
                  Meet Farmers
                </Link>
                <Link to="/products" className="flex items-center gap-1.5 px-4 py-2 text-[13px] font-label font-semibold text-white bg-forest-700 rounded-xl shadow-btn hover:bg-forest-600 hover:shadow-btn-hover hover:scale-[1.03] active:scale-[0.97] transition-all duration-200">
                  Shop
                  <ArrowRight className="w-3.5 h-3.5" strokeWidth={2.5} />
                </Link>
              </div>
            )}

            {/* Seller Add Product CTA — desktop only */}
            {isFarmer && (
              <Link
                to="/seller/products/new"
                className="hidden lg:flex items-center gap-1.5 px-4 py-2 text-[13px] font-label font-semibold text-white bg-forest-700 rounded-xl shadow-sm hover:bg-forest-600 hover:scale-[1.02] active:scale-[0.97] transition-all duration-200"
              >
                <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
                Add Product
              </Link>
            )}

            {/* Search */}
            {!isFarmer && (
              <button
                onClick={() => setSearchOpen(true)}
                className="p-2.5 text-stone-400 hover:text-forest-700 hover:bg-forest-50 rounded-xl transition-all duration-150 hover:scale-110"
                aria-label="Search"
              >
                <Search className="w-[18px] h-[18px]" strokeWidth={2} />
              </button>
            )}

            {/* Cart — always visible for non-farmer users */}
            {!isFarmer && (
              <button
                onClick={isAuthenticated ? openCart : () => navigate('/login')}
                className="relative p-2.5 text-stone-400 hover:text-forest-700 hover:bg-forest-50 rounded-xl transition-all duration-150 hover:scale-110"
                aria-label="Cart"
              >
                <ShoppingCart className="w-[18px] h-[18px]" strokeWidth={2} />
                {isAuthenticated && itemCount() > 0 && (
                  <span
                    className={`absolute -top-0.5 -right-0.5 min-w-[20px] h-5 bg-forest-600 text-white text-[10px] font-label font-bold rounded-full flex items-center justify-center px-1 transition-transform duration-200 ${
                      cartBump ? 'scale-125' : 'scale-100'
                    }`}
                  >
                    {itemCount() > 9 ? '9+' : itemCount()}
                  </span>
                )}
              </button>
            )}

            {isAuthenticated ? (
              <>
                {!isFarmer && (
                  <>
                    {/* Notifications */}
                    <Link
                      to="/notifications"
                      className="relative p-2.5 text-stone-400 hover:text-forest-700 hover:bg-forest-50 rounded-xl transition-all duration-150 hover:scale-110"
                      aria-label="Notifications"
                    >
                      <Bell className="w-[18px] h-[18px]" strokeWidth={2} />
                      {unreadCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                      )}
                    </Link>
                  </>
                )}

                {/* User menu */}
                <div className="relative ml-1" ref={userMenuRef}>
                  <button
                    onClick={() => setUserMenuOpen(v => !v)}
                    className={`flex items-center gap-2 h-9 pl-1 pr-2.5 rounded-2xl border transition-all duration-200 ${
                      userMenuOpen
                        ? 'bg-forest-50 border-forest-200'
                        : 'border-transparent hover:bg-stone-100 hover:border-stone-200'
                    }`}
                  >
                    {/* Avatar */}
                    <div className="w-7 h-7 rounded-xl bg-forest-100 border-2 border-forest-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {user?.avatarUrl
                        ? <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                        : <span className="text-[11px] font-label font-bold text-forest-700">{user?.name?.[0]?.toUpperCase()}</span>}
                    </div>
                    <span className="text-[13px] font-label font-semibold text-stone-700 hidden sm:block max-w-[80px] truncate">
                      {user?.name?.split(' ')[0]}
                    </span>
                    <ChevronDown className={`w-3.5 h-3.5 text-stone-400 transition-transform duration-200 flex-shrink-0 ${userMenuOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Dropdown */}
                  {userMenuOpen && (
                    <div className="absolute right-0 top-full mt-2.5 w-60 bg-white rounded-2xl shadow-modal border border-stone-100/80 py-1.5 animate-scale-in overflow-hidden">
                      {/* User info header */}
                      <div className="px-4 py-3.5 border-b border-stone-50">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-forest-100 border-2 border-forest-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                            {user?.avatarUrl
                              ? <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                              : <span className="text-sm font-label font-bold text-forest-700">{user?.name?.[0]?.toUpperCase()}</span>}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-label font-bold text-stone-900 truncate">{user?.name}</p>
                            <p className="text-[11px] text-stone-400 font-body truncate">{user?.email || user?.phone}</p>
                          </div>
                        </div>
                        <div className={`mt-2.5 px-2.5 py-1 rounded-lg text-[11px] font-label font-semibold text-center ${
                          isAdmin ? 'bg-amber-50 text-amber-700' : isFarmer ? 'bg-forest-50 text-forest-700' : 'bg-stone-50 text-stone-500'
                        }`}>
                          {isAdmin ? '⚡ Admin' : isFarmer ? '🌾 Farmer' : '👤 Customer'}
                        </div>
                      </div>

                      {/* Menu items */}
                      <div className="py-1">
                        {(
                          isFarmer
                            ? [
                                { to: '/seller/products', icon: LayoutDashboard, label: 'My Products' },
                                { to: '/seller/orders', icon: Package, label: 'Seller Orders' },
                              ]
                            : [
                                { to: '/profile', icon: User, label: 'My Profile' },
                                { to: '/orders', icon: Package, label: 'My Orders' },
                                { to: '/wishlist', icon: Heart, label: 'Wishlist' },
                                ...(isAdmin ? [{ to: '/admin', icon: Settings, label: 'Admin Panel' }] : []),
                              ]
                        ).map(item => (
                          <Link
                            key={item.to}
                            to={item.to}
                            onClick={() => setUserMenuOpen(false)}
                            className={`flex items-center gap-3 mx-1.5 px-3 py-2.5 text-[13px] font-body rounded-xl transition-all duration-150 group/item ${
                              location.pathname === item.to
                                ? 'bg-forest-50 text-forest-700'
                                : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'
                            }`}
                          >
                            <item.icon className="w-4 h-4 text-stone-350 group-hover/item:text-forest-600 transition-colors" strokeWidth={1.8} />
                            {item.label}
                          </Link>
                        ))}
                      </div>

                      {/* Logout */}
                      <div className="border-t border-stone-50 pt-1 pb-1">
                        <button
                          onClick={() => { logout(); setUserMenuOpen(false); navigate('/') }}
                          className="flex w-full items-center gap-3 mx-1.5 px-3 py-2.5 text-[13px] text-red-500 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all duration-150 font-body"
                          style={{ width: 'calc(100% - 12px)' }}
                        >
                          <LogOut className="w-4 h-4" strokeWidth={1.8} />
                          Sign out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2 ml-1">
                <Link to="/login">
                  <Button variant="ghost" size="sm" className="text-[13px] font-label font-semibold">Log in</Button>
                </Link>
                <Link to="/register" className="hidden sm:block">
                  <Button variant="primary" size="sm" className="text-[13px] px-5">Sign up</Button>
                </Link>
              </div>
            )}

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(v => !v)}
              className="lg:hidden p-2.5 text-stone-500 hover:bg-stone-100 rounded-xl transition-all duration-150 ml-1"
              aria-label="Toggle menu"
            >
              {mobileOpen
                ? <X className="w-5 h-5" />
                : <Menu className="w-5 h-5" strokeWidth={2} />}
            </button>
          </div>
        </div>
      </nav>

      {/* ── Mobile slide-in drawer ── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* backdrop */}
          <div
            className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm animate-fade-in"
            onClick={() => setMobileOpen(false)}
          />
          {/* drawer */}
          <div className="absolute top-0 left-0 bottom-0 w-[300px] bg-white shadow-[4px_0_40px_rgba(0,0,0,0.15)] flex flex-col animate-slide-right">
            {/* Drawer header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
              <Link to="/" onClick={() => setMobileOpen(false)} className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-forest-700 rounded-[12px] flex items-center justify-center">
                  <Leaf className="w-4 h-4 text-white" strokeWidth={2} />
                </div>
                <span className="font-display text-xl font-semibold text-stone-900">Graamo</span>
              </Link>
              <button onClick={() => setMobileOpen(false)} className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-xl transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* User info in drawer */}
            {isAuthenticated && (
              <div className="px-5 py-4 border-b border-stone-100 bg-stone-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-forest-100 border-2 border-forest-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {user?.avatarUrl
                      ? <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                      : <span className="text-sm font-label font-bold text-forest-700">{user?.name?.[0]?.toUpperCase()}</span>}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-label font-bold text-stone-900 truncate">{user?.name}</p>
                    <p className="text-[11px] text-stone-400 font-body truncate">{user?.email || user?.phone}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Nav links */}
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
              {navLinks.map(l => (
                <Link
                  key={l.to}
                  to={l.to}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-[14px] font-label font-semibold transition-all duration-150 ${
                    isActive(l.to)
                      ? 'bg-forest-50 text-forest-700 border-l-2 border-forest-600'
                      : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'
                  }`}
                >
                  {l.label}
                </Link>
              ))}

              {isAdmin && (
                <Link
                  to="/admin"
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-[14px] font-label font-semibold transition-all duration-150 mt-1 ${
                    location.pathname.startsWith('/admin')
                      ? 'bg-amber-50 text-amber-700 border-l-2 border-amber-500'
                      : 'text-amber-600 hover:bg-amber-50'
                  }`}
                >
                  <Settings className="w-4 h-4" strokeWidth={2} />
                  Admin Panel
                </Link>
              )}

              {!isAuthenticated && (
                <div className="pt-4 space-y-2">
                  <Link to="/shop-by-farms" onClick={() => setMobileOpen(false)} className="flex items-center justify-center gap-2 w-full px-4 py-3 text-[13px] font-label font-bold text-forest-700 border-2 border-forest-300 rounded-xl hover:bg-forest-50 transition-all">
                    <Sprout className="w-4 h-4" strokeWidth={2} /> Meet Farmers
                  </Link>
                  <Link to="/products" onClick={() => setMobileOpen(false)} className="flex items-center justify-center gap-2 w-full px-4 py-3 text-[13px] font-label font-bold text-white bg-forest-700 rounded-xl shadow-btn hover:bg-forest-600 transition-all">
                    Shop Now <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
                  </Link>
                </div>
              )}
            </div>

            {/* Drawer footer — auth actions */}
            {isAuthenticated ? (
              <div className="border-t border-stone-100 px-3 py-3 space-y-0.5">
                {isFarmer
                  ? <>
                      <Link to="/seller/products" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 px-4 py-3 text-[13px] font-body text-stone-600 hover:bg-stone-50 rounded-xl transition-all"><LayoutDashboard className="w-4 h-4 text-stone-400" strokeWidth={1.8} /> My Products</Link>
                      <Link to="/seller/orders" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 px-4 py-3 text-[13px] font-body text-stone-600 hover:bg-stone-50 rounded-xl transition-all"><Package className="w-4 h-4 text-stone-400" strokeWidth={1.8} /> Seller Orders</Link>
                    </>
                  : <>
                    <Link to="/profile" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 px-4 py-3 text-[13px] font-body text-stone-600 hover:bg-stone-50 rounded-xl transition-all"><User className="w-4 h-4 text-stone-400" strokeWidth={1.8} /> My Profile</Link>
                    <Link to="/orders" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 px-4 py-3 text-[13px] font-body text-stone-600 hover:bg-stone-50 rounded-xl transition-all"><Package className="w-4 h-4 text-stone-400" strokeWidth={1.8} /> My Orders</Link>
                    <Link to="/wishlist" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 px-4 py-3 text-[13px] font-body text-stone-600 hover:bg-stone-50 rounded-xl transition-all"><Heart className="w-4 h-4 text-stone-400" strokeWidth={1.8} /> Wishlist</Link>
                  </>
                }
                <button
                  onClick={() => { logout(); setMobileOpen(false); navigate('/') }}
                  className="flex w-full items-center gap-3 px-4 py-3 text-[13px] text-red-500 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all font-body"
                >
                  <LogOut className="w-4 h-4" strokeWidth={1.8} /> Sign out
                </button>
              </div>
            ) : (
              <div className="border-t border-stone-100 px-4 py-3 flex gap-2">
                <Link to="/login" onClick={() => setMobileOpen(false)} className="flex-1 text-center px-4 py-2.5 text-[13px] font-label font-semibold text-stone-700 border border-stone-200 rounded-xl hover:bg-stone-50 transition-all">Log in</Link>
                <Link to="/register" onClick={() => setMobileOpen(false)} className="flex-1 text-center px-4 py-2.5 text-[13px] font-label font-semibold text-white bg-forest-700 rounded-xl hover:bg-forest-600 transition-all">Sign up</Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Search overlay ── */}
      {searchOpen && (
        <div
          className="fixed inset-0 z-50 bg-stone-900/50 backdrop-blur-sm flex items-start justify-center pt-28 px-4"
          onClick={() => setSearchOpen(false)}
        >
          <form onSubmit={handleSearch} className="w-full max-w-2xl animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="relative glass rounded-2xl shadow-modal overflow-hidden border border-white/80">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-forest-500" strokeWidth={2} />
              <input
                autoFocus
                value={searchQ}
                onChange={e => setSearchQ(e.target.value)}
                placeholder="Search organic vegetables, fruits, grains…"
                className="w-full pl-14 pr-14 py-5 text-lg font-body bg-transparent outline-none text-stone-800 placeholder:text-stone-400"
              />
              <button type="button" onClick={() => setSearchOpen(false)} className="absolute right-4 top-1/2 -translate-y-1/2 p-2 hover:bg-stone-100 rounded-xl transition-colors">
                <X className="w-5 h-5 text-stone-400" />
              </button>
            </div>
            <p className="text-center text-[12px] text-white/60 mt-3 font-body">Press Enter to search · Esc to close</p>
          </form>
        </div>
      )}
    </>
  )
}

export const CartDrawer: React.FC = () => {
  const { cart, isOpen, closeCart, setCart } = useCartStore()
  const { isAuthenticated } = useAuthStore()
  const { items: guestItems, removeItem: removeGuestItem } = useGuestCartStore()
  const navigate = useNavigate()
  const [removing, setRemoving] = useState<number | null>(null)

  if (!isOpen) return null

  // ── Authenticated: use server cart ────────────────────────────────────────
  const handleRemove = async (itemId: number) => {
    if (!cart) return
    const optimistic: typeof cart = {
      ...cart,
      items: cart.items.filter(i => i.id !== itemId),
      subtotal: cart.items.filter(i => i.id !== itemId).reduce((s, i) => s + i.total, 0),
      itemCount: cart.items.filter(i => i.id !== itemId).length,
    }
    setCart(optimistic)
    setRemoving(itemId)
    try {
      const updated = await cartApi.removeItem(itemId)
      if (updated && typeof updated === 'object' && 'items' in updated) {
        setCart(updated)
      }
    } catch {
      setCart(cart)
    } finally {
      setRemoving(null)
    }
  }

  // ── Guest: compute totals from local store ────────────────────────────────
  const guestSubtotal = guestItems.reduce((sum, i) => sum + i.price * i.quantity, 0)

  const subtotal = isAuthenticated ? (cart?.subtotal ?? 0) : guestSubtotal
  const delivery = subtotal >= 500 ? 0 : 49
  const total = subtotal + delivery
  const freeLeft = Math.max(0, 500 - subtotal)
  const hasItems = isAuthenticated ? (cart?.items?.length ?? 0) > 0 : guestItems.length > 0
  const itemCountDisplay = isAuthenticated ? (cart?.itemCount ?? 0) : guestItems.reduce((s, i) => s + i.quantity, 0)

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-stone-900/30 backdrop-blur-sm" onClick={closeCart} />
      <div className="relative w-full max-w-[400px] bg-cream h-full flex flex-col shadow-modal animate-fade-in">
        <div className="flex items-center justify-between px-6 py-5 border-b border-stone-100">
          <div>
            <h2 className="font-display text-2xl font-semibold text-stone-900">Your Cart</h2>
            {itemCountDisplay > 0 && <p className="text-xs text-stone-400 font-body mt-0.5">{itemCountDisplay} item{itemCountDisplay > 1 ? 's' : ''}</p>}
          </div>
          <button onClick={closeCart} className="p-2 hover:bg-stone-100 rounded-xl transition-colors text-stone-400"><X className="w-5 h-5" /></button>
        </div>

        {subtotal > 0 && (
          <div className="mx-6 mt-4 p-3.5 bg-forest-50 rounded-2xl border border-forest-100">
            {freeLeft > 0 ? (
              <>
                <p className="text-xs font-label font-medium text-forest-700">Add ₹{freeLeft.toFixed(0)} more for <span className="font-bold">free delivery</span></p>
                <div className="mt-2 h-1.5 bg-forest-100 rounded-full overflow-hidden">
                  <div className="h-full bg-forest-500 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, (subtotal / 500) * 100)}%` }} />
                </div>
              </>
            ) : (
              <p className="text-xs font-label font-semibold text-forest-700 text-center">🎉 Free delivery unlocked!</p>
            )}
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
          {!hasItems ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-16">
              <div className="w-20 h-20 bg-stone-100 rounded-3xl flex items-center justify-center mb-5">
                <ShoppingCart className="w-8 h-8 text-stone-300" strokeWidth={1.5} />
              </div>
              <p className="font-display text-xl text-stone-700">Your cart is empty</p>
              <p className="text-sm text-stone-400 font-body mt-1.5 mb-6">Discover our fresh organic produce</p>
              <Button onClick={() => { closeCart(); navigate('/products') }} variant="primary" size="sm" className="gap-2">Browse Products <ArrowRight className="w-4 h-4" /></Button>
            </div>
          ) : isAuthenticated ? (
            // ── Authenticated cart items ──────────────────────────────────
            cart!.items.map(item => (
              <div key={item.id} className="flex gap-3.5 p-3 rounded-2xl hover:bg-white transition-colors group">
                <div className="w-16 h-16 rounded-2xl bg-stone-100 overflow-hidden flex-shrink-0">
                  {item.imageUrl ? <img src={resolveAssetUrl(item.imageUrl)} alt={item.productName} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-2xl">🌿</div>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-label font-semibold text-stone-800 truncate">{item.productName}</p>
                  <p className="text-xs text-stone-400 font-body mt-0.5">{item.quantity} {item.unit}</p>
                  <p className="text-[15px] font-display font-semibold text-forest-700 mt-1">₹{item.total.toFixed(0)}</p>
                </div>
                <button onClick={() => handleRemove(item.id)} className="opacity-0 group-hover:opacity-100 p-1.5 text-stone-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition-all flex-shrink-0 self-start mt-0.5">
                  {removing === item.id ? <Spinner size="sm" /> : <X className="w-3.5 h-3.5" />}
                </button>
              </div>
            ))
          ) : (
            // ── Guest cart items ──────────────────────────────────────────
            guestItems.map(item => (
              <div key={item.productId} className="flex gap-3.5 p-3 rounded-2xl hover:bg-white transition-colors group">
                <div className="w-16 h-16 rounded-2xl bg-stone-100 overflow-hidden flex-shrink-0">
                  {item.imageUrl ? <img src={resolveAssetUrl(item.imageUrl)} alt={item.productName} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-2xl">🌿</div>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-label font-semibold text-stone-800 truncate">{item.productName}</p>
                  <p className="text-xs text-stone-400 font-body mt-0.5">{item.quantity} {item.unit}</p>
                  <p className="text-[15px] font-display font-semibold text-forest-700 mt-1">₹{(item.price * item.quantity).toFixed(0)}</p>
                </div>
                <button onClick={() => removeGuestItem(item.productId)} className="opacity-0 group-hover:opacity-100 p-1.5 text-stone-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition-all flex-shrink-0 self-start mt-0.5">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>

        {hasItems && (
          <div className="border-t border-stone-100 px-6 py-5 space-y-4">
            <div className="space-y-2 text-sm font-body">
              <div className="flex justify-between text-stone-500"><span>Subtotal</span><span>₹{subtotal.toFixed(0)}</span></div>
              <div className="flex justify-between text-stone-500"><span>Delivery</span><span className={delivery === 0 ? 'text-forest-600 font-semibold' : ''}>{delivery === 0 ? 'Free' : `₹${delivery}`}</span></div>
              <div className="flex justify-between font-label font-bold text-stone-900 text-base pt-2 border-t border-stone-100"><span>Total</span><span>₹{total.toFixed(0)}</span></div>
            </div>
            {!isAuthenticated && (
              <p className="text-xs text-stone-400 font-body text-center">Log in to complete your order</p>
            )}
            <Button onClick={() => { closeCart(); navigate(isAuthenticated ? '/checkout' : '/login') }} variant="primary" className="w-full justify-center py-3.5" size="md">
              {isAuthenticated ? `Checkout · ₹${total.toFixed(0)}` : 'Log in to Checkout'} <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

export const Footer: React.FC = () => (
  <footer className="bg-stone-950 text-stone-400 mt-24 relative overflow-hidden">
    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-forest-600/40 to-transparent" />
    <div className="max-w-7xl mx-auto px-8 pt-16 pb-10">
      <div className="grid grid-cols-2 md:grid-cols-6 gap-10 mb-14">
        <div className="col-span-2">
          <Link to="/" className="flex items-center gap-3 mb-4 w-fit">
            <div className="w-10 h-10 bg-forest-700 rounded-2xl flex items-center justify-center"><Leaf className="w-5 h-5 text-white" strokeWidth={1.8} /></div>
            <span className="font-display text-2xl font-semibold text-white">Graamo</span>
          </Link>
          <p className="text-sm font-body leading-relaxed text-stone-400 max-w-xs">Connecting certified organic farmers with conscious families across India. No middlemen, maximum freshness.</p>
          <div className="flex gap-2 mt-6">
            {['T', 'I', 'F'].map(s => (
              <div key={s} className="w-9 h-9 bg-stone-800 hover:bg-forest-700 rounded-xl flex items-center justify-center transition-colors cursor-pointer" title={s}>
                <span className="text-[11px] font-label font-semibold text-stone-300">{s}</span>
              </div>
            ))}
          </div>

          <div className="mt-8 bg-stone-900 border border-stone-800 p-4 rounded-2xl">
            <p className="text-sm text-stone-300 font-body mb-3">Subscribe for offers & updates</p>
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="Enter your email"
                className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-sm text-white placeholder-stone-500 focus:border-forest-500 outline-none"
              />
              <button className="px-4 py-2 bg-forest-600 hover:bg-forest-500 text-white rounded-xl text-sm font-semibold transition">Subscribe</button>
            </div>
          </div>
        </div>
        {[
          { title: 'Shop', links: ['Vegetables', 'Fruits', 'Grains & Pulses', 'Herbs & Spices'] },
          { title: 'Farmers', links: ['Become a Seller', 'Farmer Stories', 'Certifications'] },
          { title: 'Company', links: ['About Us', 'Blog', 'Careers', 'Contact'] },
        ].map(col => (
          <div key={col.title}>
            <h4 className="text-xs font-label font-semibold tracking-wide text-amber-300 uppercase mb-4">{col.title}</h4>
            <ul className="space-y-3">
              {col.links.map(link => (
                <li key={link}>
                  <Link
                    to={
                      col.title === 'Shop'
                        ? `/products?categorySlug=${link.replace(/\s+/g, '-').toLowerCase()}`
                        : link === 'About Us'
                          ? '/about-us'
                          : `/${link.replace(/\s+/g, '-').toLowerCase()}`
                    }
                    className="text-sm font-body text-stone-300 hover:text-white transition-colors duration-200 flex items-center gap-2"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                    {link}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-stone-800 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-xs font-body text-stone-500">© 2024 Graamo. All rights reserved.</p>
        <div className="flex items-center gap-4">
          {['Privacy', 'Terms', 'Cookies'].map(l => (
            <Link
              key={l}
              to={`/${l.toLowerCase()}`}
              className="text-xs font-body text-stone-400 hover:text-amber-300 transition-colors duration-200"
            >
              {l}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-3">
          {['facebook.com', 'instagram.com', 'twitter.com'].map((href, idx) => (
            <a
              key={href}
              href={`https://${href}`}
              target="_blank"
              rel="noreferrer"
              className="text-stone-400 hover:text-amber-300 text-base"
              aria-label={href.replace('.com', '')}
            >
              <span className="w-7 h-7 grid place-items-center rounded-full bg-stone-800 hover:bg-forest-700 transition">{['f', 'i', 't'][idx]}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  </footer>
)

export const PageLayout: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <>
    <Navbar /><CartDrawer />
    <main className={`pt-[70px] min-h-screen ${className}`}>{children}</main>
    <Footer />
  </>
)