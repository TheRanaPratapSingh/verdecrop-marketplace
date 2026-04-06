import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, Cart, Notification, GuestCartItem } from '../types'

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

// ── Wishlist Store (in-memory, auth-only) ─────────────────────────────────────
interface WishlistState {
  ids: number[]                               // productIds in wishlist
  setWishlist: (ids: number[]) => void
  addId: (id: number) => void
  removeId: (id: number) => void
  clearWishlist: () => void
  isWishlisted: (id: number) => boolean
}

export const useWishlistStore = create<WishlistState>((set, get) => ({
  ids: [],
  setWishlist: (ids) => set({ ids }),
  addId: (id) => set(s => ({ ids: [...s.ids.filter(i => i !== id), id] })),
  removeId: (id) => set(s => ({ ids: s.ids.filter(i => i !== id) })),
  clearWishlist: () => set({ ids: [] }),
  isWishlisted: (id) => get().ids.includes(id),
}))

// ── Guest Cart Store (persisted, no auth required) ─────────────────────────────
interface GuestCartState {
  items: GuestCartItem[]
  addItem: (item: GuestCartItem) => void
  updateItem: (productId: number, quantity: number) => void
  removeItem: (productId: number) => void
  clearGuestCart: () => void
  guestItemCount: () => number
  guestSubtotal: () => number
}

export const useGuestCartStore = create<GuestCartState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (incoming) => {
        const existing = get().items.find(i => i.productId === incoming.productId)
        if (existing) {
          const newQty = existing.quantity + incoming.quantity
          set(s => ({
            items: s.items.map(i =>
              i.productId === incoming.productId ? { ...i, quantity: newQty } : i
            ),
          }))
        } else {
          set(s => ({ items: [...s.items, incoming] }))
        }
      },
      updateItem: (productId, quantity) => {
        if (quantity <= 0) {
          set(s => ({ items: s.items.filter(i => i.productId !== productId) }))
        } else {
          set(s => ({
            items: s.items.map(i => i.productId === productId ? { ...i, quantity } : i),
          }))
        }
      },
      removeItem: (productId) =>
        set(s => ({ items: s.items.filter(i => i.productId !== productId) })),
      clearGuestCart: () => set({ items: [] }),
      guestItemCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
      guestSubtotal: () => get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
    }),
    {
      name: 'graamo-guest-cart',
      storage: {
        getItem: (key) => { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : null } catch { return null } },
        setItem: (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* no-op */ } },
        removeItem: (key) => { try { localStorage.removeItem(key) } catch { /* no-op */ } },
      },
    }
  )
)
