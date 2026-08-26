import { defineConfig } from "vite";

// Keep the renderer separate from Electron Builder's installer output.
export default defineConfig({
  base: "./",
  build: { outDir: "renderer-dist", emptyOutDir: true },
});
