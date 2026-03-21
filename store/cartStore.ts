import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { CartItem } from '@/types'

interface CartState {
  items: CartItem[]
  addItem: (item: CartItem) => void
  removeItem: (productId: string, variant: Record<string, any> | null) => void
  updateQuantity: (productId: string, variant: Record<string, any> | null, quantity: number) => void
  clearCart: () => void
  getCartTotal: () => number
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item) => {
        set((state) => {
          const existingItemIndex = state.items.findIndex(
            (i) => i.product_id === item.product_id && JSON.stringify(i.variant) === JSON.stringify(item.variant)
          )

          if (existingItemIndex > -1) {
            const newItems = [...state.items]
            newItems[existingItemIndex].quantity += item.quantity
            return { items: newItems }
          }
          return { items: [...state.items, item] }
        })
      },
      removeItem: (productId, variant) => {
        set((state) => ({
          items: state.items.filter(
            (i) => !(i.product_id === productId && JSON.stringify(i.variant) === JSON.stringify(variant))
          )
        }))
      },
      updateQuantity: (productId, variant, quantity) => {
        set((state) => ({
          items: state.items.map((i) => {
            if (i.product_id === productId && JSON.stringify(i.variant) === JSON.stringify(variant)) {
              return { ...i, quantity }
            }
            return i
          })
        }))
      },
      clearCart: () => set({ items: [] }),
      getCartTotal: () => {
        return get().items.reduce((total, item) => total + (item.price * item.quantity), 0)
      }
    }),
    {
      name: 'psy-cart-storage',
    }
  )
)
