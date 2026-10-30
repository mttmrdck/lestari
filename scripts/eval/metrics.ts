// Scores a situation engine against a ground-truth file. Shared by `npm run eval:situasi` and the baseline run.
export interface EvalCase { id: string; type: string; query: string; expectedConcepts: string[]; relevant: string[]; excluded: string[]; expectedBehaviour?: string }
export interface Outcome { ids: string[]; concepts?: string[] }
export interface CaseResult { c: EvalCase; ids: string[]; concepts: string[]; rel: string[]; irrelevant: string[]; excludedHit: string[]; top: boolean; ok: boolean }

const canon = (id: string, variants: Map<string, string[]>) => [id, ...(variants.get(id) ?? [])];

export function score(cases: EvalCase[], run: (q: string) => Outcome, variants: Map<string, string[]>) {
  const rows: CaseResult[] = cases.map((c) => {
    const { ids, concepts = [] } = run(c.query);
    const isRel = (id: string) => canon(id, variants).some((x) => c.relevant.includes(x));
    const rel = ids.filter(isRel);
    const irrelevant = ids.filter((id) => !isRel(id));
    const excludedHit = ids.filter((id) => canon(id, variants).some((x) => c.excluded.includes(x)));
    const noMatch = c.relevant.length === 0;
    return { c, ids, concepts, rel, irrelevant, excludedHit, top: !noMatch && !!ids[0] && isRel(ids[0]), ok: noMatch ? ids.length === 0 : !!ids[0] && isRel(ids[0]) };
  });
  const pos = rows.filter((r) => r.c.relevant.length);
  const neg = rows.filter((r) => !r.c.relevant.length);
  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
  // Precision over what was actually shown (at most k). A query answered with nothing scores 0.
  const pAt = (k: number) => avg(pos.map((r) => { const s = r.ids.slice(0, k); return s.length ? s.filter((id) => r.rel.includes(id)).length / s.length : 0; }));
  const rAt = (k: number) => avg(pos.map((r) => { const found = new Set(r.ids.slice(0, k).filter((id) => r.rel.includes(id)).map((id) => [id, ...(variants.get(id) ?? [])].sort()[0])); const want = new Set(r.c.relevant.map((id) => [id, ...(variants.get(id) ?? [])].sort()[0])); return Math.min(1, found.size / Math.min(k, want.size)); }));
  const shown = pos.flatMap((r) => r.ids.slice(0, 5));
  const shownBad = pos.flatMap((r) => r.ids.slice(0, 5).filter((id) => !r.rel.includes(id)));
  return {
    rows,
    metrics: {
      cases: rows.length, positive: pos.length, noMatchCases: neg.length,
      topRelevance: avg(pos.map((r) => (r.top ? 1 : 0))),
      precisionAt3: pAt(3), precisionAt5: pAt(5), recallAt5: rAt(5),
      irrelevantRate: shown.length ? shownBad.length / shown.length : 0,
      excludedShown: pos.reduce((n, r) => n + r.excludedHit.length, 0) + neg.reduce((n, r) => n + r.ids.length, 0),
      noMatchAccuracy: neg.length ? neg.filter((r) => r.ids.length === 0).length / neg.length : 0,
      answered: avg(pos.map((r) => (r.ids.length ? 1 : 0))),
    },
  };
}
