// Prebuild guard: every public page must declare a canonical URL or opt out
// with a robots noindex. Fails the build otherwise, so a new page can never
// ship without its canonical. See CLAUDE.md rule 14 and lib/seo.ts.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const appDir = fileURLToPath(new URL("../app", import.meta.url));
const rootDir = fileURLToPath(new URL("..", import.meta.url));

// A page may delegate generateMetadata to a shared helper (the listing routes
// do, so /x and /x/sayfa/[n] cannot drift apart). Follow local imports one level
// so the guard reads the helper instead of declaring a false miss. Without this
// the check is trivially bypassed by moving metadata into any other file.
function resolveLocalImport(spec, fromFile) {
  const base = spec.startsWith("@/")
    ? resolve(rootDir, spec.slice(2))
    : spec.startsWith(".")
      ? resolve(dirname(fromFile), spec)
      : null;
  if (!base) return null;
  for (const candidate of [`${base}.tsx`, `${base}.ts`, join(base, "index.tsx"), join(base, "index.ts")]) {
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

function sourceWithHelpers(file) {
  const src = readFileSync(file, "utf8");
  let combined = src;
  for (const match of src.matchAll(/import\s[^;]*?from\s+["']([^"']+)["']/g)) {
    const target = resolveLocalImport(match[1], file);
    if (target) combined += "\n" + readFileSync(target, "utf8");
  }
  return { src, combined };
}

// Admin pages are covered by a noindex in app/admin/layout.tsx.
const SKIP_PREFIXES = ["admin"];

function findPages(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...findPages(full));
    else if (entry.name === "page.tsx" || entry.name === "page.ts") out.push(full);
  }
  return out;
}

const failures = [];
const titleFailures = [];
for (const file of findPages(appDir)) {
  const rel = relative(appDir, file).replace(/\\/g, "/");
  if (SKIP_PREFIXES.some((p) => rel === `${p}/page.tsx` || rel.startsWith(`${p}/`))) continue;

  const { src, combined } = sourceWithHelpers(file);
  const hasCanonical =
    /\bcanonical\b/.test(combined) ||
    /\bbuildCanonical\b/.test(combined) ||
    /\bcanonicalMeta\b/.test(combined);
  const hasNoindex = /index:\s*false/.test(combined);
  if (!hasCanonical && !hasNoindex) failures.push(rel);

  // The root layout template already appends "| Afrika Haberleri"; a page
  // title containing it would render the brand twice in the <title>.
  if (/\|\s*Afrika Haberleri/.test(src)) titleFailures.push(rel);
}

if (failures.length > 0) {
  console.error("\n[check-canonical] Public pages without a canonical URL or noindex:\n");
  for (const f of failures) console.error(`  - app/${f}`);
  console.error(
    "\nAdd alternates.canonical via buildCanonical() from lib/seo.ts, " +
      "or robots: { index: false } if the page must stay out of search.\n"
  );
}

if (titleFailures.length > 0) {
  console.error("\n[check-canonical] Page titles must not contain \"| Afrika Haberleri\":\n");
  for (const f of titleFailures) console.error(`  - app/${f}`);
  console.error(
    "\nThe root layout title template appends the brand automatically; " +
      "remove the suffix from the page title to avoid duplication.\n"
  );
}

if (failures.length > 0 || titleFailures.length > 0) process.exit(1);

console.log("[check-canonical] OK: all public pages declare canonical or noindex, no duplicated brand titles.");
