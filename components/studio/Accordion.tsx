"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { CustomStyle } from "@/types"

const PSY_EASE = [0.16, 1, 0.3, 1] as [number, number, number, number]

export default function Accordion({ styles }: { styles: CustomStyle[] }) {
  const [openId, setOpenId] = useState<string | null>(null)

  const toggle = (id: string) => {
    setOpenId(openId === id ? null : id)
  }

  const displayStyles =
    styles.length > 0
      ? styles
      : ([
          {
            id: "1",
            name: "Traditional",
            description:
              "Bold lines, rich color palettes, and iconic imagery rooted in history.",
            starting_price: 3000,
            example_image_url: null,
          },
          {
            id: "2",
            name: "Blackwork",
            description:
              "Heavy black ink compositions. Geometric precision meets freeform artistry.",
            starting_price: 4000,
            example_image_url: null,
          },
          {
            id: "3",
            name: "Fine-line",
            description:
              "Delicate, detailed lines that whisper rather than shout. Minimal and intentional.",
            starting_price: 2500,
            example_image_url: null,
          },
        ] as CustomStyle[])

  return (
    <div className="w-full max-w-4xl">
      {displayStyles.map((style) => (
        <div key={style.id}>
          {/* Divider line */}
          <div className="h-[1px] bg-taupe/20" />

          <button
            onClick={() => toggle(style.id)}
            className="w-full flex items-center justify-between py-8 text-left cursor-pointer group"
          >
            <span className="font-display text-display-lg text-bone group-hover:text-taupe transition-colors duration-[400ms]">
              {style.name}
            </span>
          </button>

          <AnimatePresence>
            {openId === style.id && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.5, ease: PSY_EASE }}
                className="overflow-hidden"
              >
                <div className="pb-8 flex flex-col md:flex-row md:justify-between md:items-end gap-4">
                  <p className="font-sans text-body text-taupe leading-relaxed max-w-lg">
                    {style.description}
                  </p>
                  <span className="font-sans text-caption text-psy-green whitespace-nowrap">
                    Starting from ₹{style.starting_price}
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
      {/* Final divider */}
      <div className="h-[1px] bg-taupe/20" />
    </div>
  )
}
