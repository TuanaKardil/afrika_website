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
        navy: "#0a2351",
        "navy-90": "#143063",
        amber: "#f5b800",
        "amber-dark": "#d99e00",
        primary: "#1e6fb8",
        "primary-dark": "#185a96",
        background: "#ffffff",
        surface: "#ffffff",
        "surface-2": "#f7f8fa",
        "on-surface": "#212529",
        "fg-2": "#4a5159",
        "fg-3": "#6b7280",
        "surface-container": "#f7f8fa",
        "outline-variant": "#e5e7eb",
        "border-strong": "#d1d5db",
        up: "#2e8b3d",
        down: "#c41e3a",
        tertiary: "#185a96",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "system-ui", "sans-serif"],
        headline: ["var(--font-inter)", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "system-ui", "sans-serif"],
        body: ["var(--font-inter)", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "system-ui", "sans-serif"],
      },
      boxShadow: {
        dropdown: "0 4px 16px rgba(10, 35, 81, 0.10)",
        modal: "0 12px 40px rgba(10, 35, 81, 0.18)",
      },
      maxWidth: {
        container: "1280px",
      },
    },
  },
  plugins: [],
};

export default config;
