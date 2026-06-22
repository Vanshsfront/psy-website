import { createSSRClient } from "@/lib/supabase-server"
import StudioClient from "@/components/studio/StudioClient"

export const revalidate = 60 // ISR: revalidate every 60 seconds

export const metadata = {
  title: "Guest Spot | PSY Tattoos & Shop",
  description: "Guest artists at PSY, and how to apply to guest with us.",
}

export default async function StudioGuestSpot() {
  const supabase = await createSSRClient()

  const { data: guestSpots } = await supabase
    .from("guest_spots")
    .select("*")
    .eq("is_published", true)
    .order("date_start", { ascending: true })

  return (
    <StudioClient activeTab="guest-spot" guestSpots={guestSpots || []} />
  )
}
