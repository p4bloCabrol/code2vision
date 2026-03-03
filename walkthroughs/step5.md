## QA Loop with Claude Code

Claude Code is the agent — it reads your code, sees the render, and edits files until the result matches your design.

**With a reference image:**
```
I have a design mockup at ./design/mockup.png.
Use load_reference_image() to load it, take_screenshot() to
see the current state, then implement the design and iterate
until pixel-perfect.
```

**With Figma MCP:**
```
Use the Figma node [node-id] as the design reference.
Take a screenshot, compare, and fix until it matches.
```

**Tip:** Add a `CLAUDE.md` to your project to give Claude persistent context about your stack, design system, and conventions.
