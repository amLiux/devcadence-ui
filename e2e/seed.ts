import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

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
  await prisma.connection.deleteMany({ where: { name: { startsWith: "E2E " } } });

  for (const name of ["E2E Success", "E2E Move"]) {
    await prisma.workflow.create({
      data: {
        name,
        description: "Seeded by the E2E suite",
        type: "workflow",
        projectId: shared.id,
        status: "draft",
        nodes: JSON.stringify(WORKFLOW_NODES),
        edges: JSON.stringify(WORKFLOW_EDGES),
      },
    });
  }

  console.info("[e2e] Seeded E2E workflows and the E2E Target project");
}

if (process.argv[1]?.includes("seed.ts")) {
  seed()
    .catch((error) => {
      console.error("[e2e] Seed failed:", error);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
