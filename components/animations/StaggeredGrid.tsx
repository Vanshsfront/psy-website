'use client'

import { useRef, Children, cloneElement, isValidElement } from 'react'
import { motion, useInView } from 'framer-motion'

const PSY_EASE = [0.16, 1, 0.3, 1] as [number, number, number, number]

interface StaggeredGridProps {
  children: React.ReactNode
  staggerDelay?: number
  className?: string
}

const containerVariants = {
  hidden: {},
  visible: (staggerDelay: number) => ({
    transition: {
      staggerChildren: staggerDelay,
    },
  }),
}

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: PSY_EASE,
    },
  },
}

export default function StaggeredGrid({
  children,
  staggerDelay = 0.08,
  className,
}: StaggeredGridProps) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-60px' })

  return (
    <motion.div
      ref={ref}
      className={className}
      variants={containerVariants}
      custom={staggerDelay}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
    >
      {Children.map(children, (child) => {
        if (!isValidElement(child)) return child
        return (
          <motion.div variants={itemVariants}>
            {cloneElement(child)}
          </motion.div>
        )
      })}
    </motion.div>
  )
}
