import React, { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { ShoppingCart, Search, Menu, X, LogOut, Package, Heart, Settings, LayoutDashboard, Bell, ChevronDown, Leaf, ArrowRight } from 'lucide-react'
import { useAuthStore, useCartStore, useNotifStore } from '../../store'
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
  const navigate = useNavigate()
  const location = useLocation()
  const userMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => { if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setUserMenuOpen(false) }
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h)
  }, [])
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 8)
    window.addEventListener('scroll', fn); return () => window.removeEventListener('scroll', fn)
  }, [])
  useEffect(() => { if (isAuthenticated) cartApi.get().then(setCart).catch(() => {}) }, [isAuthenticated])
  useEffect(() => { setMobileOpen(false) }, [location.pathname])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQ.trim()) { navigate(`/products?search=${encodeURIComponent(searchQ.trim())}`); setSearchOpen(false); setSearchQ('') }
  }

  const isAdmin = user?.role?.toString().trim().toLowerCase() === 'admin'
  const isFarmer = user?.role?.toString().trim().toLowerCase() === 'farmer'

  const isNavActive = (to: string) => {
    const [path, query] = to.split('?')
    if (query) return location.pathname === path && location.search === `?${query}`
    return location.pathname === path && !location.search
  }

  const navLinks = isFarmer
    ? [{ to: '/seller/orders', label: 'Seller Dashboard' }]
    : [
        { to: '/products', label: 'Shop' },
        { to: '/products?isOrganic=true', label: 'Organic' },
        { to: '/products?isFeatured=true', label: 'Featured' },
        { to: '/farmers', label: 'Know Your Farmers' },
        { to: '/shop-by-farms', label: 'Shop by Farms' },
        ...(isAdmin ? [{ to: '/admin', label: 'Admin' }] : []),
      ]

  return (
    <>
      <nav className={`fixed top-0 left-0 right-0 z-40 transition-all duration-500 ${scrolled ? 'glass shadow-nav' : 'bg-white/80 backdrop-blur-md border-b border-stone-100'}`}>
        <div className="max-w-7xl mx-auto px-5 sm:px-8 h-[68px] flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2.5 flex-shrink-0 group">
            <div className="w-9 h-9 bg-forest-700 rounded-2xl flex items-center justify-center shadow-sm group-hover:bg-forest-600 transition-colors">
              <Leaf className="w-5 h-5 text-white" strokeWidth={1.8} />
            </div>
            <span className="font-display text-[22px] font-semibold text-stone-900 tracking-tight">Graamo</span>
          </Link>

          <div className="hidden lg:flex items-center gap-1 flex-1">
            {navLinks.map(l => (
              <Link key={l.to} to={l.to} className={`px-4 py-2 text-[13px] font-label font-medium tracking-wide rounded-xl transition-all duration-150 ${isNavActive(l.to) ? 'bg-forest-50 text-forest-700' : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'}`}>{l.label}</Link>
            ))}
          </div>

          <div className="flex items-center gap-1 ml-auto">
            {!isFarmer && (
              <button onClick={() => setSearchOpen(true)} className="p-2.5 text-stone-500 hover:text-stone-800 hover:bg-stone-100 rounded-xl transition-all duration-150">
                <Search className="w-[18px] h-[18px]" strokeWidth={1.8} />
              </button>
            )}

            {isAuthenticated ? (
              <>
                {!isFarmer && (
                  <>
                    <button onClick={openCart} className="relative p-2.5 text-stone-500 hover:text-stone-800 hover:bg-stone-100 rounded-xl transition-all duration-150">
                      <ShoppingCart className="w-[18px] h-[18px]" strokeWidth={1.8} />
                      {itemCount() > 0 && <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-forest-600 text-white text-[10px] font-label font-bold rounded-full flex items-center justify-center">{itemCount() > 9 ? '9+' : itemCount()}</span>}
                    </button>
                    <Link to="/notifications" className="relative p-2.5 text-stone-500 hover:text-stone-800 hover:bg-stone-100 rounded-xl transition-all duration-150">
                      <Bell className="w-[18px] h-[18px]" strokeWidth={1.8} />
                      {unreadCount > 0 && <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">{unreadCount > 9 ? '9+' : unreadCount}</span>}
                    </Link>
                  </>
                )}
                <div className="relative ml-1" ref={userMenuRef}>
                  <button onClick={() => setUserMenuOpen(v => !v)} className="flex items-center gap-2 h-9 pl-1.5 pr-3 rounded-2xl hover:bg-stone-100 transition-all duration-150">
                    <div className="w-7 h-7 rounded-xl bg-forest-100 border-2 border-forest-200 flex items-center justify-center overflow-hidden">
                      {user?.avatarUrl ? <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" /> : <span className="text-[11px] font-label font-bold text-forest-700">{user?.name?.[0]?.toUpperCase()}</span>}
                    </div>
                    <span className="text-[13px] font-label font-medium text-stone-700 hidden sm:block">{user?.name?.split(' ')[0]}</span>
                    <ChevronDown className={`w-3.5 h-3.5 text-stone-400 transition-transform duration-200 ${userMenuOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {userMenuOpen && (
                    <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-3xl shadow-modal border border-stone-100 py-2 animate-scale-in overflow-hidden">
                      <div className="px-4 py-3 border-b border-stone-50">
                        <p className="text-sm font-label font-semibold text-stone-800">{user?.name}</p>
                        <p className="text-xs text-stone-400 mt-0.5 truncate">{user?.email || user?.phone}</p>
                        <p className="text-xs text-amber-700 mt-1.5 font-medium bg-amber-50 px-2 py-1 rounded">Role: {user?.role || 'unknown'}</p>
                      </div>
                      <div className="py-1.5">
                        {(
                          isFarmer
                            ? [{ to: '/seller/orders', icon: LayoutDashboard, label: 'Seller Dashboard' }]
                            : [
                                { to: '/profile', icon: Package, label: 'My Profile' },
                                { to: '/orders', icon: Package, label: 'Orders' },
                                { to: '/wishlist', icon: Heart, label: 'Wishlist' },
                                ...(user?.role?.toLowerCase() === 'admin' ? [{ to: '/admin', icon: Settings, label: 'Admin Panel' }] : []),
                              ]
                        ).map(item => (
                          <Link key={item.to} to={item.to} onClick={() => setUserMenuOpen(false)} className="flex items-center gap-3 mx-2 px-3 py-2.5 text-sm text-stone-600 hover:bg-stone-50 hover:text-forest-700 rounded-2xl transition-all duration-150 font-body">
                            <item.icon className="w-4 h-4 text-stone-400" strokeWidth={1.8} />{item.label}
                          </Link>
                        ))}
                      </div>
                      <div className="border-t border-stone-50 py-1.5">
                        <button onClick={() => { logout(); setUserMenuOpen(false); navigate('/') }} className="flex w-full items-center gap-3 mx-2 px-3 py-2.5 text-sm text-red-500 hover:bg-red-50 rounded-2xl transition-all duration-150 font-body">
                          <LogOut className="w-4 h-4" strokeWidth={1.8} />Sign out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2 ml-2">
                <Link to="/login">
                  <Button variant="ghost" size="sm" className="text-[13px]">Log in</Button>
                </Link>
                <Link to="/register">
                  <Button variant="primary" size="sm" className="text-[13px] px-5 py-2.5">Sign up</Button>
                </Link>
              </div>
            )}
            <button onClick={() => setMobileOpen(v => !v)} className="lg:hidden p-2.5 text-stone-500 hover:bg-stone-100 rounded-xl transition-all duration-150 ml-1">
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" strokeWidth={1.8} />}
            </button>
          </div>
        </div>
        {mobileOpen && (
          <div className="lg:hidden border-t border-stone-100 bg-white/95 backdrop-blur-xl px-5 py-4 space-y-1 animate-fade-in">
            {navLinks.map(l => <Link key={l.to} to={l.to} className="block px-4 py-3 text-sm font-label font-medium text-stone-700 hover:bg-stone-50 hover:text-forest-700 rounded-2xl transition-all">{l.label}</Link>)}
          </div>
        )}
      </nav>

      {searchOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-sm flex items-start justify-center pt-28 px-4" onClick={() => setSearchOpen(false)}>
          <form onSubmit={handleSearch} className="w-full max-w-2xl animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="relative glass rounded-3xl shadow-modal overflow-hidden">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" strokeWidth={1.8} />
              <input autoFocus value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Search organic vegetables, fruits, grains…" className="w-full pl-14 pr-14 py-5 text-lg font-body bg-transparent outline-none text-stone-800 placeholder:text-stone-400" />
              <button type="button" onClick={() => setSearchOpen(false)} className="absolute right-4 top-1/2 -translate-y-1/2 p-2 hover:bg-stone-100 rounded-xl transition-colors"><X className="w-5 h-5 text-stone-400" /></button>
            </div>
          </form>
        </div>
      )}
    </>
  )
}

export const CartDrawer: React.FC = () => {
  const { cart, isOpen, closeCart, setCart } = useCartStore()
  const { isAuthenticated } = useAuthStore()
  const navigate = useNavigate()
  const [removing, setRemoving] = useState<number | null>(null)
  if (!isOpen) return null

  const handleRemove = async (itemId: number) => {
    setRemoving(itemId)
    try { const updated = await cartApi.removeItem(itemId); setCart(updated ?? cart) } finally { setRemoving(null) }
  }

  const delivery = (cart?.subtotal ?? 0) >= 500 ? 0 : 49
  const total = (cart?.subtotal ?? 0) + delivery
  const freeLeft = Math.max(0, 500 - (cart?.subtotal ?? 0))

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-stone-900/30 backdrop-blur-sm" onClick={closeCart} />
      <div className="relative w-full max-w-[400px] bg-cream h-full flex flex-col shadow-modal animate-fade-in">
        <div className="flex items-center justify-between px-6 py-5 border-b border-stone-100">
          <div>
            <h2 className="font-display text-2xl font-semibold text-stone-900">Your Cart</h2>
            {(cart?.itemCount ?? 0) > 0 && <p className="text-xs text-stone-400 font-body mt-0.5">{cart?.itemCount} item{(cart?.itemCount ?? 0) > 1 ? 's' : ''}</p>}
          </div>
          <button onClick={closeCart} className="p-2 hover:bg-stone-100 rounded-xl transition-colors text-stone-400"><X className="w-5 h-5" /></button>
        </div>

        {(cart?.subtotal ?? 0) > 0 && (
          <div className="mx-6 mt-4 p-3.5 bg-forest-50 rounded-2xl border border-forest-100">
            {freeLeft > 0 ? (
              <>
                <p className="text-xs font-label font-medium text-forest-700">Add ₹{freeLeft.toFixed(0)} more for <span className="font-bold">free delivery</span></p>
                <div className="mt-2 h-1.5 bg-forest-100 rounded-full overflow-hidden">
                  <div className="h-full bg-forest-500 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, ((cart?.subtotal ?? 0) / 500) * 100)}%` }} />
                </div>
              </>
            ) : (
              <p className="text-xs font-label font-semibold text-forest-700 text-center">🎉 Free delivery unlocked!</p>
            )}
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
          {!cart?.items?.length ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-16">
              <div className="w-20 h-20 bg-stone-100 rounded-3xl flex items-center justify-center mb-5">
                <ShoppingCart className="w-8 h-8 text-stone-300" strokeWidth={1.5} />
              </div>
              <p className="font-display text-xl text-stone-700">Your cart is empty</p>
              <p className="text-sm text-stone-400 font-body mt-1.5 mb-6">Discover our fresh organic produce</p>
              <Button onClick={() => { closeCart(); navigate('/products') }} variant="primary" size="sm" className="gap-2">Browse Products <ArrowRight className="w-4 h-4" /></Button>
            </div>
          ) : cart.items.map(item => (
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
          ))}
        </div>

        {(cart?.items?.length ?? 0) > 0 && (
          <div className="border-t border-stone-100 px-6 py-5 space-y-4">
            <div className="space-y-2 text-sm font-body">
              <div className="flex justify-between text-stone-500"><span>Subtotal</span><span>₹{cart?.subtotal?.toFixed(0)}</span></div>
              <div className="flex justify-between text-stone-500"><span>Delivery</span><span className={delivery === 0 ? 'text-forest-600 font-semibold' : ''}>{delivery === 0 ? 'Free' : `₹${delivery}`}</span></div>
              <div className="flex justify-between font-label font-bold text-stone-900 text-base pt-2 border-t border-stone-100"><span>Total</span><span>₹{total.toFixed(0)}</span></div>
            </div>
            <Button onClick={() => { closeCart(); navigate(isAuthenticated ? '/checkout' : '/login') }} variant="primary" className="w-full justify-center py-3.5" size="md">
              Checkout · ₹{total.toFixed(0)} <ArrowRight className="w-4 h-4" />
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
    <main className={`pt-[68px] min-h-screen ${className}`}>{children}</main>
    <Footer />
  </>
)