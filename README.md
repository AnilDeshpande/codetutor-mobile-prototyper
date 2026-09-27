# Mobile Prototyper

An agent skill that turns your **spec, architecture and design documents** into a **clickable,
verified HTML prototype of an Android app** — working with you like a UX designer would.

- It finds which documents you have, and **proposes the answers they already contain for your approval**.
- It **asks you only what's left**: conflicts between documents and gaps that change the experience,
  a few questions at a time, each with a recommendation.
- It builds the prototype in an Android device shell (system back, bottom navigation / rail, dialogs,
  sheets, snackbars, simulated permission prompts) with every state reachable by URL.
- It **verifies every journey with the Playwright MCP server** across phone, tablet and dark theme,
  runs an accessibility audit, and builds a storyboard of every screen and state.
- It stops at an approved UX and a **handoff package** for native (Jetpack Compose) implementation.

Works with **Claude Code**, **Codex**, and any agent that reads `SKILL.md` folders (the open Agent
Skills format) and can run MCP servers.

```
Spec · Architecture · Design · API docs
                │
   0 Preflight: Playwright MCP present? (configure it if not)
   1 Discover inputs ──────────────► you confirm the availability table
   2 Answer from the documents ────► you approve / correct the proposals   (gate A)
   3 Ask what's left, ≤ 4 at a time ► you answer                           (gate B)
   4 Journeys, states, flow ───────► you confirm the flow                  (gate C)
   5 Build (Android shell + mock scenarios)
   6 Verify with Playwright MCP: journeys × window classes × themes, back, audit, screenshots
   7 Review & iterate (max 3 rounds)
   8 Storyboard + phone preview ───► you approve                           (gate D)
   9 HANDOFF.md → stop (no Compose code)
```

## Requirements

- Node.js 18 or newer (for the helper scripts and the Playwright MCP server)
- An agent: Claude Code, Codex, or another Agent Skills–compatible agent with MCP support
- **Playwright MCP** (`@playwright/mcp`) — installed automatically by the plugin installs, or
  configured by `install.mjs`; the skill also checks for it at the start of every run

## Install


### Claude Code (plugin — bundles Playwright MCP)

```bash
claude plugin marketplace add AnilDeshpande/codetutor-mobile-prototyper
```

```bash
claude plugin install mobile-prototyper@codetutor
```

Or inside a Claude Code session: `/plugin marketplace add AnilDeshpande/codetutor-mobile-prototyper`, then
`/plugin install mobile-prototyper@codetutor`. Restart the session afterwards.

### Codex (plugin — bundles Playwright MCP)

```bash
codex plugin marketplace add https://github.com/AnilDeshpande/codetutor-mobile-prototyper.git
```

```bash
codex plugin add mobile-prototyper@codetutor
```

A local clone works too: `codex plugin marketplace add /path/to/codetutor-mobile-prototyper`.

### Any agent (skill folder + Playwright MCP configuration)

From a clone of this repository:

```bash
node install.mjs
```

It installs the skill for every agent it finds (Claude Code, Codex, Cursor, Gemini CLI) and
configures Playwright MCP for each, after showing what it will change. Options:

| Option | Effect |
|---|---|
| `--agent claude,codex` | only these agents (`claude`, `codex`, `cursor`, `gemini`, `agents`) |
| `--scope project` | install into the current project (`.claude/skills`, `.agents/skills`, …) instead of your home folder |
| `--dir <path>` | copy the skill into any other agent's skills folder |
| `--link` | symlink instead of copy (for working on the skill) |
| `--skip-mcp` | don't touch MCP configuration |
| `--dry-run` | show what would happen |

Without cloning: `npx github:AnilDeshpande/codetutor-mobile-prototyper -- --agent codex`.

With the open Agent Skills CLI, which knows the skill folders of many agents:

```bash
npx skills add AnilDeshpande/codetutor-mobile-prototyper --skill mobile-prototype
```

Then make sure Playwright MCP is configured for that agent (next section).

## Playwright MCP

The skill won't claim anything works without it. To check or configure it yourself:

```bash
node skills/mobile-prototype/scripts/check-playwright-mcp.mjs --smoke
```

```bash
node skills/mobile-prototype/scripts/check-playwright-mcp.mjs --configure --host claude
```

Hosts: `claude`, `codex`, `cursor`, `gemini`, `all`. Config files are backed up before they're
changed, and secrets in them are never printed. For other agents, add:

```json
{ "mcpServers": { "playwright": { "command": "npx", "args": ["-y", "@playwright/mcp@latest", "--isolated"] } } }
```

MCP servers load when a session starts, so restart the agent after configuring. If the skill finds
the server missing mid-run, it asks before configuring, continues with the document and
clarification phases, and picks up verification after the restart.

## Use

Put your documents anywhere in the project (for example `docs/` and `design/`), then ask:

> Prototype the device pairing onboarding from docs/PRD.md, docs/ARCHITECTURE.md and design/.

> Check which of my docs are available and start a mobile prototype for the readings list.

> Resume my mobile prototype.

Everything the skill produces lives in `prototype/`:

```
prototype/
├── index.html, screens.js, mock-data.js, …   the prototype (plain HTML/CSS/JS, no build step)
├── scenarios/*.md                            Given / When / Then per journey
├── screenshots/<window>/<theme>/*.png        Playwright MCP captures
├── storyboard.html                           every screen × state in one grid
├── HANDOFF.md                                for the native implementation
└── notes/                                    STATE, INPUTS, CLARIFICATIONS, DECISIONS, VERIFICATION
```

Open it yourself with `node skills/mobile-prototype/scripts/serve.mjs --dir prototype` (the path
depends on where the skill is installed); it prints a local URL and a LAN URL for your phone. Add
`?debug=1` to switch scenarios, latency, theme and font size by hand.

## Repository layout

```
.claude-plugin/        Claude Code plugin + marketplace manifests
.codex-plugin/         Codex plugin manifest
.agents/plugins/       Codex marketplace manifest
.mcp.json              Playwright MCP server, bundled by both plugins
install.mjs            installer for any agent (skill + MCP configuration)
skills/mobile-prototype/
├── SKILL.md           the workflow
├── references/        intake, question bank, clarification protocol, Android conventions,
│                      Playwright MCP setup and verification, review rubric, handoff
├── scripts/           check-playwright-mcp, discover-inputs, scaffold, serve, storyboard
└── assets/            prototype template (Android shell) + notes/scenario/handoff templates
evals/                 evals.json + a fixture project with a spec, architecture, ADR and design notes
```

## Evals

`evals/evals.json` describes eight cases: input discovery, proposals for approval, surfacing a
document conflict, a missing spec, a missing Playwright MCP, verification, handoff, and a prompt
that should *not* trigger the skill. They run against `evals/fixtures/glucose-companion`, which
contains a deliberate conflict between the PRD and an architecture decision record.

## License

[MIT](LICENSE) © Anil Deshpande
