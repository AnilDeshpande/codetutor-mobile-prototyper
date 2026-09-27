# Verifying with the Playwright MCP server

Verification means *using* the prototype through the Playwright MCP tools the way a user would,
checking what the user would see after every step, and recording the evidence. Tool names below
are the server's own; in your session they may carry a prefix (`mcp__playwright__…`,
`mcp__plugin_mobile-prototyper_playwright__…`).

## Tools you'll use

| Tool | Use it to |
|---|---|
| `browser_resize` `{width, height}` | set the window class before navigating |
| `browser_navigate` `{url}` | open a scenario URL |
| `browser_snapshot` `{boxes?}` | read the accessibility tree and get element refs; `boxes: true` adds sizes |
| `browser_find` `{text \| regex}` | assert that text is (or isn't) on screen without a full snapshot |
| `browser_click` / `browser_type` / `browser_fill_form` / `browser_select_option` / `browser_press_key` | act as the user |
| `browser_wait_for` `{text \| textGone \| time}` | wait for loading to finish, or for a simulated delay |
| `browser_navigate_back` | system back via browser history (the shell maps it to app back) |
| `browser_evaluate` `{function}` | read `data-screen` / `data-state`, run `window.__prototypeAudit()` |
| `browser_emulate_media` `{colorScheme, reducedMotion, contrast}` | dark theme, reduced motion, more contrast |
| `browser_console_messages` | catch JavaScript errors |
| `browser_take_screenshot` `{filename, fullPage?}` | evidence for review and the storyboard |
| `browser_handle_dialog` | only if a native `alert/confirm` slipped in — which is itself a defect |

Don't use `browser_run_code_unsafe`; everything needed is covered above.

## Before the first run

1. Start the server in the background: `node scripts/serve.mjs --dir prototype` (prints
   `http://localhost:<port>/` and a LAN URL). Reuse it for the whole session.
2. If `browser_navigate` fails because no browser is installed, tell the user and, with their
   OK, run `npx playwright install chrome` (or `chromium`), then retry.
3. `browser_console_messages` after the first load: fix any error before testing journeys.

## The run matrix

For each scenario file in `prototype/scenarios/`:

```
for window in [compact 412×915, medium 700×1000, expanded 1024×768]   # trim to scope (A3)
  for theme in [light, dark]                                          # dark only if V3
    run scenario
```

Run the full matrix for the primary journey. For secondary and unhappy-path scenarios, compact +
light is enough unless the scenario is about layout; add one medium/expanded pass per distinct
screen so every screen is seen at every window class at least once.

## Running one scenario

1. `browser_resize` to the window size.
2. `browser_emulate_media` `{colorScheme: "light" | "dark"}`.
3. `browser_navigate` to `http://localhost:<port>/?scenario=<id>&latency=fast` (use
   `latency=slow` when the scenario is *about* waiting, and check the waiting UI appears).
4. `browser_snapshot`. Check the **Given**: the right screen (`main[data-screen]`) and state.
5. For each **When** step: act on the ref from the latest snapshot, then check the step's expected
   outcome with `browser_find` (text) or `browser_evaluate`:
   ```js
   () => ({ ...document.querySelector('main').dataset,
            title: document.querySelector('#screen-title')?.textContent,
            snackbar: document.querySelector('#snackbar')?.textContent,
            dialog: document.querySelector('dialog[open] h2')?.textContent })
   ```
   Take a fresh `browser_snapshot` whenever the screen changed; refs from an old snapshot go stale.
6. Check every **Then**.
7. Exercise **back**: from the final screen and from any mid-task screen the scenario visits,
   click the "System back" button (or `browser_navigate_back`) and confirm it lands where the
   navigation map says — including closing an open dialog or sheet first.
8. Run the audit on each distinct screen and state reached:
   `browser_evaluate` `{function: "() => window.__prototypeAudit()"}`. It returns
   `{ platform, screen, state, smallTargets, unnamedControls, overflow, clippedText, missingState }`; every list should
   be empty. Use `browser_snapshot` with `boxes: true` when you need to see sizes yourself.
9. `browser_console_messages` — any error fails the run.
10. Screenshot each distinct screen/state:
    `browser_take_screenshot` `{filename: "prototype/screenshots/<window>/<theme>/<scenario>--<screen>--<state>.png"}`.
    Names use lowercase and hyphens. If the file lands outside `prototype/screenshots/` (the
    server resolves relative paths against its workspace root), move it there.

## Extra passes (once per prototype, on the primary journey)

- **Font scale**: add `&fontScale=2` to the URL at compact; nothing essential may be cut off or
  overlap.
- **Reduced motion**: `browser_emulate_media {reducedMotion: "reduce"}`; nothing should depend on
  an animation finishing.
- **Every state by URL**: for each screen × state in the inventory, open
  `?screen=<id>&state=<state>&scenario=<id>` and screenshot it. This is what feeds the storyboard;
  a state that can't be reached by URL is a defect.

## Recording results (`notes/VERIFICATION.md`)

```
## Round 2 — 2026-09-27
| Scenario           | Window   | Theme | Result | Notes |
|--------------------|----------|-------|--------|-------|
| pairing-success    | compact  | light | pass   | |
| pairing-success    | expanded | dark  | FAIL   | step 4: "Pair" button under nav rail (overflow) |
| permission-blocked | compact  | light | pass   | |
Audit: 2 small targets on device-list (chevron buttons 32×32) — fixed in round 3
```

A failing step gets fixed in the prototype, then the scenario is re-run at the same window and
theme. Never mark a scenario as passing from reading the code.
