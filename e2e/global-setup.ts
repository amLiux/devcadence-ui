import { execFileSync } from "node:child_process";

export default async function globalSetup(): Promise<void> {
  execFileSync("npx", ["tsx", "e2e/seed.ts"], {
    stdio: "inherit",
    env: process.env,
  });
}
