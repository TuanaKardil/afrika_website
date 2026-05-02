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
        primary: "#c2652a",
        background: "#faf5ee",
        surface: "#faf5ee",
        "on-surface": "#3a302a",
        "surface-container": "#f2ece4",
        "outline-variant": "#d8d0c8",
        tertiary: "#8c3c3c",
      },
      fontFamily: {
        headline: ["var(--font-headline)", "serif"],
        body: ["var(--font-body)", "sans-serif"],
      },
      boxShadow: {
        card: "0 2px 16px rgba(58,48,42,0.04)",
      },
    },
  },
  plugins: [],
};

export default config;
