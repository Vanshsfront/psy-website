"use client"

import { useState } from "react"
import Link from "next/link"
import { Check, Download } from "lucide-react"

const TATTOO_CLAUSES = [
  "I will inform my tattooer of any condition that might affect the healing of this tattoo. I am not pregnant or nursing. I am not under the influence of alcohol or drugs.",
  "I do not have medical or skin conditions including but not limited to: acne, scarring (keloid), eczema, psoriasis, freckles, moles, or sunburn in the area to be tattooed that may interfere with the tattoo. If I have any type of infection or rash anywhere on my body, I will inform my tattooer.",
  "I acknowledge it is not reasonably possible for the representatives and employees of this studio to determine whether I might have an allergic reaction to the pigments or processes used, and I agree to accept the risk that such a reaction is possible.",
  "I acknowledge that infection is always possible as a result of obtaining a tattoo, particularly if I do not take proper care of it. I have received aftercare instructions and agree to follow them. I agree that any touch-up work needed due to my own negligence will be done at my own expense.",
  "I understand that variations in color and design may exist between the tattoo as selected and as ultimately applied to my body.",
  "I understand that if my skin color is dark, colors will not appear as bright as they do on light skin.",
  "I understand that skin treatments, laser hair removal, plastic surgery, or other skin-altering procedures may result in adverse changes to my tattoo.",
  "I acknowledge that a tattoo is a permanent change to my appearance and that no representations have been made regarding the ability to later change or remove it. To my knowledge, I do not have any physical, mental, or medical impairment or disability that might affect my wellbeing as a result of my decision to have a tattoo.",
  "I acknowledge I am over the age of 18 and that obtaining a tattoo is by my choice alone. I consent to the application of the tattoo and to any actions or conduct of the studio's representatives reasonably necessary to perform the procedure.",
]

const PIERCING_CLAUSES = [
  "I am not pregnant or nursing. I do not have epilepsy or hemophilia. I do not suffer from any heart conditions or take medication that thins the blood. I have informed my piercer of any condition such as diabetes that might hamper healing.",
  "If I suffer from hepatitis or any other communicable disease, I have informed the piercer and have been advised of any procedures necessary to promote satisfactory healing.",
  "I do not suffer from medical or skin conditions such as keloid or hypertrophic scarring, psoriasis at the piercing site, or any open wounds or lesions at the site of the piercing.",
  "I have advised the piercer of any allergies to metals, latex gloves, soaps, or medications. I acknowledge it is not reasonably possible for the piercer to determine whether I might have an allergic reaction, and I accept the risk that such a reaction is possible.",
  "I have truthfully represented that I am over the age of 18. I am not under the influence of drugs or alcohol. To my knowledge, I do not have any physical, mental, or medical impairment that might affect my wellbeing as a result of my decision to have a piercing done.",
  "I acknowledge that obtaining this piercing is my choice alone and will result in a permanent change to my appearance. No representation has been made regarding the ability to restore the skin to its pre-piercing condition.",
  "I acknowledge infection is always possible as a result of obtaining a piercing. I have received aftercare instructions and agree to follow them while my piercing is healing.",
  "I understand I will be pierced using appropriate instruments and sterilization. I agree to release and hold harmless the piercer and all employees from any and all claims, damages, or legal actions arising from or connected in any way with my piercing or the procedure used.",
]

const GENERAL_CLAUSES = [
  "I acknowledge that I am over the age of 18 and that all decisions to receive a tattoo and/or piercing are made by my own free will and choice.",
  "I consent to being filmed, photographed, and captured on the studio premises, which may be used as social media content.",
]

