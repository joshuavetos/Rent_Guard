import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./lib/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#1f2937",
          accent: "#0ea5e9",
          soft: "#e5e7eb"
        }
      },
      boxShadow: {
        card: "0 20px 45px -15px rgba(0,0,0,0.15)"
      }
    }
  },
  plugins: []
};

export default config;
