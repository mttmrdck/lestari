# LESTARI

**Fahami Makna. Kuasai Bahasa. Hidupkan Peribahasa.**

A playful, mobile-first web app that helps Malaysian students discover, understand, practise, remember and apply Malay peribahasa. Built on Cloudflare Workers, D1 and Workers AI.

## Start

```bash
npm install
npm run dev          # http://localhost:5173
```

Full stack locally (API, D1, leaderboard, login):

```bash
npm run build
npm run db:migrate:local
npm run dev:api      # http://localhost:8787 serves the build and /api/*
```

`npm run dev` alone still works as a guest app; it proxies `/api` to port 8787 when that is running. No API keys are needed: Cloudflare bindings provide the database and the embedding model. Deployment: see `docs/deployment.md`.

## What is inside

- **664 peribahasa** imported from the five supplied documents plus 10 extra sayings checked against PRPM (Dewan Bahasa dan Pustaka). See `docs/data-quality-report.md`.
- **Learning adventure**: a dashboard led by Bayu the hornbill, a learning path of 7 units and 19 lessons (teach, then practise with meaning, completion, situation, emoji and matching-pairs exercises), animated results, XP count-ups, confetti on milestones and illustrated badges.
- **Dual search**: keyword search (case- and spacing-insensitive, stems, category and theme filters, suggestions, chips) and **situation search**, which works out what a sentence means and returns only sayings that fit, or says that none do. It combines a hand-built concept map with a sentence-similarity model that picks concepts, never sayings (`docs/situation-search-evaluation.md`).
- **Detail cards**: meaning, when to use, examples (labelled), template example generator, "Jangan keliru dengan…", a meaning check, sources, save, copy and listen.
- **Latihan**: Teka Maksud, Lengkapkan Peribahasa (optional 15-second timer), Padankan Situasi, Kuiz Emoji and Kad Imbas, each easy to hard, with a review of wrong answers.
- **Simpanan**: saved sayings and past mistakes, searchable and filterable, with flashcards launched from either list.
- **Flashcards** with spaced repetition (Susah, Sederhana, Mudah) and due, new, difficult and mastered queues.
- **Progress**: streak, XP, evidence-based mastery, accuracy, a 7-day chart, category progress, achievements, favourites and activity.
- **Peribahasa Hari Ini**: a daily, date-seeded puzzle with progressive clues.
- **Accounts**: registration, login, remember me, one-time recovery codes, password change and account deletion. Guests can use everything except the leaderboard.
- **Papan Juara**: weekly, monthly and all-time rankings from a server-side XP ledger, with an animated podium and clearly labelled demo profiles.

Guest progress stays in this browser. Signed-in progress syncs to the account.

## Docs

`DESIGN.md` (design system) · `AGENTS.md` (conventions, commands) · `docs/learning-model.md` · `docs/situation-search-evaluation.md` · `docs/deployment.md` · `docs/supabase.md` · `docs/content-review-notes.md` · `docs/data-quality-report.md` · `docs/design-resources.md` · `docs/design-dna.json`