export default function ConsentPage() {
  const [name, setName] = useState("")
  const [agreed, setAgreed] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [confirmedAt, setConfirmedAt] = useState<Date | null>(null)

  const handleConfirm = () => {
    if (!agreed || !name.trim()) return
    setConfirmed(true)
    setConfirmedAt(new Date())
  }

  return (
    <main className="w-full bg-ink min-h-screen px-6 py-20">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-start justify-between mb-2 gap-4">
          <div>
            <h1 className="font-display text-3xl md:text-4xl tracking-widest text-bone mb-2">
              Consent Form
            </h1>
            <p className="font-sans text-micro text-taupe/50 uppercase tracking-[0.2em]">
              Tattoo &amp; Piercing
            </p>
          </div>
          <a
            href="/psy-consent-form.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center gap-2 border border-taupe/40 text-taupe hover:border-bone hover:text-bone uppercase tracking-widest text-micro py-2 px-4 transition-colors duration-300"
          >
            <Download className="w-3.5 h-3.5" /> PDF
          </a>
        </div>

        <p className="font-sans text-caption text-taupe leading-relaxed mt-8 mb-10">
          By proceeding, I acknowledge that I have been given the full opportunity to ask any
          and all questions about the tattoo and/or piercing procedure. All my questions have
          been answered to my complete satisfaction. I have been advised of the matters set
          forth below and agree as follows.
        </p>

        <Section title="Tattoo Consent" clauses={TATTOO_CLAUSES} />
        <Section title="Piercing Consent" clauses={PIERCING_CLAUSES} />
        <Section title="General Acknowledgements" clauses={GENERAL_CLAUSES} />

        {/* Confirm */}
        <div className="mt-12 border border-taupe/20 p-6">
          {confirmed ? (
            <div className="text-center py-6">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-psy-green/10 border border-psy-green mb-4">
                <Check className="w-5 h-5 text-psy-green" />
              </div>
              <h3 className="font-display text-2xl tracking-widest text-psy-green mb-2">
                Consent Recorded
              </h3>
              <p className="font-sans text-caption text-taupe">
                Thank you, <span className="text-bone">{name}</span>. Your consent was
                recorded on{" "}
                {confirmedAt?.toLocaleString(undefined, {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
                . Please show this confirmation to your artist before the session begins.
              </p>
            </div>
          ) : (
            <>
              <label className="block font-sans text-micro uppercase tracking-widest text-taupe mb-3">
                Full Name *
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Type your full name"
                className="flex h-12 w-full border-0 border-b border-taupe/40 bg-transparent px-0 py-3 text-body text-bone font-sans focus:border-psy-green focus:outline-none transition-colors mb-6"
              />
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-1 w-4 h-4 accent-psy-green"
                />
                <span className="font-sans text-caption text-taupe leading-relaxed">
                  <span className="text-bone">I accept all terms and conditions stated above.</span>{" "}
                  I confirm that I have read, understood, and agree to this unified consent
                  form for tattoo and/or piercing services at PSY Tattoos.
                </span>
              </label>
              <button
                type="button"
                disabled={!agreed || !name.trim()}
                onClick={handleConfirm}
                className="mt-6 w-full border border-psy-green bg-transparent text-psy-green uppercase tracking-widest text-caption py-4 hover:bg-psy-green hover:text-ink transition-all duration-[400ms] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                Confirm Consent
              </button>
            </>
          )}
        </div>

        <p className="font-sans text-micro text-taupe/40 text-center mt-10 leading-relaxed">
          PSY Tattoos &middot;{" "}
          <Link href="/" className="hover:text-taupe transition-colors">
            psyonline.in
          </Link>{" "}
          &middot; This is a digital consent form. Your agreement is recorded upon
          confirmation.
        </p>
      </div>
    </main>
  )
}

function Section({ title, clauses }: { title: string; clauses: string[] }) {
  return (
    <section className="mt-10">
      <h2 className="text-bone text-sm uppercase tracking-[0.2em] mb-4 pb-2 border-b border-taupe/15">
        {title}
      </h2>
      <ul className="space-y-4">
        {clauses.map((c, i) => (
          <li
            key={i}
            className="font-sans text-caption text-taupe leading-relaxed flex gap-3"
          >
            <span className="text-psy-green mt-1.5 flex-shrink-0">&bull;</span>
            <span>{c}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
