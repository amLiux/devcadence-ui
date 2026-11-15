import type { OAuthGuideStep } from "./oauth-step-card";

export const OAUTH_GUIDE_STEPS: OAuthGuideStep[] = [
  {
    id: "project",
    title: "Create (or pick) a Google Cloud project",
    body: "Every DevCadence instance uses its own OAuth client. Do not reuse another team's project: the consent screen, quota and verification status belong to whoever owns it.",
    code: "https://console.cloud.google.com/projectcreate",
  },
  {
    id: "apis",
    title: "Enable the APIs you will use",
    body: "A node fails with 403 if its API is disabled, even when the scope was granted. Enable only the four below plus Docs if you use it.",
    code: `https://console.cloud.google.com/apis/library/gmail.googleapis.com?project=PROJECT_ID
https://console.cloud.google.com/apis/library/calendar-json.googleapis.com?project=PROJECT_ID
https://console.cloud.google.com/apis/library/drive.googleapis.com?project=PROJECT_ID
https://console.cloud.google.com/apis/library/sheets.googleapis.com?project=PROJECT_ID
https://console.cloud.google.com/apis/library/docs.googleapis.com?project=PROJECT_ID`,
  },
  {
    id: "consent",
    title: "Configure the consent screen",
    body: "Google Auth Platform → Get started. User type External, publishing status Testing while you validate. Add your own account under Test users, otherwise the consent is rejected with access_denied.",
    code: `https://console.cloud.google.com/auth/overview?project=PROJECT_ID
https://console.cloud.google.com/auth/audience?project=PROJECT_ID`,
  },
  {
    id: "scopes",
    title: "Declare the scopes",
    body: "Data access → Add or remove scopes. If a scope is missing from the table, enable its API first or paste it in \"Manually add scopes\". DevCadence only requests the scopes of the services selected on the connection.",
    code: `openid
https://www.googleapis.com/auth/userinfo.email
https://www.googleapis.com/auth/userinfo.profile
https://www.googleapis.com/auth/gmail.modify
https://www.googleapis.com/auth/calendar.readonly
https://www.googleapis.com/auth/calendar.events
https://www.googleapis.com/auth/drive.file
https://www.googleapis.com/auth/spreadsheets
https://www.googleapis.com/auth/documents`,
  },
  {
    id: "test-users",
    title: "Add yourself as a test user",
    body: "While the app is in Testing, only accounts listed here can authorize it. Without this the consent fails with access_denied.",
    code: "https://console.cloud.google.com/auth/audience?project=PROJECT_ID",
  },
  {
    id: "client",
    title: "Create the OAuth client",
    body: "Credentials → Create client → Web application. The redirect URI must match exactly, including scheme, host, port and path.",
    code: "http://localhost:3000/api/oauth/google/callback",
  },
  {
    id: "env",
    title: "Put the credentials in the environment",
    body: "Add the client id and secret to the instance env file and restart the app: environment variables are read at boot, not on hot reload. The secret is never exposed to the browser.",
    code: `GOOGLE_CLIENT_ID="....apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-..."
# Optional, when the app is served from another host:
# GOOGLE_REDIRECT_URI="https://devcadence.example.com/api/oauth/google/callback"`,
  },
  {
    id: "authorize",
    title: "Authorize the account from Connections",
    body: "Connections → Add Connection → Google → pick the services → Connect Google account. Return to the app with the green banner and the connection shows Connected as <email>. Reconnect whenever you add a service; Disconnect revokes the token and clears the stored credentials.",
  },
];
