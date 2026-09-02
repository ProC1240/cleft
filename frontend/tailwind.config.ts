import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0c0a1a",
        card: "#16101f",
        surface: "#1c1428",
        text: "#f2eefc",
        muted: "#a89ee0",
        num: "#f2eefc",
        border: "#33294a",
        accent: "#6d4de6",
        "accent-dim": "#5636c9",
      },
      boxShadow: {
        soft: "0 24px 60px -28px rgba(0, 0, 0, 0.8)",
        glow: "0 0 26px rgba(109, 77, 230, 0.24)",
      },
      transitionTimingFunction: {
        smooth: "cubic-bezier(0.22, 1, 0.36, 1)",
        "smooth-out": "cubic-bezier(0.16, 1, 0.3, 1)",
      },
      transitionDuration: {
        450: "450ms",
      },
      fontSize: {
        "2xs": ["0.65rem", { lineHeight: "1rem" }],
      },
    },
  },
  plugins: [],
};

export default config;
