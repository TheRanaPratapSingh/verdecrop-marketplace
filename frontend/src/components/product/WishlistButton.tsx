import React, { useState } from 'react'
import { Heart } from 'lucide-react'
import { useAuthStore, useWishlistStore } from '../../store'
import { wishlistApi } from '../../services/api'
import toast from 'react-hot-toast'

interface WishlistButtonProps {
  productId: number
  productName: string
  className?: string
  size?: 'sm' | 'md'
}

export const WishlistButton: React.FC<WishlistButtonProps> = ({
  productId,
  productName,
  className = '',
  size = 'md',
}) => {
  const { isAuthenticated } = useAuthStore()
  const { isWishlisted, addId, removeId } = useWishlistStore()
  const [loading, setLoading] = useState(false)

  const wishlisted = isWishlisted(productId)

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!isAuthenticated) {
      toast.error('Please login to save to wishlist')
      return
    }

    if (loading) return
    setLoading(true)

    // Optimistic update
    if (wishlisted) {
      removeId(productId)
    } else {
      addId(productId)
    }

    try {
      if (wishlisted) {
        await wishlistApi.remove(productId)
        toast.success(`${productName} removed from wishlist`)
      } else {
        await wishlistApi.add(productId)
        toast.success(`${productName} saved to wishlist`, {
          icon: '❤️',
          style: { borderRadius: '14px' },
        })
      }
    } catch {
      // Revert optimistic update on error
      if (wishlisted) {
        addId(productId)
      } else {
        removeId(productId)
      }
      toast.error('Could not update wishlist')
    } finally {
      setLoading(false)
    }
  }

  const iconSize = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4.5 h-4.5'

  return (
    <button
      onClick={handleClick}
      title={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
      disabled={loading}
      className={`flex items-center justify-center transition-all duration-200 disabled:opacity-60 ${className}`}
    >
      <Heart
        className={`${iconSize} transition-all duration-200 ${
          wishlisted
            ? 'fill-red-500 text-red-500 scale-110'
            : 'text-stone-400 hover:text-red-400'
        }`}
        strokeWidth={1.8}
      />
    </button>
  )
}
