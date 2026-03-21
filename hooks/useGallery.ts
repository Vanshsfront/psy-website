"use client"

import { createClient } from "@/lib/supabase"
import useSWR from "swr"
import type { PortfolioItem } from "@/types"

const supabase = createClient()

async function fetchGalleryItems(): Promise<PortfolioItem[]> {
  const { data } = await supabase
    .from("portfolio_items")
    .select("*")
    .order("created_at", { ascending: false })
  return (data as PortfolioItem[]) || []
}

export function useGallery() {
  const { data, error, isLoading, mutate } = useSWR<PortfolioItem[]>(
    "gallery-items",
    fetchGalleryItems,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60000, // Cache for 60s
    }
  )

  return {
    items: data || [],
    isLoading,
    isError: !!error,
    mutate,
  }
}
