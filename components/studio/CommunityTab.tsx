"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { X } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
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
  const [selectedPost, setSelectedPost] = useState<CommunityPost | null>(null)

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedPost(null)
    }
    if (selectedPost) {
      document.addEventListener("keydown", handleKeyDown)
      document.body.style.overflow = "hidden"
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      document.body.style.overflow = ""
    }
  }, [selectedPost])

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
    <>
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
                <div
                  onClick={() => setSelectedPost(post)}
                  className="group bg-[#111111] border border-[#2a2a2a] overflow-hidden hover:border-taupe/30 transition-colors duration-300 cursor-pointer"
                >
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
                    <span className="inline-block mt-3 font-sans text-micro text-psy-green uppercase tracking-widest">
                      Read More →
                    </span>
                  </div>
                </div>
              </FadeInOnScroll>
            ))}
          </div>
        </div>
      </section>

      {/* Expanded Post Modal */}
      <AnimatePresence>
        {selectedPost && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 bg-ink/80 backdrop-blur-sm z-50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedPost(null)}
            />

            {/* Modal */}
            <motion.div
              className="fixed inset-4 md:inset-8 lg:inset-y-12 lg:inset-x-[15%] z-50 bg-[#111111] border border-[#2a2a2a] overflow-y-auto"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
            >
              {/* Close button */}
              <button
                onClick={() => setSelectedPost(null)}
                className="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center bg-ink/60 border border-taupe/20 text-taupe hover:text-bone hover:border-bone transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Image */}
              {selectedPost.image_url && (
                <div className="relative w-full aspect-video md:aspect-[21/9]">
                  <Image
                    src={selectedPost.image_url}
                    alt={selectedPost.title}
                    fill
                    className="object-cover"
                  />
                </div>
              )}

              {/* Content */}
              <div className="p-6 md:p-10 lg:p-12">
                <div className="flex items-center gap-3 mb-4">
                  <span
                    className={`text-[10px] uppercase tracking-widest font-medium px-2 py-0.5 ${
                      TYPE_STYLES[selectedPost.type] || TYPE_STYLES.announcement
                    }`}
                  >
                    {selectedPost.type}
                  </span>
                  {selectedPost.event_date && (
                    <span className="text-caption text-taupe">
                      {formatDate(selectedPost.event_date)}
                    </span>
                  )}
                  <span className="text-micro text-taupe/60">
                    {formatDate(selectedPost.created_at)}
                  </span>
                </div>

                <h2 className="font-display font-light text-display-xl text-bone leading-tight mb-6">
                  {selectedPost.title}
                </h2>

                {selectedPost.description && (
                  <p className="font-sans text-body-lg text-taupe leading-relaxed mb-6">
                    {selectedPost.description}
                  </p>
                )}

                {selectedPost.content && (
                  <div
                    className="font-sans text-body text-taupe/90 leading-relaxed prose prose-invert max-w-none"
                    dangerouslySetInnerHTML={{ __html: selectedPost.content }}
                  />
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
