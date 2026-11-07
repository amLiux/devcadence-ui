-- Global retry policy defaults.

CREATE TABLE "RetrySetting" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "baseDelayMs" INTEGER NOT NULL DEFAULT 2000,
    "manualCooldownMs" INTEGER NOT NULL DEFAULT 30000,
    "maxChain" INTEGER NOT NULL DEFAULT 10,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RetrySetting_pkey" PRIMARY KEY ("id")
);

INSERT INTO "RetrySetting" (
    "id",
    "enabled",
    "maxAttempts",
    "baseDelayMs",
    "manualCooldownMs",
    "maxChain",
    "updatedAt"
) VALUES ('default', true, 3, 2000, 30000, 10, CURRENT_TIMESTAMP);
