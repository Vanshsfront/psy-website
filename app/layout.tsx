import type { Metadata } from "next";
import { Cormorant_Garamond, DM_Sans } from "next/font/google";
import SiteShell from "@/components/layout/SiteShell";
import "./globals.css";

export const metadata: Metadata = {
  title: "PSY — Tattoos & Shop",
  description:
    "Custom tattoo artistry and handcrafted jewelry. Each piece a conversation between artist and skin.",
  keywords: [
    "tattoos",
    "luxury jewelry",
    "custom tattoo studio",
    "handcrafted rings",
    "fine line tattoo",
    "Mumbai tattoo studio",
  ],
  openGraph: {
    title: "PSY — Tattoos & Shop",
    description: "Where the mind meets the skin. Wear the ritual.",
    url: "https://psytattoos.com",
    siteName: "PSY",
    locale: "en_US",
    type: "website",
  },
};

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-dm-sans",
  display: "swap",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${cormorant.variable} ${dmSans.variable} antialiased`}
      >
        <SiteShell>
          {children}
        </SiteShell>
      </body>
    </html>
  );
}
