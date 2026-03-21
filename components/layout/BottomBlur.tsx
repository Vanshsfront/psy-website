'use client'

import { usePathname } from 'next/navigation'
import { motion, useScroll, useTransform, useSpring } from 'framer-motion'

export default function BottomBlur() {
  const pathname = usePathname()
  const { scrollY } = useScroll()

  const rawOpacity = useTransform(scrollY, [50, 150], [0, 1])
  const opacity = useSpring(rawOpacity, { stiffness: 100, damping: 20 })

  if (pathname.startsWith('/admin')) return null

  return (
    <motion.div
      className="fixed bottom-0 left-0 right-0 pointer-events-none z-40"
      style={{ height: '20vh', opacity }}
    >
      {/* Layer 1 — gradient fade to ink */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(to bottom, transparent 0%, rgba(10,10,10,0) 0%, rgba(10,10,10,0.3) 40%, rgba(10,10,10,0.85) 100%)',
        }}
      />
      {/* Layer 2 — backdrop blur masked */}
      <div
        className="absolute inset-0"
        style={{
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          maskImage:
            'linear-gradient(to bottom, transparent 0%, black 60%)',
          WebkitMaskImage:
            'linear-gradient(to bottom, transparent 0%, black 60%)',
        }}
      />
    </motion.div>
  )
}
