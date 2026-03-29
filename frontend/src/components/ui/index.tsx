import React, { forwardRef } from 'react'
import { X, Loader2, Star, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react'

// ── Button ────────────────────────────────────────────────────────────────────
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
  size?: 'xs' | 'sm' | 'md' | 'lg'
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
  variant = 'primary', size = 'md', loading, children, className = '', disabled, ...props
}, ref) => {
  const base = 'inline-flex items-center justify-center font-body font-medium rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none'
  const variants = {
    primary:   'bg-green-600 hover:bg-green-700 active:bg-green-800 text-white focus:ring-green-500 shadow-sm hover:shadow',
    secondary: 'bg-gray-500 hover:bg-gray-600 active:bg-gray-700 text-white focus:ring-gray-400 shadow-sm',
    outline:   'border-2 border-green-600 text-green-700 hover:bg-green-50 active:bg-green-100 focus:ring-green-400',
    ghost:     'text-gray-700 hover:bg-gray-100 active:bg-gray-200 focus:ring-gray-400',
    danger:    'bg-red-600 hover:bg-red-700 active:bg-red-800 text-white focus:ring-red-400 shadow-sm',
  }
  const sizes = {
    xs: 'text-xs px-2.5 py-1.5 gap-1',
    sm: 'text-sm px-3.5 py-2 gap-1.5',
    md: 'text-sm px-5 py-2.5 gap-2',
    lg: 'text-base px-7 py-3.5 gap-2',
  }
  return (
    <button ref={ref} disabled={disabled || loading} className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...props}>
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : children}
    </button>
  )
})
Button.displayName = 'Button'

// ── Input ─────────────────────────────────────────────────────────────────────
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({
  label, error, hint, leftIcon, rightIcon, className = '', ...props
}, ref) => (
  <div className="flex flex-col gap-1.5">
    {label && <label className="text-sm font-medium text-gray-700 font-body">{label}</label>}
    <div className="relative">
      {leftIcon && (
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">{leftIcon}</span>
      )}
      <input
        ref={ref}
        className={`w-full border rounded-xl px-4 py-2.5 text-sm font-body bg-white transition-all outline-none
          placeholder:text-gray-400 text-gray-800
          ${leftIcon ? 'pl-10' : ''} ${rightIcon ? 'pr-10' : ''}
          ${error
            ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100'
            : 'border-gray-200 focus:border-leaf-500 focus:ring-2 focus:ring-leaf-100'}
          ${className}`}
        {...props}
      />
      {rightIcon && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">{rightIcon}</span>
      )}
    </div>
    {error && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{error}</p>}
    {hint && !error && <p className="text-xs text-gray-500">{hint}</p>}
  </div>
))
Input.displayName = 'Input'

// ── Textarea ──────────────────────────────────────────────────────────────────
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(({ label, error, className = '', ...props }, ref) => (
  <div className="flex flex-col gap-1.5">
    {label && <label className="text-sm font-medium text-gray-700 font-body">{label}</label>}
    <textarea
      ref={ref}
      className={`w-full border rounded-xl px-4 py-2.5 text-sm font-body bg-white transition-all outline-none resize-none
        placeholder:text-gray-400 text-gray-800
        ${error ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100'
          : 'border-gray-200 focus:border-leaf-500 focus:ring-2 focus:ring-leaf-100'} ${className}`}
      {...props}
    />
    {error && <p className="text-xs text-red-500">{error}</p>}
  </div>
))
Textarea.displayName = 'Textarea'

