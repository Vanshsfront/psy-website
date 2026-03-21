'use client'

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'

const PSY_EASE = [0.16, 1, 0.3, 1] as [number, number, number, number]

interface LineRevealProps {
  className?: string
  width?: string
  delay?: number
  duration?: number
}

export default function LineReveal({
  className = '',
  width = '80px',
  delay = 0,
  duration = 0.8,
}: LineRevealProps) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true })

  return (
    <motion.div
      ref={ref}
      className={`h-[1px] bg-taupe/40 ${className}`}
      style={{ width }}
      initial={{ scaleX: 0 }}
      animate={isInView ? { scaleX: 1 } : { scaleX: 0 }}
      transition={{ duration, delay, ease: PSY_EASE }}
    />
  )
}
