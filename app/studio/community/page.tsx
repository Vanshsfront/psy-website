import { createSSRClient } from "@/lib/supabase-server"
import StudioClient from "@/components/studio/StudioClient"

export const revalidate = 60 // ISR: revalidate every 60 seconds

export const metadata = {
  title: "Community | PSY Tattoos & Shop",
  description: "Events, collaborations, and what's happening at the PSY studio.",
}

export default async function StudioCommunity() {
  const supabase = await createSSRClient()

  const { data: communityPosts } = await supabase
    .from("community_posts")
    .select("*")
    .eq("is_published", true)
    .order("created_at", { ascending: false })

  return (
    <StudioClient activeTab="community" communityPosts={communityPosts || []} />
  )
}
