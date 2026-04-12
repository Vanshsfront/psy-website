import { createSSRClient } from "@/lib/supabase-server"
import { notFound } from "next/navigation"
import Link from "next/link"

export const revalidate = 60

export default async function ArtistDetail({
  params,
}: {
  params: { slug: string }
}) {
  const supabase = await createSSRClient()
  const { data: artist, error } = await supabase
    .from("artists")
    .select("*")
    .eq("slug", params.slug)
    .single()

  if (!artist || error) {
    notFound()
  }

  const { data: portfolio } = await supabase
    .from("portfolio_items")
    .select("*")
    .eq("artist_id", artist.id)

  return (
    <main className="min-h-screen pb-24 pt-20">
      {/* Artist Hero */}
      <section className="relative w-full min-h-[60vh] md:min-h-[70vh] flex items-end overflow-hidden">
        {artist.profile_photo_url ? (
          <div
            className="absolute inset-0 bg-cover bg-center grayscale opacity-30"
            style={{ backgroundImage: `url(${artist.profile_photo_url})` }}
          />
        ) : (
          <div className="absolute inset-0 bg-surface" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/80 to-transparent" />

        <div className="relative z-10 p-8 md:p-16 max-w-7xl mx-auto w-full">
          <Link
            href="/studio"
            className="text-cta font-sans uppercase tracking-widest text-micro text-taupe mb-8 inline-block"
          >
            ← Back to Studio
          </Link>
          <h1 className="font-display font-light text-display-2xl text-bone mb-2">
            {artist.name}
          </h1>
          {artist.speciality && (
            <span className={`inline-block mt-2 px-3 py-1 text-micro uppercase tracking-widest font-sans border ${
              artist.speciality === "Tattoos"
                ? "border-psy-green/40 text-psy-green"
                : artist.speciality === "Piercings"
                ? "border-gold/40 text-gold"
                : "border-terracotta/40 text-terracotta"
            }`}>
              {artist.speciality}
            </span>
          )}
        </div>
      </section>

      {/* Bio & Details */}
      <section className="max-w-7xl mx-auto px-6 py-24 grid grid-cols-1 md:grid-cols-3 gap-16">
        <div className="md:col-span-2">
          <span className="font-sans uppercase tracking-[0.3em] text-taupe text-micro block mb-6">
            About
          </span>
          <div className="font-sans text-body-lg text-taupe leading-relaxed space-y-4">
            {artist.bio ? (
              artist.bio
                .split("\n")
                .map((p: string, i: number) => <p key={i}>{p}</p>)
            ) : (
              <p>
                Passionate artist at PSY.
              </p>
            )}
          </div>
        </div>
        <div>
          <div className="flex flex-col space-y-8">
            <div>
              <span className="font-sans text-micro uppercase tracking-widest text-taupe block mb-4">
                Book with {artist.name}
              </span>
              <p className="font-sans text-caption text-taupe mb-6">
                Every session begins with a conversation. Books open bi-monthly.
              </p>
              <Link href="/studio#book">
                <button className="w-full border border-psy-green bg-transparent text-psy-green uppercase tracking-widest text-caption py-3 px-8 rounded-[2px] hover:bg-psy-green hover:text-ink transition-all duration-[400ms] cursor-pointer">
                  Book Now
                </button>
              </Link>
            </div>

            {artist.instagram && (
              <div className="pt-8 border-t border-taupe/20">
                <span className="font-sans text-micro uppercase tracking-widest text-taupe block mb-3">
                  Follow
                </span>
                <a
                  href={`https://instagram.com/${artist.instagram}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-cta font-sans text-caption text-bone"
                >
                  @{artist.instagram}
                </a>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Portfolio Grid */}
      <section className="max-w-7xl mx-auto px-6 pt-12 border-t border-taupe/20">
        <span className="font-sans uppercase tracking-[0.3em] text-taupe text-micro block mb-12">
          Selected Works
        </span>

        {portfolio && portfolio.length > 0 ? (
          <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
            {portfolio.map((item) => (
              <div
                key={item.id}
                className="relative group overflow-hidden break-inside-avoid"
              >
                <img
                  src={item.image_url}
                  alt={item.description || "Portfolio item"}
                  className="w-full object-cover transition-transform duration-700"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-bone/0 group-hover:bg-bone/[0.05] transition-colors duration-[400ms]" />
              </div>
            ))}
          </div>
        ) : (
          <div className="w-full text-center py-24">
            <p className="font-display italic text-taupe text-body-lg">
              More coming soon.
            </p>
          </div>
        )}
      </section>
    </main>
  )
}
