'use client'

import { motion } from 'framer-motion'

const PSY_EASE = [0.16, 1, 0.3, 1] as [number, number, number, number]

interface HoverLiftProps {
  children: React.ReactNode
  lift?: number
  className?: string
}

export default function HoverLift({
  children,
  lift = -4,
  className,
}: HoverLiftProps) {
  return (
    <motion.div
      whileHover={{ y: lift }}
      transition={{ duration: 0.3, ease: PSY_EASE }}
      className={className}
    >
      {children}
    </motion.div>
  )
}
