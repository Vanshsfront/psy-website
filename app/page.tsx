import { createServiceClient } from "@/lib/supabase-server"
import HomeClient from "@/components/HomeClient"

const DEFAULT_LEFT = "https://images.unsplash.com/photo-1598371839696-5c5bb00bdc28?w=1400&q=80&auto=format&fit=crop"
const DEFAULT_RIGHT = "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=1400&q=80&auto=format&fit=crop"

export default async function Home() {
  let leftImageUrl = DEFAULT_LEFT
  let rightImageUrl = DEFAULT_RIGHT

  try {
    const supabase = createServiceClient()
    const { data } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "homepage_images")
      .single()

    if (data?.value) {
      leftImageUrl = data.value.left_image_url || DEFAULT_LEFT
      rightImageUrl = data.value.right_image_url || DEFAULT_RIGHT
    }
  } catch {
    // Fall back to defaults if site_settings table doesn't exist yet
  }

  return (
    <HomeClient
      leftImageUrl={leftImageUrl}
      rightImageUrl={rightImageUrl}
    />
  )
}
