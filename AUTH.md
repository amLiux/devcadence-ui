# Authentication (OIDC)

DevCadence can delegate sign-in to any OpenID Connect provider. Hortus Clavis is
the reference provider, but nothing in the client is Hortus-specific: Entra ID,
Keycloak, Authentik or Google Workspace work with the same configuration.

Authentication is **opt-in**. `AUTH_MODE=disabled` (the default) keeps the
current single-user behaviour and does not protect routes.

## 1. Enable it

```bash
AUTH_MODE="oidc"
AUTH_OIDC_ISSUER="https://iam.example.com"     # public URL the browser reaches
AUTH_OIDC_CLIENT_ID="hc_..."
AUTH_OIDC_CLIENT_SECRET="hcs_..."
AUTH_REDIRECT_URI="https://devcadence.example.com/api/auth/callback"
AUTH_SECRET="$(openssl rand -hex 32)"
AUTH_ADMIN_EMAILS="you@example.com"
```

`AUTH_REDIRECT_URI` must match the value registered at the provider **exactly**.
`AUTH_OIDC_ISSUER` must be the public issuer; it drives discovery, JWKS,
authorize and token endpoints.

Optional:

| Variable | Default | Purpose |
|---|---|---|
| `AUTH_OIDC_SCOPES` | `openid profile email offline_access hc.permissions` | Requested scopes |
| `AUTH_SESSION_TTL` | `28800` | Session cookie lifetime (seconds) |
| `AUTH_TRANSACTION_TTL` | `600` | Login transaction lifetime (seconds) |
| `AUTH_ADMIN_EMAILS` | empty | Emails that always resolve to `admin` |
| `AUTH_ADMIN_GROUPS` | empty | Groups claim values that resolve to `admin` |
| `AUTH_TRUST_EMAIL` | `false` | Link an existing user by email without `email_verified` |
| `AUTH_BOOTSTRAP_FIRST_USER` | `true` | First user becomes admin when no admin email matches |
| `AUTH_UPSTREAM_LOGOUT` | `false` | End the provider session too (needs `client_id`-based logout support) |

## 2. Register the client in Hortus Clavis

Create the tenant service first (`POST /admin/services`), then the OAuth client:

```bash
curl -s -X POST https://iam.example.com/admin/oauth-clients \
  -H "Authorization: Bearer $HC_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "DevCadence",
    "service_id": "<service uuid>",
    "redirect_uris": ["https://devcadence.example.com/api/auth/callback"],
    "scopes": "openid profile email offline_access hc.permissions",
    "is_confidential": true
  }'
```

The response contains `client_id` and `client_secret` once. Store them in the
DevCadence environment; they cannot be retrieved again.

Create the service actions that match the role mapping:

| Action | Role |
|---|---|
| `manage_workflows`, `manage_service`, `manage_roles`, `manage_users` | `admin` |
| `run_workflows`, `edit_workflows` | `author` |
| anything else / no permission | `viewer` |

Consider adding `run_workflows` to the service's `user` role and
`manage_workflows` to `admin`.

## 3. How it works

1. `GET /api/auth/login` creates `state`, `nonce`, a PKCE verifier and a signed
   transaction cookie, then redirects to the provider.
2. `GET /api/auth/callback` validates the state, exchanges the code with
   `client_secret_basic`, verifies the ID token (RS256, issuer, audience,
   expiry, nonce) against the provider JWKS and reads `userinfo`.
3. Users are keyed by `(issuer, subject)` in `UserIdentity`, never by email.
4. A new user is provisioned on first login; `role` is refreshed from the IdP on
   every login. `AUTH_ADMIN_EMAILS`, `AUTH_ADMIN_GROUPS` and
   `hc.permissions`/`groups` decide the role.
5. `GET /api/auth/logout` clears the local session cookie. With
   `AUTH_UPSTREAM_LOGOUT=true` it also redirects through the provider's
   `end_session_endpoint` using `client_id` and `post_logout_redirect_uri`.
   This requires an IdP that accepts `client_id` without an `id_token_hint`
   (Hortus Clavis PR #2 or later); otherwise the provider returns 400.

`proxy.ts` rejects anonymous requests to everything except `/login`,
`/api/auth`, `/api/oauth` and `/api/webhooks`. API routes that need role checks
should call `getCurrentUser()` from `src/lib/auth/current-user.ts`.

## Security notes

- Hortus Clavis currently emits `email_verified: false`. Email is treated as an
  attribute, not an identity, and auto-linking by email is disabled unless
  `AUTH_TRUST_EMAIL=true`.
- If a user with the same email already exists under another identity, login is
  rejected with a link error. An administrator must link the identity manually.
- Sessions are signed cookies, not server-side sessions. Logout clears the
  cookie; it cannot revoke a stolen token before it expires. Rotate
  `AUTH_SECRET` to invalidate every session at once.
- There is no rate limiting on `/api/auth/login` yet.
