"use client"

import Link from "next/link"
import FadeInOnScroll from "@/components/animations/FadeInOnScroll"
import type { BlogPost } from "@/types"

function formatDate(dateStr: string | null) {
  if (!dateStr) return ""
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

export default function BlogTab({ posts }: { posts: BlogPost[] }) {
  return (
    <section className="py-20 px-6">
      <div className="max-w-5xl mx-auto">
        <FadeInOnScroll direction="none">
          <div className="flex items-center mb-12">
            <span className="font-sans uppercase tracking-[0.2em] text-taupe text-micro shrink-0">
              Journal
            </span>
            <div className="flex-1 mx-6 h-[1px] bg-taupe/20" />
          </div>
        </FadeInOnScroll>

        {posts.length === 0 ? (
          <div className="text-center py-24">
            <p className="font-display italic text-taupe text-body-lg">
              Stories coming soon.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            {posts.map((post, i) => (
              <FadeInOnScroll key={post.id} direction="up" delay={i * 0.05}>
                <Link
                  href={`/studio/blog/${post.slug}`}
                  className="group block"
                >
                  {post.cover_image_url && (
                    <div className="aspect-[16/10] overflow-hidden bg-[#1a1a1a] mb-5">
                      <img
                        src={post.cover_image_url}
                        alt={post.title}
                        className="w-full h-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.04]"
                      />
                    </div>
                  )}
                  <span className="font-sans uppercase tracking-widest text-micro text-taupe">
                    {formatDate(post.published_at ?? post.created_at)}
                    {post.author ? ` · ${post.author}` : ""}
                  </span>
                  <h3 className="font-display text-display-md text-bone mt-2 mb-3 leading-tight group-hover:text-psy-green transition-colors duration-300">
                    {post.title}
                  </h3>
                  {post.excerpt && (
                    <p className="font-sans text-body text-taupe leading-relaxed">
                      {post.excerpt}
                    </p>
                  )}
                  <span className="text-cta font-sans uppercase tracking-widest text-micro text-psy-green mt-4 inline-block">
                    Read →
                  </span>
                </Link>
              </FadeInOnScroll>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
