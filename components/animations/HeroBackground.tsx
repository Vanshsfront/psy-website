"use client"

import { motion } from "framer-motion"
import { useEffect, useState } from "react"

const COLORS = ["bg-neon-cyan", "bg-psy-green", "bg-neon-purple", "bg-terracotta"]

interface Shape {
  id: number
  x: string
  y: string
  color: string
  size: string
  duration: number
  delay: number
}

export default function HeroBackground() {
  const [shapes, setShapes] = useState<Shape[]>([])

  useEffect(() => {
    // Generate 12 random floating shapes on mount to avoid hydration mismatch
    const generated = Array.from({ length: 12 }).map((_, i) => ({
      id: i,
      x: `${Math.random() * 100}%`,
      y: `${Math.random() * 100}%`,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      size: `${Math.max(100, Math.random() * 400)}px`,
      duration: 15 + Math.random() * 20,
      delay: Math.random() * 5,
    }))
    setShapes(generated)
  }, [])

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10 bg-ink">
      <div className="absolute inset-0 opacity-20 filter blur-[100px] saturate-150">
        {shapes.map((shape) => (
          <motion.div
            key={shape.id}
            className={`absolute rounded-full mix-blend-screen opacity-60 ${shape.color}`}
            style={{
              width: shape.size,
              height: shape.size,
              left: shape.x,
              top: shape.y,
            }}
            animate={{
              x: ["-20%", "20%", "-10%", "-20%"],
              y: ["-20%", "10%", "20%", "-20%"],
              scale: [1, 1.2, 0.9, 1],
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              duration: shape.duration,
              repeat: Infinity,
              ease: "linear",
              delay: shape.delay,
            }}
          />
        ))}
      </div>
      
      {/* Noise overlay to give texture over the blurred gradients */}
      <div 
        className="absolute inset-0 opacity-[0.03] z-[1] pointer-events-none" 
        style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}
      />
    </div>
  )
}
