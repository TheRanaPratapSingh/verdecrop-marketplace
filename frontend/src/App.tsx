// ── App.tsx ───────────────────────────────────────────────────────────────────
import React, { Suspense, lazy, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useAuthStore } from './store'
import { Spinner } from './components/ui'
import { trackPageView } from './lib/analytics'

const HomePage            = lazy(() => import('./pages/Home'))
const ProductsPage        = lazy(() => import('./pages/Products').then(m => ({ default: m.ProductsPage })))
const ProductDetailPage   = lazy(() => import('./pages/Products').then(m => ({ default: m.ProductDetailPage })))
const LoginPage           = lazy(() => import('./pages/Auth').then(m => ({ default: m.LoginPage })))
const RegisterPage        = lazy(() => import('./pages/Auth').then(m => ({ default: m.RegisterPage })))
const CheckoutPage        = lazy(() => import('./pages/Pages').then(m => ({ default: m.CheckoutPage })))
const OrdersPage          = lazy(() => import('./pages/Pages').then(m => ({ default: m.OrdersPage })))
const OrderDetailPage     = lazy(() => import('./pages/Pages').then(m => ({ default: m.OrderDetailPage })))
const WishlistPage        = lazy(() => import('./pages/Wishlist').then(m => ({ default: m.WishlistPage })))
const ProfilePage         = lazy(() => import('./pages/Pages').then(m => ({ default: m.ProfilePage })))
const NotificationsPage   = lazy(() => import('./pages/Pages').then(m => ({ default: m.NotificationsPage })))
const AboutUsPage         = lazy(() => import('./pages/AboutUs').then(m => ({ default: m.AboutUsPage })))
const StaticPage          = lazy(() => import('./pages/StaticPage').then(m => ({ default: m.StaticPage })))
const BlogPage            = lazy(() => import('./pages/Blog').then(m => ({ default: m.BlogPage })))
const CareersPage         = lazy(() => import('./pages/Careers').then(m => ({ default: m.CareersPage })))
const ContactPage         = lazy(() => import('./pages/Contact').then(m => ({ default: m.ContactPage })))
const BecomeSellerPage    = lazy(() => import('./pages/BecomeSeller').then(m => ({ default: m.BecomeSellerPage })))
const FarmerStoriesPage   = lazy(() => import('./pages/FarmerStories').then(m => ({ default: m.FarmerStoriesPage })))
const CertificationsPage  = lazy(() => import('./pages/Certifications').then(m => ({ default: m.CertificationsPage })))
const ShopByFarmsPage     = lazy(() => import('./pages/ShopByFarms').then(m => ({ default: m.ShopByFarmsPage })))
const FarmersPage         = lazy(() => import('./pages/Farmers').then(m => ({ default: m.FarmersPage })))
const SellerOrdersPage     = lazy(() => import('./pages/SellerOrders').then(m => ({ default: m.SellerOrdersPage })))
const SellerOrderDetailPage = lazy(() => import('./pages/SellerOrderDetail').then(m => ({ default: m.SellerOrderDetailPage })))
const AdminDashboard      = lazy(() => import('./pages/admin/Dashboard').then(m => ({ default: m.AdminDashboard })))
const AdminProducts       = lazy(() => import('./pages/admin/Products').then(m => ({ default: m.AdminProducts })))
const AdminCategories     = lazy(() => import('./pages/admin/Categories').then(m => ({ default: m.AdminCategories })))
const AdminSellers        = lazy(() => import('./pages/admin/Sellers').then(m => ({ default: m.AdminSellers })))
const AdminOrders         = lazy(() => import('./pages/admin/Orders').then(m => ({ default: m.AdminOrders })))
const AdminUsers          = lazy(() => import('./pages/admin/Users').then(m => ({ default: m.AdminUsers })))
const AdminFarmers        = lazy(() => import('./pages/admin/Farmers').then(m => ({ default: m.AdminFarmers })))

const Loader: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-cream">
    <div className="text-center">
      <div className="text-5xl mb-4">🌿</div>
      <Spinner size="lg" />
      <p className="text-sm text-gray-400 font-body mt-3">Loading…</p>
    </div>
  </div>
)

const ScrollTop: React.FC = () => {
  const { pathname, search } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
    trackPageView(`${pathname}${search}`)
  }, [pathname, search])
  return null
}

