import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        card: "var(--card)",
        card2: "var(--card2)",
        sunken: "var(--sunken)",
        accent: "var(--accent)",
        "accent-bg": "var(--accent-bg)",
        "accent-line": "var(--accent-line)",
        muted: "var(--muted)",
        line: "var(--line)",
      },
    },
  },
  plugins: [],
};
export default config;
