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
    // Eight tiles, with the ones flagged `featured` in /admin/portfolio first, so
    // the studio chooses what leads the homepage instead of it always being the
    // eight most recent uploads. Unflagged items still fill any remaining slots,
    // so the row is never short.
    supabase
      .from("portfolio_items")
      .select("*, artists(name)")
      .order("featured", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(8),
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
