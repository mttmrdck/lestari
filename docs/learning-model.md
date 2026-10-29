# Learning model

Everything here is implemented in `src/lib/` and covered by `src/test/learning.test.ts`.

## XP: rewards for learning actions only

| Action | XP | Duplicate protection |
|---|---|---|
| Correct quiz answer | 10 | once per question per session **and** once per saying, mode and day |
| Correct answer in "Pilih Peribahasa" (context) | +5 bonus | same as above |
| Completing a quiz session of 5+ questions | 10 | once per session id |
| Passing a learning-path lesson (60%+) for the first time | 20 | once per lesson |
| Flashcard review (any rating) | 3 | once per card per day |
| Opening a saying for the first time | 1 | once per saying, at most 20 per day |
| Daily challenge solved in 1/2/3/4 attempts | 30/25/20/15 | once per date |
| Daily challenge attempted but not solved | 5 | once per date |

Wrong answers, refreshing, re-opening cards and searching earn nothing. The daily goal (30, 50 or 80 XP) is the learner's choice.

## Learning path

7 units and 19 lessons (`src/lib/lessons.ts`). A lesson teaches 2–4 sayings, then practises them: one Teka Maksud per saying, up to two Lengkapkan, a Padankan Situasi and a Kuiz Emoji question when curated content exists, and one matching-pairs round (counts as correct with at most one wrong pairing). Passing needs 60%. Lessons unlock strictly in order; a locked lesson URL shows why it is locked.

## Achievements

Mula Melangkah (first lesson passed), Langkah Pertama (first quiz session), Konsisten! (7-day streak), Bijak Bahasa (25 mastered), Raja Peribahasa (100 mastered), Pencari Tegar (10 different situation searches), Pakar Emoji (15 correct), Mahir Konteks (20 correct situation answers), Penebak Harian (5 daily challenges), Ulang Kaji Rajin (50 flashcard reviews). All are computed from stored activity.

## Mistakes list

A saying is listed under Simpanan → Kesilapan when its latest quiz answer was wrong or it was saved for revision after a quiz. Dismissing it records the wrong-answer count at that moment; it returns only after a new wrong answer. Dismissing never changes mastery evidence.

## Streak

A day counts when the learner answers a quiz question, reviews a card or plays the daily challenge. The current streak is the run of consecutive active days ending today, or yesterday if today has no activity yet.

## Mastery: evidence, separate from XP

A saying is **mastered** when either:

1. its flashcard has an interval of 7 days or more after 2 or more successful reviews in a row, or
2. it has been answered correctly 2 or more times in quizzes, at least once in a contextual question, and the latest answer was correct.

Opening a card never counts towards mastery.

## Spaced repetition (simplified SM-2)

| Rating | New card | Learned card | Ease |
|---|---|---|---|
| Susah | again in 10 minutes | again in 10 minutes, lapse +1, success run resets | −0.2 (min 1.3) |
| Sederhana | 1 day | 3 days, then interval × ease | −0.05 |
| Mudah | 4 days | interval × ease × 1.3 | +0.1 (max 3) |

Day intervals land at the start of the due day. A card rated Susah also returns once more at the end of the current session. Queues: **due** (due ≤ now), **new** (up to 10 per day, ordered by revision list, then favourites, then curriculum level), **difficult** (2+ lapses or last rating Susah), **mastered** (rule above).

## Daily challenge

The saying is `pool[hash("lestari:" + date) % pool.length]`, where the pool is the learnable core sayings of 3 or more words sorted by id. Every learner gets the same saying on the same date, and a refresh does not change it. There are 4 attempts. Clues unlock in order: maksud, kategori, first word, word shape. Answers within 90% edit similarity of the saying or any of its variants are accepted. State is saved per date.

## Situation search scoring

1. **Concepts** (`src/content/concepts.ts`): each trigger phrase found in the input adds 2, each single word (or its stem, at least 5 letters) adds 1. A concept's sayings score `weight × (4 − 0.6 × rank)`.
2. **Lexical**: distinct input words found in a saying's meaning or keywords add an IDF-weighted score × 0.55.
3. **Labels** (relevance estimates, not probabilities): *kuat* = concept weight ≥ 2 and the saying is in the concept's top two; *sederhana* = concept weight ≥ 2 or 2+ distinct meaning words; otherwise *lemah*. If nothing reaches *sederhana*, the UI says there is no strong match.
