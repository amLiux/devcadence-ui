# DevDock — Session Summary

**Date:** 2026-07-23  
**Project:** `/Users/amliux/Dev/devdock/`

---

## What We Built

**DevDock** — a standalone open-source admin dashboard for managing multiple repos, connections, and integrations. Reference implementation for DevCadence + DevCadence-MCP (kept decoupled).

### Stack
- Next.js 16 + TypeScript + Tailwind v4 + shadcn/ui + Prisma v7 + PostgreSQL
- Geist font (matched Vercel/opencode style)
- ReactFlow (workflow editor) + vaul (drawer) + cmdk (combobox) + @base-ui/react (select, popover) + sonner (toasts)
- ESLint + Prettier (`@typescript-eslint/no-explicit-any: error`, `no-console: warn`)

### Database
- PostgreSQL via Colima + Docker: `docker start devdock-postgres`
- Connection: `postgresql://devdock:devdock@localhost:5432/devdock`
- Models: `Repository`, `RepoSetting`, `Workflow` (all migrations applied)

---

## Features Completed

### Core
- Sidebar, InfoBar, ModalProvider, ThemeProvider, TooltipProvider
- Connections page with drawer modal (GitHub functional, Slack/Discord/OpenAI/Notion/Google Drive = "Coming soon")
- Connection form: name + description + provider-specific inputs
- API routes: `GET/POST /api/connections`, `PUT/DELETE /api/connections/[id]`, `GET /api/repos`

### Workflow Editor
- ReactFlow canvas with resizable panels
- EditorProvider (useReducer: elements, edges, selectedNode, context)
- Sidebar with draggable node cards + config forms for all node types
- Save/publish, test button per node, context viewer modal
- Debug modal (terminal-style, per-node sections, color-coded logs)

### Node Types
| Category | Nodes |
|----------|-------|
| Triggers | Webhook, Schedule, Listen Commits/PRs/Issues/Comments/Releases |
| Actions | Create Issue, Add Comment, Add Label, Request Review, HTTP Request, Transform Data, Conditional |

### Smart GitHub Selects
- `GitHubRepoSelect`, `GitHubLabelsSelect`, `GitHubAssigneesSelect`, `GitHubIssueSelect`
- Module-level caching for all

### GitHub API Endpoints (all with server-side response caching)
- repos, commits, pulls, actions, issues, comments, contributors, labels

### Context System (Linked List)
- Context flows: `{ previousStep: { name, output, success, error, previousStep?: ... } }`
- Transform Data expression: `item.previousStep.output.temperature`
- Context viewer: `{ }` button shows flat JSON with tested/untested badges
- Skeleton built from nodes on load/add/delete

### Caching
- Server-side in-memory cache (`src/lib/cache.ts`) — 5-min TTL
- Caches: GET HTTP Request responses + GitHub API routes
- Both test-node and test-workflow cache parsed JSON response body directly

### Single-Node Test Fix
- test-node now recursively executes parent nodes to build ancestor chain
- Transform Data works with play button when connected to HTTP Request

---

## Completed (Conditional Node)

- Config form in sidebar (condition expression + sample input)
- Execution logic in test-workflow (`executeConditional` function)
- Execution logic in test-node (`testConditional` function)
- `executeNode` switch updated to call `executeConditional`
- `walk()` routes via `sourceHandle` (success/failure) based on condition
- Two output handles: green "Yes" (left, `sourceHandle: "success"`) and red "No" (right, `sourceHandle: "failure"`)
- `EditorEdge` type includes `sourceHandle` for handle-aware routing
- Conditional node has amber border for visual distinction

---

## Next Steps

1. **Test Conditional end-to-end** — HTTP Request → Conditional → separate paths
2. **Test remaining triggers** — Listen Commits/PRs/Issues/Comments/Releases
3. **Consider workflow visual execution feedback** — color nodes during test run

---

## Key Files

| File | Purpose |
|------|---------|
| `src/lib/types.ts` | All TypeScript types |
| `src/lib/cache.ts` | In-memory cache with TTL |
| `src/lib/github.ts` | GitHub API helpers |
| `src/lib/db.ts` | Prisma client |
| `src/providers/editor-provider.tsx` | Editor state + context |
| `src/components/composed/debug-modal.tsx` | Debug modal |
| `src/components/composed/context-viewer.tsx` | Context viewer |
| `src/components/composed/github-*.tsx` | Smart GitHub selects |
| `src/app/(main)/(pages)/workflows/editor/[editorId]/components/editor-canvas.tsx` | ReactFlow canvas + save/test/context |
| `src/app/(main)/(pages)/workflows/editor/[editorId]/components/editor-canvas-card.tsx` | Node card rendering (dual handles for Conditional) |
| `src/app/(main)/(pages)/workflows/editor/[editorId]/components/editor-canvas-sidebar.tsx` | Sidebar config |
| `src/app/api/workflows/test-node/route.ts` | Single node test |
| `src/app/api/workflows/test-workflow/route.ts` | Full workflow test |
| `src/app/api/github/repos/[owner]/[repo]/*` | GitHub API endpoints |
| `prisma/schema.prisma` | DB models |
| `Makefile` | Dev commands |

---

## Commands

```bash
# Dev
make dev          # Start dev server
make dev-db       # Start PostgreSQL container
make build        # Production build
make lint         # ESLint check
make format       # Prettier format
make db-reset     # Reset database
make db-generate  # Generate Prisma client
make db-pull      # Pull schema from DB
make db-studio    # Open Prisma Studio
```
