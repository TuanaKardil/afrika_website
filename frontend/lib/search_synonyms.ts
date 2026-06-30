/**
 * Synonym groups for Africa-focused Turkish news search.
 * Each inner array is a group of interchangeable terms.
 * The frontend expands user queries so that any term in a group
 * matches articles containing any other term in the same group.
 */
const SYNONYM_GROUPS: string[][] = [
  // ── African countries ──────────────────────────────────────
  ["mısır", "misir", "egypt"],
  ["nijerya", "nigeria"],
  ["gana", "ghana"],
  ["etiyopya", "etiopia", "ethiopia"],
  ["fas", "morocco"],
  ["fildişi sahili", "fildisi sahili", "ivory coast", "cote d ivoire"],
  ["güney afrika", "guney afrika", "south africa"],
  ["tanzanya", "tanzania"],
  ["mozambik", "mozambique"],
  ["zimbabve", "zimbabwe"],
  ["namibya", "namibia"],
  ["botsvana", "botswana"],
  ["zambiya", "zambia"],
  ["tunus", "tunisia"],
  ["cezayir", "algeria"],
  ["demokratik kongo", "dr kongo", "drc", "kongo"],
  ["somali", "somalia"],
  ["madagaskar", "madagascar"],
  ["liberya", "liberia"],
  ["güney sudan", "guney sudan", "south sudan"],
  ["eritre", "eritrea"],
  ["kamerun", "cameroon"],
  ["angola", "angola"],
  ["ruanda", "rwanda"],
  ["burundi", "burundi"],
  ["uganda", "uganda"],
  ["kenya", "kenya"],
  ["senegal", "senegal"],
  ["mali", "mali"],
  ["nijer", "niger"],
  ["gabon", "gabon"],
  ["togo", "togo"],
  ["benin", "benin"],
  ["sudan", "sudan"],
  ["libya", "libya"],
  ["sierra leone", "sierra leone"],
  ["gambiya", "gambia"],
  // ── Turkish char variants (common typos/transliterations) ──
  ["altın", "altin", "gold"],
  ["tarım", "tarim", "agriculture"],
  ["enerji", "energy"],
  ["maden", "madencilik", "mining", "mineral"],
  ["seçim", "secim", "election", "sandık", "oy", "vote"],
  ["darbe", "coup"],
  ["ekonomi", "economy"],
  ["yatırım", "yatirim", "investment"],
  ["ticaret", "trade"],
  ["ihracat", "export"],
  ["ithalat", "import"],
  ["savunma", "defense", "defence"],
  ["göç", "goc", "migration"],
  ["petrol", "oil", "petroleum"],
  ["doğalgaz", "dogalgaz", "natural gas"],
  ["güvenlik", "guvenlik", "security"],
  ["kalkınma", "kalkinma", "development"],
  ["altyapı", "altyapi", "infrastructure"],
  ["liman", "port", "harbour"],
  ["demiryolu", "railway", "railroad"],
  ["banka", "bank"],
  ["finans", "finance"],
  ["borç", "borc", "debt"],
  ["sağlık", "saglik", "health"],
  ["eğitim", "egitim", "education"],
  ["turizm", "tourism"],
  ["tekstil", "textile"],
  ["çimento", "cimento", "cement"],
  ["konut", "housing"],
  ["gayrimenkul", "real estate"],
  // ── Organizations & institutions ───────────────────────────
  ["afrika birliği", "african union", "au"],
  ["dünya bankası", "dunya bankasi", "world bank"],
  ["para fonu", "imf", "international monetary fund"],
  ["brics", "brics"],
  ["ecowas", "ecowas", "batı afrika topluluğu"],
  ["sadc", "sadc"],
  ["comesa", "comesa"],
  ["afreximbank", "afreximbank"],
  ["afdb", "africa development bank", "afrika kalkınma bankası"],
];

