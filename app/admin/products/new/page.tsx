import ProductForm from "@/components/admin/ProductForm"

export default function NewProductPage() {
  return (
    <div>
      <div className="mb-8 pb-4 border-b border-borderDark">
        <h1 className="font-display text-3xl font-bold">Add Physical Product</h1>
      </div>
      <ProductForm />
    </div>
  )
}
