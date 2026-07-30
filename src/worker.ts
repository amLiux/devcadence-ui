import "./lib/queue";

console.log("[worker] Workflow queue worker started");
console.log("[worker] Waiting for jobs...");

process.on("SIGINT", () => {
  console.log("[worker] Shutting down...");
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("[worker] Shutting down...");
  process.exit(0);
});
