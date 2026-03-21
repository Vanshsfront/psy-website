'use client'

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'

const PSY_EASE = [0.16, 1, 0.3, 1] as [number, number, number, number]

interface FadeInOnScrollProps {
  children: React.ReactNode
  delay?: number
  direction?: 'up' | 'down' | 'left' | 'right' | 'none'
  duration?: number
  className?: string
}

export default function FadeInOnScroll({
  children,
  delay = 0,
  direction = 'up',
  duration = 0.7,
  className,
}: FadeInOnScrollProps) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })

  const directionMap = {
    up: { y: 24, x: 0 },
    down: { y: -24, x: 0 },
    left: { x: 24, y: 0 },
    right: { x: -24, y: 0 },
    none: { x: 0, y: 0 },
  }

  const { x, y } = directionMap[direction]

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, x, y }}
      animate={isInView ? { opacity: 1, x: 0, y: 0 } : { opacity: 0, x, y }}
      transition={{ duration, ease: PSY_EASE, delay }}
      className={className}
    >
      {children}
    </motion.div>
  )
}
