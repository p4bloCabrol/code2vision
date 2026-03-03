# code2vision — CLAUDE.md

## Project Vision

**code2vision** is a Visual Studio Code plugin that acts as the **eyes** for Claude Code. It gives Claude Code visual access to the real browser render and console of the user's running dev server, enabling an automated pixel-perfect QA loop.

**Claude Code is the agent. The plugin is the data provider.**

```
Design source (any) ──┐
                       ├──→ Claude Code (agent) → edits files → dev server reloads
Browser render ────────┘         ↑
Console logs ──────────────── code2vision MCP Server (this plugin)
```

**Design sources supported (pick any):**
- Figma MCP — when Figma Pro is available
- Local image — `load_reference_image(path)`, export from any tool (Figma free, Penpot, Zeplin, Stitch...)
- Other MCPs — Penpot, Zeplin, Stitch, etc. just add them to `.mcp.json`

## Core Architecture

### Roles

| Component | Role | Writes files? | Sees browser? |
|-----------|------|:---:|:---:|
| **Claude Code** | Agent — reasons, plans, edits code | YES | NO |
| **code2vision plugin** | MCP Server — captures visual state | NO | YES |
| **Figma MCP (official)** | Design spec source | NO | NO |
| **Playwright** | Real browser automation | NO | YES |

### How It Works

1. Claude Code connects to **code2vision** as an MCP server (local stdio or HTTP)
2. Claude Code connects to **Figma MCP** for design specs
3. Claude Code calls `take_screenshot()` → gets current render via Playwright
4. Claude Code calls `get_console_logs()` → gets browser errors/warnings
5. Claude Code compares render vs Figma spec → edits source files
6. Dev server hot-reloads → Claude Code repeats from step 3
7. Loop ends when pixel-perfect or after N iterations (human escalation)

### Data Flow

```
User runs: npm run dev (Vite/Webpack/etc)
    ↓
code2vision launches Playwright → navigates to dev server URL
    ↓
Claude Code calls MCP tool: take_screenshot()
    ← returns: base64 PNG of current render
Claude Code calls MCP tool: get_console_logs()
    ← returns: array of { level, message, timestamp }
Claude Code calls Figma MCP: get_node(nodeId)
    ← returns: FigmaSpec { colors, typography, spacing, sizes }
    ↓
Claude Code diffs visual state vs spec → generates file edits
Claude Code uses Edit/Write tools → modifies source files
    ↓
Dev server hot-reloads → wait → repeat
```

## MCP Server Tools Exposed by This Plugin

```typescript
// Tools that Claude Code can call via MCP protocol
tools: [
  {
    name: 'take_screenshot',
    description: 'Captures a screenshot of the current browser render',
    input_schema: {
      url?: string,         // override URL, defaults to configured dev server
      fullPage?: boolean,   // default false
      selector?: string,    // capture specific element
    },
    returns: 'base64 PNG image'
  },
  {
    name: 'get_console_logs',
    description: 'Returns captured browser console logs since last call',
    input_schema: {
      level?: 'log' | 'warn' | 'error' | 'all'  // default: 'all'
    },
    returns: 'ConsoleLog[]'
  },
  {
    name: 'get_dom_snapshot',
    description: 'Returns the current DOM structure as JSON',
    input_schema: {
      selector?: string   // scope to element, default: 'body'
    },
    returns: 'serialized DOM tree'
  },
  {
    name: 'navigate',
    description: 'Navigates the browser to a URL or route',
    input_schema: {
      url: string
    },
    returns: 'void'
  },
  {
    name: 'wait_for_reload',
    description: 'Waits until the page has finished reloading after file changes',
    input_schema: {
      timeout?: number  // ms, default 5000
    },
    returns: 'void'
  }
]
```

## Tech Stack

