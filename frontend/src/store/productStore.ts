
import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { CatalogCard } from "@/types/product"

interface ProductStore {
  product: CatalogCard | null
  setProduct: (product: CatalogCard) => void
  clearProduct: () => void
}

export const useProductStore = create<ProductStore>()(
  persist(
    (set) => ({
      product: null,
      setProduct: (product) => set({ product }),
      clearProduct: () => set({ product: null }),
    }),
    {
      name: "cove-product", // key in localStorage
    }
  )
)
