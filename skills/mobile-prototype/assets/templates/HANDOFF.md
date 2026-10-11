# Handoff — {{APP_NAME}}

Flow locked by: <name> on <date> · Platforms: <android / ios> (min OS: <…>) · Sketch: [`flow.drawio`](flow.drawio) (how to open it: section 12) · Final look: <[`look/screens.html`](look/screens.html) / not done>

## 1. Summary

## 2. Inputs
| Document | Version / date |
|---|---|

## 3. Screen inventory
Each frame (S-number) is one state of one app screen. Screen names are the same here and in
`flow.drawio`; state and entry condition are listed apart from them. The tables between the
`generated` markers come from `flow.json`: run `node <skill>/scripts/handoff.mjs` to refresh them,
and don't edit inside them.

<!-- generated:screens (scripts/handoff.mjs from flow.json; don't edit inside) -->
<!-- /generated:screens -->

## 4. Navigation graph
```
<text diagram>
```
| From | Back goes to | Up goes to | Confirmation needed? | Platform differences |
|---|---|---|---|---|

### Transitions
Where each action leads: the next screen is the transition target, not the screen's own place in
the navigation (that is the *App screen / navigation location* in section 3).

<!-- generated:transitions (scripts/handoff.mjs from flow.json; don't edit inside) -->
<!-- /generated:transitions -->

## 5. State model per screen
```
<ScreenName>UiState = Loading | Content(…) | Empty | Error(message, canRetry) | Offline(cached)
```
| Screen | State | S-number | Trigger | What the user sees |
|---|---|---|---|---|
<!-- Use the screen names and states from section 3; one UiState type per screen, one case per state. -->

## 6. Component mapping
### Android (Material 3)
| Sketch element | M3 component | Variant / notes |
|---|---|---|
### iOS (SwiftUI)
| Sketch element | SwiftUI component | Variant / notes (custom? SF Symbol) |
|---|---|---|

## 7. Theme
Look: <visual design not done: platform baseline | visual direction A, approved <date> | design system `design-system/<app>/`> · Source: `notes/DESIGN.md` · Contrast: `notes/THEME-REPORT.md` (<n>/<n> pairs pass)

(If the design phase didn't run, leave the tables below out.)
### Android (Material 3 colour scheme)
Seed <#hex> · variant <tonal-spot…> · dynamic colour <off / on> · <material-theme.json if a design system>
| Role | Light | Dark |
|---|---|---|
### iOS
AccentColor <#light> / <#dark> · other colours: system semantic colours · materials: <classic / Liquid Glass> · <ios-theme.json if a design system>
| Colour | Light | Dark | Used for |
|---|---|---|---|
### Type, shape, spacing, motion
| Token | Android | iOS |
|---|---|---|

## 8. Copy
| Screen | Key | Text | iOS variant (if different) | Status (approved / draft) |
|---|---|---|---|---|

## 9. Decisions
### Assumptions to confirm before build
| ID | Assumption |
|---|---|
### All decisions
| ID | Decision | Source |
|---|---|---|

## 10. Open questions
| ID | Question | Owner |
|---|---|---|

## 11. What was checked
| Check | Result |
|---|---|
| `sketch.mjs --check` (spec valid, every screen reachable; no arrow overlaps or crosses another or runs over a screen; labels in the clear) | |
| Flow locked by the user (gate C) | |
| Theme contrast (`THEME-REPORT.md`), if the design phase ran | |
| `look/screens.html` checks, as reported by the user, if the design phase ran | |

Not checked: behaviour (nothing was run as an app).

## 12. Visual references
The sketch is [`flow.drawio`](flow.drawio). Open it in VS Code with the *Draw.io Integration*
extension (`hediet.vscode-drawio`), in draw.io Desktop (https://www.drawio.com), or at
https://app.diagrams.net (File › Open from › Device). Don't count on a draw.io plugin in Android
Studio. The pages are the tabs along the bottom of the window:

<!-- generated:pages (scripts/handoff.mjs from flow.json; don't edit inside) -->
<!-- /generated:pages -->

Final look: <`look/screens.html`, one screen at `look/index.html?platform=<p>&screen=<screen>&state=<state>&theme=light` / not done>

## 13. Out of scope for the prototype
-

## Sources
The S-numbers, screen names and states follow the skill's flow spec; decision IDs are question
IDs (`notes/CLARIFICATIONS.md` explains them). The conventions are the skill's; the content is
this project's.

| Convention | Defined in |
|---|---|
| Frames, S-numbers, screens, states and entry conditions | {{REF:references/sketch-spec.md|Flow spec}} |
| What each section of this handoff contains | {{REF:references/handoff-package.md|Handoff package}} |
| Question IDs used as decision IDs | {{REF:references/question-bank.md|Question bank}} |
| Opening and editing `flow.drawio` | {{REF:references/drawio-setup.md|draw.io setup}} |
