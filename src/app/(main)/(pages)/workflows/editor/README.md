# DevDock Workflow Editor — Developer Guide

## Architecture

```
Workflow Page (/workflows)
  └─ Lists all workflows, "New Workflow" button opens drawer
      └─ Creates workflow → redirects to editor

Editor Page (/workflows/editor/[id])
  └─ EditorProvider (state management via useReducer)
      └─ EditorCanvas
          ├─ Left: ReactFlow canvas (drag-and-drop nodes, edge connections)
          └─ Right: Sidebar
              ├─ Actions tab (draggable node cards)
              └─ Settings tab (config form for selected node)
```

## Key Files

| File                                    | Purpose                                                         |
| --------------------------------------- | --------------------------------------------------------------- |
| `src/providers/editor-provider.tsx`     | Global editor state: nodes, edges, selectedNode, sidebar tab    |
| `src/app/.../editor-canvas.tsx`         | ReactFlow canvas, save/publish, drop handler, node click        |
| `src/app/.../editor-canvas-card.tsx`    | Node card rendered on canvas (icon, title, delete/edit buttons) |
| `src/app/.../editor-canvas-sidebar.tsx` | Sidebar with draggable cards + settings form                    |

## Adding a New Node Type

### 1. Define the node card in the sidebar

In `editor-canvas-sidebar.tsx`, add to the appropriate array:

```ts
const githubNodes: NodeCardDef[] = [
  // ... existing nodes
  {
    type: "GitHub", // "Trigger" | "Action" | "GitHub"
    title: "My New Node",
    description: "What this node does",
  },
];
```

### 2. Add an icon (optional)

In `editor-canvas-sidebar.tsx` and `editor-canvas-card.tsx`:

```ts
const iconMap: Record<string, React.ReactNode> = {
  // ... existing icons
  GitHub: <GitBranch className="..." />,
};
```

### 3. Add the config form

In `editor-canvas-sidebar.tsx`, add a case in `NodeSettingsForm`:

```tsx
if (title === "My New Node") {
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-xs">Field Name</Label>
        <Input
          className="h-8 text-xs"
          placeholder="..."
          value={meta.fieldName || ""}
          onChange={(e) => handleChange("fieldName", e.target.value)}
        />
      </div>
    </div>
  );
}
```

Config values are stored in `node.data.metadata` (a `Record<string, unknown>`).

### 4. Add a backend endpoint (if needed)

Create the API route in `src/app/api/`:

```ts
// src/app/api/my-endpoint/route.ts
import { NextResponse } from "next/server";
import { getGitHubToken, githubFetch } from "@/lib/github";

export async function GET() {
  const token = await getGitHubToken();
  if (!token) return NextResponse.json({ error: "No token" }, { status: 404 });
  const data = await githubFetch("/some/endpoint", token);
  return NextResponse.json(data);
}
```

## Data Flow

1. **Drag node** from sidebar → `onDrop` creates a `Node` with `type: "cardNode"` and data `{ title, description, type, metadata: {} }`
2. **Click node** on canvas → `onNodeClick` sets `selectedNode` in context + switches sidebar to Settings tab
3. **Edit settings** → `updateNode(id, { metadata: { ... } })` updates the node's metadata
4. **Connect nodes** → `onConnect` creates an edge between source/target handles
5. **Save** → Serializes `nodes` + `edges` to JSON, PUT to `/api/workflows/[id]`
6. **Delete node** → Trash icon on card dispatches `DELETE_NODE`, removes from canvas and state

## Node Data Structure

```ts
interface EditorNodeData {
  title: string; // Display name (e.g., "Listen Commits")
  description: string; // Short description
  completed: boolean; // Visual status indicator
  current: boolean; // Visual status indicator
  metadata: Record<string, unknown>; // Config values from settings form
  type: "Trigger" | "Action" | "GitHub";
}
```

## Prisma Models

- **Workflow**: `id`, `name`, `description`, `nodes` (JSON string), `edges` (JSON string), `flowPath` (JSON string), `publish` (bool)
- **Repository**: `id`, `name`, `description`, `url`, `branch`, `patToken`, `status`

## GitHub API Helpers

- `src/lib/github.ts` — `getGitHubToken()` fetches PAT from DB, `githubFetch()` makes authenticated requests
- Endpoints: `/api/github/repos`, `/api/github/repos/[owner]/[repo]/commits|pulls|actions`
