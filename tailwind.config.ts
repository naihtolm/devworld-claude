import type { Config } from "tailwindcss";
import colors from "tailwindcss/colors";

// Single place to change Devworld's brand color — everything in the app
// references `brand-*` rather than a raw Tailwind color name, so swapping
// the palette later is a one-line change here.
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./modules/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: colors.indigo,
      },
      fontSize: {
        // Design language §00 — Display/H1 are the only sizes meant to
        // reach for a distinct display treatment; everything else stays
        // on the system body font.
        display: ["2.75rem", { lineHeight: "1.1", fontWeight: "700" }],
        h1: ["1.875rem", { lineHeight: "1.2", fontWeight: "600" }],
        h2: ["1.25rem", { lineHeight: "1.3", fontWeight: "600" }],
        micro: ["0.6875rem", { lineHeight: "1.4", letterSpacing: "0.05em" }],
      },
      borderRadius: {
        card: "0.375rem", // radius-md — buttons, inputs, cards all share this; no rounded-lg in the app
      },
      boxShadow: {
        card: "0 1px 2px rgba(23,23,31,0.06)",
        popover: "0 4px 16px rgba(23,23,31,0.10)",
      },
    },
  },
  plugins: [],
};

export default config;
