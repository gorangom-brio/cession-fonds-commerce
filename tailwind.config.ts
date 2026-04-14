import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          50: "#f0f4ff",
          100: "#e0e9ff",
          700: "#1e3070",
          800: "#172554",
          900: "#0f172a",
        },
        border: "#e5e7eb",
        background: "#ffffff",
        foreground: "#0f172a",
        muted: {
          foreground: "#6b7280",
        },
        "confidence-high": "#16a34a",
        "confidence-medium": "#d97706",
        "confidence-low": "#dc2626",
      },
    },
  },
  plugins: [],
};

export default config;
