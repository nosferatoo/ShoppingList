# CLAUDE.md — Shopping & To-Do Lists App

## Project Overview

A private, offline-first shopping list and to-do list PWA for 2 users. The app runs on iOS Safari (optimized for iPhone 12 Pro Max) and desktop browsers, with different UX patterns for each platform.

### Core Principles

- **KISS**: Keep it simple, avoid over-engineering
- **YAGNI**: Don't add features not explicitly specified
- **Offline-first**: Full sync strategy - all data cached locally, works offline
- **Mobile-first**: Design for iPhone first, enhance for desktop
- **Last Write Wins (LWW)**: Simple conflict resolution using timestamps

- Use TypeScript with strict types and existing project patterns
- Use Svelte 5 runes syntax only; do not use legacy Svelte syntax
- Prefer Tailwind CSS and existing UI components over custom styles
- Use shadcn-svelte (bits-ui) components
- Make the smallest correct change required; avoid refactors unless requested
- Preserve existing behavior unless explicitly instructed otherwise

- Do not load, read, or reference any external files or documentation unless explicitly requested in the current prompt
- Do not assume requirements; if essential information is missing, ask one concise clarifying question and stop

- Prefer minimal diffs over full rewrites
- Keep outputs concise, deterministic, and directly usable