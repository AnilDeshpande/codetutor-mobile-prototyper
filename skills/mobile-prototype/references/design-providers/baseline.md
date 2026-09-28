# Built-in design provider (baseline)

The baseline provider is you, reasoning from the documents and the platform visual languages. It
needs no install and always works; use it when `ui-ux-pro-max` isn't available or the user
prefers not to use it. Label its output honestly: `Provider: baseline (reasoned from the
documents and the platform guidelines; no design dataset)`.

Its job is to fill `DESIGN.md` (template: `assets/templates/DESIGN.md`) twice: a recommended
direction and one real alternative.

## Filling the contract

| Field | How to decide | Default when nothing says otherwise |
|---|---|---|
| brand | A colour stated in a brand guide, design document, existing app or logo (V1, V2). Quote the source. | None: ask. If the user says "you choose", propose one from the domain (health and care: teal or blue; money: deep blue or green; energy and sport: warm orange or red; children: friendly, saturated) and flag it as an assumption. Never present Material's sample purple as a brand. |
| accent | A second brand colour, only if the documents have one. | auto |
| expressiveness | The context of use (P1): stressful, clinical or regulated → restrained; everyday consumer → balanced; entertainment, social, youth, promotion → bold. | balanced |
| density | V4. Data-heavy tools and experts → dense; first-time, anxious or older users → spacious. | balanced |
| motion | Medical, anxious, vestibular-sensitive or older users, or "calm" in the brief → minimal. | standard |
| shape | Professional, financial, enterprise → square; friendly consumer, children → soft. | rounded (platform default) |
| contrast | `high` when X1 commits to WCAG AAA, or the users need it (low vision, older users, clinical use in bright light). | standard |
| font.display / font.text | Only a font named by the brand guide, available for apps (Google Fonts, or a licence the product holds). Record the licence. | platform (Roboto / SF Pro) |
| android.scheme | fidelity when the brand colour must appear exactly (brand guide says so); otherwise auto. | auto |
| ios.tint | auto; if `theme.mjs` reports the brand is too light for text on iOS, use the colour it suggests as the tint and keep the brand for fills and illustrations. | auto |

## Choosing the alternative

Make the second option a real choice, not a variation nobody can see: change one or two dials
that the documents leave open, for example restrained vs balanced, tonal-spot vs fidelity, or
rounded vs square. Say in one line what each option is for ("A: calm and clinical, B: warmer,
more like a consumer app").

## The rest of the file

Write *Intent*, *Colour use*, *Typography*, *Components and emphasis*, *Motion* and *Platform
notes* from the documents plus `references/platforms/<platform>/visual-language.md`. Keep it
specific to this product: "glucose values use the title style with tabular figures; out-of-range
values add an icon and a label, never colour alone" is useful, "clean modern look" is not.
