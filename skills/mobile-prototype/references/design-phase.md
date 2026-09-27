# Phase 9 — Optional design phase

The prototype settles **how the product works**; this phase settles **how it looks**, and only
after the UX is approved (gate D). It is optional, runs only when the user chooses it, and never
blocks the handoff: if it's skipped or stopped, the handoff goes ahead with the platform baseline
look, marked "visual design not approved".

```
gate D (UX approved)
  └─ one-line offer ─ no ──────────────────────────────────────────────► Phase 10 handoff
                     └ yes → 9.1 level + provider → 9.2 three choices → 9.3 two directions
                            → 9.4 style tiles, user picks (gate E1) → 9.5 apply → 9.6 refine
                            → 9.7 re-verify everything → 9.8 user approves the look (gate E2) → Phase 10
```

## The offer (at gate D)

After the user approves the UX, add one line, no more:

> The flow is approved. Want a design pass before the handoff? **Visual direction** (a look for
> this prototype) or **design system** (a look saved in your project for the build). Otherwise
> I'll write the handoff now.

If the user asked for "polish" or a "design system" earlier, say you've noted it (`Design:
requested` in `STATE.md`) and make this offer at gate D; don't start earlier. A brand colour that
is already documented (V1) is applied in Phase 5 with `theme.mjs --brand`; that isn't the design
phase.

## 9.1 Level and provider

| Level | Files | For |
|---|---|---|
| **Visual direction** | `prototype/notes/DESIGN.md`, `prototype/tokens/<platform>.theme.css` | a convincing look for reviews and user tests; disposable with the prototype |
| **Design system** | `design-system/<app>/DESIGN.md` (master), `design-system/<app>/screens/<screen>.md` (overrides), `material-theme.json`, `ios-theme.json`, `THEME-REPORT.md` | a look the native build will implement; kept in the project, linked from the handoff |

Provider: the **baseline** (`references/design-providers/baseline.md`), which reasons from the
documents and the platform visual languages. Tell the user which provider you are using in one
line. Record level and provider in `STATE.md`.

## 9.2 Three choices (one question round)

Propose an answer for each from the documents, with the reason, and ask the user to approve or
change them in one round (the host's question tool, or a numbered list):

| Choice | Options (plain language) | Usual source |
|---|---|---|
| Density | spacious · balanced · dense | V4, P1 |
| Expressiveness | restrained · balanced · bold | P1 context, domain, audience |
| Motion | minimal · standard | audience, X1 |

Also settle the brand colour if V1 is still open (from a brand guide, existing app or logo; if
the user says "you choose", propose one and flag it). Fonts stay the platform's unless the brand
guide names one. Complex choreography, parallax and scroll-driven animation are out of scope:
they don't transfer to a native build as a design decision.

## 9.3 Two directions

Write two filled contracts (`assets/templates/DESIGN.md`): `prototype/notes/design/option-a.md`
(recommended) and `option-b.md` (a real alternative, see the provider reference). Then generate
their tokens without touching the prototype:

```
node scripts/theme.mjs --design prototype/notes/design/option-a.md --option a --out prototype
node scripts/theme.mjs --design prototype/notes/design/option-b.md --option b --out prototype
```

`theme.mjs` checks every text/background pair on every platform in scope, in light and dark. If
a pair fails it writes nothing and says why, usually with a passing colour to use instead; fix
the direction (never lower the bar). Offline, Android colours come from an approximation and the
output says so: run it again online before the handoff.

## 9.4 Style tiles → gate E1

`theme.mjs` writes `prototype/style-tile.html`: the prototype's own shell showing the palette
with contrast ratios, the type scale, and every component (buttons, list, fields, switch, chips,
banner, error state, dialog, sheet, snackbar/toast). With the server running, for each option ×
platform × theme, capture with Playwright MCP (`browser_resize` to the phone window, then):

```
style-tile.html?option=a&platform=android&theme=light                    (components)
style-tile.html?option=a&platform=android&theme=light&screen=colour      (palette)
style-tile.html?option=a&platform=android&theme=light&screen=components&state=dialog
```

Save them as `prototype/screenshots/design/<option>/<platform>-<theme>-<screen>.png`, run
`window.__prototypeAudit()` on each (all lists empty), and show the user both options side by
side with one line each on what it's for. The user picks one, or asks for changes: edit that
option's file, regenerate, show again. Gate E1 passes on an explicit pick.

## 9.5 Apply

- **Visual direction**: copy the chosen option to `prototype/notes/DESIGN.md` (status
  `approved`), then `node scripts/theme.mjs --design prototype/notes/DESIGN.md --out prototype`.
  This writes `tokens/<platform>.theme.css`, links it after `tokens/<platform>.css` in
  `index.html`, and writes `notes/THEME-REPORT.md`.
- **Design system**: copy it to `design-system/<app>/DESIGN.md` instead, then
  `node scripts/theme.mjs --design design-system/<app>/DESIGN.md --out prototype --export design-system/<app>`.
  Write `prototype/notes/DESIGN.md` as a one-line pointer to the master. Add
  `design-system/<app>/screens/<screen>.md` only for screens that differ from the master (for
  example an onboarding screen with a large illustration, or a dashboard where one figure
  dominates): what differs and why, in terms of the master's roles and styles — never new colour
  values. A screen file overrides the master for that screen only.
- `node scripts/theme.mjs --remove --out prototype` goes back to the template baseline.

Record the decision in `DECISIONS.md` (for example `D21 — Visual direction A approved: calm,
restrained teal, platform fonts`).

## 9.6 Refine the screens (look, not behaviour)

Apply the direction's *Colour use*, *Typography* and *Components and emphasis* to `screens.js`:
which content gets the title style, where primary-container cards highlight something,
illustration placeholders in empty states, icon choices, spacing between groups. Use only the
neutral tokens and template classes, so both platforms stay correct.

Anything that would change a journey, a state, navigation, copy that was approved, or what's on a
screen is **UX, not design**: record it as a clarification and get it approved before changing it.

## 9.7 Re-verify everything

The look changes colours, fonts, spacing and sizes, so repeat the full Phase 6 run: every
scenario × platform × window × theme, the font-scale passes, reduced motion, every state by URL,
the audit on every screen and state (including `lowContrast`), and no console errors. Replace
the screenshots, rebuild the storyboard, and score the rubric (section 9 covers the direction).

## 9.8 Approve the look → gate E2

Show the storyboard and the style tile of the applied direction, list anything the rubric scored
as minor, and ask for approval of the look. Record it in `STATE.md` (`Design: visual direction
A, approved <date>`) and continue to Phase 10.

## If something fails

| Problem | What to do |
|---|---|
| The provider fails or isn't available | use the baseline provider and say so |
| `theme.mjs` reports failing contrast | use its suggested colour or change the direction; never ship the failing pair |
| Material Color Utilities can't be downloaded | the approximation is used and flagged; run again online before the handoff |
| A font can't be downloaded | the platform font is shown; say so on the style tile review |
| The user stops the design phase | `theme.mjs --remove` (or keep an approved direction), note it in `STATE.md`, go to the handoff |
