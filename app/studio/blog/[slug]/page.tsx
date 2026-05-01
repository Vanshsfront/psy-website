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
          href="/studio"
          className="inline-flex items-center gap-2 text-taupe hover:text-bone transition-colors text-caption font-sans uppercase tracking-widest mb-12"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Studio
        </Link>

        <div className="mb-10">
          <span className="font-sans uppercase tracking-widest text-micro text-taupe">
            {formatDate(p.published_at ?? p.created_at)}
            {p.author ? ` · ${p.author}` : ""}
          </span>
          <h1 className="font-display text-display-2xl text-bone mt-3 leading-tight">
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
