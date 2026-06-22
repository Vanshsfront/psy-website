import { createSSRClient } from "@/lib/supabase-server"
import BlogTab from "@/components/studio/BlogTab"
import type { BlogPost } from "@/types"

export const revalidate = 60 // ISR: revalidate every 60 seconds

export const metadata = {
  title: "Journal | PSY Tattoos & Shop",
  description: "Stories, events, and notes from the PSY studio.",
}

export default async function BlogHome() {
  const supabase = await createSSRClient()

  const { data: blogPosts } = await supabase
    .from("blog_posts")
    .select("*")
    .eq("is_published", true)
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })

  return (
    <main className="w-full bg-ink min-h-screen text-bone pt-24">
      <div className="max-w-5xl mx-auto px-6">
        <h1 className="font-display font-light text-display-2xl text-bone leading-[0.95] mb-4">
          Journal
        </h1>
        <p className="font-sans text-body text-taupe leading-relaxed max-w-md">
          Stories, events, and notes from the studio.
        </p>
      </div>
      <BlogTab posts={(blogPosts as BlogPost[]) || []} />
    </main>
  )
}
