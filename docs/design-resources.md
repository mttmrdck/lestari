# Design resources: what was used, and how

All 17 repositories were verified to exist (GitHub API, 29 Oct 2026), shallow-cloned to a scratch folder and read. No third-party script was executed except the ones listed as "run", after their imports were checked. Skills marked "installed" were copied into the project-scoped `.claude/skills/` (no global Claude settings were changed).

| Resource | Status | How it shaped LESTARI |
|---|---|---|
| Duolingo App UI – Free UI Kit (Recreated), Figma Community (`~/Downloads/…-2.zip`, 7 exported screens) | Studied (rendered to images) | Principles only: chunky full-width buttons with a darker bottom edge, close button plus thin progress bar in lessons, big centred questions, bordered choices that turn blue when selected, a matching-pairs exercise, a starry deep-blue surface, a mascot speaking in bubbles. No owl, logo, illustration or branding reused. |
| nextlevelbuilder/ui-ux-pro-max-skill | Installed, run | `search.py --design-system` for "gamified language learning students playful" gave indigo + progress-green and a rounded display face. I kept the palette logic, replaced Comic Neue with Plus Jakarta Sans for teenage legibility, and followed its pre-delivery checklist (44px targets, 4.5:1 contrast, reduced motion, 375–1440 checks). |
| VoltAgent/awesome-design-md | Consulted | Studied how brand DESIGN.md files structure tokens and prose. No brand was copied. |
| nexu-io/open-design | Consulted, not launched | Needs its desktop app or daemon plus `od mcp install`, which edits global Claude config, so it was not launched. Its skill catalogue was reviewed for reference. |
| Leonxlnx/taste-skill | Installed, run | Read the app-screen chapter (type-led KPIs, honest zeros, a product "face", one signature element). Ran `inspect.mjs` against the built welcome screen in Brave. It drove the full-width display headline and fixed stat labels rendering above their numbers. Findings that contradict the brief (violet, cream ground, an SVG mascot instead of photographs) were defended, not followed. |
| pbakaus/impeccable | Installed, consulted | Read the skill and `craft-floor.md` before UI work. Applied Operate mode, banned eyebrows, themed selection and focus, and the "brief wins" rule. Its launcher downloads a binary, so it was not run. |
| DavidHDev/react-bits | Used | `ClickSpark` copied into `src/components/ui/` (attributed), with a `manual` mode added so sparks fire only on correct answers and saves. CountUp was rejected because it pulls in the `motion` library; GSAP already covers count-ups. |
| emilkowalski/skills | Installed, applied | Easing tokens (`--ease-out`, `--ease-in-out`), duration table, "should this animate" gate, never `scale(0)`, transform and opacity only. |
| Nutlope/hallmark | Installed, run | Floor rules applied (tokens only, `overflow-x: clip`, focus-visible, no `transition: all`, no middle-dot meta, no emoji icons). `sloplint.mjs` ran until 0 FAIL; the remaining WARNs were reviewed as false positives. Stamp at the top of `src/index.css`. |
| google-labs-code/design.md | Used, run | `DESIGN.md` follows the spec; `npx @google/design.md lint` reports 0 errors and 0 warnings. Its contrast check caught coral text at 4.08:1, which was darkened. |
| greensock/gsap-skills | Installed, applied | `useGSAP` with scope and cleanup, `gsap.registerPlugin(useGSAP)`, timelines for welcome, results and achievements, reduced-motion guards. ScrollTrigger deliberately not used. |
| oso95/scroll-world | Evaluated, excluded | Builds a scroll-scrubbed 3D world from paid Higgsfield and Seedance video generation. Unsuitable for a fast learning app and needs paid external services. |
| DavidHDev/canvas-ui | Evaluated, excluded | WebGL/WebGPU effects over HTML; GPU cost on student devices for no learning value. |
| kelvinkn17/skills (fun-isometric) | Evaluated, consulted | Needs Bun, ffmpeg and Playwright rendering. Its sticker style (flat fill, bold silhouette) informed Bayu's flat SVG treatment. |
| CloudAI-X/threejs-skills | Evaluated, excluded | No 3D scene shipped; a static SVG mascot gives the same warmth at a fraction of the cost. |
| zanwei/design-dna | Installed, applied | No reference images were supplied, so the three-dimension DNA profile (`docs/design-dna.json`) was written from the brief's descriptions using its schema. |
| LottieFiles/motion-design-skill | Installed, applied | Choreography and emotion-to-motion guidance for success, error shake and celebration. No Lottie runtime added (too heavy for small effects). |
| AThevon/genjutsu | Consulted | Reviewed its motion and mobile-principles skills; it overlaps with the Emil and GSAP guidance already applied, so nothing extra was installed. |
| dataviz (bundled skill) | Applied | XP chart: single series, no legend, 4px data-ends, 2px gaps, hover values, hidden data table; palette validated with `validate_palette.js`. |

## Redesign pass (Hutan Ceria)

- **UI/UX Pro Max** re-run for "playful gamified language learning app vibrant mascot": still proposed indigo; the brief's green-led palette won, but its rounded display type and "progress animations + achievement unlocks" effects were adopted (Nunito instead of the suggested Comic Neue for legibility).
- **Google DESIGN.md lint**: 0 errors, 0 warnings. Contrast checks forced dark text on every bright fill (white on #58CC02 is only 2.1:1).
- **Hallmark sloplint**: 0 FAIL, 0 REFLEX; gate 7b (pure white surfaces) waived on the record for answer cards on the cream page.
- **taste-skill inspect --app** on Latihan: fixed "covered text" (the confetti canvas now mounts only while falling). Remaining findings (emoji content, tactile bottom shadows, coloured icon blocks, cream ground) are direct requirements of this brief and were kept deliberately.
- **Emil Kowalski / motion-design / GSAP**: easing tokens plus a spring for the nav indicator, press feedback at 110ms, the gentle 2.4s node pulse instead of flashing, entrance timelines scoped with `useGSAP`, everything off under reduced motion.
- **React Bits ClickSpark** on correct answers and saves; confetti is a small in-house canvas (no extra animation library).