// ── Build fast lookup: any term → its full expansion group ──
const _lookup = new Map<string, string[]>();
for (const group of SYNONYM_GROUPS) {
  for (const term of group) {
    _lookup.set(term, group);
  }
}

/** Replace Turkish-specific chars with ASCII equivalents. */
function normalizeTurkishChars(s: string): string {
  return s
    .replace(/ı/g, "i")
    .replace(/İ/g, "i")
    .replace(/ğ/g, "g")
    .replace(/Ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/Ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/Ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/Ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/Ç/g, "c");
}

/** Return all synonym expansions for a single token. */
function expandToken(token: string): string[] {
  const lower = token.toLocaleLowerCase("tr-TR");
  // Exact match in synonym map
  if (_lookup.has(lower)) return _lookup.get(lower)!;
  // Try ASCII-normalized version
  const ascii = normalizeTurkishChars(lower);
  if (_lookup.has(ascii)) return _lookup.get(ascii)!;
  // No synonym — include the original + ASCII variant (handles misir/mısır swaps)
  const result = [lower];
  if (ascii !== lower) result.push(ascii);
  return result;
}

/** Escape a string for use as a single tsquery lexeme. */
function escapeTsLexeme(s: string): string {
  // Remove chars that break tsquery syntax; keep alphanumerics and Turkish letters
  return s.replace(/[()&|!:*'\\<>]/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Given a raw user query, build a PostgreSQL tsquery string.
 *
 * "mısır altın" →
 *   "(mısır | misir | egypt) & (altın | altin | gold)"
 *
 * Multi-word synonym groups (e.g. "güney afrika") are detected greedily
 * before tokenizing to single words.
 */
export function buildTsQuery(rawQuery: string): string {
  let q = rawQuery.trim().toLocaleLowerCase("tr-TR");

  // Remove characters that are meaningless in search
  q = q.replace(/[^\wğüşıöçĞÜŞİÖÇ\s-]/g, " ").replace(/\s+/g, " ").trim();

  if (!q) return "";

  // Greedy multi-word synonym detection (check 3-word, 2-word, then 1-word)
  const tokenGroups: string[][] = [];
  const words = q.split(" ");
  let i = 0;

  while (i < words.length) {
    let matched = false;

    // Try 3-word phrase
    if (i + 2 < words.length) {
      const phrase3 = words.slice(i, i + 3).join(" ");
      if (_lookup.has(phrase3)) {
        tokenGroups.push(_lookup.get(phrase3)!);
        i += 3;
        matched = true;
      }
    }

    // Try 2-word phrase
    if (!matched && i + 1 < words.length) {
      const phrase2 = words.slice(i, i + 2).join(" ");
      if (_lookup.has(phrase2)) {
        tokenGroups.push(_lookup.get(phrase2)!);
        i += 2;
        matched = true;
      }
    }

    // Single word
    if (!matched) {
      const expansions = expandToken(words[i]);
      tokenGroups.push(expansions);
      i++;
    }
  }

  // Filter out tokens that are too short (avoid noise)
  const meaningful = tokenGroups.filter((g) => g.some((t) => t.length >= 2));
  if (meaningful.length === 0) return "";

  // Build tsquery: (a | b | c) & (d | e)
  const parts = meaningful.map((group) => {
    const escaped = group
      .map(escapeTsLexeme)
      .filter(Boolean)
      // Split multi-word synonyms (e.g. "south africa" → "south" & "africa")
      .flatMap((t) => (t.includes(" ") ? t.split(" ") : [t]))
      .filter((t) => t.length >= 2);

    const unique = Array.from(new Set(escaped));
    if (unique.length === 0) return null;
    if (unique.length === 1) return unique[0];
    return `(${unique.join(" | ")})`;
  });

  return parts.filter(Boolean).join(" & ");
}

/** Normalize a raw query for display / deduplication purposes. */
export function normalizeQuery(rawQuery: string): string {
  return rawQuery.trim().toLocaleLowerCase("tr-TR").replace(/\s+/g, " ");
}
