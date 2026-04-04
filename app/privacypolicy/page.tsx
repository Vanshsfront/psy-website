export default function PrivacyPolicyPage() {
  return (
    <main className="w-full bg-ink min-h-screen px-6 py-20">
      <div className="max-w-3xl mx-auto">
        <h1 className="font-display text-3xl md:text-4xl tracking-widest text-bone mb-2">
          Privacy Policy
        </h1>
        <p className="font-sans text-micro text-taupe/50 uppercase tracking-[0.2em] mb-12">
          Last updated: April 2025
        </p>

        <div className="space-y-10 font-sans text-caption text-taupe leading-relaxed">
          <section>
            <h2 className="text-bone text-sm uppercase tracking-[0.2em] mb-3">1. Information We Collect</h2>
            <p>
              When you book a session, place an order, or contact us, we collect personal information such as your name, email address, phone number, and any details you provide about your tattoo request. We also collect payment information through our secure payment processor (Razorpay), though we do not store card details on our servers.
            </p>
          </section>

          <section>
            <h2 className="text-bone text-sm uppercase tracking-[0.2em] mb-3">2. How We Use Your Information</h2>
            <p>We use your information to:</p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-taupe/80">
              <li>Process bookings and orders</li>
              <li>Communicate with you about your appointment or purchase</li>
              <li>Send order confirmations and updates</li>
              <li>Improve our services</li>
            </ul>
          </section>

          <section>
            <h2 className="text-bone text-sm uppercase tracking-[0.2em] mb-3">3. Sharing Your Information</h2>
            <p>
              We do not sell or rent your personal information to third parties. We may share your information with service providers (such as payment processors and courier services) solely to fulfill your orders and bookings. These providers are bound by confidentiality obligations.
            </p>
          </section>

          <section>
            <h2 className="text-bone text-sm uppercase tracking-[0.2em] mb-3">4. Data Security</h2>
            <p>
              We take reasonable measures to protect your personal information from unauthorized access, loss, or misuse. All payment transactions are encrypted and processed through Razorpay's secure infrastructure.
            </p>
          </section>

          <section>
            <h2 className="text-bone text-sm uppercase tracking-[0.2em] mb-3">5. Cookies</h2>
            <p>
              Our website may use cookies to improve your browsing experience. You can disable cookies in your browser settings, though some features of the site may not function properly without them.
            </p>
          </section>

          <section>
            <h2 className="text-bone text-sm uppercase tracking-[0.2em] mb-3">6. Your Rights</h2>
            <p>
              You may request access to, correction of, or deletion of your personal data by contacting us at the email below. We will respond within a reasonable timeframe.
            </p>
          </section>

          <section>
            <h2 className="text-bone text-sm uppercase tracking-[0.2em] mb-3">7. Contact</h2>
            <p>
              For any privacy-related questions, please reach out to us at{" "}
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
