#!/usr/bin/env node
/**
 * Browser test runner for the development gallery.
 *
 * Serves the gallery's production build (apps/gallery/dist) and the suite pages
 * (tests/browser/suites/*.html) from one local origin, then opens each suite in
 * a headless Chromium browser (Edge or Chrome, whichever is installed). Each
 * suite page writes its results into <pre id="out">. A small wrapper page,
 * served by this runner, waits for that text and posts it back here. That
 * keeps the suite pages unchanged and avoids relying on browser console output
 * (Edge on Windows doesn't write --dump-dom output to a redirected stdout).
 *
 * No test dependencies are needed beyond the browser.
 *
 * Usage:
 *   npm test                                     build the gallery, then run every suite
 *   npm run test:browser                         run every suite against the existing build
 *   npm run test:browser -- methodology-flow     run selected suites (file names without .html)
 *   npm run test:browser -- --verbose            also print every passing check
 *
 * Set BROWSER=/path/to/chrome-or-edge to choose the browser explicitly.
 */
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import http from "node:http";
import { tmpdir } from "node:os";
import { dirname, extname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "../..");
const SUITES_DIR = join(HERE, "suites");
const SITE_DIR = join(ROOT, "apps/gallery/dist");
/** Upper bound for one suite (they take well under a minute each). */
const TIMEOUT_MS = 5 * 60 * 1000;

const args = process.argv.slice(2);
const verbose = args.includes("--verbose");
const only = args.filter((a) => !a.startsWith("--"));

const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".map": "application/json" };

function findBrowser() {
  if (process.env.BROWSER) return process.env.BROWSER;
  const candidates =
    {
      win32: [
        "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
        "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
        "C:/Program Files/Google/Chrome/Application/chrome.exe",
        "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
      ],
      darwin: [
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
        "/Applications/Chromium.app/Contents/MacOS/Chromium",
      ],
    }[process.platform] ?? [];
  for (const path of candidates) if (existsSync(path)) return path;
  for (const name of ["google-chrome", "google-chrome-stable", "chromium", "chromium-browser", "microsoft-edge"]) {
    const found = spawnSync(process.platform === "win32" ? "where" : "which", [name], { encoding: "utf8" });
    if (found.status === 0 && found.stdout.trim()) return found.stdout.trim().split(/\r?\n/)[0];
  }
  return null;
}

/** Wrapper page: loads the suite (unchanged), waits for its result text and posts it to the runner. */
function wrapperPage(name) {
  return `<!doctype html><html><head><meta charset="utf-8"><title>${name}</title></head>
<body style="margin:0">
<iframe id="suite" src="/suites/${name}.html" style="border:0;width:1320px;height:900px"></iframe>
<script>
const send = (text) => fetch("/__result/${name}", { method: "POST", body: text });
const timer = setInterval(() => {
  try {
    const out = document.getElementById("suite").contentDocument?.getElementById("out");
    const text = out ? out.textContent : "";
    if (/^(SUMMARY|CRASH)/.test(text)) { clearInterval(timer); send(text); }
  } catch (error) { clearInterval(timer); send("CRASH runner wrapper: " + error); }
}, 250);
</script></body></html>`;
}

/** Pending suite results, resolved when the wrapper page posts them. */
const waiting = new Map();

function startServer() {
  const server = http.createServer((req, res) => {
    const path = decodeURIComponent((req.url ?? "/").split("?")[0]);

    if (req.method === "POST" && path.startsWith("/__result/")) {
      let body = "";
      req.setEncoding("utf8");
      req.on("data", (chunk) => (body += chunk));
      req.on("end", () => {
        waiting.get(path.slice("/__result/".length))?.(body);
        res.writeHead(204).end();
      });
      return;
    }
    if (path.startsWith("/__run/")) {
      res.writeHead(200, { "content-type": TYPES[".html"], "cache-control": "no-store" });
      res.end(wrapperPage(path.slice("/__run/".length)));
      return;
    }

    const inSuites = path.startsWith("/suites/");
    const base = inSuites ? SUITES_DIR : SITE_DIR;
    const rel = inSuites ? path.slice("/suites/".length) : path === "/" ? "index.html" : path.slice(1);
    const file = resolve(base, rel);
    if (!file.startsWith(base + sep)) {
      res.writeHead(403).end();
      return;
    }
    try {
      const body = readFileSync(file);
      res.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream", "cache-control": "no-store" });
      res.end(body);
    } catch {
      res.writeHead(404).end();
    }
  });
  return new Promise((ok) => server.listen(0, "127.0.0.1", () => ok(server)));
}

