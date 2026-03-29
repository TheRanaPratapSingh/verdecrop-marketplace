import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, Cart, Notification } from '../types'

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

        localStorage.setItem('accessToken', accessToken)
        localStorage.setItem('refreshToken', refreshToken)
        set({ user: normalizedUser, isAuthenticated: true, accessToken, refreshToken })
      },
      setUser: (user) => {
        const normalizedRole = (user.role || 'user').toString().trim().toLowerCase() as User['role']
        set({ user: { ...user, role: normalizedRole } })
      },
      logout: () => {
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
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
