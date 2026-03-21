import { createSSRClient } from "@/lib/supabase-server"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Plus, Trash2, Instagram } from "lucide-react"

export const revalidate = 0

export default async function AdminArtistsPage() {
  const supabase = await createSSRClient()
  const { data: artists } = await supabase
    .from("artists")
    .select("*")
    .order("name", { ascending: true })

  return (
    <div>
      <div className="flex justify-between items-center mb-8 pb-4 border-b border-borderDark">
        <h1 className="font-display text-3xl font-bold">Resident Artists</h1>
        <Link href="/admin/artists/new">
          <Button variant="neon" className="flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Artist
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {artists && artists.length > 0 ? (
          artists.map(artist => (
            <div key={artist.id} className="bg-surface border border-borderDark rounded overflow-hidden flex flex-col">
              <div className="h-48 bg-surfaceLighter relative">
                {artist.image_url ? (
                  <img src={artist.image_url} alt={artist.name} className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-500" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-mutedText border-b border-borderDark">No Image</div>
                )}
                <div className="absolute top-3 right-3 bg-background/80 backdrop-blur px-2 py-1 text-xs font-mono rounded text-neon-purple border border-borderDark">
                  {artist.specialties[0]}
                </div>
              </div>
              <div className="p-4 flex flex-col flex-1">
                <h3 className="font-display font-bold text-xl mb-1">{artist.name}</h3>
                <p className="text-sm text-mutedText font-mono mb-4">/{artist.slug}</p>
                
                {artist.instagram && (
                  <a href={`https://instagram.com/${artist.instagram.replace('@','')}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-mutedText hover:text-white transition-colors mb-4 inline-block w-fit">
                    <Instagram className="w-4 h-4" /> {artist.instagram}
                  </a>
                )}
                
                <p className="text-sm text-mutedText line-clamp-3 mb-6 flex-1">
                  {artist.bio}
                </p>

                <div className="pt-4 border-t border-borderDark flex justify-between items-center mt-auto">
                  <span className="text-xs text-mutedText font-mono">{artist.specialties.length} styles</span>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" className="text-mutedText hover:text-danger">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full py-12 text-center text-mutedText border border-dashed border-borderDark rounded bg-surfaceLighter">
            No artists found. Add your first resident.
          </div>
        )}
      </div>

    </div>
  )
}
