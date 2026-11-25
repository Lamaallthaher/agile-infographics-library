import { defineConfig, type UserConfig } from "vite";
import react from "@vitejs/plugin-react";

/**
 * Shared Vite library-mode config for every package in packages/*.
 *
 * - ES modules only, one file per entry (+ shared chunks) in dist/.
 * - React and every @agile-infographics/* package stay external, so a component
 *   never bundles core or another component, and the client's React is used.
 * - All CSS of a package is extracted to dist/style.css, and every JS file
 *   imports it, so `import { X } from "@agile-infographics/<pkg>"` brings its
 *   styles along automatically in any bundler (Vite, webpack, Next.js, …).
 */
export function libraryConfig(entry: Record<string, string>): UserConfig {
  return defineConfig({
    plugins: [react()],
    build: {
      outDir: "dist",
      emptyOutDir: true,
      sourcemap: true,
      cssCodeSplit: false,
      lib: { entry, formats: ["es"], cssFileName: "style" },
      rolldownOptions: {
        external: (id) => /^(react|react-dom)(\/|$)/.test(id) || id.startsWith("@agile-infographics/"),
        output: {
          // Every chunk (not only entries) imports the CSS, so it survives even when a
          // bundler skips a re-export-only entry file thanks to "sideEffects".
          banner: 'import "./style.css";',
        },
      },
    },
  });
}
