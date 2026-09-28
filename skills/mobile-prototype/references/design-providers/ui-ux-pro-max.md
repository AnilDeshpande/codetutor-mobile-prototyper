# Design provider: ui-ux-pro-max

[ui-ux-pro-max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) (MIT, © 2024 Next Level
Builder) is a searchable design dataset with a reasoning layer: product categories, styles,
palettes, font pairings, UX rules, and guidance per stack. It is strong on **mood, palette and
font-pairing reasoning and general UX rules**; its output leans towards the web (landing-page
patterns, hover effects, CSS shadows, GSAP). This file says how to use the strong part and leave
the rest, so its output ends up in the same `DESIGN.md` contract as the baseline provider's.

It is a **provider**, not the owner of the workflow: its results are recommendations. Our
decisions, the documents and the platform conventions win over it, and it never writes tokens —
`theme.mjs` does.

## Availability and install

```
node scripts/design-provider.mjs --check --json
```

- `usable: true` → use it.
- Not installed → install it now: the user chose the design phase, which is their consent.
  `node scripts/design-provider.mjs --install --host <claude|codex|cursor|gemini|agents> --json`.
  Show the user the `notice` lines it returns (what is installed, from where, the licence, where
  to, how to remove it) — don't summarise them away.
- `reason: python-missing` or any failure → tell the user in one line (with the install hint for
  Python that the script prints) and use the baseline provider (`baseline.md`). Never install
  Python yourself, and never block on it.

Run every query through the wrapper, which finds the install and the right Python:

```
node scripts/design-provider.mjs --run -- "<query>" <search.py options>
```

## Queries (mobile-shaped)

Keep queries short (2–5 meaningful words): product type, domain, mood, and "mobile app". Don't
put private project data (names of people, internal codenames, figures) in a query.

1. **Direction** (one per option):
   ```
   --run -- "<product type> <domain> <2-3 mood words> mobile app" --design-system -p "<App>" \
            --variance <v> --motion <m> --density <d> --json
   ```
2. **Palette alternatives** when the first palette doesn't fit the documents:
   `--run -- "<domain> <mood>" --domain color -n 3 --json`.
3. **Native app rules** (the `web` domain searches its iOS/Android app-interface guidelines):
   `--run -- "<topic> e.g. bottom tabs touch target" --domain web -n 3`. Use them as review
   input; our platform conventions win where they differ.
4. **Stack notes for the handoff**: `--run -- "<topic>" --stack jetpack-compose` or
   `--stack swiftui`. Quote the guideline and its documentation link only — never copy its code
   examples into the handoff (the handoff contains no code).

## The three choices → its dials

| Our choice | Its dial |
|---|---|
| expressiveness restrained / balanced / bold | `--variance 2 / 5 / 8` |
| motion minimal / standard | `--motion 2 / 4` (never higher: complex choreography doesn't transfer to a native build) |
| density spacious / balanced / dense | `--density 2 / 5 / 8` |

## Its output → DESIGN.md

| Its field | Goes to | Notes |
|---|---|---|
| `colors.primary` | `brand` | unless the documents give a brand colour — the documents win; then use its palette only for the accent |
| `colors.accent` / `cta` | `accent` | only if clearly different from the brand in hue; otherwise `auto` |
| `colors.destructive`, `background`, `card`, `muted`, `border`, `ring`, all `on_*` | — | ignored: Material 3 derives surfaces and on-colours from the brand, and iOS keeps its system colours |
| `typography.heading` / `body` | `font.display` / `font.text` | only if the font is on Google Fonts (it links them) and suits body text at small sizes; keep `platform` for body on iOS unless the brand needs it |
| `style.name`, `keywords` | *Intent*, `expressiveness`, `shape` | e.g. minimal/Swiss → restrained + rounded or square; playful/soft → soft |
| `constraints` containing `wcag-aaa` | `contrast: high` | also add it to *Accessibility commitments*, and verify with `__prototypeAudit({ minContrast: 7 })` |
| `anti_patterns`, `decision_rules` | *Colour use* / *Components and emphasis* | as don'ts, where they apply to an app |
| `category` | *Intent* | cite it: "Provider category: Healthcare App" |
| `spacing_scale`, `dials` | — | our density choice already sets spacing |

**Not taken** (list them under *Not taken from the provider*, with one line why): `pattern`
(landing-page sections: Hero, testimonials, CTA), hover effects and `key_effects` that assume a
pointer, CSS shadow scales, `motion_snippet` (GSAP / scroll-triggered animation), CSS `@import`
and `google_fonts_url` (theme.mjs downloads fonts itself).

Set `Provider: ui-ux-pro-max v2.15.0` (or the version `--check` reports) in the header and cite
it as the source in *Rationale*.

## Two options

Run the direction query twice with different dials or mood words (for example "calm clinical" at
variance 2 vs "warm supportive" at variance 5) so the options differ for a reason; map both.
Keep the raw output for provenance, not as a second source of truth:

- visual direction: `prototype/notes/design/ui-ux-pro-max-<option>.json` (the `--json` output);
- design system: `design-system/<app>/sources/ui-ux-pro-max.md` (the same query with
  `--format markdown` instead of `--json`). Don't use its `--persist`: it writes a `MASTER.md`
  that its own skill treats as the master, which would compete with the approved `DESIGN.md`.

Everything after this — style tiles, `theme.mjs`, the re-verification and the approvals — is the
same as with the baseline provider (`references/design-phase.md`).
