import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { encryptConfig } from "../src/lib/secrets";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

const WORKFLOW_NODES = [
  {
    id: "e2e-trigger",
    type: "cardNode",
    position: { x: 80, y: 80 },
    data: {
      title: "Webhook",
      description: "E2E trigger",
      type: "Trigger",
      completed: false,
      current: false,
      metadata: {},
    },
  },
  {
    id: "e2e-transform",
    type: "cardNode",
    position: { x: 80, y: 280 },
    data: {
      title: "Transform Data",
      description: "E2E transform",
      type: "Action",
      completed: false,
      current: false,
      metadata: { expression: "({ ok: true, value: 42 })" },
    },
  },
];

const WORKFLOW_EDGES = [{ id: "e2e-edge", source: "e2e-trigger", target: "e2e-transform" }];

const FAILURE_NODES = [
  {
    id: "e2e-failure-trigger",
    type: "cardNode",
    position: { x: 80, y: 80 },
    data: {
      title: "Webhook",
      description: "E2E failure trigger",
      type: "Trigger",
      completed: false,
      current: false,
      metadata: { connectionId: "e2e-webhook" },
    },
  },
  {
    id: "e2e-failure-http",
    type: "cardNode",
    position: { x: 80, y: 280 },
    data: {
      title: "HTTP Request",
      description: "E2E failure request",
      type: "Action",
      completed: false,
      current: false,
      metadata: { url: "http://127.0.0.1:9", method: "GET" },
    },
  },
];

const FAILURE_EDGES = [
  { id: "e2e-failure-edge", source: "e2e-failure-trigger", target: "e2e-failure-http" },
];

async function seedConnections(): Promise<void> {
  await prisma.connection.deleteMany({ where: { name: { startsWith: "E2E " } } });

  await prisma.connection.create({
    data: {
      id: "e2e-webhook",
      type: "Webhook",
      name: "E2E Webhook",
      description: "Seeded by the E2E suite",
      config: encryptConfig({}),
    },
  });

  await prisma.connection.create({
    data: {
      id: "e2e-smtp",
      type: "SMTP",
      name: "E2E SMTP",
      description: "Seeded by the E2E suite (MailHog)",
      config: encryptConfig({
        host: "127.0.0.1",
        port: 1025,
        user: "",
        password: "",
        secure: false,
        fromEmail: "e2e@devdock.local",
      }),
    },
  });

  await prisma.notificationSetting.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      enabled: true,
      channel: "email",
      connectionId: "e2e-smtp",
      target: "e2e@devdock.local",
      throttleMinutes: 1,
    },
    update: {
      enabled: true,
      channel: "email",
      connectionId: "e2e-smtp",
      target: "e2e@devdock.local",
      throttleMinutes: 1,
    },
  });
}

export async function seed(): Promise<void> {
  const shared = await prisma.project.findFirst({ where: { isShared: true } });
  if (!shared) {
    throw new Error("Shared project is missing. Run `npx prisma migrate deploy` first.");
  }

  await prisma.project.upsert({
    where: { id: "e2e-target" },
    create: {
      id: "e2e-target",
      name: "E2E Target",
      description: "Created by the E2E seed",
      isShared: false,
    },
    update: { name: "E2E Target" },
  });

  const previous = await prisma.workflow.findMany({
    where: { name: { startsWith: "E2E " } },
    select: { id: true },
  });
  const previousIds = previous.map((workflow) => workflow.id);
  if (previousIds.length > 0) {
    await prisma.workflowLog.deleteMany({
      where: { run: { workflowId: { in: previousIds } } },
    });
    await prisma.workflowRun.deleteMany({ where: { workflowId: { in: previousIds } } });
    await prisma.workflow.deleteMany({ where: { id: { in: previousIds } } });
  }

  await seedConnections();

  const workflows = [
    { name: "E2E Success", status: "draft", nodes: WORKFLOW_NODES, edges: WORKFLOW_EDGES },
    { name: "E2E Move", status: "draft", nodes: WORKFLOW_NODES, edges: WORKFLOW_EDGES },
    { name: "E2E Failure", status: "active", nodes: FAILURE_NODES, edges: FAILURE_EDGES },
  ];

  for (const workflow of workflows) {
    await prisma.workflow.create({
      data: {
        name: workflow.name,
        description: "Seeded by the E2E suite",
        type: "workflow",
        projectId: shared.id,
        status: workflow.status,
        nodes: JSON.stringify(workflow.nodes),
        edges: JSON.stringify(workflow.edges),
      },
    });
  }

  console.info("[e2e] Seeded E2E workflows, connections and the E2E Target project");
}

if (process.argv[1]?.includes("seed.ts")) {
  seed()
    .catch((error) => {
      console.error("[e2e] Seed failed:", error);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
