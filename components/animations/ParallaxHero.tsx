'use client'

import { useEffect } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'

interface ParallaxHeroProps {
  background: React.ReactNode
  foreground?: React.ReactNode
  intensity?: number
  className?: string
}

export default function ParallaxHero({
  background,
  foreground,
  intensity = 15,
  className,
}: ParallaxHeroProps) {
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  const springConfig = { stiffness: 80, damping: 20 }
  const springX = useSpring(mouseX, springConfig)
  const springY = useSpring(mouseY, springConfig)

  const bgX = useTransform(springX, [0, 1], [-intensity * 0.5, intensity * 0.5])
  const bgY = useTransform(springY, [0, 1], [-intensity * 0.5, intensity * 0.5])
  const fgX = useTransform(springX, [0, 1], [-intensity * 1.5, intensity * 1.5])
  const fgY = useTransform(springY, [0, 1], [-intensity * 1.5, intensity * 1.5])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const { innerWidth, innerHeight } = window
      mouseX.set(e.clientX / innerWidth)
      mouseY.set(e.clientY / innerHeight)
    }
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [mouseX, mouseY])

  return (
    <div className={`relative overflow-hidden ${className ?? ''}`}>
      <motion.div
        className="absolute inset-0"
        style={{ x: bgX, y: bgY }}
      >
        {background}
      </motion.div>
      {foreground && (
        <motion.div
          className="relative z-10"
          style={{ x: fgX, y: fgY }}
        >
          {foreground}
        </motion.div>
      )}
      {!foreground && (
        <div className="relative z-10">
          {/* When no foreground is provided, render nothing — 
              parent should place content via absolute positioning */}
        </div>
      )}
    </div>
  )
}
