export default function TermsOfServicePage() {
  return (
    <main className="w-full bg-ink min-h-screen px-6 py-20">
      <div className="max-w-3xl mx-auto">
        <h1 className="font-display text-3xl md:text-4xl tracking-widest text-bone mb-2">
          Terms of Service
        </h1>
        <p className="font-sans text-micro text-taupe/50 uppercase tracking-[0.2em] mb-12">
          Last updated: April 2025
        </p>

        <div className="space-y-10 font-sans text-caption text-taupe leading-relaxed">
          <section>
            <h2 className="text-bone text-sm uppercase tracking-[0.2em] mb-3">1. Acceptance of Terms</h2>
            <p>
              By accessing this website or booking a session with PSY Tattoos, you agree to be bound by these Terms of Service. If you do not agree, please do not use our services.
            </p>
          </section>

          <section>
            <h2 className="text-bone text-sm uppercase tracking-[0.2em] mb-3">2. Booking & Deposits</h2>
            <p>
              All bookings require a non-refundable deposit to confirm your appointment. This deposit is deducted from the final session cost. Deposits are forfeited if you cancel without providing at least 48 hours' notice. We reserve the right to decline any booking at our discretion.
            </p>
          </section>

          <section>
            <h2 className="text-bone text-sm uppercase tracking-[0.2em] mb-3">3. Rescheduling & Cancellations</h2>
            <p>
              You may reschedule your appointment once without penalty, provided you notify us at least 48 hours in advance. Same-day cancellations or no-shows will result in forfeiture of the deposit. PSY Tattoos reserves the right to reschedule appointments due to artist unavailability or other circumstances, with advance notice to you.
            </p>
          </section>

          <section>
            <h2 className="text-bone text-sm uppercase tracking-[0.2em] mb-3">4. Health & Safety</h2>
            <p>
              You confirm that you are at least 18 years of age. You are responsible for disclosing any medical conditions, allergies, or skin sensitivities prior to your session. PSY Tattoos follows strict hygiene and sterilisation protocols; however, you accept inherent risks associated with tattooing. We reserve the right to refuse service if we believe proceeding would pose a health or safety risk.
            </p>
          </section>

          <section>
            <h2 className="text-bone text-sm uppercase tracking-[0.2em] mb-3">5. Shop Orders & Returns</h2>
            <p>
              All shop purchases are final. We do not accept returns or exchanges unless the item arrives damaged or defective. In the event of a defective item, please contact us within 7 days of delivery with photographic evidence and we will arrange a replacement or refund at our discretion.
            </p>
          </section>

          <section>
            <h2 className="text-bone text-sm uppercase tracking-[0.2em] mb-3">6. Intellectual Property</h2>
            <p>
              All artwork, designs, photographs, and content on this website are the intellectual property of PSY Tattoos or the respective artists. You may not reproduce, distribute, or use any content without prior written permission.
            </p>
          </section>

          <section>
            <h2 className="text-bone text-sm uppercase tracking-[0.2em] mb-3">7. Limitation of Liability</h2>
            <p>
              PSY Tattoos is not liable for any indirect, incidental, or consequential damages arising from the use of our services or website. Our liability is limited to the amount paid for the specific service in question.
            </p>
          </section>

          <section>
            <h2 className="text-bone text-sm uppercase tracking-[0.2em] mb-3">8. Changes to Terms</h2>
            <p>
              We may update these Terms of Service at any time. Continued use of our services after changes are posted constitutes acceptance of the revised terms.
            </p>
          </section>

          <section>
            <h2 className="text-bone text-sm uppercase tracking-[0.2em] mb-3">9. Contact</h2>
            <p>
              For any questions about these terms, please contact us at{" "}
              <a
                href="mailto:psytattooindia@gmail.com"
                className="text-bone hover:text-psy-green transition-colors duration-300"
              >
                psytattooindia@gmail.com
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </main>
  )
}