| Layer | Technology | Reason |
|-------|-----------|--------|
| Plugin host | TypeScript + VS Code Extension API | Standard for VS Code plugins |
| MCP Server | `@modelcontextprotocol/sdk` | Protocol Claude Code speaks |
| Browser automation | **Playwright** | Real browser, pixel-accurate screenshots, console capture |
| Webview UI (control panel) | React + Vite | Plugin's own VS Code panel UI |
| Communication (UI ↔ host) | VS Code `postMessage` API | Required by VS Code sandbox |
| Figma | Official Figma MCP Server | Standard, maintained by Figma |
| Build | esbuild (extension host) + Vite (webview-ui) | Industry standard for VS Code plugins |
| Testing | Vitest + `@vscode/test-electron` | Standard for VS Code extension testing |

## Project Structure

```
code2vision/
├── src/
│   ├── extension.ts            # VS Code activate/deactivate entry point
│   ├── mcp/
│   │   ├── server.ts           # MCP Server setup (stdio transport)
│   │   └── tools/
│   │       ├── screenshot.ts   # take_screenshot tool implementation
│   │       ├── console.ts      # get_console_logs tool implementation
│   │       ├── dom.ts          # get_dom_snapshot tool implementation
│   │       └── navigate.ts     # navigate + wait_for_reload tools
│   ├── browser/
│   │   ├── manager.ts          # Playwright browser lifecycle
│   │   └── console-collector.ts # Intercepts page console events
│   └── webview/
│       ├── panel.ts            # VS Code control panel (status, logs viewer)
│       └── bridge.ts           # postMessage bridge
├── webview-ui/                 # Plugin's own VS Code panel UI
│   ├── src/
│   │   ├── App.tsx
│   │   ├── StatusPanel.tsx     # Shows current QA loop status
│   │   └── LogsPanel.tsx       # Shows captured console logs
│   └── vite.config.ts
├── package.json                # VS Code extension manifest
├── tsconfig.json
└── .vscodeignore
```

## Code Conventions

- **Strict TypeScript** everywhere, no `any`
- Extension host code and webview-ui code are **completely separate bundles** — they do not share memory or imports
- All `postMessage` payloads typed with discriminated unions
- Playwright instance is a **singleton** managed by `browser/manager.ts` — one browser, reused across tool calls
- MCP Server runs on **stdio transport** (most secure, no open ports)
- Console logs collected via Playwright's `page.on('console', ...)` event — not script injection

## Security Principles

- Plugin has **read-only access**: captures state, never writes user files
- MCP Server runs on stdio (no network exposure)
- Playwright runs in a sandboxed subprocess
- No credentials stored in plugin — Figma auth handled by Figma MCP, Claude auth handled by Claude Code
- Minimal VS Code permissions requested in `package.json`

## Framework Agnosticism

The plugin detects the dev server URL from VS Code workspace settings. It does not assume React, Vue, Svelte, or any framework — Playwright just navigates to whatever URL is configured. The user's framework choice is irrelevant to the capture layer.

## Configuration

Set in the user's VS Code workspace settings:

```json
{
  "code2vision.devServerUrl": "http://localhost:5173",
  "code2vision.mcpTransport": "stdio",
  "code2vision.screenshotDelay": 500,
  "code2vision.maxQAIterations": 10
}
```

MCP connection config for Claude Code (`.mcp.json` in workspace):

```json
{
  "mcpServers": {
    "code2vision": {
      "command": "node",
      "args": ["${extensionPath}/dist/mcp-server.js"]
    },
    "figma": {
      "command": "npx",
      "args": ["-y", "@figma/mcp-server"],
      "env": {
        "FIGMA_ACCESS_TOKEN": "${env:FIGMA_ACCESS_TOKEN}"
      }
    }
  }
}
```

## Project Status

- [ ] Initial plugin scaffolding (package.json, tsconfig, esbuild config)
- [ ] Playwright browser manager (singleton, lifecycle)
- [ ] MCP Server with stdio transport
- [ ] `take_screenshot` tool
- [ ] `get_console_logs` tool
- [ ] `get_dom_snapshot` tool
- [ ] `navigate` + `wait_for_reload` tools
- [ ] VS Code control panel (WebView UI)
- [ ] Figma MCP integration docs/example
- [ ] e2e tests with `@vscode/test-electron`
