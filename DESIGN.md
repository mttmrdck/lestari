---
version: alpha
name: LESTARI — Hutan Ceria
description: A bright, playful learning adventure for Malay peribahasa. Jungle green for progress, sunshine for rewards, sky blue for discovery, coral rose and lavender for variety, all on warm cream. Chunky tactile controls, Bayu the hornbill guide, and motion that celebrates real learning.
colors:
  primary: "#58CC02"
  on-primary: "#0E3B05"
  primary-soft: "#D7FFB8"
  on-primary-soft: "#245B28"
  primary-ink: "#2B7A0B"
  sky: "#1CB0F6"
  on-sky: "#06324A"
  sky-soft: "#DDF4FF"
  sky-ink: "#0A5F8A"
  rose: "#FF6B6B"
  on-rose: "#4A0F0F"
  rose-soft: "#FFE4E4"
  lavender: "#CE82FF"
  on-lavender: "#3B1366"
  lavender-soft: "#F3E3FF"
  lavender-ink: "#5C2A8A"
  sun: "#FFC800"
  sun-soft: "#FFF4CC"
  sun-ink: "#7A5600"
  coral: "#B33232"
  coral-soft: "#FFE4E4"
  ink: "#263238"
  ink-muted: "#4B5B63"
  ink-subtle: "#66767E"
  paper: "#FFFDF5"
  surface: "#FFFFFF"
  surface-sunk: "#F7F3E6"
  line: "#E9E4D4"
  line-strong: "#D9D2BE"
  night: "#1E3A5F"
  on-night: "#F4FAFF"
  on-night-muted: "#B9D3EE"
  casque: "#FF8A3D"
typography:
  display:
    fontFamily: Nunito Variable
    fontSize: 2.625rem
    fontWeight: 900
    lineHeight: 1.05
    letterSpacing: -0.02em
  title:
    fontFamily: Nunito Variable
    fontSize: 1.375rem
    fontWeight: 900
    lineHeight: 1.2
  body:
    fontFamily: Nunito Variable
    fontSize: 1rem
    fontWeight: 560
    lineHeight: 1.6
  label:
    fontFamily: Nunito Variable
    fontSize: 0.875rem
    fontWeight: 850
    lineHeight: 1.3
  button:
    fontFamily: Nunito Variable
    fontSize: 1rem
    fontWeight: 850
    lineHeight: 1.2
    letterSpacing: 0.01em
  saying:
    fontFamily: Fraunces Variable
    fontSize: 2rem
    fontWeight: 560
    lineHeight: 1.2
    fontVariation: "'SOFT' 100, 'opsz' 36"
rounded:
  sm: 10px
  md: 14px
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
    textColor: "{colors.on-primary}"
    rounded: "{rounded.md}"
    height: 50px
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.sky-ink}"
    rounded: "{rounded.md}"
  button-sky:
    backgroundColor: "{colors.sky}"
    textColor: "{colors.on-sky}"
  button-reward:
    backgroundColor: "{colors.sun}"
    textColor: "{colors.ink}"
  link:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.primary-ink}"
  choice-selected:
    backgroundColor: "{colors.sky-soft}"
    textColor: "{colors.sky-ink}"
  choice-correct:
    backgroundColor: "{colors.primary-soft}"
    textColor: "{colors.on-primary-soft}"
  choice-wrong:
    backgroundColor: "{colors.coral-soft}"
    textColor: "{colors.coral}"
  tile-challenge:
    backgroundColor: "{colors.rose-soft}"
    textColor: "{colors.coral}"
  tile-challenge-icon:
    backgroundColor: "{colors.rose}"
    textColor: "{colors.on-rose}"
  tile-special:
    backgroundColor: "{colors.lavender-soft}"
    textColor: "{colors.lavender-ink}"
  tile-special-icon:
    backgroundColor: "{colors.lavender}"
    textColor: "{colors.on-lavender}"
  tile-reward:
    backgroundColor: "{colors.sun-soft}"
    textColor: "{colors.sun-ink}"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
  well:
    backgroundColor: "{colors.surface-sunk}"
    textColor: "{colors.ink}"
  night-panel:
    backgroundColor: "{colors.night}"
    textColor: "{colors.on-night}"
    rounded: "{rounded.xl}"
  night-panel-muted:
    backgroundColor: "{colors.night}"
    textColor: "{colors.on-night-muted}"
  divider:
    backgroundColor: "{colors.line}"
    textColor: "{colors.ink-muted}"
  outline:
    backgroundColor: "{colors.line-strong}"
    textColor: "{colors.ink}"
  streak:
    backgroundColor: "{colors.sun-soft}"
    textColor: "{colors.sun-ink}"
  bayu-casque:
    backgroundColor: "{colors.casque}"
    textColor: "{colors.ink}"
---

# LESTARI design system: Hutan Ceria

## Overview

LESTARI should feel like stepping into a cheerful rainforest adventure, not opening a school portal. Learners follow **Bayu**, an original rhinoceros-hornbill guide (the enggang appears in real peribahasa), along a **learning path** of short lessons. Every screen has one obvious next action, and every real learning action is answered with feedback, XP and, at milestones, a celebration.

- **Reference:** the supplied *Duolingo App UI – Free UI Kit (Recreated)* (Figma Community, 7 screens) was studied for principles: full-width chunky buttons with a darker bottom edge, a thin lesson progress bar beside a close button, big centred questions, bordered choices that turn blue when selected, a "tap the matching pairs" exercise, a starry deep-blue surface and a mascot that speaks in bubbles. No Duolingo branding, owl or illustration is used.
- **Mode:** a playful learning product. Delight is spent on feedback and milestones; reading surfaces (sayings, meanings, explanations) stay calm and high-contrast.
- **Signature elements:** the snaking learning path with Bayu beside the current lesson, and, in situation search, the student's own sentence with the matched words highlighted.

