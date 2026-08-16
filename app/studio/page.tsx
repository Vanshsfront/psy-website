import { createSSRClient } from "@/lib/supabase-server"
import StudioClient from "@/components/studio/StudioClient"

export const revalidate = 60 // ISR: revalidate every 60 seconds

export default async function StudioHome() {
  const supabase = await createSSRClient()

  // A guest artist only belongs on the homepage while they are actually here, so
  // anything whose run has already ended is excluded. Open-ended spots (no
  // date_end) keep showing until they are unpublished.
  const today = new Date().toISOString().split("T")[0]

  const [
    { data: artists },
    { data: styles },
    { data: portfolio },
    { data: guestSpots },
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
    supabase
      .from("guest_spots")
      .select("*")
      .eq("is_published", true)
      .or(`date_end.is.null,date_end.gte.${today}`)
      .order("date_start", { ascending: true }),
  ])

  return (
    <StudioClient
      activeTab="studio"
      artists={artists || []}
      styles={styles || []}
      portfolio={portfolio || []}
      guestSpots={guestSpots || []}
    />
  )
}
