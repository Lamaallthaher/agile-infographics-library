import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/**
 * The development gallery. It resolves the workspace packages to their source
 * files (the "@agile-infographics/source" export condition), so edits in any
 * package hot-reload here without building the packages first.
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    conditions: ["@agile-infographics/source", "module", "browser", "development|production"],
  },
  server: {
    port: 5173,
    open: false,
  },
});
