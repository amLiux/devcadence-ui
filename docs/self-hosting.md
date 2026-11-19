# Self-hosting devcadence for a team

This is the guide for running one shared instance for a small team on a VPS.
For local development use `make dev` instead; this document assumes a public
hostname, TLS and real secrets.

> Status: practical baseline, not a managed platform. Adjust sizing and backup
> retention to your team. Everything below is deliberately boring: one host, one
> Compose project, one database.

## What you are running

| Process | Role | Port |
|---|---|---|
| `app` | Next.js server (UI + API) | 3000, internal |
| `worker` | BullMQ worker and scheduler | none |
| `postgres` | workflows, runs, users, connections | 5432, internal |
| `redis` | queue, schedules, rate limiting | 6379, internal |
| `caddy` | TLS termination and reverse proxy | 80/443, public |

The app and the worker **must both run**. The web process alone will not execute
queued workflows or schedules.

## Minimum host

- 2 vCPU / 4 GB RAM / 40 GB disk for a small team (≤ 20 users, low run volume).
- Ubuntu 24.04 or similar, Docker Engine + Compose plugin.
- Node.js 26 only if you build on the host; the image below builds in Docker.
- A DNS `A` record, e.g. `app.example.com` → your VPS IP.
- Firewall: allow 22, 80, 443. Nothing else.

Use a dedicated host or at least a dedicated Compose project. Do not co-locate
Postgres with unrelated databases you cannot back up together.

## 1. Get the code and build

```bash
git clone git@github.com:amLiux/devcadence-ui.git
cd devcadence-ui
cp .env.example .env
chmod 600 .env
```

Create a `Dockerfile` (not committed yet by default):

```dockerfile
FROM node:26-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci
COPY . .
RUN npm run build

FROM node:26-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app ./
EXPOSE 3000
CMD ["npm", "start"]
```

The worker uses the same image with a different command. Keeping dev
dependencies in the image is intentional: the worker runs through `tsx`.

## 2. Environment

`docker-compose.prod.yml` loads `.env`. Inside Compose, use service names, not
localhost:

```env
# Inside the Compose network
DATABASE_URL="postgresql://devdock:<strong-password>@postgres:5432/devdock?schema=public"
REDIS_URL="redis://redis:6379"

APP_DOMAIN="app.example.com"
NEXT_PUBLIC_APP_URL="https://app.example.com"

# Encrypts connection secrets at rest. Generate once:
#   openssl rand -hex 32
DEVDOCK_MASTER_KEY="<64-hex-chars>"

# App sign-in. NEVER leave this disabled on a public host.
AUTH_MODE="oidc"                 # or "hortus"
AUTH_SECRET="<openssl rand -hex 32>"
AUTH_ADMIN_EMAILS="you@example.com"

# OIDC mode
AUTH_OIDC_ISSUER="https://iam.example.com"
AUTH_OIDC_CLIENT_ID="..."
AUTH_OIDC_CLIENT_SECRET="..."
AUTH_REDIRECT_URI="https://app.example.com/api/auth/callback"

# Or Hortus API mode (branded form)
# AUTH_API_URL="http://host.docker.internal:8001"
# AUTH_API_SERVICE="devcadence"
# AUTH_RATE_LIMIT_MAX="5"
# AUTH_RATE_LIMIT_WINDOW="300"

GITHUB_TOKEN="..."               # only if you use GitHub nodes
# GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET if you use Google nodes
```

Notes:

- `DEVDOCK_MASTER_KEY` encrypts connection secrets. Losing it means those
  secrets cannot be decrypted. Back it up separately, in a password manager.
- `AUTH_SECRET` signs sessions. Rotating it logs everyone out.
- `AUTH_MODE=disabled` is only for a single-user instance behind a private
  network. Never on a public host.
- `NEXT_PUBLIC_APP_URL` must be the public HTTPS origin, not an internal name.

See [`AUTH.md`](../AUTH.md) for the full auth reference.

## 3. Compose

Create `docker-compose.prod.yml`:

```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: devdock
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?set POSTGRES_PASSWORD}
      POSTGRES_DB: devdock
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U devdock -d devdock"]
      interval: 5s
      timeout: 3s
      retries: 12
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    command: ["redis-server", "--appendonly", "yes"]
    volumes:
      - redisdata:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 12
    restart: unless-stopped

  app:
    build: .
    image: devcadence:local
    env_file: .env
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    restart: unless-stopped

  worker:
    image: devcadence:local
    command: ["npx", "tsx", "src/worker.ts"]
    env_file: .env
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    restart: unless-stopped

  caddy:
    image: caddy:2-alpine
    ports:
      - "80:80"
      - "443:443"
    environment:
      APP_DOMAIN: ${APP_DOMAIN:?set APP_DOMAIN}
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
      - caddy_config:/config
    depends_on:
      - app
    restart: unless-stopped

volumes:
  pgdata:
  redisdata:
  caddy_data:
  caddy_config:
```

Add `POSTGRES_PASSWORD` to `.env` too. It must match the password inside
`DATABASE_URL`.

Create `Caddyfile`:

```caddyfile
{$APP_DOMAIN} {
  encode zstd gzip
  reverse_proxy app:3000
}
```

Caddy obtains and renews TLS automatically. `X-Forwarded-For` is passed through,
which the login rate limiter uses.

