# draw.io setup

The sketch is a plain `.drawio` file (XML) written by `scripts/sketch.mjs`. Nothing else is
required to create it. The tools below make it nicer to look at and edit.

| Tool | What it adds | Needed? |
|---|---|---|
| draw.io MCP server (`@drawio/mcp`) | tools that open a diagram in the draw.io editor in the browser (`open_drawio_xml`, also CSV and Mermaid) | installed at setup; the skill works without it |
| draw.io Desktop | opens `.drawio` files offline; `sketch.mjs --open` uses it when present | optional |
| draw.io extension for VS Code / Cursor | edit the file inside the editor | optional |
| Browser viewer | `sketch.mjs --open` falls back to it; `--url` writes the link | nothing to install |

The diagram never leaves the machine through these: the MCP server and the viewer link carry it
in the URL fragment, which browsers don't send to a server.

## The MCP server

Check and configure it for the agent that is running:

```
node scripts/check-drawio-mcp.mjs --host <claude|codex|cursor|gemini>
node scripts/check-drawio-mcp.mjs --configure --host <agent> [--scope user|project]
node scripts/check-drawio-mcp.mjs --smoke          start it once and list its tools
```

Ask the user before `--configure`: it changes their agent configuration (a backup is kept). The
configuration it writes is the official one:

```json
{ "mcpServers": { "drawio": { "command": "npx", "args": ["-y", "@drawio/mcp"] } } }
```

```toml
[mcp_servers.drawio]
command = "npx"
args = ["-y", "@drawio/mcp"]
```

| Agent | Where it goes |
|---|---|
| Claude Code | the `mobile-prototyper` plugin bundles it; otherwise `claude mcp add drawio -- npx -y @drawio/mcp` |
| Codex | `~/.codex/config.toml`, or `.codex/config.toml` in a trusted project |
| Cursor | `~/.cursor/mcp.json` or `.cursor/mcp.json` |
| Gemini CLI | `~/.gemini/settings.json` |

A newly added server loads when the agent session restarts. If the tools aren't there, tell the
user in one line and carry on.

**When to use the tools.** `open_drawio_xml` needs the whole file's XML as its argument, which is
slow for a real flow. So show the sketch with `sketch.mjs --open`, and use the tool only when the
user wants the browser *editor* and has no Desktop app or editor extension.

## Troubleshooting

| Symptom | What to do |
|---|---|
| The server is configured but its tools aren't in the session | restart the agent session; in Codex check the project is trusted. Carry on meanwhile |
| `--smoke` times out or reports a half-finished npx download | delete the folder it names and run it again |
| `--open` opens the browser, not the Desktop app | draw.io Desktop isn't installed (https://www.drawio.com); the viewer is fine for reviewing |
| The click-through links don't jump in an editor | editors select shapes on click; use the page tabs, or open the viewer link (`--url`) |

## For the user: keeping hand edits in the same style

The hand-drawn look is a style on each shape, so a shape drawn by hand in draw.io comes out
clean unless one of these is done:

- **Duplicate** an existing shape (Cmd/Ctrl+D) and change its text. This always matches.
- **Set the default**: select a sketched shape, then Format panel → Style → *Set as Default
  Style*; repeat once with an arrow selected. It lasts while the file is open.
- **Sketch theme** (VS Code extension): set `hediet.vscode-drawio.theme` to `sketch`; new shapes
  are hand-drawn by default.

Tell the agent what changed after editing by hand: it carries the change into `flow.json`, which
is what the next version of the diagram is generated from.
