# Handoff — {{APP_NAME}}

Approved by: <name> on <date> · Platforms: <android / ios> (min OS: <…>) · Prototype: `prototype/index.html` · Storyboard: `prototype/storyboard.html`

## 1. Summary

## 2. Inputs
| Document | Version / date |
|---|---|

## 3. Screen inventory
| Screen id | Title | Purpose | Entry points | Destination |
|---|---|---|---|---|

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
| Screen | State | Trigger | What the user sees |
|---|---|---|---|

## 6. Component mapping
### Android (Material 3)
| Prototype element | M3 component | Variant / notes |
|---|---|---|
### iOS (SwiftUI)
| Prototype element | SwiftUI component | Variant / notes (custom? SF Symbol) |
|---|---|---|

## 7. Theme
Look: <platform baseline | visual direction A, approved <date> | design system `design-system/<app>/`> · Source: `notes/DESIGN.md` · Contrast: `notes/THEME-REPORT.md` (<n>/<n> pairs pass)
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

## 11. Verification
| Scenario | Android: compact | medium | expanded | iOS: iphone | iphone-se | ipad | dark |
|---|---|---|---|---|---|---|---|
Not verified:

## 12. Visual references
| Screen · state | Screenshot |
|---|---|

## 13. Faked in the prototype
-