function stopBrowser(child) {
  if (child.exitCode !== null) return;
  // On Windows, end the whole process tree (Edge/Chrome start several processes).
  if (process.platform === "win32") spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
  else child.kill();
}

function runSuite(browser, port, name) {
  const profile = mkdtempSync(join(tmpdir(), "aig-browser-test-"));
  const child = spawn(
    browser,
    [
      "--headless=new",
      "--disable-gpu",
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-extensions",
      "--disable-background-timer-throttling",
      "--disable-renderer-backgrounding",
      `--user-data-dir=${profile}`,
      "--window-size=1320,900",
      `http://127.0.0.1:${port}/__run/${name}`,
    ],
    { stdio: "ignore" },
  );
  return new Promise((ok) => {
    const finish = (text) => {
      waiting.delete(name);
      clearTimeout(timer);
      stopBrowser(child);
      setTimeout(() => {
        try {
          rmSync(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
        } catch {
          /* a locked file in the OS temp folder is harmless */
        }
        ok(text);
      }, 300);
    };
    const timer = setTimeout(() => finish(`CRASH timed out after ${TIMEOUT_MS / 1000}s without a result`), TIMEOUT_MS);
    waiting.set(name, finish);
    child.on("error", (error) => finish(`CRASH could not start the browser: ${error.message}`));
  });
}

function parse(text) {
  const summary = text.match(/^SUMMARY (\d+)\/(\d+) passed/m);
  const lines = text.split("\n");
  return {
    crashed: text.startsWith("CRASH"),
    found: Boolean(summary),
    passed: summary ? Number(summary[1]) : 0,
    total: summary ? Number(summary[2]) : 0,
    // Failures are listed twice in the page output (summary + full list); report each once.
    fails: [...new Set(lines.filter((l) => l.startsWith("FAIL ")))],
    passes: lines.filter((l) => l.startsWith("PASS ")),
    raw: text,
  };
}

async function main() {
  if (!existsSync(join(SITE_DIR, "index.html"))) {
    console.error("No gallery build found at apps/gallery/dist. Run `npm test` (builds first) or `npm run build:gallery`.");
    process.exit(2);
  }
  const browser = findBrowser();
  if (!browser) {
    console.error("No Chromium-based browser found (Edge, Chrome or Chromium). Set BROWSER=/path/to/browser.");
    process.exit(2);
  }
  const all = readdirSync(SUITES_DIR).filter((f) => f.endsWith(".html")).map((f) => f.slice(0, -5)).sort();
  const unknown = only.filter((n) => !all.includes(n));
  if (unknown.length) {
    console.error(`Unknown suite(s): ${unknown.join(", ")}. Available: ${all.join(", ")}`);
    process.exit(2);
  }
  const suites = only.length ? only : all;

  const server = await startServer();
  const { port } = server.address();
  console.log(`Browser: ${browser}\nGallery build: apps/gallery/dist\n`);

  let failedSuites = 0;
  let checks = 0;
  for (const name of suites) {
    const started = Date.now();
    const result = parse(await runSuite(browser, port, name));
    const secs = ((Date.now() - started) / 1000).toFixed(1);
    const good = result.found && !result.crashed && result.fails.length === 0 && result.passed === result.total;
    checks += result.total;
    if (!good) failedSuites++;
    console.log(`${good ? "PASS" : "FAIL"}  ${name.padEnd(24)} ${result.found ? `${result.passed}/${result.total} checks` : "no result"}  (${secs}s)`);
    if (result.crashed || !result.found) console.log(`      ${(result.raw || "the page produced no output").split("\n").slice(0, 8).join("\n      ")}`);
    for (const f of result.fails) console.log(`      ${f}`);
    if (verbose) for (const p of result.passes) console.log(`      ${p}`);
  }
  server.close();

  console.log(`\n${suites.length - failedSuites}/${suites.length} suites passed, ${checks} checks in total.`);
  process.exit(failedSuites ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(2);
});
