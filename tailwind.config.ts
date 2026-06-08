import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  darkMode: "class",
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
        serif: ["var(--font-serif)", "Georgia", "serif"],
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
