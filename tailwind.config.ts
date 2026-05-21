import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-dm-sans)"],
        mono: ["var(--font-jetbrains-mono)"],
      },
      colors: {
        bg: "var(--bg)",
        "bg-hover": "var(--bg-hover)",
        text: "var(--text)",
        "text-secondary": "var(--text-secondary)",
        "text-tertiary": "var(--text-tertiary)",
        border: "var(--border)",
        accent: "var(--accent)",
      },
      borderRadius: {
        card: "6px",
        pill: "4px",
      },
      maxWidth: {
        page: "1080px",
      },
    },
  },
  plugins: [],
};

export default config;
