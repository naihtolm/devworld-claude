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
    },
  },
  plugins: [],
};

export default config;
