/**
 * Build guard: no live article may be answered with 410 Gone.
 *
 * middleware.ts hard-410s every slug in lib/deleted-slugs.ts. That list was
 * built from Search Console 404s, but a 404 is far more often a MOVED slug than
 * a deleted article: 12 of its original 64 entries pointed at articles that
 * were still live, and 410-ing them destroyed their ranking (CLAUDE.md rule 22).
 *
 * This check fails the build if any listed slug resolves to a live article,
 * either directly or through the "<base>" / "<base>-<6 hex>" slug-churn pair.
 * A re-scraped article that comes back into the DB is caught on the next build.
 *
 * Skips itself (with a warning, never a failure) when Supabase env vars are
 * absent, so local builds without secrets still work.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const MIN_PUBLISHED_SCORE = 6;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) {
  console.warn("check-deleted-slugs: Supabase env vars missing, skipping.");
  process.exit(0);
}

const source = readFileSync(join(ROOT, "lib/deleted-slugs.ts"), "utf8");
const listed = [...source.matchAll(/^\s*"([^"]+)",\s*$/gm)].map((m) => m[1]);
if (listed.length === 0) {
  console.log("check-deleted-slugs: list is empty, nothing to verify.");
  process.exit(0);
}

const supabase = createClient(url, key);
const { data, error } = await supabase
  .from("articles")
  .select("slug")
  .eq("is_suppressed", false)
  .gte("score", MIN_PUBLISHED_SCORE)
  .not("title_tr", "is", null)
  .limit(10000);

if (error) {
  console.warn(`check-deleted-slugs: query failed (${error.message}), skipping.`);
  process.exit(0);
}

const HASH = /-[0-9a-f]{6}$/;
const live = new Set(data.map((a) => a.slug));
const byBase = new Map();
for (const s of live) {
  const b = s.replace(HASH, "");
  if (!byBase.has(b)) byBase.set(b, s);
}

const conflicts = [];
for (const slug of listed) {
  const hit = live.has(slug) ? slug : byBase.get(slug.replace(HASH, ""));
  if (hit) conflicts.push([slug, hit]);
}

if (conflicts.length > 0) {
  console.error(
    `\ncheck-deleted-slugs: ${conflicts.length} slug(s) in lib/deleted-slugs.ts `
    + "are answered with 410 Gone but resolve to a LIVE article:\n"
  );
  for (const [slug, hit] of conflicts) {
    console.error(`  410:  ${slug}`);
    console.error(`  live: ${hit}\n`);
  }
  console.error(
    "Remove them from DELETED_HABER_SLUGS. app/haber/[slug] already 308s a\n"
    + "moved slug to its current URL, so no entry is needed for those.\n"
  );
  process.exit(1);
}

console.log(`check-deleted-slugs: OK (${listed.length} entries, none live).`);
