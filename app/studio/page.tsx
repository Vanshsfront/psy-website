import { createSSRClient } from "@/lib/supabase-server"
import StudioClient from "@/components/studio/StudioClient"

export const revalidate = 60 // ISR: revalidate every 60 seconds

export default async function StudioHome() {
  const supabase = await createSSRClient()

  const [
    { data: artists },
    { data: styles },
    { data: portfolio },
  ] = await Promise.all([
    supabase.from("artists").select("*"),
    supabase.from("styles").select("*"),
    supabase
      .from("portfolio_items")
      .select("*, artists(name)")
      .order("created_at", { ascending: false })
      .limit(4),
  ])

  return (
    <StudioClient
      activeTab="studio"
      artists={artists || []}
      styles={styles || []}
      portfolio={portfolio || []}
    />
  )
}
