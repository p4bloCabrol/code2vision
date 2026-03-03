## Connect Claude Code

The `.mcp.json` file tells Claude Code where to find the code2vision MCP server. The setup command generates it automatically with the correct path to the installed extension.

Once added, Claude Code will have access to these tools:

| Tool | What it does |
|------|-------------|
| `take_screenshot()` | Captures the current browser render |
| `get_console_logs()` | Returns browser console output |
| `get_dom_snapshot()` | Returns the DOM as a JSON tree |
| `navigate(url)` | Navigates to a URL or route |
| `wait_for_reload()` | Waits for hot-reload to finish |
| `load_reference_image(path)` | Loads a design reference image |

**Important:** restart Claude Code after the file is created so it picks up the new MCP config.
