# CLAUDE.md

## Package Manager

- Always use **npm** (not pnpm, yarn, or bun) for installing packages and running scripts.

## UI Components

- Always use **shadcn/ui** components (`components/ui/`) for all UI elements (buttons, cards, tables, badges, inputs, dialogs, etc.).
- Always use **ai-elements** components for AI chat interfaces (conversations, messages, tool displays, prompt inputs).
- Do not use plain HTML elements when a shadcn or ai-elements component exists for the same purpose.
- If a needed shadcn or ai-elements component is not yet installed, install it before using it (e.g., `npx shadcn@latest add <component>`).
