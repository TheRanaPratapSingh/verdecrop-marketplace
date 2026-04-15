import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, Cart, Notification } from '../types'

// Safe localStorage wrapper — jsdom (used by prerender) has no localStorage
const safeStorage = {
  getItem: (key: string) => {
    try { return localStorage.getItem(key) } catch { return null }
  },
  setItem: (key: string, value: string) => {
    try { localStorage.setItem(key, value) } catch { /* no-op during prerender */ }
  },
  removeItem: (key: string) => {
    try { localStorage.removeItem(key) } catch { /* no-op during prerender */ }
  },
}

// ── Auth Store ────────────────────────────────────────────────────────────────
interface AuthState {
  user: User | null
  isAuthenticated: boolean
  accessToken: string | null
  refreshToken: string | null
  setAuth: (user: User, accessToken: string, refreshToken: string) => void
  setUser: (user: User) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      accessToken: null,
      refreshToken: null,
      setAuth: (user, accessToken, refreshToken) => {
        const normalizedRole = (user.role || 'user').toString().trim().toLowerCase() as User['role']
        const normalizedUser = { ...user, role: normalizedRole }

        safeStorage.setItem('accessToken', accessToken)
        safeStorage.setItem('refreshToken', refreshToken)
        set({ user: normalizedUser, isAuthenticated: true, accessToken, refreshToken })
      },
      setUser: (user) => {
        const normalizedRole = (user.role || 'user').toString().trim().toLowerCase() as User['role']
        set({ user: { ...user, role: normalizedRole } })
      },
      logout: () => {
        safeStorage.removeItem('accessToken')
        safeStorage.removeItem('refreshToken')
        set({ user: null, isAuthenticated: false, accessToken: null, refreshToken: null })
      },
    }),
    {
      name: 'verdecrop-auth',
      partialize: (s) => ({ user: s.user, isAuthenticated: s.isAuthenticated }),
      onRehydrateStorage: () => (state) => {
        if (state?.user?.role) {
          const normalizedRole = state.user.role.toString().trim().toLowerCase() as User['role']
          state.user.role = normalizedRole
        }
      },
    }
  )
)


// ── Cart Store ────────────────────────────────────────────────────────────────
interface CartState {
  cart: Cart | null
  isOpen: boolean
  setCart: (cart: Cart | null) => void
  openCart: () => void
  closeCart: () => void
  toggleCart: () => void
  itemCount: () => number
}

export const useCartStore = create<CartState>((set, get) => ({
  cart: null,
  isOpen: false,
  setCart: (cart) => set({ cart }),
  openCart: () => set({ isOpen: true }),
  closeCart: () => set({ isOpen: false }),
  toggleCart: () => set((s) => ({ isOpen: !s.isOpen })),
  itemCount: () => get().cart?.itemCount ?? 0,
}))

// ── Notification Store ────────────────────────────────────────────────────────
interface NotifState {
  notifications: Notification[]
  unreadCount: number
  setNotifications: (n: Notification[]) => void
  markRead: (id: number) => void
  markAllRead: () => void
  remove: (id: number) => void
}

export const useNotifStore = create<NotifState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  setNotifications: (notifications) => set({
    notifications,
    unreadCount: notifications.filter(n => !n.isRead).length
  }),
  markRead: (id) => {
    const notifications = get().notifications.map(n => n.id === id ? { ...n, isRead: true } : n)
    set({ notifications, unreadCount: notifications.filter(n => !n.isRead).length })
  },
  markAllRead: () => {
    const notifications = get().notifications.map(n => ({ ...n, isRead: true }))
    set({ notifications, unreadCount: 0 })
  },
  remove: (id) => {
    const notifications = get().notifications.filter(n => n.id !== id)
    set({ notifications, unreadCount: notifications.filter(n => !n.isRead).length })
  },
}))

// ── UI Store ──────────────────────────────────────────────────────────────────
interface UIState {
  searchQuery: string
  setSearchQuery: (q: string) => void
}

export const useUIStore = create<UIState>((set) => ({
  searchQuery: '',
  setSearchQuery: (searchQuery) => set({ searchQuery }),
}))

// ── Guest Cart Store ──────────────────────────────────────────────────────────
export interface GuestCartItem {
  productId: number
  productName: string
  price: number
  originalPrice?: number
  imageUrl?: string
  unit: string
  quantity: number
  stockQuantity: number
  slug?: string
  variantLabel?: string
}

interface GuestCartState {
  items: GuestCartItem[]
  addItem: (item: GuestCartItem) => void
  updateItem: (productId: number, quantity: number) => void
  removeItem: (productId: number) => void
  clearCart: () => void
}

export const useGuestCartStore = create<GuestCartState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item) => {
        const existing = get().items.find((i: GuestCartItem) => i.productId === item.productId && i.variantLabel === item.variantLabel)
        if (existing) {
          set({ items: get().items.map((i: GuestCartItem) => i.productId === item.productId && i.variantLabel === item.variantLabel ? { ...i, quantity: i.quantity + item.quantity } : i) })
        } else {
          set({ items: [...get().items, item] })
        }
      },
      updateItem: (productId, quantity) => {
        if (quantity <= 0) {
          set({ items: get().items.filter((i: GuestCartItem) => i.productId !== productId) })
        } else {
          set({ items: get().items.map((i: GuestCartItem) => i.productId === productId ? { ...i, quantity } : i) })
        }
      },
      removeItem: (productId) => set({ items: get().items.filter((i: GuestCartItem) => i.productId !== productId) }),
      clearCart: () => set({ items: [] }),
    }),
    {
      name: 'verdecrop-guest-cart',
      storage: {
        getItem: (key) => {
          const raw = safeStorage.getItem(key)
          return raw ? JSON.parse(raw) : null
        },
        setItem: (key, value) => safeStorage.setItem(key, JSON.stringify(value)),
        removeItem: (key) => safeStorage.removeItem(key),
      },
    }
  )
)

// ── Wishlist Store ────────────────────────────────────────────────────────────
interface WishlistState {
  ids: Set<number>
  isWishlisted: (id: number) => boolean
  addId: (id: number) => void
  removeId: (id: number) => void
  setWishlist: (ids: number[]) => void
}

export const useWishlistStore = create<WishlistState>()((set, get) => ({
  ids: new Set<number>(),
  isWishlisted: (id) => get().ids.has(id),
  addId: (id) => set((s) => ({ ids: new Set([...s.ids, id]) })),
  removeId: (id) => {
    const next = new Set(get().ids)
    next.delete(id)
    set({ ids: next })
  },
  setWishlist: (ids) => set({ ids: new Set(ids) }),
}))
