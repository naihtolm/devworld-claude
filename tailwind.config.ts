import type { Config } from "tailwindcss";

// Devworld's design language: Terminal — near-black ground, monospace
// structure, one signal accent color used sparingly. Approved direction
// from the design canvas pass; see modules/ui/ and the mockups for the
// full rationale (glow-not-lift hover, sharp corners, dark-adapted status
// colors).
//
// `neutral` and `white` are overridden (not extended) with a semantically
// inverted scale: the app already used neutral-50 for page background,
// neutral-900 for primary text, white for card surfaces — inverting the
// actual hex values under those same names means every existing
// `bg-neutral-50` / `text-neutral-900` / `bg-white` call site in the app
// repaints dark automatically, with zero per-file edits. `brand` becomes
// the lime accent scale, used the same way indigo was.
const neutral = {
  50: "#0A0B0F", // page ground (was lightest, now darkest)
  100: "#111318", // card/surface bg
  200: "#27272A", // default border
  300: "#3F3F46", // stronger border, outline pills
  400: "#52525B", // placeholder text
  500: "#71717A", // muted text
  600: "#A1A1AA", // secondary text
  700: "#C4C4CB",
  800: "#D4D4D8",
  900: "#E4E4E7", // primary text (was near-black, now near-white)
  950: "#FAFAFA",
};

const brand = {
  50: "rgba(168,255,96,0.10)", // tinted pill/highlight backgrounds
  100: "rgba(168,255,96,0.16)",
  200: "rgba(168,255,96,0.30)", // tinted borders
  300: "#7DDB4A",
  400: "#8FE045",
  500: "#9AF054",
  600: "#A8FF60", // the accent — buttons, links, focus rings
  700: "#8FE045", // hover/darker
  800: "#6FBF35",
  900: "#4F8F22",
};

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./modules/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        white: neutral[100],
        neutral,
        brand,
      },
      fontFamily: {
        mono: ["'JetBrains Mono'", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      fontSize: {
        display: ["2.75rem", { lineHeight: "1.1", fontWeight: "700" }],
        h1: ["1.875rem", { lineHeight: "1.2", fontWeight: "600" }],
        h2: ["1.25rem", { lineHeight: "1.3", fontWeight: "600" }],
        micro: ["0.6875rem", { lineHeight: "1.4", letterSpacing: "0.05em" }],
      },
      borderRadius: {
        card: "0.1875rem", // 3px — sharp, not soft; no rounded-lg anywhere in the app
      },
      boxShadow: {
        card: "0 1px 2px rgba(0,0,0,0.4)",
        // The signature hover treatment: a lime glow, not a lifted soft
        // shadow — cards/buttons brighten toward the viewer instead of
        // lifting off the page.
        popover: "0 0 32px rgba(168,255,96,0.12)",
        glow: "0 0 20px rgba(168,255,96,0.35)",
      },
    },
  },
  plugins: [],
};

export default config;
