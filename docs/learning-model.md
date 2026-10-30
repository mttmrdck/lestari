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

Full results and the history of each decision: `docs/situation-search-evaluation.md`.

1. **Normalise** (`src/lib/semantic.ts`): lowercase, informal spellings to standard ("xde duit" becomes "tiada wang"), reduplication, and negation tracking, so "tidak sombong" never counts as "sombong".
2. **Cues** (`src/content/taxonomy.ts`): each concept has weighted rules (`a|b + c ! d`). A concept needs a weight of 2, so one weak word such as "kawan" decides nothing.
3. **Sentence similarity** (`worker/situasi.ts`): the sentence is embedded with `@cf/baai/bge-m3` and compared with 623 example situations (`data/curated/situations.json`). A concept's score is the mean of its two closest examples. A `_neutral` class of ordinary sentences lets the system recognise "this is not a peribahasa situation".
4. **Combine** (`mergeHits` in `src/lib/search.ts`): `final = similarity + 0.06 if a cue also fired`. A concept must reach 0.55 and beat the neutral class; only concepts within 0.02 of the best are kept. Similarity can overrule a cue that misfired. If the model is unavailable, cues decide alone and the page says so.
5. **Retrieve and rank:** only sayings attached to a kept concept in `data/curated/semantics.json` can appear. Curated order, primary before related, and small tie-breakers set the order. A saying listed under `bukan` for a kept concept is removed. Results below 62% of the best are dropped, and related sayings are dropped once two primary ones qualify.
6. **Labels** (estimates, not probabilities): *Padanan kuat* or *Padanan berkaitan*. If nothing qualifies, the page says so instead of showing weak results.

## Leaderboard and XP ledger

Local XP (shown in the header) and leaderboard XP are separate on purpose. The browser reports what the learner did (`XpClaim`); `worker/xp.ts` decides whether that action is valid and what it is worth, using the table above. A unique key per user prevents double payment, including retries. Daily challenge wins are re-graded on the server.

Limits: 300 XP per Malaysian calendar day in total, 8 quiz-session bonuses, 60 flashcard reviews and 20 explorations. Guest XP from before signing in is kept in the learner's progress but never counts on the leaderboard.

**What this does not prove.** A quiz answer is graded in the browser, so a determined person with a script can claim correct answers for real sayings. The daily cap limits the damage to 300 XP a day. Server-side question delivery would be needed to close that gap.

Ranking: most XP in the period, then whoever reached that total first, then account id. Weeks start on Monday in Malaysian time. Rank movement compares the board at the end of yesterday with the board now.
