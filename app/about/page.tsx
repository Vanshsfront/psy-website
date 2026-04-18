import { createServiceClient } from "@/lib/supabase-server"
import AboutClient from "@/components/about/AboutClient"

export const revalidate = 60

export default async function AboutPage() {
  let meetTheTeam = { photo_url: "", heading: "Meet the Team", description: "" }

  try {
    const supabase = createServiceClient()
    const { data } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "meet_the_team")
      .single()

    if (data?.value) {
      meetTheTeam = {
        photo_url: data.value.photo_url || "",
        heading: data.value.heading || "Meet the Team",
        description: data.value.description || "",
      }
    }
  } catch {
    // Fall back to defaults if site_settings table doesn't exist yet
  }

  return <AboutClient meetTheTeam={meetTheTeam} />
}
