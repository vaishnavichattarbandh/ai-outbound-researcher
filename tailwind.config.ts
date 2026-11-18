import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#F3F5F7",
        ink: "#14181F",
        muted: "#5B6573",
        line: "#D9DEE5",
        accent: { DEFAULT: "#2447F5", soft: "#E8ECFE" },
        good: "#13795B",
        warn: "#A15C07",
      },
      fontFamily: { sans: ["var(--font-sans)", "system-ui", "sans-serif"] },
    },
  },
  plugins: [],
};
export default config;
