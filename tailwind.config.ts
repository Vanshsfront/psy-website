import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#0A0A0A",
        bone: "#F5F3EF",
        taupe: "#B8ADA4",
        "psy-green": "#3BA37C",
        moss: "#2F6F5E",
        wine: "#2C233A",
        terracotta: "#C0654A",
        gold: "#C6A96B",
        surface: "#111111",
        danger: "#ff3c3c",
        // Admin backward-compat aliases (maps old tokens → brand equivalents)
        background: "#0A0A0A",
        surfaceLighter: "#1a1a1a",
        borderDark: "#2a2a2a",
        primaryText: "#F5F3EF",
        mutedText: "#B8ADA4",
        neon: {
          green: "#3BA37C",
          purple: "#2C233A",
          cyan: "#B8ADA4",
        },
      },
      fontFamily: {
        sans: ["var(--font-dm-sans)", "sans-serif"],
        display: ["var(--font-cormorant)", "serif"],
      },
      fontSize: {
        "display-2xl": "clamp(4rem, 8vw, 9rem)",
        "display-xl": "clamp(2.5rem, 5vw, 5rem)",
        "display-lg": "clamp(1.8rem, 3vw, 3rem)",
        "body-lg": "1.125rem",
        body: "1rem",
        caption: "0.8125rem",
        micro: "0.6875rem",
      },
      boxShadow: {
        navbar: "0 1px 0 0 rgba(245,243,239,0.08)",
        glowGreen: "0 0 15px rgba(59, 163, 124, 0.3)",
        glowPurple: "0 0 15px rgba(44, 35, 58, 0.3)",
      },
      animation: {
        "fade-in": "fadeIn 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "fade-in-up": "fadeInUp 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        fadeInUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
