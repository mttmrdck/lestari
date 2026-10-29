# AGENTS.md: working on LESTARI

LESTARI is a mobile-first React app for learning Malay peribahasa. Phase 1 is a front-end-only prototype: all learner data lives in `localStorage`. Read `DESIGN.md` before touching any UI.

## Commands

| Task | Command |
|---|---|
| Install | `npm install` |
| Dev server | `npm run dev` (http://localhost:5173) |
| Type-check and build | `npm run build` |
| Serve the build | `npm run preview` (http://localhost:4173) |
| Unit tests (data, search, learning logic) | `npm test` |
| Browser checks (needs `npm run preview` running and Chrome, Brave or Edge installed; `CHROME_PATH` overrides) | `npm run e2e` |
| Lint | `npm run lint` |
| Lint the design system | `npm run design:lint` |
| Re-extract source documents (needs `pip install pypdf` for the PDF) | `npm run data:extract` |
| Rebuild the knowledge base and the data report | `npm run data:import` |
| Refresh PRPM evidence | `npm run data:prpm` |

## Architecture

```
data/sources/original/   supplied documents, untouched
data/sources/raw/        text snapshots from scripts/extract_sources.py
data/sources/prpm/       PRPM (DBP) evidence snippets with URLs
data/curated/            hand-written layer: review flags, corrections, PDF-only rows,
                         PRPM additions, teaching notes (enrichment.json)
scripts/                 extract -> import -> validate pipeline, e2e checks
src/data/                GENERATED knowledge base (peribahasa.json, sources.json); never edit
src/content/             curated quiz and search content: emoji, situations, concepts, contrasts
src/lib/                 framework-free logic: text, search, srs, progress store, quiz, daily, lessons, validate
src/app/                 store binding and app shell (navigation, toasts)
src/components/          Mascot (Bayu, 7 moods), LearningPath, Badge, Celebrate (confetti, count-up), QuestionPrompt, UI primitives, React Bits ClickSpark
src/features/<area>/     screens: home, path, lesson, search, detail, quiz, flashcards, favourites, progress, daily-challenge, misc
src/test/                Vitest suites
docs/                    data-quality report, learning model, design DNA, resources log
```

## Rules

- **One source of truth.** Every screen reads records from `src/lib/data.ts`. Progress references records by their stable `id`, the slug of the saying. If you rename a saying, its id changes, so update every curated reference. The importer and the tests fail on dangling ids.
- **Never hand-edit `src/data/*.json`.** Change `data/curated/*` and run `npm run data:import`, then commit the regenerated files and `docs/data-quality-report.md`.
- **Provenance is mandatory.** Source text stays as written (spelling fixes keep `maksudAsal`). LESTARI-written examples are `origin: "disediakan-lestari"`. A record added from outside the supplied documents needs PRPM evidence and a `sourceUrl`. Never invent a peribahasa or a meaning.
- **Honest product.** No fake statistics, no "AI" label on local matching, no XP without a learning action. XP rules live in `src/lib/progress.ts` (`XP`) and `docs/learning-model.md`; keep them in step.
- **Sensitive records** (`data/curated/review.json`) stay searchable but must not appear in quizzes, flashcards or the daily puzzle. Use `LEARNABLE` or `CORE`, never `RECORDS`, for anything that teaches.
- **Lessons** live in `src/lib/lessons.ts`. Units group sayings by meaning-derived theme plus hand-checked `include`/`exclude` lists; a saying belongs to one lesson only. Check a new grouping by reading every saying's meaning.
- **Copy** is Malaysian Bahasa Melayu, second person (`kamu`), encouraging, never shaming.

## Design system maintenance

- Tokens live in two places that must match: the YAML front matter of `DESIGN.md` and the `@theme` block in `src/index.css`. Change `DESIGN.md` first, run `npm run design:lint` (0 errors, 0 warnings, WCAG contrast checked), then mirror the change in CSS.
- Use token utilities (`bg-primary`, `text-ink-muted`, `rounded-[var(--radius-lg)]`). No raw colours in components. Hallmark's sloplint enforces this: `node .claude/skills/hallmark/scripts/sloplint.mjs src/index.css src/features src/components src/app --scope app` should report 0 FAIL.
- Motion: CSS for presses (edge collapse), page entrance, idle loops and the flip; GSAP (`useGSAP`, scoped, reduced-motion aware) for dashboard entrance, results and achievement timelines; `fireConfetti()` only for milestones (lesson passed, daily solved, badge unlocked, 7/8+ quiz). Animate only `transform`, `opacity` and `clip-path`. Never `transition: all`.
- Icons are Lucide only. Emoji appear only as Teka Emoji content.
- Project-scoped design skills are installed in `.claude/skills/` (UI/UX Pro Max, Impeccable, taste-skill, Hallmark, Emil Kowalski's animate and improve-animations, GSAP, motion-design, design-dna). See `docs/design-resources.md` for how each was used.

## Testing expectations

Before finishing a change: `npm test`, `npm run build`, and, for UI changes, `npm run preview` plus `npm run e2e`, then look at the screenshots in `e2e-shots/` at 375, 430, 768 and 1440px.
