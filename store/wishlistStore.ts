import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Product } from '@/types'

interface WishlistState {
  items: Product[]
  addItem: (product: Product) => void
  removeItem: (productId: string) => void
  isInWishlist: (productId: string) => boolean
}

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (product) => {
        set((state) => {
          if (!state.items.find(i => i.id === product.id)) {
            return { items: [...state.items, product] }
          }
          return state
        })
      },
      removeItem: (productId) => {
        set((state) => ({
          items: state.items.filter((i) => i.id !== productId)
        }))
      },
      isInWishlist: (productId) => {
        return get().items.some(i => i.id === productId)
      }
    }),
    {
      name: 'psy-wishlist-storage',
    }
  )
)
