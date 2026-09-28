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
| `browser_navigate_back` | back via browser history (the shell maps it to the platform's back) |
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

For each platform in scope (P5) and each scenario file in `prototype/scenarios/`:

```
for platform in [android, ios]                                        # the approved platforms
  for window in WINDOWS[platform]                                     # trim to scope (A3)
    for theme in [light, dark]                                        # dark only if V3
      run scenario
```

| Platform | Windows (name · viewport) | Font-scale pass | Minimum target |
|---|---|---|---|
| android | compact 412×915 · medium 700×1000 · expanded 1024×768 | `fontScale=2` (200 %) | 48 px |
| ios | iphone 393×852 · iphone-se 375×667 · ipad 820×1180 | `fontScale=3` (largest Dynamic Type) | 44 px |

Run the full matrix for the primary journey on every platform in scope. For secondary and
unhappy-path scenarios, the first window (compact / iphone) + light is enough unless the scenario
is about layout; add one pass at the other windows per distinct screen so every screen is seen at
every window at least once. When both platforms are in scope, every journey is verified on both:
the flow is shared, but back, dialogs, sheets and permissions behave differently.

## Running one scenario

1. `browser_resize` to the window size.
2. `browser_emulate_media` `{colorScheme: "light" | "dark"}`.
3. `browser_navigate` to `http://localhost:<port>/?platform=<platform>&scenario=<id>&latency=fast`
   (use `latency=slow` when the scenario is *about* waiting, and check the waiting UI appears).
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
   confirm it lands where the navigation map says — including closing an open dialog or sheet
   first.
   - **Android**: click "System back" (`system-back`) or use `browser_navigate_back`. At the start
     destination, back leaves the app (the launcher appears).
   - **iOS**: click the navigation bar's back button (`up`; it reads "Cancel" on modal screens) or
     use `browser_navigate_back`. At the root of a tab nothing happens — check that too. The edge
     swipe does the same as the back button; exercise it once per prototype with
     `browser_evaluate` dispatching `pointerdown`/`pointerup` on `[data-testid=edge-swipe]`
     (dx > 60 px).
8. Run the audit on each distinct screen and state reached:
   `browser_evaluate` `{function: "() => window.__prototypeAudit()"}`. It returns
   `{ platform, screen, state, smallTargets, unnamedControls, overflow, clippedText, overlapping, lowContrast, missingState }`;
   every list should be empty. Targets are checked against the platform's minimum (48 / 44 px);
   `overlapping` lists text that spills out of its box onto its neighbours; `lowContrast` lists
   text below 4.5:1 (3:1 for large text) against what is actually behind it, in both themes. When
   the design direction sets `contrast: high` (WCAG AAA), call
   `() => window.__prototypeAudit({ minContrast: 7 })`. Use `browser_snapshot` with `boxes: true` when you need to see sizes yourself.
9. `browser_console_messages` — any error fails the run.
10. Screenshot each distinct screen/state:
    `browser_take_screenshot` `{filename: "prototype/screenshots/<platform>/<window>/<theme>/<scenario>--<screen>--<state>.png"}`.
    Names use lowercase and hyphens. If the file lands outside `prototype/screenshots/` (the
    server resolves relative paths against its workspace root), move it there.

## Extra passes (once per prototype, on the primary journey)

- **Font scale**: add `&fontScale=2` (Android, at compact) or `&fontScale=3` (iOS, at iphone-se)
  to the URL; nothing essential may be cut off or overlap. On iOS, rows stack vertically and
  navigation-bar text stays its normal size, as on a device.
- **Reduced motion**: `browser_emulate_media {reducedMotion: "reduce"}`; nothing should depend on
  an animation finishing.
- **Every state by URL**: for each screen × state in the inventory, open
  `?platform=<platform>&screen=<id>&state=<state>&scenario=<id>` and screenshot it, per platform. This is what feeds the storyboard;
  a state that can't be reached by URL is a defect.

## Recording results (`notes/VERIFICATION.md`)

```
## Round 2 — 2026-09-27
| Scenario           | Platform | Window    | Theme | Result | Notes |
|--------------------|----------|-----------|-------|--------|-------|
| pairing-success    | android  | compact   | light | pass   | |
| pairing-success    | android  | expanded  | dark  | FAIL   | step 4: "Pair" button under nav rail (overflow) |
| pairing-success    | ios      | iphone    | light | pass   | |
| permission-blocked | ios      | iphone-se | light | pass   | one denial → Open Settings |
Audit: 2 small targets on device-list (chevron buttons 32×32) — fixed in round 3
```

A failing step gets fixed in the prototype, then the scenario is re-run at the same window and
theme. Never mark a scenario as passing from reading the code.
