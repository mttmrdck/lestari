# LESTARI

**Fahami Makna. Kuasai Bahasa. Hidupkan Peribahasa.**

A mobile-first web app that helps Malaysian students discover, understand, practise, remember and apply Malay peribahasa. Phase 1 prototype.

## Start

```bash
npm install
npm run dev          # http://localhost:5173
```

Production build: `npm run build && npm run preview` (http://localhost:4173). No environment variables or API keys are needed.

## What is inside

- **664 peribahasa** imported from the five supplied documents plus 10 extra sayings checked against PRPM (Dewan Bahasa dan Pustaka). See `docs/data-quality-report.md`.
- **Dual search**: keyword search (case- and spacing-insensitive, stems, category and theme filters, suggestions, chips) and **situation search**, which explains each match using the student's own words. Situation search is transparent local matching, not AI.
- **Detail cards**: meaning, when to use, examples (labelled), template example generator, "Jangan keliru dengan…", a meaning check, sources, save, copy and listen.
- **Quiz hub**: Teka Emoji, Isi Tempat Kosong (optional 15-second timer) and Pilih Peribahasa yang Sesuai, each easy to hard, with a review of wrong answers.
- **Flashcards** with spaced repetition (Susah, Sederhana, Mudah) and due, new, difficult and mastered queues.
- **Progress**: streak, XP, evidence-based mastery, accuracy, a 7-day chart, category progress, achievements, favourites and activity.
- **Peribahasa Hari Ini**: a daily, date-seeded puzzle with progressive clues.

Progress is stored in this browser only; nothing syncs between devices.

## Docs

`DESIGN.md` (design system) · `AGENTS.md` (conventions, commands) · `docs/learning-model.md` · `docs/data-quality-report.md` · `docs/design-resources.md` · `docs/design-dna.json`
