import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios'
import type {
  AuthResponse, User, Category, Farmer, Product, Cart,
  Address, Order, Review, Notification, PagedResult,
  ApiResponse, DashboardStats, WishlistItem, SellerProduct, SellerProductDetail,
  Subscription, ReferralCode, ReferralEntry, WalletSummary
} from '../types'
import { useAuthStore } from '../store'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

// ── Request interceptor: attach JWT ──────────────────────────────────────────
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('accessToken')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// ── Response interceptor: auto refresh ──────────────────────────────────────
let isRefreshing = false
let failedQueue: Array<{ resolve: (t: string) => void; reject: (e: unknown) => void }> = []

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach(p => error ? p.reject(error) : p.resolve(token!))
  failedQueue = []
}

api.interceptors.response.use(
  res => res,
  async err => {
    const original = err.config
    if (err.response?.status === 401 && !original._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then(token => {
          original.headers.Authorization = `Bearer ${token}`
          return api(original)
        })
      }
      original._retry = true
      isRefreshing = true
      const refreshToken = localStorage.getItem('refreshToken')
      if (!refreshToken) {
        localStorage.clear()
        window.location.href = '/login'
        return Promise.reject(err)
      }
      try {
        const res = await axios.post(`${BASE_URL}/auth/refresh`, { token: refreshToken })
        const { accessToken, refreshToken: newRefresh, user } = res.data.data
        localStorage.setItem('accessToken', accessToken)
        localStorage.setItem('refreshToken', newRefresh)
        api.defaults.headers.common.Authorization = `Bearer ${accessToken}`
        if (user) {
          useAuthStore.getState().setUser(user)
        }
        processQueue(null, accessToken)
        return api(original)
      } catch (refreshErr) {
        processQueue(refreshErr, null)
        localStorage.clear()
        window.location.href = '/login'
        return Promise.reject(refreshErr)
      } finally {
        isRefreshing = false
      }
    }
    return Promise.reject(err)
  }
)

const unwrap = <T>(promise: Promise<{ data: ApiResponse<T> }>) =>
  promise.then(r => r.data.data as T)

// ── Auth ─────────────────────────────────────────────────────────────────────
export const authApi = {
  sendOtp: (identifier: string, purpose = 'login') =>
    unwrap<boolean>(api.post('/auth/send-otp', { identifier, purpose })),
  verifyOtp: (identifier: string, code: string, name?: string, email?: string, phone?: string) =>
    unwrap<AuthResponse>(api.post('/auth/verify-otp', { identifier, code, name, email, phone })),
  refresh: (token: string) =>
    unwrap<AuthResponse>(api.post('/auth/refresh', { token })),
  logout: (refreshToken: string) =>
    unwrap<boolean>(api.post('/auth/logout', { refreshToken })),
}

// ── User ─────────────────────────────────────────────────────────────────────
export const userApi = {
  getMe: () => unwrap<User>(api.get('/users/me')),
  updateProfile: (data: { name: string; email?: string; phone?: string }) =>
    unwrap<User>(api.put('/users/me', data)),
  uploadAvatar: (form: FormData) =>
    unwrap<{ url: string }>(api.post('/users/me/avatar', form, { headers: { 'Content-Type': 'multipart/form-data' } })),
  updateFcmToken: (token: string) =>
    unwrap<boolean>(api.put('/users/me/fcm-token', { token })),
  getAddresses: () => unwrap<Address[]>(api.get('/users/me/addresses')),
  createAddress: (data: Omit<Address, 'id'>) => unwrap<Address>(api.post('/users/me/addresses', data)),
  updateAddress: (id: number, data: Omit<Address, 'id'>) => unwrap<Address>(api.put(`/users/me/addresses/${id}`, data)),
  deleteAddress: (id: number) => unwrap<boolean>(api.delete(`/users/me/addresses/${id}`)),
  setDefaultAddress: (id: number) => unwrap<boolean>(api.put(`/users/me/addresses/${id}/default`, {})),
  getAll: (params?: { page?: number; pageSize?: number; search?: string }) =>
    unwrap<PagedResult<User>>(api.get('/users', { params })),
  setActive: (id: number, isActive: boolean) =>
    unwrap<boolean>(api.put(`/users/${id}/active`, isActive)),
}

export const wishlistApi = {
  getAll: () => unwrap<WishlistItem[]>(api.get('/wishlist')),
  add: (productId: number) => unwrap<boolean>(api.post(`/wishlist/${productId}`, {})),
  remove: (productId: number) => unwrap<boolean>(api.delete(`/wishlist/${productId}`)),
}

