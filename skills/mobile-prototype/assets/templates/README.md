# {{APP_NAME}} prototype — start here

This folder holds a draw.io sketch of the app's screens and flow, and the notes behind it. You only need the files in
**Read now**; the rest are there for reference or for the agent to resume from.

## Where we are

Stop: **inputs** — confirming which documents to use
Waiting on you: confirm the documents

## Read now, in this order

| # | File | Why | Time |
|---|---|---|---|
| 1 | — | | |

## Opening the sketch

The sketch is [`flow.drawio`](flow.drawio); it appears at gate C. Open it in any of these:

- **VS Code** with the *Draw.io Integration* extension (`hediet.vscode-drawio`): open the file and
  it shows as a diagram you can edit.
- **draw.io Desktop** (free, macOS, Windows and Linux, from https://www.drawio.com): File › Open.
- **A browser**, nothing to install: https://app.diagrams.net, then File › Open from › Device.
  The file is read in the browser.

In Android Studio, don't count on a draw.io plugin; open the file in one of the above.

The pages are the tabs along the bottom of the window:

- **Wireflow**: one page per journey, named after it, with every screen (S1, S2, …) and arrow.
- **Click-through**: per journey a *Map* page; click a box to open that screen's page.
- **Screen pages** (click-through, or both): one per screen state, named by its number, screen and
  state ("S1 Overview — Empty"). The blue controls link to the screen they lead to, and
  "↩ Back to the overview" returns. In an editor a click selects the shape: follow the link from
  the hint draw.io shows under it, or use the page tabs.

## All files

| File | For | What it is |
|---|---|---|
| `README.md` | you | This guide. Updated at every stop. |
| `notes/CLARIFICATIONS.md` | you | Every question about the product, the answer proposed from your documents, and whether you approved it. |
| `notes/DECISIONS.md` | reference | What is agreed so far, and who decided it. |
| `notes/INPUTS.md` | reference | The documents used and the facts taken from them, with citations. Open it to check where a proposal came from. |
| `notes/STATE.md` | agent | Phase, gates passed and next step, so a new session can resume. You don't need to read it. |
| `flow.json` | agent | The flow as data. The sketch is generated from it; tell the agent what to change rather than editing it. |
<!-- Rows added by later stops, in this order:
| `flow.drawio` | you | The sketch: every screen (S1, S2, …) and the arrows between them. See *Opening the sketch*. |
| `look/style-tile.html` | you | The design directions to choose from (design phase only). |
| `look/screens.html` | you | Every screen in the final Android / iOS look (design phase only). |
| `notes/DESIGN.md` | you | The chosen look, written down (design phase only). |
| `notes/THEME-REPORT.md` | reference | Colours and contrast results for the theme. |
| `HANDOFF.md` | you + native team | The final package for building the app. |
-->
