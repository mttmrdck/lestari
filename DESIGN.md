---
version: alpha
name: LESTARI — Hutan & Hikayat
description: A bright, warm learning world for Malay peribahasa. Paper-cream surfaces, deep indigo ink, one violet for action, and a hornbill guide. Playful in motion and colour moments, calm and legible for study.
colors:
  primary: "#5B3FD8"
  primary-strong: "#4A30BF"
  primary-soft: "#ECE7FF"
  on-primary-soft: "#3D2A99"
  ink: "#1E1A3C"
  ink-muted: "#55506F"
  ink-subtle: "#6E6987"
  paper: "#FBF6EC"
  surface: "#FFFDF8"
  surface-sunk: "#F4EDDF"
  line: "#E6DCC8"
  line-strong: "#D3C6AC"
  night: "#17142F"
  night-raised: "#221E42"
  on-night: "#F5F1FF"
  on-night-muted: "#B9B2D9"
  mint: "#157A55"
  mint-soft: "#DDF3E8"
  mint-bright: "#2BB673"
  sun: "#FFC845"
  sun-soft: "#FFF2CC"
  sun-ink: "#7A5200"
  coral: "#A8352B"
  coral-soft: "#FCE4DF"
  casque: "#F2762E"
  focus-ring: "#5B3FD8"
  selection: "#ECE7FF"
typography:
  display-xl:
    fontFamily: Bricolage Grotesque Variable
    fontSize: 3.25rem
    fontWeight: 750
    lineHeight: 1.02
    letterSpacing: -0.03em
  display-lg:
    fontFamily: Bricolage Grotesque Variable
    fontSize: 2.25rem
    fontWeight: 720
    lineHeight: 1.08
    letterSpacing: -0.025em
  title:
    fontFamily: Bricolage Grotesque Variable
    fontSize: 1.375rem
    fontWeight: 680
    lineHeight: 1.2
    letterSpacing: -0.015em
  saying-lg:
    fontFamily: Fraunces Variable
    fontSize: 2rem
    fontWeight: 560
    lineHeight: 1.2
    letterSpacing: -0.01em
    fontVariation: "'SOFT' 100, 'opsz' 72"
  saying-md:
    fontFamily: Fraunces Variable
    fontSize: 1.1875rem
    fontWeight: 560
    lineHeight: 1.3
    fontVariation: "'SOFT' 100, 'opsz' 24"
  body:
    fontFamily: Plus Jakarta Sans Variable
    fontSize: 1rem
    fontWeight: 450
    lineHeight: 1.6
  body-sm:
    fontFamily: Plus Jakarta Sans Variable
    fontSize: 0.875rem
    fontWeight: 500
    lineHeight: 1.5
  label:
    fontFamily: Plus Jakarta Sans Variable
    fontSize: 0.8125rem
    fontWeight: 650
    lineHeight: 1.3
  numeral:
    fontFamily: Bricolage Grotesque Variable
    fontSize: 1.75rem
    fontWeight: 700
    lineHeight: 1
    fontFeature: "'tnum' 1"
rounded:
  sm: 8px
  md: 12px
  lg: 18px
  xl: 26px
  full: 999px
spacing:
  "1": 4px
  "2": 8px
  "3": 12px
  "4": 16px
  "5": 20px
  "6": 24px
  "8": 32px
  "10": 40px
  "12": 48px
  "16": 64px
components:
  page:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
  text-secondary:
    textColor: "{colors.ink-muted}"
  text-caption:
    textColor: "{colors.ink-subtle}"
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#FFFFFF"
    rounded: "{rounded.md}"
    height: 48px
  button-primary-hover:
    backgroundColor: "{colors.primary-strong}"
    textColor: "#FFFFFF"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    height: 48px
  chip:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.full}"
    height: 36px
  chip-selected:
    backgroundColor: "{colors.primary-soft}"
    textColor: "{colors.on-primary-soft}"
    rounded: "{rounded.full}"
  input:
    backgroundColor: "{colors.surface-sunk}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    height: 52px
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: 20px
  night-panel:
    backgroundColor: "{colors.night}"
    textColor: "{colors.on-night}"
    rounded: "{rounded.xl}"
  night-panel-raised:
    backgroundColor: "{colors.night-raised}"
    textColor: "{colors.on-night-muted}"
  option-correct:
    backgroundColor: "{colors.mint-soft}"
    textColor: "{colors.mint}"
  option-wrong:
    backgroundColor: "{colors.coral-soft}"
    textColor: "{colors.coral}"
  progress-fill:
    backgroundColor: "{colors.mint-bright}"
    textColor: "{colors.ink}"
  xp-pill:
    backgroundColor: "{colors.sun}"
    textColor: "{colors.ink}"
  achievement:
    backgroundColor: "{colors.sun-soft}"
    textColor: "{colors.sun-ink}"
  streak-flame:
    backgroundColor: "{colors.sun-soft}"
    textColor: "{colors.sun-ink}"
  focus:
    backgroundColor: "{colors.selection}"
    textColor: "{colors.focus-ring}"
  divider:
    backgroundColor: "{colors.line}"
    textColor: "{colors.ink-muted}"
  outline-strong:
    backgroundColor: "{colors.line-strong}"
    textColor: "{colors.ink}"
  bayu-casque:
    backgroundColor: "{colors.casque}"
    textColor: "{colors.ink}"
