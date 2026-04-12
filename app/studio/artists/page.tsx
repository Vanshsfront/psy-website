import { createSSRClient } from "@/lib/supabase-server"
import Link from "next/link"
import { Artist } from "@/types"

export const revalidate = 60

export default async function ArtistsPage() {
  const supabase = await createSSRClient()
  const { data: artists } = await supabase.from("artists").select("*")

  return (
    <main className="max-w-7xl mx-auto px-6 py-24 min-h-screen pt-28">
      <div className="mb-16">
        <span className="font-sans uppercase tracking-[0.3em] text-taupe text-micro block mb-4">
          PSY Tattoos
        </span>
        <h1 className="font-display font-light text-display-xl text-bone">
          The Artists
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
        {(artists as Artist[] || []).length > 0 ? (
          (artists as Artist[]).map((artist) => (
            <Link
              key={artist.id}
              href={`/studio/artists/${artist.slug}`}
              className="group block"
            >
              <div className="aspect-square overflow-hidden mb-6 bg-surface">
                {artist.profile_photo_url ? (
                  <img
                    src={artist.profile_photo_url}
                    alt={artist.name}
                    className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-[400ms]"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-taupe font-sans text-caption">
                    No Photo
                  </div>
                )}
              </div>
              <h3 className="font-display text-display-lg text-bone mb-1 group-hover:text-taupe transition-colors duration-[400ms]">
                {artist.name}
              </h3>
              {artist.speciality && (
                <span className={`inline-block mb-2 px-2 py-0.5 text-micro uppercase tracking-widest font-sans border ${
                  artist.speciality === "Tattoos"
                    ? "border-psy-green/40 text-psy-green"
                    : artist.speciality === "Piercings"
                    ? "border-gold/40 text-gold"
                    : "border-terracotta/40 text-terracotta"
                }`}>
                  {artist.speciality}
                </span>
              )}
              <p className="font-sans text-caption text-taupe/60 line-clamp-2 mb-4">
                {artist.bio}
              </p>
              <span className="text-cta font-sans uppercase tracking-widest text-micro text-bone">
                View Work →
              </span>
            </Link>
          ))
        ) : (
          <div className="col-span-full text-center py-24">
            <p className="font-display italic text-taupe text-body-lg">
              More coming soon.
            </p>
          </div>
        )}
      </div>
    </main>
  )
}