// ── Categories ────────────────────────────────────────────────────────────────
export const categoryApi = {
  getAll: () => unwrap<Category[]>(api.get('/categories')),
  getById: (id: number) => unwrap<Category>(api.get(`/categories/id/${id}`)),
  getBySlug: (slug: string) => unwrap<Category>(api.get(`/categories/${slug}`)),
  create: (data: { name: string; description?: string; iconUrl?: string; displayOrder?: number; isActive?: boolean; showOnHome?: boolean }) =>
    unwrap<Category>(api.post('/categories', data)),
  update: (id: number, data: { name?: string; description?: string; iconUrl?: string; displayOrder?: number; isActive?: boolean; showOnHome?: boolean }) =>
    unwrap<Category>(api.put(`/categories/${id}`, data)),
  delete: (id: number) => unwrap<boolean>(api.delete(`/categories/${id}`)),
}

// ── Farmers ──────────────────────────────────────────────────────────────────
export const farmerApi = {
  getAll: (params?: { page?: number; pageSize?: number; isApproved?: boolean }) =>
    unwrap<PagedResult<Farmer>>(api.get('/farmers', { params })),
  getById: (id: number) => unwrap<Farmer>(api.get(`/farmers/${id}`)),
  getMyProfile: () => unwrap<Farmer>(api.get('/farmers/me')),
  register: (data: object) => unwrap<Farmer>(api.post('/farmers/register', data)),
  create: (data: object) => unwrap<Farmer>(api.post('/farmers/register', data)),
  update: (id: number, data: object) => unwrap<Farmer>(api.put(`/farmers/${id}`, data)),
  delete: (id: number) => unwrap<boolean>(api.delete(`/farmers/${id}`)),
  approve: (id: number, approve: boolean) => unwrap<boolean>(api.put(`/farmers/${id}/approve`, approve)),
  uploadPhoto: (id: number, form: FormData) =>
    unwrap<{ url: string }>(api.post(`/farmers/${id}/photo`, form, { headers: { 'Content-Type': 'multipart/form-data' } })),
  getWomenLed: () => unwrap<Farmer[]>(api.get('/farmers/women-led')),
  setWomenLed: (id: number, isWomenLed: boolean, story?: string) =>
    unwrap<Farmer>(api.put(`/farmers/${id}/women-led`, { isWomenLed, story })),
}

// ── Products ─────────────────────────────────────────────────────────────────
export const productApi = {
  getAll: (params?: object) => unwrap<PagedResult<Product>>(api.get('/products', { params })),
  getFeatured: (count = 8) => unwrap<Product[]>(api.get('/products/featured', { params: { count } })),
  getById: (id: number) => unwrap<Product>(api.get(`/products/${id}`)),
  getBySlug: (slug: string) => unwrap<Product>(api.get(`/products/${slug}`)),
  create: (data: object) => unwrap<Product>(api.post('/products', data)),
  createAdmin: (farmerId: number, data: object) =>
    unwrap<Product>(api.post('/products/admin', data, { params: { farmerId } })),
  update: (id: number, data: object) => unwrap<Product>(api.put(`/products/${id}`, data)),
  delete: (id: number) => unwrap<boolean>(api.delete(`/products/${id}`)),
  uploadImage: (id: number, form: FormData) =>
    unwrap<{ url: string }>(api.post(`/products/${id}/images`, form, { headers: { 'Content-Type': 'multipart/form-data' } })),
  // Seller endpoints
  getMyProducts: (params?: { page?: number; pageSize?: number }) =>
    unwrap<PagedResult<SellerProduct>>(api.get('/products/seller/my', { params })),
  getSellerById: (id: number) =>
    unwrap<SellerProductDetail>(api.get(`/products/seller/${id}`)),
  // Admin endpoints
  getPending: (params?: { page?: number; pageSize?: number }) =>
    unwrap<PagedResult<SellerProduct>>(api.get('/products/pending', { params })),
  approve: (id: number, approve: boolean, note?: string) =>
    unwrap<boolean>(api.put(`/products/${id}/approve`, { approve, note })),
}

// ── Cart ─────────────────────────────────────────────────────────────────────
export const cartApi = {
  get: () => unwrap<Cart>(api.get('/cart')),
  addItem: (productId: number, quantity: number) => unwrap<Cart>(api.post('/cart/items', { productId, quantity })),
  updateItem: (id: number, quantity: number) => unwrap<Cart>(api.put(`/cart/items/${id}`, { quantity })),
  removeItem: (id: number) => unwrap<Cart>(api.delete(`/cart/items/${id}`)),
  clear: () => unwrap<boolean>(api.delete('/cart')),
}

