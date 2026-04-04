"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Instagram, Facebook, MapPin } from "lucide-react"

const SOCIAL_LINKS = {
  instagram: "https://www.instagram.com/psytattoosindia/reels/?hl=en",
  facebook: "https://www.facebook.com/214077871800038",
  maps: "https://maps.app.goo.gl/xbL7DeaD5FSL9tUg9",
}

export default function Footer() {
  const pathname = usePathname()

  // Hide on admin routes and home page
  if (pathname.startsWith("/admin") || pathname === "/") return null

  return (
    <footer className="relative bg-[#080808] border-t border-taupe/10 pt-16 pb-8 px-6">
      <div className="max-w-7xl mx-auto">
        {/* Top section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-16">
          {/* Brand */}
          <div>
            <Link
              href="/"
              className="font-display text-2xl tracking-widest text-bone hover:opacity-80 transition-opacity duration-300"
            >
              PSY
            </Link>
            <p className="font-sans text-caption text-taupe mt-3 leading-relaxed max-w-xs">
              Where the mind meets the skin. Psy Tattoos exists at the intersection of mind, art, people, and progress.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <span className="font-sans text-micro uppercase tracking-[0.2em] text-taupe block mb-4">
              Navigate
            </span>
            <nav className="flex flex-col gap-3">
              {[
                { name: "Studio", path: "/studio" },
                { name: "Shop", path: "/shop" },
                { name: "About", path: "/about" },
                { name: "Book a Session", path: "/studio#book" },
              ].map((link) => (
                <Link
                  key={link.name}
                  href={link.path}
                  className="font-sans text-caption text-taupe hover:text-bone transition-colors duration-300 w-fit"
                >
                  {link.name}
                </Link>
              ))}
            </nav>
          </div>

          {/* Social & Location */}
          <div>
            <span className="font-sans text-micro uppercase tracking-[0.2em] text-taupe block mb-4">
              Connect
            </span>
            <div className="flex flex-col gap-4">
              <a
                href={SOCIAL_LINKS.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 text-taupe hover:text-psy-green transition-colors duration-300 group"
              >
                <Instagram className="w-4 h-4 transition-transform duration-300 group-hover:scale-110" />
                <span className="font-sans text-caption">@psytattoosindia</span>
              </a>
              <a
                href={SOCIAL_LINKS.facebook}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 text-taupe hover:text-psy-green transition-colors duration-300 group"
              >
                <Facebook className="w-4 h-4 transition-transform duration-300 group-hover:scale-110" />
                <span className="font-sans text-caption">PSY Tattoos India</span>
              </a>
              <a
                href={SOCIAL_LINKS.maps}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 text-taupe hover:text-psy-green transition-colors duration-300 group"
              >
                <MapPin className="w-4 h-4 transition-transform duration-300 group-hover:scale-110" />
                <span className="font-sans text-caption">Mumbai, India</span>
              </a>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="h-[1px] bg-taupe/10 mb-8" />

        {/* Bottom */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="font-sans text-micro text-taupe/50">
              © {new Date().getFullYear()} PSY Tattoos. All rights reserved.
            </span>
            <Link
              href="/privacypolicy"
              className="font-sans text-micro text-taupe/30 hover:text-taupe/60 transition-colors duration-300"
            >
              Privacy Policy
            </Link>
            <Link
              href="/termsofservice"
              className="font-sans text-micro text-taupe/30 hover:text-taupe/60 transition-colors duration-300"
            >
              Terms of Service
            </Link>
          </div>
          <span className="font-display italic text-micro text-taupe/30">
            — where the mind meets the skin
          </span>
        </div>
      </div>
    </footer>
  )
}
