import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/content/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Βαθύ ανθρακί / μαύρο με ζεστό λευκό και μπρονζέ λεπτομέρειες
        ink: {
          950: "#0a0a0b",
          900: "#111113",
          800: "#1a1a1e",
          700: "#26262c",
          600: "#34343c",
        },
        bone: {
          DEFAULT: "#f4efe6",
          muted: "#cfc7b8",
          dim: "#9a9284",
        },
        // Χρυσό εμπνευσμένο από το πραγματικό λογότυπο (μαύρο + χρυσό έμβλημα).
        bronze: {
          DEFAULT: "#c9a349",
          light: "#e4c172",
          dark: "#90702c",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Georgia", "serif"],
      },
      letterSpacing: {
        widest2: "0.3em",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        // Κινηματογραφικό αργό zoom/pan.
        "ken-burns": {
          "0%": { transform: "scale(1.04) translate(0, 0)" },
          "100%": { transform: "scale(1.16) translate(-1.5%, -1.5%)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.7s cubic-bezier(0.16,1,0.3,1) both",
        "fade-in": "fade-in 0.8s ease both",
        "ken-burns": "ken-burns 20s ease-in-out infinite alternate",
      },
    },
  },
  plugins: [],
};

export default config;
