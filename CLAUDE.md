# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Project

Static Pokémon GO PvP team builder, hosted on GitHub Pages from `main` (root). Design and
milestones live in `PLAN.md`.

## Rules

- No build step, no package manager, no runtime dependencies. Every JS file is a plain IIFE that
  attaches to `window`; never use `<script type="module">`, because it breaks under `file://`.
- Layering: `theme.js` → `data.js` → `engine.js` (pure, no DOM, under test) → `app.js` (state, DOM).
  Never reach back up the chain.
- Data comes from a trimmed PvPoke snapshot in `data/`, refreshed by a GitHub Action. The site never
  fetches third-party URLs at runtime.
- Wrap all `localStorage` access in try/catch, and re-validate persisted fields in `load()`.
- Keep the README's status table and `PLAN.md` milestones current with each milestone. The user
  asked for the README to be kept up to date as the project grows.
- If a feature would need something GitHub Pages cannot provide (a server, secrets, server-side
  storage), raise it with the user before building it.
