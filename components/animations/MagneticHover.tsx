'use client'

import { useRef, useState, type MouseEvent, type ReactNode } from 'react'
import { motion } from 'framer-motion'

const PSY_EASE = [0.16, 1, 0.3, 1] as [number, number, number, number]

interface MagneticHoverProps {
  children: ReactNode
  strength?: number
  className?: string
}

export default function MagneticHover({
  children,
  strength = 0.3,
  className,
}: MagneticHoverProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ x: 0, y: 0 })

  const handleMouse = (e: MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return
    const { left, top, width, height } = ref.current.getBoundingClientRect()
    const x = (e.clientX - left - width / 2) * strength
    const y = (e.clientY - top - height / 2) * strength
    setPosition({ x, y })
  }

  const handleLeave = () => {
    setPosition({ x: 0, y: 0 })
  }

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouse}
      onMouseLeave={handleLeave}
      animate={{ x: position.x, y: position.y }}
      transition={{ type: 'spring', stiffness: 350, damping: 15, mass: 0.2 }}
      className={className}
    >
      {children}
    </motion.div>
  )
}
