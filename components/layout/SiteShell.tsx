"use client"

import { usePathname } from "next/navigation"
import Navbar from "./Navbar"
import Footer from "./Footer"
import BottomBlur from "./BottomBlur"
import LenisProvider from "./LenisProvider"

export default function SiteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isStoreAdmin = pathname.startsWith("/storeadmin")
  const isAdmin = pathname.startsWith("/admin")

  if (isStoreAdmin || isAdmin) {
    return <>{children}</>
  }

  return (
    <LenisProvider>
      <Navbar />
      <BottomBlur />
      {children}
      <Footer />
    </LenisProvider>
  )
}