## Colors

Colour has a job; nothing is coloured at random.

- **Jungle green (#58CC02)** is progress, success and the main action. White text on it fails contrast (2.1:1), so fills carry **deep green text (#0E3B05)**, 6.1:1. Green text on cream uses **#2B7A0B** (5.3:1).
- **Sunshine (#FFC800)** is rewards: XP, the daily challenge reward, badges, the "Jom Belajar!" button. Ink text (8.5:1).
- **Sky blue (#1CB0F6)** is discovery and selection: search, the nav indicator, the selected answer (taken from the kit), with navy text (#06324A, 5.5:1).
- **Coral rose (#FF6B6B)** is energetic emphasis for challenge tiles such as Padankan Situasi. **Lavender (#CE82FF)** marks special content (Lengkapkan, collectible badges).
- **Red (#B33232)** is reserved for wrong answers and errors.
- **Night sky (#1E3A5F)** is the daily challenge surface, sprinkled with stars.
- **Warm cream (#FFFDF5)** is the page; cards are white with a 2px warm border.

## Typography

- **Nunito** (rounded, 560–900) for the whole interface: friendly like the kit's typeface, yet highly legible for long Malay meanings. Headings 900, buttons and labels 850, body 560.
- **Fraunces** (soft serif) for every peribahasa, so the saying reads as heritage literature inside a playful app.
- Body at least 16px; tabular figures for XP and counts.

## Layout

- **Mobile first:** compact top bar (wordmark, streak flame, XP), five-tab bottom bar (Utama, Cari, Latihan, Simpanan, Profil) with a sliding indicator. Lessons hide both bars and use the kit's layout: close button, progress bar, full-width answers and a fixed bottom action bar.
- **Desktop:** a 248px sidebar with the same sliding indicator, shortcuts and today's goal; the dashboard splits 1.45 : 1 into the adventure column (hero, path) and a rail (daily challenge, activities, progress, badges).
- Spacing on a 4px scale; touch targets at least 44px.

## Elevation & Depth

Depth is tactile, not blurry: controls and tiles sit on a solid **bottom edge** in a darker shade of their own colour (CSS-only tokens, never behind text: green edge #46A302, sky edge #1899D6, sun edge #E0A800, rose edge #E05555, lavender edge #A568CC) (4px for buttons and tiles, 6px for path nodes and hero panels). Pressing moves the element down by the edge height and the edge disappears. Cards use a 2px border, links get a 4px bottom border. Only overlays (sheets, achievement banner) use a soft lifted shadow. No glassmorphism.

## Shapes

- Buttons and inputs 14px, cards 18px, hero panels 26–28px, chips and badges full pills.
- Path nodes are 76px circles; achievement badges are shields with a ribbon highlight.
- Bayu is drawn with organic curves; the UI stays geometric.

## Components

- **Button:** primary (green), secondary (white, blue text, grey edge), sun (reward), sky (discovery), quiet (text). Disabled buttons turn flat grey.
- **Learning path:** unit banner in the unit colour; nodes done (check), current (star, gentle pulse, "Mula" bubble, Bayu waving beside it), locked (grey lock, explains why).
- **Lesson steps:** teach card, multiple choice with *Semak*, matching pairs, results with three stat tiles (XP, accuracy, correct).
- **Feedback bar:** fixed at the bottom; green with Bayu cheering or red with Bayu encouraging, the correct answer and the explanation, then *Teruskan*.
- **Activity tile:** its own soft colour, an icon block in the strong colour, title, short description.
- **Badges:** illustrated shields per achievement; locked ones are grey with a lock and a progress bar.

## Motion

Motion signals state and celebrates real learning; it never blocks reading.

| Moment | Motion | Duration |
|---|---|---|
| Button and tile press | translateY by edge height, edge collapses | 110ms |
| Page change | rise and fade in | 260ms |
| Nav indicator | slides with a soft spring | 300ms |
| Answer correct | choice pops, sparks (React Bits ClickSpark), Bayu hops | 320–520ms |
| Answer wrong | choice shakes, Bayu wiggles encouragingly | 360–520ms |
| Current lesson node | slow ring pulse (not a flash) | 2.4s loop |
| Bayu idle | float and occasional blink | 3.6s / 5.2s loops |
| XP and score | count up from the previous value | 700–900ms |
| Lesson results, achievement | GSAP timeline, confetti on first pass, badge pop | ≤ 1.7s |

Easing tokens: `--ease-out` (0.23, 1, 0.32, 1), `--ease-in-out` (0.77, 0, 0.175, 1), `--ease-spring` (0.34, 1.56, 0.64, 1). CSS handles presses, transitions and loops; GSAP (`useGSAP`, scoped) handles the welcome, dashboard entrance and results timelines. `prefers-reduced-motion: reduce` stops loops, confetti and count-ups.

## Do's and Don'ts

- **Do** show the next action first and tie every number to real activity (zeros are shown as zeros).
- **Do** keep text on bright fills dark; check contrast with this file's linter.
- **Do** label provenance ("Disemak dengan PRPM", "Contoh oleh LESTARI", "anggaran").
- **Don't** use the Duolingo owl, logo or illustrations, or emoji as interface icons (emoji are Kuiz Emoji content only).
- **Don't** add confetti to ordinary clicks, animate layout properties, or loop motion near text being read.
- **Don't** call local matching "AI".
