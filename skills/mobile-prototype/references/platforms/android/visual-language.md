# Android visual language (Material 3) for the design phase

Read in Phase 9 only. `conventions.md` in this folder covers behaviour; this file covers the
look, and how the dials in `DESIGN.md` map onto Material 3. `scripts/theme.mjs` does the colour
maths; your job is to choose the inputs and use the roles well.

## Colour

Material 3 builds the whole scheme from one source colour: five tonal palettes (primary,
secondary, tertiary, neutral, neutral variant, plus error), from which each **role** takes a tone.
Screens use roles, never raw colours.

| Role | Use for |
|---|---|
| primary / on-primary | the key action (filled button, FAB), active states, progress |
| primary-container / on-primary-container | prominent but not primary: a highlighted card, the FAB container |
| secondary-container / on-secondary-container | selection: the navigation indicator, tonal buttons, selected chips |
| tertiary(-container) | contrast accents that balance the primary (a stat, a badge); the `accent` in DESIGN.md |
| surface, surface-container-lowest … highest | layering: cards, sheets, bars and fields sit on different containers instead of shadows |
| on-surface / on-surface-variant | text: primary and supporting |
| outline / outline-variant | field and button borders (≥ 3:1) / dividers (decorative) |
| error(-container) | errors only |
| inverse-surface / inverse-primary | snackbars |

- **Scheme variants** (`android.scheme`): tonal-spot (the default: calm, brand as an accent),
  neutral (almost grey: restrained), vibrant (saturated primary: bold), expressive (hue-shifted,
  playful), fidelity and content (keep the brand colour itself as primary-container: for brands
  that must be exact). `auto` picks neutral / tonal-spot / vibrant from expressiveness.
- **Dynamic colour** (Android 12+): the system can replace the brand scheme with one from the
  wallpaper. Record a decision: off for brand-critical or regulated products (the usual choice),
  on for utilities that should feel part of the phone. The prototype always shows the brand scheme.
- **Custom colours** (success, domain states such as in range / low / high) are *harmonised*
  towards the brand hue so they sit in the same scheme; each gets the same four roles. State is
  never colour alone.
- **Dark theme**: the scheme's dark tones, not inverted colours; surfaces get lighter as they
  rise. Check both themes.

## Type

Scale: display (L/M/S) · headline · title · body · label, each large / medium / small. Roboto
(or Roboto Flex) by default; a brand typeface replaces it for display, headline and title
(`font.display`) and, more rarely, for everything (`font.text`). Keep body text in a highly
legible face; use tabular figures for numbers that change. Sizes are in sp and scale with the
user's font size (tested at 200 %).

## Shape

Corner scale: none 0 · extra small 4 · small 8 · medium 12 · large 16 · extra large 28 · full.
Components map to it (chips small, cards medium, FAB large, dialogs and sheets extra large,
buttons full). `shape: square` tightens the scale and squares buttons (8 dp); `soft` rounds it
further. Material 3 Expressive (2025) adds more shape variety and shape morphing — use it only
when the product wants a bold, playful look and the target OS supports it.

## Elevation, motion, icons

- **Elevation** is mostly tonal (surface-container levels); shadows only where something floats
  (FAB, menus, dragged items).
- **Motion**: emphasised easing for transitions (300–500 ms), standard easing for small changes
  (150–250 ms); predictive back shows the destination during the back gesture (Android 14+).
  `motion: minimal` shortens durations and prefers fades; always honour "Remove animations".
- **Icons**: Material Symbols (Apache-2.0), one style throughout (outlined or rounded), 24 dp,
  weight matching the text.
- **Edge-to-edge** is the default from Android 15: content draws behind the status and
  navigation bars with insets; the prototype's simulated bars show where.

## How the DESIGN.md dials map

| Dial | Android |
|---|---|
| expressiveness | scheme variant (restrained → neutral, balanced → tonal-spot, bold → vibrant) |
| density | spacing scale (spacious 4/8/16/20/32/40/56 · balanced 4/8/12/16/24/32/48 · dense 4/6/8/12/16/24/40); touch targets stay 48 dp |
| motion | minimal: 100 / 150 ms; standard: 150 / 300 ms |
| shape | corner scale and button shape, as above |
| fonts | display font → display, headline, title-large; text font → everything else |

## Handoff

Give the native team `material-theme.json` (design-system level) or the scheme table from
`notes/THEME-REPORT.md`: every role in light and dark, the seed, the variant, and custom colours
— enough to rebuild the scheme in Material Theme Builder or code. No Compose code.
