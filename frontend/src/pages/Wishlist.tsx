import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Heart, ShoppingCart, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { PageLayout } from '../components/layout'
import { Badge, Button, Card, EmptyState, Spinner } from '../components/ui'
import { cartApi, wishlistApi } from '../services/api'
import { resolveAssetUrl } from '../lib/image'
import type { WishlistItem } from '../types'
import { useCartStore } from '../store'

export const WishlistPage: React.FC = () => {
  const [items, setItems] = useState<WishlistItem[]>([])
  const [loading, setLoading] = useState(true)
  const [removingId, setRemovingId] = useState<number | null>(null)
  const [addingId, setAddingId] = useState<number | null>(null)
  const { setCart, openCart } = useCartStore()

  const loadWishlist = async () => {
    setLoading(true)
    try {
      const data = await wishlistApi.getAll()
      setItems(data)
    } catch {
      toast.error('Failed to load wishlist')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadWishlist()
  }, [])

  const handleRemove = async (productId: number) => {
    setRemovingId(productId)
    try {
      await wishlistApi.remove(productId)
      setItems(prev => prev.filter(item => item.id !== productId))
      toast.success('Removed from wishlist')
    } catch {
      toast.error('Failed to remove item')
    } finally {
      setRemovingId(null)
    }
  }

  const handleAddToCart = async (item: WishlistItem) => {
    setAddingId(item.id)
    try {
      const cart = await cartApi.addItem(item.id, 1)
      setCart(cart)
      openCart()
      toast.success('Added to cart')
    } catch {
      toast.error('Failed to add to cart')
    } finally {
      setAddingId(null)
    }
  }

  return (
    <PageLayout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-8">
          <p className="section-label mb-2">Your Favorites</p>
          <h1 className="text-3xl font-display font-bold text-stone-900 mb-2">Wishlist</h1>
          <p className="text-stone-600 font-body">Save products you love and move them to cart when you’re ready.</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Spinner size="lg" /></div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={<Heart className="w-10 h-10 text-stone-300" />}
            title="Your wishlist is empty"
            description="Browse products and tap the heart icon to save your favorites here."
            action={<Link to="/products"><Button>Explore Products</Button></Link>}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {items.map(item => (
              <Card key={item.id} className="p-5 rounded-3xl border border-stone-200 bg-white">
                <div className="flex items-start gap-4">
                  <Link to={`/products/${item.slug}`} className="w-24 h-24 rounded-2xl bg-stone-100 overflow-hidden flex-shrink-0">
                    {item.imageUrl ? (
                      <img src={resolveAssetUrl(item.imageUrl)} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-3xl">🌿</div>
                    )}
                  </Link>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-wider text-stone-400 font-semibold">{item.farmerName}</p>
                        <Link to={`/products/${item.slug}`} className="block mt-1 text-base font-semibold text-stone-900 hover:text-forest-700 transition-colors">
                          {item.name}
                        </Link>
                      </div>
                      {item.isOrganic && <Badge variant="green">Organic</Badge>}
                    </div>

                    <p className="text-sm text-stone-500 mt-2">{item.categoryName}</p>
                    <div className="mt-3 flex items-end justify-between gap-4">
                      <div>
                        <p className="text-xl font-display font-bold text-stone-900">₹{item.price.toFixed(0)}</p>
                        <p className="text-xs text-stone-500">per {item.unit}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" loading={addingId === item.id} onClick={() => handleAddToCart(item)}>
                          <ShoppingCart className="w-4 h-4" /> Cart
                        </Button>
                        <Button size="sm" variant="ghost" loading={removingId === item.id} onClick={() => handleRemove(item.id)}>
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PageLayout>
  )
}

export default WishlistPage
