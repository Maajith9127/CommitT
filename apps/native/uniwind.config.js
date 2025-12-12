import { defineConfig } from "uniwind";
import presetTailwind from "uniwind/preset-tailwind";

export default defineConfig({
  presets: [presetTailwind()],

  content: ["./app/**/*.{js,ts,tsx}", "../../packages/ui/**/*.{js,ts,tsx}"],

  themes: ["light", "dark"], // optional but good
});
