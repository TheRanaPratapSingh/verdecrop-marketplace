export interface User {
  id: number
  name: string
  email?: string
  phone?: string
  role: 'user' | 'farmer' | 'admin'
  avatarUrl?: string
  isActive: boolean
}

export interface AuthResponse {
  accessToken: string
  refreshToken: string
  user: User
}

export interface Category {
  id: number
  name: string
  slug: string
  description?: string
  iconUrl?: string
  displayOrder: number
  productCount: number
  isActive?: boolean
  showOnHome?: boolean
}

export interface Farmer {
  id: number
  userId: number
  farmName: string
  description?: string
  location: string
  state: string
  certificationNumber?: string
  bankAccountNumber?: string
  bankIfsc?: string
  isApproved: boolean
  totalSales: number
  rating: number
  reviewCount: number
  ownerName: string
  avatarUrl?: string
  pinCode?: string
  isPremium: boolean
  premiumPlan: string
  premiumExpiresAt?: string
  isWomenLed: boolean
  womenStory?: string
}

export interface Product {
  id: number
  name: string
  slug: string
  description?: string
  categoryId: number
  categoryName: string
  farmerId: number
  farmerName: string
  farmLocation?: string
  price: number
  originalPrice?: number
  unit: string
  minOrderQty: number
  stockQuantity: number
  imageUrl?: string
  imageUrls: string[]
  isOrganic: boolean
  isFeatured: boolean
  rating: number
  reviewCount: number
  isActive: boolean
  reviews?: Review[]
  // Dynamic pricing (optional — populated when available)
  dynamicPrice?: number
  pricingLabel?: string
  pricingFactors?: string[]
}

export interface DynamicPriceInfo {
  basePrice: number
  dynamicPrice: number
  adjustmentPercent: number
  pricingLabel: string
  factors: string[]
  computedAt: string
}

export type WishlistItem = Product

// ── Subscription ──────────────────────────────────────────────────────────────
export interface SubscriptionItem {
  productId: number
  productName: string
  imageUrl?: string
  quantity: number
  unit: string
  price: number
}

export type SubscriptionStatus = 'active' | 'paused' | 'cancelled'
export type BoxType = 'vegetable' | 'fruit' | 'custom'
export type Frequency = 'weekly' | 'monthly'

export interface Subscription {
  id: number
  boxType: BoxType
  frequency: Frequency
  status: SubscriptionStatus
  price: number
  startDate: string
  endDate?: string
  nextDeliveryDate: string
  notes?: string
  createdAt: string
  address: Address
  items: SubscriptionItem[]
}

// ── Referral ──────────────────────────────────────────────────────────────────
export interface ReferralCode {
  id: number
  code: string
  usageCount: number
  isActive: boolean
  createdAt: string
}

export interface ReferralEntry {
  id: number
  referredUserId: number
  referredUserName: string
  status: 'pending' | 'completed'
  creditsAwarded: number
  completedAt?: string
  createdAt: string
}

export interface WalletCredit {
  id: number
  amount: number
  type: 'earned' | 'redeemed' | 'expired'
  description: string
  createdAt: string
}

export interface WalletSummary {
  totalEarned: number
  totalRedeemed: number
  balance: number
  recent: WalletCredit[]
}

// ── Bundle ────────────────────────────────────────────────────────────────────
export interface BundleItem {
  productId: number
  productName: string
  imageUrl?: string
  price: number
  unit: string
  quantity: number
}

export interface Bundle {
  id: number
  name: string
  slug: string
  description?: string
  imageUrl?: string
  discountPercent: number
  originalTotal: number
  bundlePrice: number
  isActive: boolean
  items: BundleItem[]
}

// ── PriceAlert ────────────────────────────────────────────────────────────────
export interface PriceAlertInfo {
  id: number
  productId: number
  productName: string
  imageUrl?: string
  currentPrice: number
  targetPrice: number
  isTriggered: boolean
  createdAt: string
}

export interface CartItem {
  id: number
  productId: number
  productName: string
  imageUrl?: string
  price: number
  quantity: number
  unit: string
  total: number
}

export interface Cart {
  id: number
  items: CartItem[]
  subtotal: number
  itemCount: number
}

// ── Guest Cart (localStorage, no auth required) ───────────────────────────────
export interface GuestCartItem {
  productId: number
  productName: string
  price: number
  originalPrice?: number
  imageUrl?: string
  unit: string
  quantity: number
  stockQuantity: number
  slug: string
}

export interface Address {
  id: number
  label: string
  fullName: string
  phone: string
  street: string
  city: string
  state: string
  pinCode: string
  isDefault: boolean
}

export interface OrderItem {
  id: number
  productId: number
  productName: string
  imageUrl?: string
  quantity: number
  unit: string
  unitPrice: number
  totalPrice: number
}

export interface OrderStatusHistory {
  id: number
  status: string
  note?: string
  createdAt: string
}

export type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded'
export type PaymentMethod = 'razorpay' | 'stripe' | 'cod'
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded'

export interface Order {
  id: number
  orderNumber: string
  status: OrderStatus
  paymentStatus: PaymentStatus
  paymentMethod: PaymentMethod
  subtotal: number
  deliveryCharge: number
  discountAmount: number
  taxAmount: number
  totalAmount: number
  couponCode?: string
  notes?: string
  createdAt: string
  estimatedDelivery?: string
  deliveredAt?: string
  address: Address
  items: OrderItem[]
  statusHistory: OrderStatusHistory[]
  itemCount?: number
}

export interface Review {
  id: number
  userId: number
  userName: string
  userAvatar?: string
  rating: number
  comment?: string
  isVerifiedPurchase: boolean
  createdAt: string
}

export interface Notification {
  id: number
  title: string
  body: string
  type: 'order' | 'promo' | 'system' | 'announce'
  actionUrl?: string
  isRead: boolean
  createdAt: string
}

export interface PagedResult<T> {
  items: T[]
  totalCount: number
  page: number
  pageSize: number
  totalPages: number
}

export interface ApiResponse<T> {
  success: boolean
  message?: string
  data?: T
  errors?: unknown
}

export interface DashboardStats {
  totalUsers: number
  totalFarmers: number
  totalProducts: number
  totalOrders: number
  totalRevenue: number
  monthlyRevenue: number
  pendingOrders: number
  pendingFarmerApprovals: number
  revenueChart: Array<{ label: string; revenue: number; orders: number }>
}

export type ProductStatus = 'pending' | 'approved' | 'rejected'

export interface SellerProduct {
  id: number
  name: string
  slug: string
  categoryId: number
  categoryName: string
  price: number
  originalPrice?: number
  unit: string
  stockQuantity: number
  imageUrl?: string
  isOrganic: boolean
  isFeatured: boolean
  isActive: boolean
  rating: number
  reviewCount: number
  status: ProductStatus
  createdAt: string
}

export interface SellerProductDetail extends SellerProduct {
  description?: string
  farmerId: number
  farmerName: string
  farmLocation: string
  minOrderQty: number
  imageUrls: string[]
  subcategory?: string
  tags: string[]
  village?: string
  certificationType?: string
  quantityOptions: string[]
  harvestDate?: string
  shelfLifeDays?: number
  freshnessGuarantee?: string
  deliveryTime?: string
  availableCities: string[]
  isFarmToHome: boolean
}
