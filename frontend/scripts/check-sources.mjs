#!/usr/bin/env node
/**
 * Fail the build if frontend/lib/sources.ts has drifted from the scraper's
 * registry at scraper/scraper/sources.py.
 *
 * The two files are maintained by hand in different languages. When they
 * disagree the failure is quiet and ugly: the article page falls back to
 * rendering the raw slug ("business_daily_africa") as the outlet name, and the
 * JSON-LD publisher falls back to "Afrika Haberleri". Catching it at build time
 * costs nothing.
 *
 * Parsing is deliberately regex-based rather than executing Python: this runs in
 * the Vercel build image, which has no Python guarantee. If the Python file
 * cannot be read (e.g. a frontend-only checkout) the check is skipped rather
 * than failing the build.
 */
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const pyPath = resolve(here, "../../scraper/scraper/sources.py");
const tsPath = resolve(here, "../lib/sources.ts");

if (!existsSync(pyPath)) {
  console.log("check-sources: scraper/sources.py not found, skipping");
  process.exit(0);
}

/** slug -> {label, homepage, lang} from the Python Source(...) blocks. */
function parsePython(text) {
  const out = new Map();
  // Each entry starts at `slug="..."`; read the sibling fields up to the next one.
  const blocks = text.split(/\n    Source\(/).slice(1);
  for (const block of blocks) {
    const slug = block.match(/slug="([^"]+)"/)?.[1];
    if (!slug) continue;
    out.set(slug, {
      label: block.match(/label="([^"]*)"/)?.[1] ?? "",
      homepage: block.match(/homepage="([^"]*)"/)?.[1] ?? "",
      lang: block.match(/\blang="([^"]*)"/)?.[1] ?? "en",
    });
  }
  return out;
}

/** slug -> {label, homepage, lang} from the TS SOURCES array literal. */
function parseTypescript(text) {
  const out = new Map();
  const re =
    /\{\s*slug:\s*"([^"]+)",\s*label:\s*"([^"]*)",\s*homepage:\s*"([^"]*)",\s*lang:\s*"([^"]*)"\s*\}/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    out.set(m[1], { label: m[2], homepage: m[3], lang: m[4] });
  }
  return out;
}

const py = parsePython(readFileSync(pyPath, "utf8"));
const ts = parseTypescript(readFileSync(tsPath, "utf8"));

if (py.size === 0) {
  console.error("check-sources: parsed 0 sources from sources.py, parser is stale");
  process.exit(1);
}

const errors = [];
for (const [slug, p] of py) {
  const t = ts.get(slug);
  if (!t) {
    errors.push(`missing from lib/sources.ts: ${slug}`);
    continue;
  }
  for (const field of ["label", "homepage", "lang"]) {
    if (p[field] !== t[field]) {
      errors.push(`${slug}.${field}: python="${p[field]}" ts="${t[field]}"`);
    }
  }
}
for (const slug of ts.keys()) {
  if (!py.has(slug)) errors.push(`in lib/sources.ts but not sources.py: ${slug}`);
}

if (errors.length) {
  console.error("\ncheck-sources FAILED: frontend and scraper source registries disagree\n");
  for (const e of errors) console.error("  - " + e);
  console.error("\nFix frontend/lib/sources.ts to match scraper/scraper/sources.py.\n");
  process.exit(1);
}

console.log(`check-sources: ${py.size} sources in sync`);
