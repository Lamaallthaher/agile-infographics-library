// Removes CSS side-effect imports (`import "./x.css";`) from emitted .d.ts files.
// They are meaningless for types and make a client's type check fail
// ("Cannot find module or type declarations for side-effect import").
// Usage: node scripts/strip-css-imports.mjs <types-dir>
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const CSS_IMPORT = /^import\s+["'][^"']+\.css["'];?[ \t]*\r?\n/gm;

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path);
    else if (name.endsWith(".d.ts")) {
      const text = readFileSync(path, "utf8");
      const stripped = text.replace(CSS_IMPORT, "");
      if (stripped !== text) writeFileSync(path, stripped);
    }
  }
}

walk(process.argv[2] ?? "dist/types");
