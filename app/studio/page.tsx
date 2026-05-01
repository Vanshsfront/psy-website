import { createSSRClient } from "@/lib/supabase-server"
import StudioClient from "@/components/studio/StudioClient"

export const revalidate = 60 // ISR: revalidate every 60 seconds

export default async function StudioHome() {
  const supabase = await createSSRClient()

  const [
    { data: artists },
    { data: styles },
    { data: portfolio },
    { data: communityPosts },
    { data: guestSpots },
    { data: testimonials },
    { data: blogPosts },
  ] = await Promise.all([
    supabase.from("artists").select("*"),
    supabase.from("styles").select("*"),
    supabase
      .from("portfolio_items")
      .select("*, artists(name)")
      .order("created_at", { ascending: false })
      .limit(4),
    supabase
      .from("community_posts")
      .select("*")
      .eq("is_published", true)
      .order("created_at", { ascending: false }),
    supabase
      .from("guest_spots")
      .select("*")
      .eq("is_published", true)
      .order("date_start", { ascending: true }),
    supabase
      .from("customer_testimonials")
      .select("*")
      .eq("is_published", true)
      .order("created_at", { ascending: false }),
    supabase
      .from("blog_posts")
      .select("*")
      .eq("is_published", true)
      .order("published_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false }),
  ])

  return (
    <StudioClient
      artists={artists || []}
      styles={styles || []}
      portfolio={portfolio || []}
      communityPosts={communityPosts || []}
      guestSpots={guestSpots || []}
      testimonials={testimonials || []}
      blogPosts={blogPosts || []}
    />
  )
}