---

# LESTARI design system

## Overview

LESTARI is where Malaysian students learn to understand and use peribahasa. The visual world is **Hutan & Hikayat**: the Malaysian rainforest crossed with the Malay manuscript tradition, made playful for teenagers and upper-primary pupils.

- **Mode: Operate.** Students come to search, practise and review. Scanability and calm reading beat spectacle. Delight is spent on rare moments: finishing a quiz, solving the daily saying, unlocking an achievement.
- **The guide is Bayu, a hornbill** (enggang), drawn as an original SVG. The hornbill is a Malaysian emblem and appears in real peribahasa ("Enggang lalu, ranting patah"). Bayu appears on the welcome screen, empty states and celebrations, never as wallpaper.
- **Signature element: the match bridge.** In *Carian Situasi*, the student's own sentence is shown with the words that triggered the match highlighted, beside the saying and the reason it fits. The match explains itself.
- **Sayings are set like literature.** Every peribahasa is typeset in Fraunces, a soft serif, so the saying reads as heritage text against the modern UI sans.
- Interface language is Bahasa Melayu. No eyebrow labels, no tracked capitals.

References studied (described in the brief; no image files were supplied): a playful 3D-character learning app with purple accents and rounded progress cards, a clean educational app with discovery cards and bottom navigation, and a dark gamified app with bright green progress and streaks. LESTARI keeps their principles (one clear action per screen, chunky friendly controls, progress shown as real numbers, a dark "challenge" surface with a green indicator) and none of their branding.

## Colors

The palette is warm paper and deep ink with one action colour. Colour goes on meaning, not chrome.

