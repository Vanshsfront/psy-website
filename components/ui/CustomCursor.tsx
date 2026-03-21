"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { usePathname } from "next/navigation"

export default function CustomCursor() {
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isPointer, setIsPointer] = useState(false)
  const [isHidden, setIsHidden] = useState(true)
  const [isDesktop, setIsDesktop] = useState(true)
  const pathname = usePathname()

  // Disable on admin routes
  const isAdmin = pathname?.startsWith("/admin")

  useEffect(() => {
    const hasHover = window.matchMedia("(hover: hover)").matches
    setIsDesktop(hasHover)
    if (!hasHover || isAdmin) return

    const onMouseMove = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY })
      setIsHidden(false)

      const target = e.target as HTMLElement
      const isClickable =
        window.getComputedStyle(target).cursor === "pointer" ||
        target.tagName.toLowerCase() === "a" ||
        target.tagName.toLowerCase() === "button" ||
        target.closest("a") !== null ||
        target.closest("button") !== null

      setIsPointer(isClickable)
    }

    const onMouseLeave = () => setIsHidden(true)
    const onMouseEnter = () => setIsHidden(false)

    window.addEventListener("mousemove", onMouseMove)
    document.addEventListener("mouseleave", onMouseLeave)
    document.addEventListener("mouseenter", onMouseEnter)

    return () => {
      window.removeEventListener("mousemove", onMouseMove)
      document.removeEventListener("mouseleave", onMouseLeave)
      document.removeEventListener("mouseenter", onMouseEnter)
    }
  }, [isAdmin])

  if (!isDesktop || isAdmin || isHidden) return null

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        * { cursor: none !important; }
      `}} />
      <motion.div
        className="fixed top-0 left-0 w-5 h-5 rounded-full border-2 border-bone/80 pointer-events-none z-[9999] -ml-2.5 -mt-2.5 mix-blend-difference"
        animate={{
          x: position.x,
          y: position.y,
          scale: isPointer ? 2.5 : 1,
          opacity: 1,
        }}
        transition={{
          x: { duration: 0 },
          y: { duration: 0 },
          scale: { type: "spring", damping: 20, stiffness: 300, mass: 0.5 },
          opacity: { duration: 0.2 },
        }}
      />
    </>
  )
}
