// Prebuild guard: every public page must declare a canonical URL or opt out
// with a robots noindex. Fails the build otherwise, so a new page can never
// ship without its canonical. See CLAUDE.md rule 14 and lib/seo.ts.
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const appDir = fileURLToPath(new URL("../app", import.meta.url));

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

  const src = readFileSync(file, "utf8");
  const hasCanonical = /\bcanonical\b/.test(src) || /\bbuildCanonical\b/.test(src);
  const hasNoindex = /index:\s*false/.test(src);
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