- **Paper (#FBF6EC)** is the page ground; **Surface (#FFFDF8)** lifts cards one step; **Surface sunk (#F4EDDF)** is for wells such as inputs and the flashcard back.
- **Ink (#1E1A3C)** is the text colour, an indigo-tinted near-black. **Ink muted (#55506F)** carries secondary text (7.4:1 on paper). Never use grey on a tinted surface; tint from ink.
- **Violet (#5B3FD8)** is the only action colour: primary buttons, active navigation, focus rings, selected chips. **Violet soft (#ECE7FF)** backs selected states.
- **Mint (#157A55 / #DDF3E8)** means correct and mastered. **Mint bright (#2BB673)** fills progress bars (non-text).
- **Sun (#FFC845 / #FFF2CC)** means streaks, XP and achievements; text on it is ink or **sun ink (#7A5200)**.
- **Coral (#A8352B / #FCE4DF)** is reserved for wrong answers and errors.
- **Night (#17142F)** is the challenge surface (Peribahasa Hari Ini), echoing the dark gamified reference, with mint bright as its indicator.
- **Casque (#F2762E)** belongs to Bayu's casque and the streak flame only.

Focus rings use violet; text selection uses violet soft.

## Typography

- **Bricolage Grotesque** (display): screen titles, numbers, the wordmark. Weight 680–760, slightly tight tracking.
- **Plus Jakarta Sans** (UI and body): designed by Tokotype in Jakarta; its rhythm suits Malay text. Body 16px minimum, 1.6 line height, measure 65ch.
- **Fraunces** (sayings only): soft-axis serif for every peribahasa, the card front and the daily answer.
- Numbers in stats use tabular figures.
- All three faces are self-hosted through Fontsource (no third-party font requests).

## Layout

- **Mobile first (375–430px):** 16px gutters, a compact top bar (wordmark, streak, XP) and a five-item bottom navigation (Utama, Cari, Kuiz, Kad Imbas, Profil) that respects the safe area. Touch targets are at least 44px.
- **Tablet (768px):** two-column grids where content pairs naturally; navigation stays at the bottom.
- **Desktop (≥1024px):** a 248px left sidebar with the navigation and today's goal; content is capped at 1080px and centred, with a 2:1 main/aside split on Home and the detail page. Mobile cards are not stretched; the layout recomposes.
- Spacing uses the 4px scale. Groups sit 8–12px apart, sections 32–48px. There is more space above a heading than below it.

## Elevation & Depth

Surfaces are mostly flat, separated by a 1px warm line (#E6DCC8) or one tone step. Two shadows exist:

- **Rest:** `0 1px 2px rgb(30 26 60 / 0.05), 0 2px 10px -4px rgb(30 26 60 / 0.06)` on cards that can be tapped.
- **Lift:** `0 14px 34px -14px rgb(30 26 60 / 0.28)` for the flashcard, sheets and toasts.

Primary buttons carry a 3px darker inner bottom edge, so they read as pressable keys. On press it collapses and the button moves down 1px. No glassmorphism, no glows.

## Shapes

- Controls: 12px radius. Cards: 18px. Hero panels and the night challenge panel: 26px. Chips and badges only: full pill.
- Never a card inside a card; inner groupings use a sunk well or a divider.
- Bayu and the welcome scene use organic curves; the UI itself stays geometric.

## Components

- **Button:** primary (violet, white text, tactile edge), secondary (surface with a strong line), quiet (text only, violet). Height 48px (40px compact). States: hover darkens, press sinks, focus ring 3px violet with 2px offset, disabled at 45% opacity with no pointer.
- **Chip:** 36px pill for keywords and filters. The selected state is violet soft with violet ink and a check icon.
- **Segmented control:** the two search modes. The track is sunk; the active segment is surface with the rest shadow.
- **Peribahasa row:** the saying in Fraunces (saying-md), meaning in body-sm muted, with category and status badges after it. The whole row is the link.
- **Badge:** category (violet soft), status (mint for PRPM-checked, sun for needs review), rule-derived categories marked "anggaran".
- **Quiz option:** a full-width button with a letter key (A–D). On answer, the correct option turns mint with a check and a wrong choice turns coral with a cross. The feedback panel slides up with the explanation.
- **Flashcard:** 3D flip on the Y axis (460ms, strong ease-in-out). Front is the saying; back is the meaning, an example and the category. The three rating buttons show the next interval ("10 min", "1 hari", "4 hari").
- **Night panel:** the daily challenge on Home and its page.
- **Toasts:** XP gains and achievements, bottom-centre above the navigation, auto-dismissed, announced via `aria-live`.

## Motion

Motion communicates state; it never delays content.

- Easing tokens (Emil Kowalski): `--ease-out: cubic-bezier(0.23, 1, 0.32, 1)` for entrances, `--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1)` for on-screen movement such as the card flip.
- Durations: press 120ms, chips and hovers 160ms, panels 240ms, flip 460ms, celebrations up to 900ms.
- CSS transitions handle hover, press, selection and the flip. GSAP (with `useGSAP`) handles the one authored moment per screen: the welcome scene, quiz results, the daily-challenge win and achievement unlocks. React Bits' ClickSpark adds sparks on correct answers and saves.
- `prefers-reduced-motion: reduce` swaps movement for instant state changes; content is never hidden waiting for an animation.
- Only `transform`, `opacity` and `clip-path` animate. Never `transition: all`.

## Do's and Don'ts

- **Do** show real numbers, including zeros. A new learner sees "0 XP" with a clear first step, never a fake streak.
- **Do** label provenance: "Disemak dengan PRPM (DBP)", "Contoh ayat oleh LESTARI", "Kategori anggaran".
- **Do** keep each screen to one primary action.
- **Don't** use emoji as interface icons. Lucide icons only, 1.75px stroke. Emoji appear only as quiz content in Teka Emoji.
- **Don't** add eyebrow labels, section numbers, gradient text, purple-to-blue gradients, or icon-in-tinted-circle stat tiles.
- **Don't** call local matching "AI". Situation search is labelled as concept and keyword matching.
- **Don't** shame mistakes. Feedback copy is encouraging: "Hampir tepat! Cuba fahami maksudnya sekali lagi."
