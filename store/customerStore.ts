import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ShopCustomer } from '@/types'

interface CustomerState {
  token: string | null
  customer: ShopCustomer | null
  setAuth: (token: string, customer: ShopCustomer) => void
  logout: () => void
  isLoggedIn: () => boolean
}

export const useCustomerStore = create<CustomerState>()(
  persist(
    (set, get) => ({
      token: null,
      customer: null,
      setAuth: (token, customer) => set({ token, customer }),
      logout: () => set({ token: null, customer: null }),
      isLoggedIn: () => !!get().token,
    }),
    {
      name: 'psy-customer-storage',
    }
  )
)
