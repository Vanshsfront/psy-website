import { createSSRClient } from "@/lib/supabase-server"
import Image from "next/image"
import Link from "next/link"
import Accordion from "@/components/studio/Accordion"
import BookingForm from "@/components/studio/BookingForm"
import StudioClient from "@/components/studio/StudioClient"

export const revalidate = 60 // ISR: revalidate every 60 seconds

export default async function StudioHome() {
  const supabase = await createSSRClient()

  const { data: artists } = await supabase.from("artists").select("*")
  const { data: styles } = await supabase.from("styles").select("*")
  const { data: portfolio } = await supabase
    .from("portfolio_items")
    .select("*, artists(name)")
    .order("created_at", { ascending: false })
    .limit(4)

  return (
    <StudioClient
      artists={artists || []}
      styles={styles || []}
      portfolio={portfolio || []}
    />
  )
}