// ── Badge ─────────────────────────────────────────────────────────────────────
interface BadgeProps {
  children: React.ReactNode
  variant?: 'green' | 'earth' | 'blue' | 'orange' | 'red' | 'gray' | 'purple'
  size?: 'sm' | 'md'
  className?: string
}
export const Badge: React.FC<BadgeProps> = ({ children, variant = 'green', size = 'sm', className = '' }) => {
  const variants = {
    green:  'bg-leaf-100 text-leaf-800',
    earth:  'bg-earth-100 text-earth-800',
    blue:   'bg-blue-100 text-blue-800',
    orange: 'bg-orange-100 text-orange-800',
    red:    'bg-red-100 text-red-800',
    gray:   'bg-gray-100 text-gray-700',
    purple: 'bg-purple-100 text-purple-800',
  }
  const sizes = { sm: 'text-xs px-2 py-0.5', md: 'text-sm px-3 py-1' }
  return <span className={`inline-flex items-center font-medium rounded-full font-body ${variants[variant]} ${sizes[size]} ${className}`}>{children}</span>
}

// ── Status Badge ──────────────────────────────────────────────────────────────
export const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const map: Record<string, { label: string; variant: BadgeProps['variant'] }> = {
    pending:     { label: 'Pending',     variant: 'orange' },
    confirmed:   { label: 'Confirmed',   variant: 'blue' },
    processing:  { label: 'Processing',  variant: 'purple' },
    shipped:     { label: 'Shipped',     variant: 'earth' },
    delivered:   { label: 'Delivered',   variant: 'green' },
    cancelled:   { label: 'Cancelled',   variant: 'red' },
    refunded:    { label: 'Refunded',    variant: 'gray' },
    paid:        { label: 'Paid',        variant: 'green' },
    failed:      { label: 'Failed',      variant: 'red' },
  }
  const config = map[status] ?? { label: status, variant: 'gray' }
  return <Badge variant={config.variant as BadgeProps['variant']}>{config.label}</Badge>
}

// ── Spinner ───────────────────────────────────────────────────────────────────
export const Spinner: React.FC<{ size?: 'sm' | 'md' | 'lg'; className?: string }> = ({ size = 'md', className = '' }) => {
  const sizes = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-10 h-10' }
  return <Loader2 className={`animate-spin text-leaf-600 ${sizes[size]} ${className}`} />
}

// ── Modal ─────────────────────────────────────────────────────────────────────
interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  footer?: React.ReactNode
}
export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, size = 'md', footer }) => {
  if (!isOpen) return null
  const sizes = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className={`relative bg-white rounded-2xl shadow-modal w-full ${sizes[size]} animate-scale-in max-h-[90vh] flex flex-col`}
        onClick={e => e.stopPropagation()}
      >
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-display font-semibold text-gray-900">{title}</h2>
            <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition">
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
        <div className="px-6 py-5 overflow-y-auto flex-1">{children}</div>
        {footer && <div className="px-6 py-4 border-t border-gray-100">{footer}</div>}
      </div>
    </div>
  )
}

// ── Card ──────────────────────────────────────────────────────────────────────
export const Card: React.FC<{ children: React.ReactNode; className?: string; hover?: boolean }> = ({ children, className = '', hover }) => (
  <div className={`bg-white rounded-2xl shadow-card ${hover ? 'hover:shadow-card-hover transition-shadow cursor-pointer' : ''} ${className}`}>
    {children}
  </div>
)

// ── Star Rating ───────────────────────────────────────────────────────────────
export const StarRating: React.FC<{
  rating: number; max?: number; size?: 'sm' | 'md'; interactive?: boolean; onChange?: (r: number) => void
}> = ({ rating, max = 5, size = 'sm', interactive, onChange }) => {
  const sizes = { sm: 'w-3.5 h-3.5', md: 'w-5 h-5' }
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <Star
          key={i}
          className={`${sizes[size]} transition-colors ${
            i < Math.round(rating) ? 'fill-amber-400 text-amber-400' : 'fill-gray-200 text-gray-200'
          } ${interactive ? 'cursor-pointer hover:fill-amber-300 hover:text-amber-300' : ''}`}
          onClick={() => interactive && onChange?.(i + 1)}
        />
      ))}
    </div>
  )
}

