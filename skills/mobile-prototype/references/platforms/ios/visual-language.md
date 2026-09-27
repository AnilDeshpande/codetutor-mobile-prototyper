# iOS visual language (Human Interface Guidelines) for the design phase

Read in Phase 9 only. `conventions.md` in this folder covers behaviour; this file covers the
look, and how the dials in `DESIGN.md` map onto iOS. `scripts/theme.mjs` derives the colours;
your job is to choose the inputs and use them the iOS way.

## Colour

- **One tint.** The brand colour becomes the app's accent (AccentColor): it marks what is
  interactive — bar buttons, links, the selected tab, prominent buttons (switches stay green by
  default). It is not a large-surface colour: iOS apps don't paint navigation bars or backgrounds
  in the brand colour.
- **System semantic colours** for everything else: backgrounds (system / secondary / tertiary,
  and the grouped set for inset lists), labels (primary / secondary / tertiary / quaternary),
  separators and fills. They adapt to dark mode and Increase Contrast by themselves; keep them.
- The tint needs **4.5:1** on the grouped background, in cells and on bordered buttons. Light
  brand colours (yellow, light green, cyan) don't reach it: `theme.mjs` stops and suggests the
  nearest colour with the same hue that does. Use it as the tint (`ios.tint`) and keep the brand
  colour for illustrations, the app icon and fills. In dark mode `theme.mjs` lifts the tint the
  way Apple's system colours do.
- **Status colours** are the system ones (red, green, orange), in their accessible variants for
  text. State is never colour alone.

## Materials and Liquid Glass

- Bars, sheets and popovers use translucent **materials** (thin to thick) that blur the content
  beneath; content scrolls under the bars.
- **Liquid Glass** (iOS 26 and later) makes bars and controls float as glass above the content,
  with the tab bar shrinking on scroll and toolbars grouping controls into capsules. Whether it
  applies depends on the minimum iOS version (A5): below 26, the classic materials. The prototype
  draws translucent bars that read correctly for both; describe the target in *Platform notes*
  and the handoff rather than faking glass effects.

## Type

Dynamic Type text styles (default size, pt): Large Title 34 · Title 1 28 · Title 2 22 · Title 3
20 · Headline 17 semibold · Body 17 · Callout 16 · Subheadline 15 · Footnote 13 · Caption 1 12 ·
Caption 2 11. SF Pro is the system font (it can't be bundled in the prototype; Apple devices show
it). A brand typeface is allowed but must scale with Dynamic Type (the native team uses the text
style it relates to); keep body text in SF Pro unless the brand really requires otherwise. Use
tabular figures for changing numbers. Bar titles, tab labels and back buttons keep their size
at large accessibility sizes.

## Shape, spacing, icons, motion

- **Corners** are continuous ("squircle"), and nested shapes are concentric (inner radius =
  outer radius − padding). Inset grouped lists 10–12 pt, cards 12–16, sheets 20+, buttons
  capsule or rounded rectangle. `shape: square` switches buttons to rounded rectangles and
  tightens radii; `soft` rounds further.
- **Spacing**: 16 pt side margins on iPhone (20 on larger widths), an 8 pt rhythm, 44 pt minimum
  targets.
- **Icons**: SF Symbols, weight matched to the adjacent text, in one rendering mode (monochrome,
  hierarchical or palette). The prototype uses open glyphs; name the SF Symbol for each icon in
  the handoff.
- **Motion**: springs, not linear easing; with Reduce Motion, cross-fades replace slides.
  `motion: minimal` shortens durations.
- **App icon**: iOS 18+ asks for light, dark and tinted variants (iOS 26: layered icons). Note it
  for the handoff if the design phase touches the icon.

## How the DESIGN.md dials map

| Dial | iOS |
|---|---|
| expressiveness | how strong the tinted fills are (bordered buttons, info banners, selected rows); the tint itself doesn't change |
| density | spacing scale (as Android); row heights stay ≥ 44 pt |
| motion | minimal: 100 / 150 ms; standard: 200 / 350 ms |
| shape | corner radii and capsule vs rounded-rectangle buttons |
| fonts | display font → large title, titles 1–3; text font → everything else (SF Pro when `platform`) |

## Handoff

Give the native team `ios-theme.json` (design-system level) or the tint table from
`notes/THEME-REPORT.md`: AccentColor for light and dark, the tinted fill colours, and which
system colours are used where. No SwiftUI code.
