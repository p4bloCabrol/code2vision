# code2vision

**Give Claude Code eyes.** code2vision lets Claude see your browser render and console in real time, enabling an automated pixel-perfect QA loop.

---

## What it does

Claude Code can write code but can't see what it produces in the browser. code2vision closes that gap by exposing browser capture tools to Claude via MCP:

```
Your design (Figma, image, etc.)
        ↓
Claude Code reads design → writes code → sees the render → fixes → repeats
        ↑
  code2vision (this plugin)
  captures screenshot + console
  from your running dev server
```

Claude iterates automatically until the render matches the design — or asks for your help when it gets stuck.

---

## Requirements

- [Claude Code](https://claude.ai/code) installed and running
- Node.js 18+
- A running frontend dev server (Vite, Next.js, CRA, Angular, etc.)

---

## Quick Start

### 1. Install the extension

Install from the VS Code Marketplace or from a `.vsix` file.

On first install, a **Getting Started walkthrough** opens automatically with guided steps.

### 2. Install the browser engine

code2vision uses Playwright to capture real screenshots. Run once per machine:

```bash
npx playwright install chromium
```

Or use the walkthrough button: `Ctrl+Shift+P` → **code2vision: Getting Started** → Step 1.

### 3. Add code2vision to your project

Open your frontend project in VS Code, then:

```
Ctrl+Shift+P → code2vision: Setup .mcp.json for this workspace
```

This creates a `.mcp.json` file that tells Claude Code where to find the MCP server:

```json
{
  "mcpServers": {
    "code2vision": {
      "command": "node",
      "args": ["/path/to/extension/dist/mcp/server-entry.js"]
    }
  }
}
```

### 4. Open the Preview Panel

```
Ctrl+Shift+P → code2vision: Open Preview Panel
```

The panel shows your app's live render on the left and the browser console on the right.

### 5. Start Claude Code

```bash
cd your-project
claude
```

Claude Code detects the `.mcp.json` automatically. Restart it if it was already running.

### 6. Give Claude a prompt

```
My dev server is running at http://localhost:5173.
Use take_screenshot() to see the current render, then implement
[your feature/design] and keep iterating until it looks right.
```

---

## MCP Tools

These tools are available to Claude Code once connected:

| Tool | Description |
|------|-------------|
| `take_screenshot()` | Captures the current browser render as a PNG |
| `get_console_logs()` | Returns browser console output (log/warn/error) |
| `get_dom_snapshot()` | Returns the DOM as a JSON tree |
| `navigate(url)` | Navigates the browser to a URL or route |
| `wait_for_reload()` | Waits for hot-reload to finish after file changes |
| `load_reference_image(path)` | Loads a local design image for Claude to compare against |

---

## Design Sources

code2vision works with any design reference — pick what you have:

| Source | How to use |
|--------|-----------|
| **Local image** | Export a PNG from any tool, use `load_reference_image("./design.png")` |
| **Figma MCP** | Add the [official Figma MCP](https://github.com/figma/mcp) to `.mcp.json` |
| **Penpot / Zeplin / Stitch** | Add their MCP server to `.mcp.json` alongside code2vision |

---

## Configuration

Set in your VS Code workspace settings (`.vscode/settings.json`):

```json
{
  "code2vision.devServerUrl": "http://localhost:5173",
  "code2vision.screenshotDelay": 500,
  "code2vision.maxQAIterations": 10
}
```

---

## How the QA Loop Works

1. Claude reads your design reference (image, Figma, etc.)
2. Calls `take_screenshot()` → sees the current render
3. Compares render vs design → identifies differences
4. Edits your source files directly
5. Calls `wait_for_reload()` → waits for hot-reload
6. Takes a new screenshot → evaluates → repeats
7. Stops when pixel-perfect, or asks for your help after N iterations

You can watch the whole thing live in the code2vision panel.

---

## Security

- The plugin **only reads** — it never writes your files
- The MCP server runs as a local stdio process (no open ports)
- Playwright runs in a sandboxed subprocess
- No credentials stored — Figma auth is handled by Figma MCP, Claude auth by Claude Code

---

## Troubleshooting

**Panel shows "Could not load http://localhost:5173"**
→ Make sure your dev server is running before opening the panel.

**Claude doesn't have `take_screenshot` available**
→ Run `code2vision: Setup .mcp.json` and restart Claude Code.

**MCP server fails to start**
→ Make sure you ran `npx playwright install chromium` at least once.

---

## License

MIT
