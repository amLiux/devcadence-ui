# Spike: Kubernetes / kubectl workflow nodes

**Ticket:** dd-48  
**Goal:** Define how devdock should add Kubernetes cluster introspection nodes.

## Use cases

- List pods, services, deployments, HPAs, nodes.
- Check pod status / restart counts and surface them in workflows.
- Read container logs for a pod.
- Report resource utilization or image versions.
- Future: exec into a container to run diagnostics.

## Options evaluated

### 1. `@kubernetes/client-node` (official JavaScript client) — Recommended

The Kubernetes project maintains `@kubernetes/client-node`. It is generated from the Kubernetes OpenAPI spec, so it tracks API versions closely.

**Pros**
- Official, well-documented, TypeScript-first.
- No external binary dependency; works anywhere Node runs.
- Supports kubeconfig files, in-cluster service accounts, and programmatic auth.
- Built-in helpers for common operations: `Exec`, `Log`, `PortForward`, `Attach`, `Cp`, `Watch`.
- Type-safe generated clients for CoreV1, AppsV1, Autoscaling, etc.

**Cons**
- Adds a sizable dependency tree.
- Generated API surface is huge and can be verbose.
- Version matrix must be considered (client minor version tracks Kubernetes API minor version).
- `Exec` / `Log` use WebSocket streaming, which is slightly more code than a simple `kubectl` shell call.

**Example**

```ts
import * as k8s from "@kubernetes/client-node";

const kc = new k8s.KubeConfig();
kc.loadFromDefault(); // or loadFromCluster() when running in-cluster

const api = kc.makeApiClient(k8s.CoreV1Api);
const { items } = await api.listNamespacedPod({ namespace: "default" });

const hpaApi = kc.makeApiClient(k8s.AutoscalingV2Api);
const hpas = await hpaApi.listNamespacedHorizontalPodAutoscaler({ namespace: "default" });
```

### 2. Shell out to `kubectl`

Run `kubectl get po -o json`, `kubectl get svc`, etc. via `child_process` and parse the JSON output.

**Pros**
- Familiar to operators; easy to construct commands.
- Works with any kubeconfig or plugin-based auth.
- No Node dependency version matrix.

**Cons**
- Requires `kubectl` binary in the runtime image.
- Arbitrary command injection risk if user input reaches the shell.
- Harder to stream logs or exec interactively.
- Parsing JSON is brittle compared to typed objects.

### 3. Go microservice with `client-go`

Offload Kubernetes work to a small Go service that uses `client-go`.

**Pros**
- `client-go` is the most mature and feature-complete client.
- Could be reused by other parts of the platform.

**Cons**
- Adds operational complexity (deploy, auth, networking, versioning).
- Overkill for a workflow node that only needs read-only introspection.

## Decision

Use **`@kubernetes/client-node`** for Kubernetes nodes.

Rationale:
- It is the standard Node.js client and fits our Node/Next.js stack.
- Read-only introspection (pods, services, HPAs, nodes) is straightforward with typed APIs.
- Connection auth maps cleanly to either a kubeconfig upload or an in-cluster service account.
- Avoids shell injection and binary dependencies.

## Connection type

Add a **Kubernetes** connection type with two auth modes:

1. **Kubeconfig file** — user uploads a YAML kubeconfig (stored encrypted like other connection secrets).
2. **In-cluster service account** — used when devdock itself runs inside the target cluster.

Store the kubeconfig content (or a flag for in-cluster) encrypted in `Connection.config`.

## Proposed nodes (MVP)

| Node | What it does | Output |
|------|--------------|--------|
| `Kubernetes — List Pods` | List pods in a namespace with status, restarts, images. | Array of pod objects |
| `Kubernetes — List Services` | List services with ports and selectors. | Array of service objects |
| `Kubernetes — List Deployments` | List deployments with replicas and images. | Array of deployment objects |
| `Kubernetes — List HPAs` | List horizontal pod autoscalers with targets/current metrics. | Array of HPA objects |
| `Kubernetes — Get Pod Logs` | Stream recent logs from a pod/container. | Log text |

Out of scope for MVP:
- `kubectl exec` (interactive or arbitrary commands).
- Creating/updating/deleting resources.
- Port forwarding.

## Security

- Never allow arbitrary `kubectl` commands from workflow metadata.
- Nodes should use typed API calls with allow-listed resource types.
- Kubeconfig must be encrypted at rest (reuse dd-36 secrets layer).
- Respect RBAC: devdock only sees what the provided kubeconfig/service account can see.
- Avoid `exec` until there is a clear sandboxing story.

## Open questions

1. Do we want a single configurable "Kubernetes Query" node (resource type + field selector), or explicit nodes per resource?
2. Should we support multiple contexts/clusters per kubeconfig, or force a single current context?
3. How do we handle long-running `get logs` streaming in a workflow step that expects a synchronous result?

## Next step

Create the Kubernetes connection type and the first node (`List Pods`) behind a feature flag, then validate against a local `kind` cluster.
