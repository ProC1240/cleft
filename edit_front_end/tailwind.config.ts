import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./main.tsx", "./CleftUI.tsx"],
  theme: {
    extend: {
      colors: {
        bg: "#08051a",
        card: "#12101c",
        surface: "#1a1728",
        text: "#D4C4FF",
        muted: "#A78BFA",
        num: "#FFFFFF",
        border: "#2a2540",
        accent: "#6327FF",
        "accent-dim": "#4a1dbf",
      },
      boxShadow: {
        soft: "0 14px 40px rgba(0, 0, 0, 0.45)",
        glow: "0 0 24px rgba(99, 39, 255, 0.25)",
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
