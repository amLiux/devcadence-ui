import "./lib/queue";
import { syncSchedules } from "./lib/scheduler";

syncSchedules().then(() => {
  console.info("[worker] Schedules synced");
});

console.info("[worker] Workflow queue worker started");
console.info("[worker] Waiting for jobs...");

process.on("SIGINT", () => {
  console.info("[worker] Shutting down...");
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.info("[worker] Shutting down...");
  process.exit(0);
});