const RequireAuth: React.FC<{ children: React.ReactNode; role?: string }> = ({ children, role }) => {
  const { isAuthenticated, user } = useAuthStore()
  const isHydrated = useAuthStore.persist.hasHydrated()
  const location = useLocation()

  const userRole = (user?.role || '').toString().trim().toLowerCase()
  const requiredRole = (role || '').toString().trim().toLowerCase()

  if (!isHydrated) return <Loader />
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />
  
  if (requiredRole && userRole !== requiredRole) {
    console.warn(`Access denied: user role "${userRole}" does not match required role "${requiredRole}"`)
    return <Navigate to="/" replace />
  }
  
  return <>{children}</>
}

const RequireGuest: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuthStore()
  const isHydrated = useAuthStore.persist.hasHydrated()
  if (!isHydrated) return <Loader />
  return isAuthenticated ? <Navigate to="/" replace /> : <>{children}</>
}

// ── This inner component can safely use useLocation ──────────────────────────
const AppRoutes: React.FC = () => {
  const location = useLocation()

  useEffect(() => {
    trackPageView(location.pathname)
  }, [location.pathname])

  return (
    <>
      <ScrollTop />
      <Suspense fallback={<Loader />}>
        <Routes>
          <Route path="/"                element={<HomePage />} />
          <Route path="/products"        element={<ProductsPage />} />
          <Route path="/products/:slug"  element={<ProductDetailPage />} />
          <Route path="/about-us"        element={<AboutUsPage />} />
          <Route path="/blog"            element={<BlogPage />} />
          <Route path="/careers"         element={<CareersPage />} />
          <Route path="/contact"         element={<ContactPage />} />
          <Route path="/become-a-seller" element={<BecomeSellerPage />} />
          <Route path="/shop-by-farms"   element={<ShopByFarmsPage />} />
          <Route path="/farmers"         element={<FarmersPage />} />
          <Route path="/farmer-stories"  element={<FarmerStoriesPage />} />
          <Route path="/certifications"  element={<CertificationsPage />} />
          <Route path="/login"           element={<RequireGuest><LoginPage /></RequireGuest>} />
          <Route path="/register"        element={<RequireGuest><RegisterPage /></RequireGuest>} />
          <Route path="/checkout"        element={<RequireAuth><CheckoutPage /></RequireAuth>} />
          <Route path="/orders"          element={<RequireAuth><OrdersPage /></RequireAuth>} />
          <Route path="/orders/:id"      element={<RequireAuth><OrderDetailPage /></RequireAuth>} />
          <Route path="/wishlist"        element={<RequireAuth><WishlistPage /></RequireAuth>} />
          <Route path="/seller/orders"   element={<RequireAuth role="farmer"><SellerOrdersPage /></RequireAuth>} />
          <Route path="/seller/orders/:id" element={<RequireAuth role="farmer"><SellerOrderDetailPage /></RequireAuth>} />
          <Route path="/profile"         element={<RequireAuth><ProfilePage /></RequireAuth>} />
          <Route path="/notifications"   element={<RequireAuth><NotificationsPage /></RequireAuth>} />
          <Route path="/admin"           element={<RequireAuth><AdminDashboard /></RequireAuth>} />
          <Route path="/admin/products"  element={<RequireAuth><AdminProducts /></RequireAuth>} />
          <Route path="/admin/categories" element={<RequireAuth><AdminCategories /></RequireAuth>} />
          <Route path="/admin/sellers"   element={<RequireAuth><AdminSellers /></RequireAuth>} />
          <Route path="/admin/orders"    element={<RequireAuth><AdminOrders /></RequireAuth>} />
          <Route path="/admin/users"     element={<RequireAuth><AdminUsers /></RequireAuth>} />
          <Route path="/admin/farmers" element={<RequireAuth><AdminFarmers /></RequireAuth>} />
          <Route path="*"               element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
      <Toaster position="top-right" toastOptions={{
        duration: 3500,
        style: { borderRadius: '14px', fontSize: '14px', fontFamily: '"DM Sans", system-ui, sans-serif' },
        success: { iconTheme: { primary: '#267d39', secondary: '#fff' } }
      }} />
    </>
  )
}

// ── App wraps everything in BrowserRouter ─────────────────────────────────────
const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}

export default App