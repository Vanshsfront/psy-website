'use client'

import { useRef, createElement } from 'react'
import { motion, useInView } from 'framer-motion'

const PSY_EASE = [0.16, 1, 0.3, 1] as [number, number, number, number]

interface TextRevealProps {
  text: string | string[]
  as?: 'h1' | 'h2' | 'h3' | 'p'
  className?: string
  delay?: number
  stagger?: number
}

export default function TextReveal({
  text,
  as = 'h2',
  className,
  delay = 0,
  stagger = 0.12,
}: TextRevealProps) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true })
  const lines = Array.isArray(text) ? text : [text]

  return createElement(
    as,
    { ref, className },
    lines.map((line, i) => (
      <span key={i} className="block overflow-hidden">
        <motion.span
          className="block"
          initial={{ y: '105%' }}
          animate={isInView ? { y: '0%' } : { y: '105%' }}
          transition={{
            duration: 0.9,
            ease: PSY_EASE,
            delay: delay + i * stagger,
          }}
        >
          {line}
        </motion.span>
      </span>
    ))
  )
}