// ── Empty State ───────────────────────────────────────────────────────────────
export const EmptyState: React.FC<{
  icon?: React.ReactNode; title: string; description?: string; action?: React.ReactNode
}> = ({ icon, title, description, action }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    {icon && <div className="mb-4 opacity-50">{icon}</div>}
    <h3 className="text-lg font-display font-semibold text-gray-700 mb-1">{title}</h3>
    {description && <p className="text-sm text-gray-500 mb-5 max-w-xs">{description}</p>}
    {action}
  </div>
)

// ── Skeleton ──────────────────────────────────────────────────────────────────
export const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%] animate-shimmer rounded-lg ${className}`} />
)

export const ProductSkeleton: React.FC = () => (
  <div className="bg-white rounded-2xl shadow-card overflow-hidden">
    <Skeleton className="h-48 rounded-none" />
    <div className="p-4 space-y-2">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
      <Skeleton className="h-5 w-1/3" />
      <Skeleton className="h-9 w-full mt-2" />
    </div>
  </div>
)

// ── Pagination ────────────────────────────────────────────────────────────────
export const Pagination: React.FC<{
  page: number; totalPages: number; onPageChange: (p: number) => void
}> = ({ page, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null
  return (
    <div className="flex items-center justify-center gap-2">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
        className="p-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      {Array.from({ length: Math.min(totalPages, 7) }).map((_, i) => {
        const p = i + 1
        return (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={`w-9 h-9 rounded-xl text-sm font-medium transition ${
              p === page ? 'bg-leaf-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            {p}
          </button>
        )
      })}
      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page === totalPages}
        className="p-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  )
}

// ── Price Display ─────────────────────────────────────────────────────────────
export const PriceDisplay: React.FC<{ price: number; originalPrice?: number; size?: 'sm' | 'md' | 'lg' }> = ({
  price, originalPrice, size = 'md'
}) => {
  const sizes = { sm: 'text-base', md: 'text-lg', lg: 'text-2xl' }
  const discount = originalPrice && originalPrice > price
    ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0
  return (
    <div className="flex items-baseline gap-2 flex-wrap">
      <span className={`${sizes[size]} font-display font-bold text-leaf-700`}>₹{price.toFixed(0)}</span>
      {originalPrice && originalPrice > price && (
        <>
          <span className="text-sm text-gray-400 line-through font-body">₹{originalPrice.toFixed(0)}</span>
          <Badge variant="green" size="sm">{discount}% off</Badge>
        </>
      )}
    </div>
  )
}

// ── Section Header ────────────────────────────────────────────────────────────
export const SectionHeader: React.FC<{ title: string; subtitle?: string; action?: React.ReactNode }> = ({ title, subtitle, action }) => (
  <div className="flex items-end justify-between mb-6">
    <div>
      <h2 className="text-2xl md:text-3xl font-display font-bold text-gray-900">{title}</h2>
      {subtitle && <p className="text-gray-500 font-body mt-1">{subtitle}</p>}
    </div>
    {action}
  </div>
)

// ── Tab Group ─────────────────────────────────────────────────────────────────
export const TabGroup: React.FC<{
  tabs: { id: string; label: string; count?: number }[]
  active: string
  onChange: (id: string) => void
  className?: string
}> = ({ tabs, active, onChange, className = '' }) => (
  <div className={`flex gap-1 bg-gray-100 rounded-xl p-1 ${className}`}>
    {tabs.map(tab => (
      <button
        key={tab.id}
        onClick={() => onChange(tab.id)}
        className={`flex-1 py-2 px-3 text-sm font-medium rounded-lg transition-all font-body flex items-center justify-center gap-1.5 ${
          active === tab.id ? 'bg-white text-leaf-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
        }`}
      >
        {tab.label}
        {tab.count !== undefined && (
          <span className={`text-xs rounded-full px-1.5 py-0.5 min-w-[20px] text-center ${
            active === tab.id ? 'bg-leaf-100 text-leaf-700' : 'bg-gray-200 text-gray-500'
          }`}>{tab.count}</span>
        )}
      </button>
    ))}
  </div>
)
