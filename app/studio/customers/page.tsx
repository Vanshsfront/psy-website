import { createSSRClient } from "@/lib/supabase-server"
import StudioClient from "@/components/studio/StudioClient"

export const revalidate = 60 // ISR: revalidate every 60 seconds

export const metadata = {
  title: "Customers | PSY Tattoos & Shop",
  description: "What our clients say about PSY Tattoos.",
}

export default async function StudioCustomers() {
  const supabase = await createSSRClient()

  const { data: testimonials } = await supabase
    .from("customer_testimonials")
    .select("*")
    .eq("is_published", true)
    .order("created_at", { ascending: false })

  return (
    <StudioClient activeTab="customers" testimonials={testimonials || []} />
  )
}
