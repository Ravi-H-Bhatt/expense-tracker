/**
 * split-math.ts
 * Precise, rounding-safe money math for expense splitting.
 *
 * All amounts are handled in paise (integer) internally to avoid
 * floating-point drift, then returned as rupee numbers with 2 decimals.
 */

/** Round a rupee value to 2 decimals safely. */
export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Split a total amount equally among N participants such that the
 * sum of the parts EXACTLY equals the total (no lost/created paise).
 *
 * The remainder paise are distributed one-by-one to the first members,
 * which is the standard fair-rounding approach.
 *
 * @returns array of amounts (rupees, 2 decimals) of length `count`
 */
export function splitEqually(total: number, count: number): number[] {
  if (count <= 0) return [];
  const totalPaise = Math.round(total * 100);
  const base = Math.floor(totalPaise / count);
  let remainder = totalPaise - base * count;

  const parts: number[] = [];
  for (let i = 0; i < count; i++) {
    let paise = base;
    if (remainder > 0) {
      paise += 1;
      remainder -= 1;
    }
    parts.push(paise / 100);
  }
  return parts;
}

/**
 * Build equal splits keyed by participant name, guaranteeing the
 * parts sum exactly to the total.
 */
export function buildEqualSplits(
  total: number,
  names: string[]
): { name: string; amount: number }[] {
  const amounts = splitEqually(total, names.length);
  return names.map((name, i) => ({ name, amount: amounts[i] }));
}

/**
 * Validate that a set of custom split amounts sums to the total
 * within a 1-paise tolerance.
 */
export function validateCustomSplits(
  total: number,
  amounts: number[]
): { ok: boolean; sum: number; diff: number } {
  const sum = round2(amounts.reduce((s, a) => s + (Number(a) || 0), 0));
  const diff = round2(sum - total);
  return { ok: Math.abs(diff) < 0.01, sum, diff };
}

/* ----------------------------- Fuzzy matching ---------------------------- */

/** Levenshtein edit distance between two strings. */
function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const prev = new Array(n + 1);
  const curr = new Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= n; j++) prev[j] = curr[j];
  }
  return prev[n];
}

const normalize = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');

/**
 * Find the best-matching candidate name for a (possibly misspelled) input.
 *
 * Matching strategy, in order:
 *  1. Exact (case-insensitive) match
 *  2. First-name / prefix match (input is a prefix of a candidate or vice-versa)
 *  3. Fuzzy match within an edit-distance threshold scaled to word length
 *
 * @returns the matched candidate string, or null if nothing is close enough.
 */
export function matchName(input: string, candidates: string[]): string | null {
  if (!input) return null;
  const target = normalize(input);

  // 1. Exact
  for (const c of candidates) {
    if (normalize(c) === target) return c;
  }

  // 2. Prefix / first-name match
  for (const c of candidates) {
    const nc = normalize(c);
    if (nc.startsWith(target) || target.startsWith(nc)) return c;
    // match against first token of candidate (e.g. "Krisha" -> "Krisha Trivedi")
    const firstToken = nc.split(' ')[0];
    if (firstToken === target) return c;
  }

  // 3. Fuzzy (edit distance). Threshold scales with the longer word length.
  let best: { name: string; dist: number } | null = null;
  for (const c of candidates) {
    const nc = normalize(c);
    const dist = levenshtein(target, nc);
    const firstToken = nc.split(' ')[0];
    const firstDist = levenshtein(target, firstToken);
    const useDist = Math.min(dist, firstDist);
    if (best === null || useDist < best.dist) {
      best = { name: c, dist: useDist };
    }
  }

  if (best) {
    const maxLen = Math.max(target.length, normalize(best.name).length);
    // allow ~30% of the word to differ (min 1, max 3 edits)
    const threshold = Math.min(3, Math.max(1, Math.floor(maxLen * 0.3)));
    if (best.dist <= threshold) return best.name;
  }

  return null;
}

/**
 * Resolve a list of (possibly misspelled) names to canonical member names.
 * Unmatched names are returned in `unmatched`.
 */
export function resolveNames(
  inputs: string[],
  candidates: string[]
): { matched: string[]; unmatched: string[] } {
  const matched: string[] = [];
  const unmatched: string[] = [];
  const seen = new Set<string>();

  for (const input of inputs) {
    const m = matchName(input, candidates);
    if (m && !seen.has(m)) {
      matched.push(m);
      seen.add(m);
    } else if (!m) {
      unmatched.push(input);
    }
  }
  return { matched, unmatched };
}
