import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { createSSRClient } from "@/lib/supabase-server"
import type { BlogPost } from "@/types"

export const revalidate = 60

function formatDate(dateStr: string | null) {
  if (!dateStr) return ""
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

export default async function BlogPostPage({
  params,
}: {
  params: { slug: string }
}) {
  const supabase = await createSSRClient()
  const { data: post } = await supabase
    .from("blog_posts")
    .select("*")
    .eq("slug", params.slug)
    .eq("is_published", true)
    .maybeSingle()

  if (!post) notFound()
  const p = post as BlogPost

  return (
    <main className="w-full bg-ink min-h-screen pt-24 pb-32">
      <article className="max-w-3xl mx-auto px-6">
        <Link
          href="/blog"
          className="inline-flex items-center gap-2 text-taupe hover:text-bone transition-colors text-caption font-sans uppercase tracking-widest mb-12"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Journal
        </Link>

        <div className="mb-10">
          <span className="font-sans uppercase tracking-widest text-micro text-taupe">
            {formatDate(p.published_at ?? p.created_at)}
            {p.author ? ` · ${p.author}` : ""}
          </span>
          {/* display-lg, not display-2xl. The 2xl step is a hero size — up to
              144px — which set an eight-to-one ratio against the 18px body text
              and pushed the article itself below the fold on a laptop. */}
          <h1 className="font-display text-display-lg text-bone mt-3 leading-tight max-w-3xl">
            {p.title}
          </h1>
          {p.excerpt && (
            <p className="font-display italic text-taupe text-body-lg mt-4 leading-relaxed">
              {p.excerpt}
            </p>
          )}
        </div>

        {p.cover_image_url && (
          <div className="aspect-[16/9] overflow-hidden bg-[#1a1a1a] mb-12">
            <img
              src={p.cover_image_url}
              alt={p.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <div
          className="prose prose-invert max-w-none font-sans text-body text-bone/90 leading-relaxed prose-headings:font-display prose-headings:text-bone prose-a:text-psy-green hover:prose-a:underline prose-strong:text-bone prose-img:rounded"
          dangerouslySetInnerHTML={{ __html: p.content }}
        />
      </article>
    </main>
  )
}
