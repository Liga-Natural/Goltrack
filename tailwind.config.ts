import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        pitch: {
          50: "#fdecec",
          100: "#f8c9cb",
          400: "#eb4b56",
          500: "#e63946",
          600: "#c62838",
          700: "#8f1b25",
          900: "#4a0e13",
        },
        navy: {
          50: "#f2f2f2",
          400: "#3a3a3a",
          600: "#242424",
          700: "#1a1a1a",
          800: "#141414",
          900: "#0a0a0a",
        },
        volt: {
          400: "#e63946",
          500: "#c62838",
        },
      },
      fontFamily: {
        display: ["'Archivo Black'", "system-ui", "sans-serif"],
        body: ["'Inter'", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(10,15,26,0.04), 0 8px 24px -8px rgba(10,15,26,0.12)",
      },
    },
  },
  plugins: [],
};

export default config;
