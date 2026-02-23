import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx,mdx}", "./components/**/*.{ts,tsx,mdx}", "./public/**/*.html"],
  theme: {
    extend: {
      fontFamily: {
        serif: ["Cormorant Garamond", "serif"],
        sans: ["Inter", "ui-sans-serif", "system-ui"],
      },
      colors: {
        champagne: "#C9A56A",
        blush: "#f7d6c8",
        ivory: "#f6f1ed",
        matteCharcoal: "#1E1B18",
      },
      boxShadow: {
        glass: "0 24px 45px rgba(30, 27, 24, 0.08)",
        glow: "0 0 30px rgba(201, 165, 106, 0.35)",
      },
      backgroundImage: {
        "soft-gradient": "linear-gradient(135deg, rgba(253,233,230,0.7), rgba(243,201,179,0.65))",
      },
      borderRadius: {
        "3xl": "32px",
      },
    },
  },
  plugins: [],
};

export default config;
