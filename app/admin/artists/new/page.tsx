import ArtistForm from "@/components/admin/ArtistForm"

export default function NewArtistPage() {
  return (
    <div>
      <div className="mb-8 pb-4 border-b border-borderDark">
        <h1 className="font-display text-3xl font-bold">Recruit Artist</h1>
      </div>
      <ArtistForm />
    </div>
  )
}