// ── Orders ───────────────────────────────────────────────────────────────────
export const orderApi = {
  getAll: (params?: { page?: number; pageSize?: number }) =>
    unwrap<PagedResult<Order>>(api.get('/orders', { params })),
  getSellerOrders: (params?: { page?: number; pageSize?: number; status?: string }) =>
    unwrap<PagedResult<Order>>(api.get('/orders/seller', { params })),
  getById: (id: number) => unwrap<Order>(api.get(`/orders/${id}`)),
  place: (data: { addressId: number; paymentMethod: string; couponCode?: string; notes?: string }) =>
    unwrap<Order>(api.post('/orders', data)),
  applyCoupon: (code: string, orderAmount: number) =>
    unwrap<{ code: string; discountAmount: number; finalAmount: number }>(api.post('/orders/apply-coupon', { code, orderAmount })),
  cancel: (id: number) => unwrap<boolean>(api.post(`/orders/${id}/cancel`, {})),
  updateStatus: (id: number, status: string, note?: string) =>
    unwrap<boolean>(api.put(`/orders/${id}/status`, status, { params: { note } })),
  getAllAdmin: (params?: object) => unwrap<PagedResult<Order>>(api.get('/admin/orders', { params })),
}

// ── Payments ─────────────────────────────────────────────────────────────────
export const paymentApi = {
  createRazorpayOrder: (orderId: number) =>
    unwrap<{ razorpayOrderId: string; amount: number; currency: string; keyId: string }>(
      api.post('/payments/razorpay/create-order', { orderId })),
  verifyRazorpay: (data: { razorpayOrderId: string; razorpayPaymentId: string; razorpaySignature: string; orderId: number }) =>
    unwrap<boolean>(api.post('/payments/razorpay/verify', data)),
  createStripeIntent: (orderId: number) =>
    unwrap<{ clientSecret: string; paymentIntentId: string }>(api.post('/payments/stripe/create-intent', { orderId })),
}

// ── Reviews ──────────────────────────────────────────────────────────────────
export const reviewApi = {
  getProductReviews: (productId: number, page = 1, pageSize = 10) =>
    unwrap<PagedResult<Review>>(api.get(`/reviews/product/${productId}`, { params: { page, pageSize } })),
  create: (data: { productId: number; orderId: number; rating: number; comment?: string }) =>
    unwrap<Review>(api.post('/reviews', data)),
  delete: (id: number) => unwrap<boolean>(api.delete(`/reviews/${id}`)),
}

// ── Notifications ─────────────────────────────────────────────────────────────
export const notificationApi = {
  getAll: () => unwrap<Notification[]>(api.get('/notifications')),
  markRead: (id: number) => unwrap<boolean>(api.put(`/notifications/${id}/read`, {})),
  markAllRead: () => unwrap<boolean>(api.put('/notifications/read-all', {})),
  delete: (id: number) => unwrap<boolean>(api.delete(`/notifications/${id}`)),
}

// ── Admin ─────────────────────────────────────────────────────────────────────
export const adminApi = {
  getDashboard: () => unwrap<DashboardStats>(api.get('/admin/dashboard')),
}

// ── Subscriptions ─────────────────────────────────────────────────────────────
export const subscriptionApi = {
  getAll: () => unwrap<Subscription[]>(api.get('/subscriptions')),
  getById: (id: number) => unwrap<Subscription>(api.get(`/subscriptions/${id}`)),
  create: (data: { addressId: number; boxType: string; frequency: string; notes?: string; items?: { productId: number; quantity: number }[] }) =>
    unwrap<Subscription>(api.post('/subscriptions', data)),
  update: (id: number, data: { addressId?: number; notes?: string; items?: { productId: number; quantity: number }[] }) =>
    unwrap<Subscription>(api.put(`/subscriptions/${id}`, data)),
  pauseResume: (id: number, pause: boolean) => unwrap<Subscription>(api.put(`/subscriptions/${id}/pause`, { pause })),
  cancel: (id: number) => unwrap<boolean>(api.delete(`/subscriptions/${id}`)),
}

// ── Referral ──────────────────────────────────────────────────────────────────
export const referralApi = {
  getMyCode: () => unwrap<ReferralCode>(api.get('/referral/code')),
  getMyReferrals: () => unwrap<ReferralEntry[]>(api.get('/referral/my-referrals')),
  getWallet: () => unwrap<WalletSummary>(api.get('/referral/wallet')),
  applyCode: (code: string) => unwrap<boolean>(api.post('/referral/apply', { code })),
}