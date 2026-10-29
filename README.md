# LESTARI

**Fahami Makna. Kuasai Bahasa. Hidupkan Peribahasa.**

A playful, mobile-first web app that helps Malaysian students discover, understand, practise, remember and apply Malay peribahasa. Phase 1 prototype.

## Start

```bash
npm install
npm run dev          # http://localhost:5173
```

Production build: `npm run build && npm run preview` (http://localhost:4173). No environment variables or API keys are needed.

## What is inside

- **664 peribahasa** imported from the five supplied documents plus 10 extra sayings checked against PRPM (Dewan Bahasa dan Pustaka). See `docs/data-quality-report.md`.
- **Learning adventure**: a dashboard led by Bayu the hornbill, a learning path of 7 units and 19 lessons (teach, then practise with meaning, completion, situation, emoji and matching-pairs exercises), animated results, XP count-ups, confetti on milestones and illustrated badges.
- **Dual search**: keyword search (case- and spacing-insensitive, stems, category and theme filters, suggestions, chips) and **situation search**, which explains each match using the student's own words. Situation search is transparent local matching, not AI.
- **Detail cards**: meaning, when to use, examples (labelled), template example generator, "Jangan keliru dengan…", a meaning check, sources, save, copy and listen.
- **Latihan**: Teka Maksud, Lengkapkan Peribahasa (optional 15-second timer), Padankan Situasi, Kuiz Emoji and Kad Imbas, each easy to hard, with a review of wrong answers.
- **Simpanan**: saved sayings and past mistakes, searchable and filterable, with flashcards launched from either list.
- **Flashcards** with spaced repetition (Susah, Sederhana, Mudah) and due, new, difficult and mastered queues.
- **Progress**: streak, XP, evidence-based mastery, accuracy, a 7-day chart, category progress, achievements, favourites and activity.
- **Peribahasa Hari Ini**: a daily, date-seeded puzzle with progressive clues.

Progress is stored in this browser only; nothing syncs between devices.

## Docs

`DESIGN.md` (design system) · `AGENTS.md` (conventions, commands) · `docs/learning-model.md` · `docs/data-quality-report.md` · `docs/design-resources.md` · `docs/design-dna.json`
