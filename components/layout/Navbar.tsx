"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ShoppingBag, Menu, X, User } from "lucide-react"
import { useCartStore } from "@/store/cartStore"
import { useCustomerStore } from "@/store/customerStore"
import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"

const PSY_EASE = [0.16, 1, 0.3, 1] as const

export default function Navbar() {
  const pathname = usePathname()
  const cartItems = useCartStore(state => state.items)
  const [mounted, setMounted] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    setMounted(true)
    const handleScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  const isLoggedIn = useCustomerStore(state => state.isLoggedIn)
  const cartCount = mounted ? cartItems.reduce((acc, item) => acc + item.quantity, 0) : 0
  const customerLoggedIn = mounted ? isLoggedIn() : false

  const navLinks = [
    { name: "Studio", path: "/studio" },
    { name: "Shop", path: "/shop" },
    { name: "About", path: "/about" },
  ]

  // Hide on admin routes
  if (pathname.startsWith("/admin")) return null

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-[400ms] ${
          scrolled
            ? "bg-ink/90 backdrop-blur-md shadow-navbar"
            : "bg-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* LOGO */}
          <Link
            href="/"
            className="font-display text-[1.1rem] tracking-widest text-bone hover:opacity-80 transition-opacity duration-[400ms]"
          >
            PSY
          </Link>

          {/* CENTER NAV LINKS — Desktop */}
          <div className="hidden md:flex items-center space-x-10">
            {navLinks.map((link) => {
              const isActive =
                link.path === "/studio"
                  ? pathname === "/studio"
                  : link.path === "/shop"
                  ? pathname.startsWith("/shop")
                  : pathname.startsWith(link.path)
              return (
                <Link
                  key={link.name}
                  href={link.path}
                  className="relative group"
                >
                  <span
                    className={`font-sans uppercase tracking-widest text-caption transition-colors duration-[400ms] ${
                      isActive ? "text-bone" : "text-taupe group-hover:text-bone"
                    }`}
                  >
                    {link.name}
                  </span>
                  {/* Underline */}
                  <span
                    className={`absolute -bottom-1 left-0 h-[1px] bg-bone transition-all duration-[400ms] ${
                      isActive ? "w-full" : "w-0 group-hover:w-full"
                    }`}
                  />
                </Link>
              )
            })}
          </div>

          {/* RIGHT ACTIONS */}
          <div className="flex items-center space-x-6">
            <Link
              href={customerLoggedIn ? "/shop/account" : "/shop/account/login"}
              className="relative group"
              title={customerLoggedIn ? "Account" : "Login"}
            >
              <User className={`w-4.5 h-4.5 transition-all duration-300 group-hover:text-bone ${customerLoggedIn ? "text-psy-green" : "text-taupe/60"}`} />
            </Link>
            <Link href="/shop/cart" className="relative group">
              <ShoppingBag className="w-5 h-5 text-bone transition-opacity group-hover:opacity-70" />
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-psy-green text-[10px] font-bold text-ink">
                  {cartCount}
                </span>
              )}
            </Link>

            {/* Mobile hamburger */}
            <button
              className="md:hidden text-bone"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </nav>

      {/* MOBILE FULL-SCREEN OVERLAY */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: PSY_EASE }}
            className="fixed inset-0 z-40 bg-ink flex flex-col items-center justify-center overflow-hidden"
          >
            <nav className="flex flex-col items-center space-y-8">
              {navLinks.map((link, i) => (
                <motion.div
                  key={link.name}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    delay: 0.1 + i * 0.08,
                    duration: 0.5,
                    ease: PSY_EASE,
                  }}
                >
                  <Link
                    href={link.path}
                    className="font-display text-display-lg text-bone tracking-wide hover:text-taupe transition-colors duration-[400ms]"
                    onClick={() => setMobileOpen(false)}
                  >
                    {link.name}
                  </Link>
                </motion.div>
              ))}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
