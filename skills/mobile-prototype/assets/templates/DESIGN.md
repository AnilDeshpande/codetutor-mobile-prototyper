# Design direction — {{APP_NAME}}

| | |
|---|---|
| Option | a (recommended) |
| Level | visual direction · or design system (`design-system/<app>/`) |
| Provider | baseline · or ui-ux-pro-max <version> |
| Platforms | android, ios · minimum OS: … |
| Status | proposed · approved <date> by <name> |

This file is the contract between a design provider and the final-look screens: the provider fills it in,
`scripts/theme.mjs` turns the `theme` block into platform tokens, and nothing else changes the
look. Every value needs a reason in *Rationale*; everything below the theme block is guidance for
screens and for the native team.

## Intent

<Three words for the feel, then one or two sentences: who uses it, in what situation, and what
the look must do for them. Cite the documents (P1, J…).>

## Theme

```theme
brand: #006a60              # the brand / seed colour (#rrggbb) — required
accent: auto                # auto, or #rrggbb for a second brand colour (Android tertiary; not used on iOS)
expressiveness: balanced    # restrained | balanced | bold
density: balanced           # spacious | balanced | dense
motion: standard            # minimal | standard
shape: rounded              # square | rounded | soft
contrast: standard          # standard (WCAG AA, 4.5:1 text) | high (AAA, 7:1 text)
font.display: platform      # platform, or a font family for headlines and titles
font.text: platform         # platform, or a font family for everything else
android.scheme: auto        # auto (from expressiveness) | tonal-spot | neutral | vibrant | expressive | fidelity | content
android.success: #2e7d32    # seed for the success colour (harmonised with the brand)
ios.tint: auto              # auto (the brand), adjust (darken until it passes), #rrggbb, or #light/#dark
```

## Rationale

| Value | Why | Source |
|---|---|---|
| brand | | brand guide p. 3 / user / provider |
| expressiveness | | |
| density | | V4 |
| motion | | |
| shape | | |
| contrast | | X1 / provider constraint |
| fonts | licence: | |

## Colour use

- Where the brand colour appears (primary actions, selection, key figures) and where it must not
  (for example never for a warning or an out-of-range value).
- Status colours: error, success, and any domain colours (for example glucose in range / low /
  high): meaning, and the second cue besides colour (icon, label, position).

## Typography

Hierarchy on a typical screen (what is display / title / body / caption); numbers (tabular
figures?); anything never to set in the display font.

## Components and emphasis

Cards vs lists, how prominent the primary action is, dividers vs spacing, how empty and error
states look (illustration or icon), iconography (Material Symbols style; the SF Symbol names go
in the handoff).

## Motion

What moves and why (screen transitions, feedback); what must not move; Reduce Motion behaviour.

## Accessibility commitments

Contrast ≥ 4.5:1 for text in both themes (checked by `theme.mjs` and the audit), text scaling to
200 % (Android) / the largest Dynamic Type size (iOS), state never shown by colour alone, and any
X1 commitments.

## Platform notes

### Android
Scheme variant, dynamic colour (on or off for this product, and why), anything Material 3
Expressive, edge-to-edge.

### iOS
Tint in light and dark, Liquid Glass or classic materials (from the minimum iOS version), SF
Symbols rendering mode, app icon variants.

## Not taken from the provider

Suggestions that don't apply to a native mobile app (landing-page sections, hover effects, web
shadows, scroll-driven or GSAP animation) and why they were dropped.

## Screen overrides (design-system level only)

| Screen | File | What differs from this master |
|---|---|---|
