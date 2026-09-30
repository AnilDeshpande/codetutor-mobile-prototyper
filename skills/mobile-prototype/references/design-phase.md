# Phase 5 — Optional design phase

The sketch settles **how the product works**; this phase settles **how it looks**, and only
after the flow is locked (gate C). It is optional, runs only when the user chooses it, and never
blocks the handoff: if it's skipped or stopped, the handoff goes ahead with the sketch alone,
marked "visual design not done".

Its input is the locked `prototype/flow.json`. Its output is a design system (or a lighter visual
direction) plus **final-look screens**: every screen state of the flow, rendered in the
platform's own look — Material 3 on Android, the system look on iOS — with the chosen theme.
The screens are pictures of the look. They are not a working app, and the flow is not reopened.

```
gate C (flow locked)
  └─ one-line offer ─ no ──────────────────────────────────────────────► Phase 6 handoff
                     └ yes → 5.1 level + provider → 5.2 render the screens → 5.3 three choices
                            → 5.4 two directions → 5.5 style tiles, user picks (gate D1)
                            → 5.6 apply → 5.7 check → 5.8 user approves the look (gate D2) → Phase 6
```

## The offer (at gate C)

After the user locks the flow, add one line, no more:

> The flow is locked. Want a design pass before the handoff? **Visual direction** (a look for
> these screens) or **design system** (a look saved in your project for the build). Otherwise
> I'll write the handoff now.

If the user asked for "polish" or a "design system" earlier, say you've noted it (`Design:
requested` in `STATE.md`) and make this offer at gate C; don't start earlier.

## 5.1 Level and provider

| Level | Files | For |
|---|---|---|
| **Visual direction** | `prototype/notes/DESIGN.md`, `prototype/look/` | a convincing look for reviews; disposable with the prototype |
| **Design system** | `design-system/<app>/DESIGN.md` (master), `design-system/<app>/screens/<screen>.md` (overrides), `material-theme.json`, `ios-theme.json`, `THEME-REPORT.md` | a look the native build will implement; kept in the project, linked from the handoff |

Provider — whoever fills the `DESIGN.md` contract:

1. `node scripts/design-provider.mjs --check --json`. If `usable`, use **ui-ux-pro-max**
   (`references/design-providers/ui-ux-pro-max.md`).
2. If it isn't installed, install it now — choosing the design phase is the user's consent:
   `node scripts/design-provider.mjs --install --host <this agent> --json`, and show the user the
   `notice` lines it returns (version, source, licence, destination, how to remove it). It works
   straight away, no restart: queries go through `design-provider.mjs --run`.
3. If Python 3 is missing or the install fails, say so in one line and use the **baseline**
   (`references/design-providers/baseline.md`), which reasons from the documents and the
   platform visual languages. Never install Python, and never let this block the phase.

Tell the user which provider you are using in one line. Record level and provider in `STATE.md`.
Whichever provider fills the contract, everything after it is the same.

## 5.2 Render the screens

```
node scripts/screens.mjs --spec prototype/flow.json --out prototype
```

It reads the platforms from the spec (or `--platform android|ios|both`) and writes
`prototype/look/`: `screens.html` (every screen state in flow order, with the same S-numbers as
the sketch, per platform, light and dark, at three text sizes) and the files behind it. At this
point the screens use the platform baseline look. Everything in `look/` is generated: never edit
it, and run `screens.mjs` again if `flow.json` changes.

To look at them, serve the folder and open the page:

```
node scripts/serve.mjs                                → http://localhost:4173/screens.html
```

The page runs a check on each screen (touch-target size, content wider than the screen, text cut
off, overlapping content, text contrast) and shows the result under it and in a summary at the
top. The user sees the same summary.

## 5.3 Three choices (one question round)

Propose an answer for each from the documents, with the reason, and ask the user to approve or
change them in one round (the host's question tool, or a numbered list):

| Choice | Options (plain language) | Usual source |
|---|---|---|
| Density | spacious · balanced · dense | V4, P1 |
| Expressiveness | restrained · balanced · bold | P1 context, domain, audience |
| Motion | minimal · standard | audience, X1 |

If an accessibility commitment (X1) or the provider asks for WCAG AAA, set `contrast: high`:
`theme.mjs` then targets 7:1 for text, and `screens.html` checks at 7:1 too. Also settle the
brand colour if V1 is still open (from a brand guide, existing app or logo; if the user says "you
choose", propose one and flag it). Fonts stay the platform's unless the brand guide names one.
Complex choreography, parallax and scroll-driven animation are out of scope: they don't transfer
to a native build as a design decision.

## 5.4 Two directions

Write two filled contracts (`assets/templates/DESIGN.md`): `prototype/notes/design/option-a.md`
(recommended) and `option-b.md` (a real alternative, see the provider reference). Then generate
their tokens without touching the screens:

```
node scripts/theme.mjs --design prototype/notes/design/option-a.md --option a --out prototype
node scripts/theme.mjs --design prototype/notes/design/option-b.md --option b --out prototype
```

`theme.mjs` checks every text/background pair on every platform in scope, in light and dark. If
a pair fails it writes nothing and says why, usually with a passing colour to use instead; fix
the direction (never lower the bar). Offline, Android colours come from an approximation and the
output says so: run it again online before the handoff.

## 5.5 Style tiles → gate D1

`theme.mjs` writes `prototype/look/style-tile.html`: the platform shell showing the palette with
contrast ratios, the type scale, and every component (buttons, list, fields, switch, chips,
banner, error state, dialog, sheet, snackbar/toast). Give the user the links for both options on
each platform in scope, with one line each on what the direction is for:

```
http://localhost:4173/style-tile.html?option=a&platform=android&theme=light
http://localhost:4173/style-tile.html?option=b&platform=android&theme=light
   add &theme=dark, &screen=colour (palette), &screen=type (type scale),
   &screen=components&state=dialog (or sheet, snackbar)
