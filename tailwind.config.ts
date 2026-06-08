import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  darkMode: "class",
  safelist: [
    "bg-blue-500",
    "bg-emerald-500",
    "bg-amber-500",
    "bg-violet-500",
    "bg-rose-500",
    "bg-pink-500",
    "bg-orange-500",
    "bg-sky-500",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#FF4D2E",
          50: "#FFF0EC",
          100: "#FFD9D0",
          500: "#FF4D2E",
          600: "#E63B1C",
          700: "#B82C13",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        serif: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      keyframes: {
        marquee: {
          "0%": { transform: "translateX(0%)" },
          "100%": { transform: "translateX(-50%)" },
        },
      },
      animation: {
        marquee: "marquee 45s linear infinite",
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
} satisfies Config;
