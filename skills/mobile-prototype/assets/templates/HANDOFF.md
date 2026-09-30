# Handoff — {{APP_NAME}}

Flow locked by: <name> on <date> · Platforms: <android / ios> (min OS: <…>) · Sketch: `prototype/flow.drawio` · Final look: <`prototype/look/screens.html` / not done>

## 1. Summary

## 2. Inputs
| Document | Version / date |
|---|---|

## 3. Screen inventory
| S-number(s) | Screen id | Title | Purpose | Entry points | Destination |
|---|---|---|---|---|---|

## 4. Navigation graph
```
<text diagram>
```
| From | Back goes to | Up goes to | Confirmation needed? | Platform differences |
|---|---|---|---|---|

## 5. State model per screen
```
<ScreenName>UiState = Loading | Content(…) | Empty | Error(message, canRetry) | Offline(cached)
```
| Screen | State | S-number | Trigger | What the user sees |
|---|---|---|---|---|

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
| `sketch.mjs --check` (spec valid, every screen reachable, no overlapping arrows) | |
| Flow locked by the user (gate C) | |
| Theme contrast (`THEME-REPORT.md`), if the design phase ran | |
| `look/screens.html` checks, as reported by the user, if the design phase ran | |

Not checked: behaviour (nothing was run as an app).

## 12. Visual references
| Journey | Page in `flow.drawio` | Screens (S-numbers) | Final look (if done) |
|---|---|---|---|

## 13. Out of scope for the prototype
-