```

**Stop (gate D1)**, with the reading guide. The user picks one, or asks for changes: edit that
option's file, regenerate, show again. Gate D1 passes on an explicit pick.

## 5.6 Apply

- **Visual direction**: copy the chosen option to `prototype/notes/DESIGN.md` (status
  `approved`), then `node scripts/theme.mjs --design prototype/notes/DESIGN.md --out prototype`.
  This writes `look/tokens/<platform>.theme.css`, links it in `look/index.html`, and writes
  `notes/THEME-REPORT.md`. `look/screens.html` now shows every screen in the chosen look.
- **Design system**: copy it to `design-system/<app>/DESIGN.md` instead, then
  `node scripts/theme.mjs --design design-system/<app>/DESIGN.md --out prototype --export design-system/<app>`.
  Write `prototype/notes/DESIGN.md` as a one-line pointer to the master. Add
  `design-system/<app>/screens/<screen>.md` only for screens that differ from the master (for
  example an onboarding screen with a large illustration, or a dashboard where one figure
  dominates): what differs and why, in terms of the master's roles and styles — never new colour
  values. A screen file overrides the master for that screen only.
- `node scripts/theme.mjs --remove --out prototype` goes back to the platform baseline.

Record the decision in `DECISIONS.md` (for example `D21 — Visual direction A approved: calm,
restrained teal, platform fonts`).

The look is applied through the theme only. Anything that would change a journey, a state,
navigation, approved copy or what is on a screen is **flow, not design**: record it as a
clarification, get it approved, change `flow.json`, regenerate the sketch and run `screens.mjs`
again.

## 5.7 Check

Open `look/screens.html` and, for every platform in scope, look at light and dark and at the
130 % and 200 % text sizes. Every screen must show ✓: no small touch targets, nothing wider than
the screen, no cut-off or overlapping text, and text contrast at 4.5:1 (7:1 with `contrast:
high`). A failing screen is fixed in the direction (a colour, a font, density) or, if the content
is simply too long for a phone, in `flow.json` with the user's agreement. You can't open a
browser yourself: ask the user to read you the summary line at the top of the page and any red
notes, and say so plainly rather than claiming the checks passed.

## 5.8 Approve the look → gate D2

Give the user `look/screens.html` and the style tile of the applied direction, tell them what the
summary line should say, and ask for approval of the look. **Stop (gate D2)**, with the reading
guide. Record the approval in `STATE.md` (`Design: visual direction A, approved <date>`) and
continue to Phase 6.

## If something fails

| Problem | What to do |
|---|---|
| ui-ux-pro-max can't be installed (no Python 3, offline, integrity check failed) | use the baseline provider and say so; `design-provider.mjs` has changed nothing |
| Its output is web-shaped or off-topic | drop that part (see its reference), retry once with a narrower query, else use the baseline for that field |
| `theme.mjs` reports failing contrast | use its suggested colour or change the direction; never ship the failing pair |
| `theme.mjs` says no platforms are linked | run `screens.mjs` first: it creates `look/` |
| Material Color Utilities can't be downloaded | the approximation is used and flagged; run again online before the handoff |
| A font can't be downloaded | the platform font is shown; say so on the style tile review |
| A screen shows issues on `screens.html` | fix the direction or the content (5.7); don't hand over a look with red notes |
| The user stops the design phase | `theme.mjs --remove` (or keep an approved direction), note it in `STATE.md`, go to the handoff |
