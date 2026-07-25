---
name: devdock-sme
description: Auto-generated SME for devdock — admin dashboard for managing repos, connections, and workflow automation
---

# SME: devdock

## Overview
Standalone open-source admin dashboard for managing multiple repos, connections, and workflow automation. Reference implementation for DevCadence + DevCadence-MCP.

## Stack
Next.js 16 + TypeScript + Tailwind v4 + shadcn/ui + Prisma v7 + PostgreSQL + ReactFlow + Geist font

## Entry Points
- `src/app/layout.tsx` — Root layout (Geist font, ThemeProvider, TooltipProvider)
- `src/app/(main)/layout.tsx` — Main layout (Sidebar + InfoBar)
- `src/app/page.tsx` — Root redirect

## Key Modules
- `src/app/(main)/(pages)/connections/` — Connection management (GitHub functional, others coming soon)
- `src/app/(main)/(pages)/workflows/` — Workflow listing + editor
- `src/app/(main)/(pages)/workflows/editor/[editorId]/` — ReactFlow canvas + sidebar + node cards
- `src/app/api/connections/` — Connection CRUD (Prisma)
- `src/app/api/workflows/` — Workflow CRUD + test-node + test-workflow
- `src/app/api/github/repos/` — GitHub API proxy (commits, pulls, issues, labels, contributors, actions, comments)
- `src/components/composed/` — Reusable complex components (debug-modal, context-viewer, github-selects)
- `src/components/ui/` — shadcn/ui primitives
- `src/lib/` — Utilities (cache, db, github, types, constants)

## Database (Prisma + PostgreSQL)
- `Repository` — name, type, settings (JSON), description
- `RepoSetting` — key-value settings per repo
- `Workflow` — name, nodes (JSON), edges (JSON), publish status

## Workflow System
- **Node types**: Triggers (Webhook, Schedule, Listen Commits/PRs/Issues/Comments/Releases), Actions (Create Issue, Add Comment, Add Label, Request Review, HTTP Request, Transform Data, Conditional)
- **Context**: Linked list (`previousStep`) flowing between connected nodes
- **Conditional node**: Dual output handles (green=Yes, red=No), routes by `sourceHandle`
- **Test system**: Per-node play button + workflow Test button, debug modal with terminal-style logs
- **Caching**: Server-side in-memory cache (5-min TTL) for GET HTTP Request + GitHub API responses

## Key Patterns
- `EditorProvider` (useReducer) manages editor state — elements, edges, selectedNode, context
- Event-driven node actions via `window.dispatchEvent(CustomEvent)`
- `useApi` hook for generic API calls
- `RESERVED_KEYS` filter prevents `name`/`description` from leaking into settings
- ESLint: `@typescript-eslint/no-explicit-any: error`, `no-console: warn`

## Commands
```bash
make dev          # Dev server
make dev-db       # Start PostgreSQL (Colima + Docker)
make build        # Production build
make lint         # ESLint
make format       # Prettier
```

## DevCadence Config
- Log dir: `~/docs/devdock/`
- Ticket prefix: DD
- Git control: manual
- Role: dev-lead
