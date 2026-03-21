import CheckoutClient from "@/components/shop/CheckoutClient"

export default async function CheckoutPage() {
  return (
    <main className="min-h-screen bg-ink">
      <div className="max-w-7xl mx-auto px-6 py-24 pt-28">
        <span className="font-sans uppercase tracking-[0.3em] text-taupe text-micro block mb-4">
          Checkout
        </span>
        <h1 className="font-display font-light text-display-xl text-bone mb-16">
          Secure Checkout
        </h1>
        <CheckoutClient />
      </div>
    </main>
  )
}
