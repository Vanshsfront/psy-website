"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import ArtistForm from "@/components/admin/ArtistForm"
import type { Artist } from "@/types"

export default function EditArtistPage({ params }: { params: { id: string } }) {
  const [artist, setArtist] = useState<Artist | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    async function fetchArtist() {
      try {
        const res = await fetch(`/api/admin/artists/${params.id}`)
        if (!res.ok) throw new Error("Artist not found")
        const data = await res.json()
        setArtist(data)
      } catch (e: any) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    fetchArtist()
  }, [params.id])

  if (loading) {
    return (
      <div>
        <div className="mb-8 pb-4 border-b border-borderDark">
          <div className="h-8 w-48 bg-surfaceLighter animate-pulse rounded" />
        </div>
        <div className="max-w-2xl bg-surface p-6 border border-borderDark rounded space-y-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-12 bg-surfaceLighter/50 animate-pulse rounded" />
          ))}
        </div>
      </div>
    )
  }

  if (error || !artist) {
    return (
      <div className="text-center py-20">
        <p className="text-danger mb-4">{error || "Artist not found"}</p>
        <button
          onClick={() => router.push("/admin/artists")}
          className="text-sm text-mutedText hover:text-white transition-colors"
        >
          ← Back to Artists
        </button>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8 pb-4 border-b border-borderDark">
        <h1 className="font-display text-3xl font-bold">Edit Artist</h1>
        <p className="text-sm text-mutedText mt-1">Editing {artist.name}</p>
      </div>
      <ArtistForm artist={artist} />
    </div>
  )
}
