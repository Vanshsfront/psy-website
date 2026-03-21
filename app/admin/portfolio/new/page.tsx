import PortfolioForm from "@/components/admin/PortfolioForm"

export default function NewPortfolioPage() {
  return (
    <div>
      <div className="mb-8 pb-4 border-b border-borderDark">
        <h1 className="font-display text-3xl font-bold">Add to Gallery</h1>
      </div>
      <PortfolioForm />
    </div>
  )
}
