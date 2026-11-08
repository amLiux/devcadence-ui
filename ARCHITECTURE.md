# Architecture

Component rules for this repo. The lint config enforces the measurable parts;
the rest is a review checklist.

## Rules

### R1 — One component per file

A file exports one component. Small private helpers that are only used by that
component get their own file when they grow past ~40 lines. `react/no-multi-comp`
flags any second component in a file.

### R2 — Logic lives in hooks

State, effects, fetching and orchestration live in a `use*` hook, either in
`src/hooks/` or colocated next to the feature. Components receive data and
callbacks as props.

- A hook owns one concern. If it needs a second `useEffect` to coordinate two
  unrelated things, split it.
- Hooks are tested directly. Components are tested for their states.

### R3 — Pages are wiring plus JSX

A page composes hooks and components. No inline fetch chains, no business rules,
no multi-step transformations in the JSX. If a page grows a handler longer than a
few lines, it belongs in a hook.

### R4 — Presentational components do not fetch

A component that renders data receives it as props. Data loading belongs to the
page or the hook that owns the screen.

### R5 — Size and density limits

| Rule | Limit |
|---|---|
| `max-lines` | 300 |
| `max-lines-per-function` | 180 |
| `complexity` | 15 |
| `max-statements` | 30 |
| `max-depth` | 4 |
| `max-params` | 4 |

Line limits skip blank lines and comments. JSX counts toward the function limit:
a component that is only JSX still has to be split when it grows.

### R6 — Where code goes

| Kind | Location |
|---|---|
| Screen hooks | `src/hooks/` or colocated `use-*.ts` |
| Shared components | `src/components/composed/` |
| Vendored primitives | `src/components/ui/` |
| Domain logic | `src/lib/<domain>/` |
| Tests | Colocated `*.test.ts(x)` |

## Exemptions

- `src/components/ui/**` — vendored shadcn primitives.
- `src/app/**/docs/**` — documentation pages, long but mostly content.
- `src/generated/**` — Prisma client.
- `**/*.test.ts(x)` — test files.

Exemptions cover the size and density rules. They do not cover correctness rules
such as `no-explicit-any`.

## Rollout

The rules are **errors**. `npm run lint` fails on a violation.

1. `dd-108`: rules and `ARCHITECTURE.md`, introduced as warnings.
2. `dd-109` and `dd-112`: cleanup until lint reported zero warnings.
3. `dd-113`: warnings flipped to errors.

If a change needs to exceed a limit, split the code instead of adding an
eslint-disable.

## Review checklist

- One component per file?
- Logic in a hook, not in JSX?
- Page free of fetch chains and business rules?
- New hook covered by a test?
- `npm run lint` passes?
