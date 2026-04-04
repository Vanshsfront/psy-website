"use client"

import Image from "next/image"
import FadeInOnScroll from "@/components/animations/FadeInOnScroll"
import type { CommunityPost } from "@/types"

const TYPE_STYLES: Record<string, string> = {
  event: "bg-psy-green/20 text-psy-green",
  collab: "bg-amber-500/20 text-amber-400",
  announcement: "bg-taupe/20 text-taupe",
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

export default function CommunityTab({
  posts,
}: {
  posts: CommunityPost[]
}) {
  if (posts.length === 0) {
    return (
      <section className="py-32 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <p className="font-display italic text-taupe text-body-lg">
            Nothing posted yet. Check back soon.
          </p>
        </div>
      </section>
    )
  }

  return (
    <section className="py-24 px-6">
      <div className="max-w-7xl mx-auto">
        <FadeInOnScroll direction="none">
          <div className="flex items-center mb-12">
            <span className="font-sans uppercase tracking-[0.2em] text-taupe text-micro shrink-0">
              Community
            </span>
            <div className="flex-1 mx-6 h-[1px] bg-taupe/20" />
          </div>
        </FadeInOnScroll>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map((post, i) => (
            <FadeInOnScroll key={post.id} direction="up" delay={i * 0.08}>
              <div className="group bg-[#111111] border border-[#2a2a2a] overflow-hidden hover:border-taupe/30 transition-colors duration-300">
                {post.image_url && (
                  <div className="relative aspect-video overflow-hidden">
                    <Image
                      src={post.image_url}
                      alt={post.title}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    />
                  </div>
                )}
                <div className="p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <span
                      className={`text-[10px] uppercase tracking-widest font-medium px-2 py-0.5 ${
                        TYPE_STYLES[post.type] || TYPE_STYLES.announcement
                      }`}
                    >
                      {post.type}
                    </span>
                    {post.type === "event" && post.event_date && (
                      <span className="text-micro text-taupe">
                        {formatDate(post.event_date)}
                      </span>
                    )}
                  </div>
                  <h3 className="font-display text-xl text-bone leading-tight mb-2">
                    {post.title}
                  </h3>
                  {post.description && (
                    <p className="font-sans text-caption text-taupe leading-relaxed">
                      {post.description.length > 160
                        ? post.description.slice(0, 160) + "..."
                        : post.description}
                    </p>
                  )}
                </div>
              </div>
            </FadeInOnScroll>
          ))}
        </div>
      </div>
    </section>
  )
}
