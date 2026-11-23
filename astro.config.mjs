import { defineConfig } from "astro/config";
import preact from "@astrojs/preact";

// GitHub Pages serves a project site under /<repository>/. The deploy workflow sets SITE_URL and SITE_BASE.
// The islands are written against the React API and run on Preact through preact/compat: all island JS is about
// 37 KB gzipped, against about 96 KB with react-dom (2026-11-21 build). Radix primitives work through the same
// aliases. To go back to React: swap in @astrojs/react, react and react-dom and drop the ssr.noExternal line.
export default defineConfig({
  site: process.env.SITE_URL ?? "http://localhost:4321",
  base: process.env.SITE_BASE ?? "/",
  integrations: [preact({ compat: true })],
  // Bundle Radix for the server render too, so its `react` imports also resolve to preact/compat there.
  vite: { ssr: { noExternal: [/^@radix-ui\//] } },
  build: { inlineStylesheets: "auto" },
  devToolbar: { enabled: false },
});