## 4. First run

```bash
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d postgres redis
docker compose -f docker-compose.prod.yml run --rm app npx prisma migrate deploy
docker compose -f docker-compose.prod.yml up -d
```

Then:

1. Open `https://app.example.com/login`.
2. Sign in with the admin email configured in `AUTH_ADMIN_EMAILS` (OIDC), or with
   the admin user you created in HortusClavis (hortus mode).
3. Run a trivial workflow and check the worker logs:
   `docker compose -f docker-compose.prod.yml logs -f worker`.

A first login provisions the local user. Roles are refreshed from the IdP on
every login; local edits to `User.role` are overwritten.

## 5. Backups and restore

Postgres is the source of truth. Redis holds queue state and rate-limit windows;
AOF keeps it across restarts, but you do not need to back it up.

Nightly backup (example with `age` + `rclone`):

```bash
#!/usr/bin/env bash
set -euo pipefail
STAMP=$(date -u +%Y%m%dT%H%M%SZ)
docker compose -f docker-compose.prod.yml exec -T postgres \
  pg_dump -U devdock -Fc devdock | age -r "$AGE_RECIPIENT" > "/backups/devdock-$STAMP.dump.age"
rclone copy "/backups/devdock-$STAMP.dump.age" b2:devcadence-backups/
find /backups -name 'devdock-*.dump.age' -mtime +30 -delete
```

Retention suggestion: 7 daily, 4 weekly, 3 monthly. Keep an encrypted copy of
`.env` (including `DEVDOCK_MASTER_KEY`) in your password manager.

Restore drill (run it once, not just when you need it):

```bash
docker compose -f docker-compose.prod.yml stop app worker
# On a clean database:
age -d -i key.txt backup.dump.age | \
  docker compose -f docker-compose.prod.yml exec -T postgres \
  pg_restore -U devdock -d devdock --clean --if-exists
docker compose -f docker-compose.prod.yml start app worker
```

Verify: login works, the workflow list matches, and a new run completes.

## 6. Upgrades

```bash
# 1. Back up first
# 2. Pull the target version
git fetch --tags && git checkout <tag-or-commit>
docker compose -f docker-compose.prod.yml build
# 3. Apply migrations before starting the new app
docker compose -f docker-compose.prod.yml run --rm app npx prisma migrate deploy
# 4. Recreate app + worker
docker compose -f docker-compose.prod.yml up -d
```

Migrations are forward-only. A rollback means restoring the previous image
**and** the database backup if the migration changed data. For a small team, a
short maintenance window is cheaper than pretending to do zero-downtime.

After upgrading, check `/login`, `/api/auth/me` (401 without a cookie), and the
worker logs. Keep the previous image tag until the new one has served traffic.

## 7. Security checklist

- [ ] `AUTH_MODE` is not `disabled` on a public host.
- [ ] TLS is terminated by Caddy (add HSTS if your security policy requires it).
- [ ] Only 80/443 are public; Postgres and Redis have no host ports.
- [ ] `DEVDOCK_MASTER_KEY`, `AUTH_SECRET`, `POSTGRES_PASSWORD` are random and
      stored in a password manager.
- [ ] `.env` is `chmod 600` and never committed.
- [ ] Backups are encrypted and stored off-host; a restore was tested.
- [ ] SSH uses keys; password login is disabled.
- [ ] Rate limiting is enabled in hortus mode (dd-152); OIDC providers own their
      own brute-force protection.
- [ ] `X-Forwarded-For` reaches the app through the proxy, or all login attempts
      share the `unknown` rate-limit bucket.
- [ ] The host is patched; Docker and the base image are updated regularly.
- [ ] The app does not log passwords or tokens; configure proxy access logs to redact query strings if your policy requires it.

## 8. Operations

```bash
# Logs
docker compose -f docker-compose.prod.yml logs -f app worker caddy

# Restart one process
docker compose -f docker-compose.prod.yml restart app

# Disk and database size
df -h
docker compose -f docker-compose.prod.yml exec postgres \
  psql -U devdock -d devdock -c "select pg_size_pretty(pg_database_size('devdock'));"
```

A simple uptime check should hit `https://app.example.com/login` (200) and alert
if it is not 200. The worker has no HTTP port; monitor its process/logs instead.

## Appendix A — HortusClavis on the same host

If you run the suite, keep HortusClavis on offset ports so it does not collide:

| Service | HortusClavis | devcadence |
|---|---|---|
| app | 8001 | 3000 |
| Postgres | 5433 | 5432 |
| Redis | 6380 | 6379 |

In hortus mode, `AUTH_API_URL` depends on where devcadence runs:

- App on the host: `http://127.0.0.1:8001`
- App inside Compose: `http://host.docker.internal:8001` and add
  `extra_hosts: ["host.docker.internal:host-gateway"]` to the app/worker services.

For OIDC, register `https://app.example.com/api/auth/callback` as the client
redirect URI in HortusClavis.

## Appendix B — Managed platforms (optional)

Railway, Render and Fly.io work for the web process, but **run the worker as a
separate service** from the same image. Vercel alone is not enough because the
BullMQ worker is a long-running process. Use managed Postgres and Redis, and
keep the same backup/restore discipline.

This is an appendix, not the primary path: self-hosting on a VPS is the model
the project is built for.
