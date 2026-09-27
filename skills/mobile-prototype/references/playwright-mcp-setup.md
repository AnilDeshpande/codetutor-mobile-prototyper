# Playwright MCP setup

The skill needs the Playwright MCP server (`@playwright/mcp`, from Microsoft) for Phase 6. This
file covers checking for it, configuring it for each agent, and fixing common failures.

## 1. Is it available in this session?

Look at your own tool list. Available means tools whose names end in `browser_navigate`,
`browser_snapshot` and `browser_click`. Typical names:

| Agent | Tool name example |
|---|---|
| Claude Code, configured directly | `mcp__playwright__browser_navigate` |
| Claude Code, via this plugin | `mcp__plugin_mobile-prototyper_playwright__browser_navigate` |
| Codex | `browser_navigate` from the `playwright` MCP server (shown with the server name) |

Some agents load MCP tools lazily (for example Claude Code's deferred tools): search the tool list
for `browser_navigate` before concluding they're missing.

## 2. If not: check the configuration

```bash
node <skill-dir>/scripts/check-playwright-mcp.mjs            # all agents it can find
node <skill-dir>/scripts/check-playwright-mcp.mjs --smoke    # also start the server once and list its tools
```

It reports, per agent, whether Playwright MCP is configured and where, without printing secrets
from config files. Show the user the result.

## 3. Configure (only with the user's approval)

Ask first — this changes the user's agent configuration. Then:

```bash
node <skill-dir>/scripts/check-playwright-mcp.mjs --configure --host claude   # or codex, cursor, gemini, all
```

What it does for each host:

| Host | Command / file | Entry |
|---|---|---|
| Claude Code | `claude mcp add -s user playwright -- npx -y @playwright/mcp@latest --isolated` (`--scope project` writes `.mcp.json` instead) | server `playwright` |
| Codex | `codex mcp add playwright -- npx -y @playwright/mcp@latest --isolated`, or appends to `~/.codex/config.toml` | `[mcp_servers.playwright]` |
| Cursor | merges into `~/.cursor/mcp.json` | `mcpServers.playwright` |
| Gemini CLI | merges into `~/.gemini/settings.json` | `mcpServers.playwright` |
| Anything else | prints the JSON snippet to paste | — |

`--isolated` keeps the browser profile in memory, so parallel sessions don't fight over a profile
and prototypes start clean. Add `--headless` to the args if the user doesn't want to see a
browser window.

If the skill was installed as the Claude Code or Codex **plugin**, the plugin's `.mcp.json` already
provides the server; configuring it again is unnecessary.

## 4. Restart

MCP servers are loaded when the agent session starts. After configuring:

- Claude Code: restart the session (or run `/mcp` in an interactive terminal session to reconnect).
- Codex: start a new session.
- Others: restart the agent or reload its MCP servers.

Record in `notes/STATE.md` that verification is waiting for the restart, and continue with the
phases that don't need a browser. Everything needed to resume is in `prototype/notes/`.

## 5. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `npm error ENOTEMPTY … _npx/<hash>/node_modules/playwright` | a half-finished earlier `npx` download | delete that `~/.npm/_npx/<hash>` folder (ask first), then retry |
| `Browser "chrome" is not installed` on first navigate | Playwright MCP defaults to Chrome | `npx playwright install chrome`, or add `--browser msedge` / `--browser firefox` if that's installed |
| Server never starts; `node` too old | Playwright MCP needs Node 18+ | install a current Node LTS |
| Corporate proxy blocks the download | npm can't reach the registry | configure npm's proxy, or install `@playwright/mcp` globally and point the command at it |
| Screenshots land somewhere unexpected | relative paths resolve against the server's workspace root | use paths starting with `prototype/…` and run the agent from the project root, or move the files |
| Tools listed but every call fails | the browser profile is locked by another session | make sure `--isolated` is in the args |

## 6. If the user declines Playwright MCP

Say plainly what that means: the prototype can be built, but no journey will be verified and the
storyboard can't be captured. Offer the choices — configure it now, use another browser tool the
agent has (the user must say so explicitly), or stop after Phase 5 with verification marked
"not done" in `STATE.md` and the handoff.
