import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";
import path from "node:path";

export default defineConfig({
  root: path.resolve(import.meta.dirname, "simulation-results"),
  plugins: [viteSingleFile()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
