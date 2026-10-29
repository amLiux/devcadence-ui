"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, ChevronLeft, Lock, Unlock, Database, Key, Shield, Eye, EyeOff, RefreshCcw } from "lucide-react";
import { useDocsProgress } from "@/hooks/use-tutorial-progress";

type Stage = "idle" | "typing" | "encrypting" | "stored" | "decrypting" | "revealed";

const DEMO_SECRET = "ghp_************************************";
const ENCRYPTED_PREVIEW = "enc:v1:HIcDP60xSDcKU7p1enzvlQgwes2CYTJjlu5i7SHXJ/Tj4XCecYLcWbkoHrSb5oFiF5kIXf0eSVsIcnxkjuJ6RQr8tdsTEMDbrKFmUJjBD19oyXa+IKY6FWVo1xvhZf1d9JLo4DNiNq3Zter/4faC5H1XAwRqNq786TBV6uZVEqJK40gwvjAoBb8SZm4=";

function AnimatedArrow({ active }: { active: boolean }) {
  return (
    <div className={`flex flex-col items-center justify-center transition-all duration-500 ${active ? "opacity-100" : "opacity-30"}`}>
      <div className={`h-8 w-0.5 bg-gradient-to-b from-transparent via-primary/60 to-transparent ${active ? "animate-pulse" : ""}`} />
      <ArrowRight className={`h-4 w-4 text-primary -rotate-90 ${active ? "animate-bounce" : ""}`} />
    </div>
  );
}

function StageCard({
  title,
  icon,
  active,
  completed,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  active: boolean;
  completed: boolean;
  children: React.ReactNode;
}) {
  return (
    <Card
      className={`transition-all duration-500 ${
        active
          ? "border-primary/60 shadow-[0_0_16px_rgba(34,197,94,0.15)]"
          : completed
            ? "border-green-500/40 bg-green-500/5"
            : "border-border/60 opacity-70"
      }`}
    >
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-md ${active ? "bg-primary/10" : completed ? "bg-green-500/10" : "bg-muted"}`}>
            {icon}
          </div>
          <span className="text-sm font-medium">{title}</span>
          {completed && <Badge variant="outline" className="text-[9px] border-green-500/50 text-green-600">Done</Badge>}
          {active && <Badge variant="outline" className="text-[9px] border-primary/50 text-primary animate-pulse">Active</Badge>}
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

export default function SecurityDocsPage() {
  const { markPage } = useDocsProgress();
  useEffect(() => { markPage("security"); }, [markPage]);

  const [stage, setStage] = useState<Stage>("idle");
  const [secret, setSecret] = useState("");
  const [showReal, setShowReal] = useState(false);
  const [encrypted, setEncrypted] = useState("");
  const [decrypted, setDecrypted] = useState("");

  const reset = useCallback(() => {
    setStage("idle");
    setSecret("");
    setEncrypted("");
    setDecrypted("");
    setShowReal(false);
  }, []);

  const runEncryption = useCallback(() => {
    const value = secret.trim() || DEMO_SECRET;
    setSecret(value);
    setStage("typing");
    setTimeout(() => setStage("encrypting"), 600);
    setTimeout(() => {
      setEncrypted(ENCRYPTED_PREVIEW);
      setStage("stored");
    }, 1800);
  }, [secret]);

  const runDecryption = useCallback(() => {
    setStage("decrypting");
    setTimeout(() => {
      setDecrypted(secret || DEMO_SECRET);
      setStage("revealed");
    }, 1200);
  }, [secret]);

  const isIdle = stage === "idle";
  const isTyping = stage === "typing";
  const isEncrypting = stage === "encrypting";
  const isStored = stage === "stored" || stage === "decrypting" || stage === "revealed";
  const isRevealed = stage === "revealed";

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div>
        <Link href="/docs" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mb-3">
          <ChevronLeft className="h-3 w-3" />
          Back to docs
        </Link>
        <h1 className="text-2xl font-bold">How does devdock handle your secrets?</h1>
        <p className="text-muted-foreground mt-1">
          Connection secrets are encrypted with AES-256-GCM before they reach the database. The plaintext never leaves the server unprotected.
        </p>
      </div>

      {/* Interactive animation */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium">Try it</h2>
          <Button variant="ghost" size="sm" onClick={reset} className="h-7 text-xs gap-1">
            <RefreshCcw className="h-3 w-3" />
            Reset
          </Button>
        </div>

        {/* Input stage */}
        <StageCard
          title="1. You enter a secret"
          icon={<Key className="h-4 w-4 text-blue-500" />}
          active={isTyping || isIdle}
          completed={!isIdle && !isTyping}
        >
          <div className="space-y-2">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  type={showReal ? "text" : "password"}
                  placeholder="Type a secret or click Encrypt"
                  value={secret}
                  onChange={(e) => setSecret(e.target.value)}
                  className="h-9 text-xs pr-9 font-mono"
                  disabled={!isIdle}
                />
                <button
                  type="button"
                  onClick={() => setShowReal(!showReal)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  disabled={!isIdle}
                >
                  {showReal ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
              <Button onClick={runEncryption} disabled={!isIdle} size="sm" className="h-9 text-xs">
                {secret.trim() ? "Encrypt" : "Use demo secret"}
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground">
              This could be a GitHub PAT, SMTP password, database credential, or webhook HMAC secret.
            </p>
          </div>
        </StageCard>

        <AnimatedArrow active={isEncrypting || isStored || isRevealed} />

        {/* Encryption stage */}
        <StageCard
          title="2. devdock encrypts it"
          icon={<Lock className="h-4 w-4 text-emerald-500" />}
          active={isEncrypting}
          completed={isStored || isRevealed}
        >
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs">
              <Shield className="h-3.5 w-3.5 text-emerald-500" />
              <span>AES-256-GCM with a random IV and authentication tag</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Key className="h-3.5 w-3.5" />
              <span>Master key from <code className="bg-muted px-1 rounded">DEVDOCK_MASTER_KEY</code></span>
            </div>
            <div className="h-8 rounded bg-muted/50 flex items-center px-2 overflow-hidden">
              <span className={`text-[10px] font-mono truncate ${isEncrypting ? "animate-pulse text-primary" : "text-muted-foreground"}`}>
                {isEncrypting ? "scrambling plaintext..." : encrypted ? encrypted : "waiting for input"}
              </span>
            </div>
          </div>
        </StageCard>

        <AnimatedArrow active={isStored || isRevealed} />

        {/* Storage stage */}
        <StageCard
          title="3. Only ciphertext is stored"
          icon={<Database className="h-4 w-4 text-purple-500" />}
          active={isStored && !isRevealed}
          completed={isRevealed}
        >
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              The database stores the encrypted string prefixed with <code className="bg-muted px-1 rounded">enc:v1:</code>. At rest, an attacker with only DB access sees noise.
            </p>
            <div className="rounded border border-dashed border-border/60 p-2 bg-muted/20">
              <div className="text-[10px] text-muted-foreground mb-1">Connection.config</div>
              <code className="text-[10px] font-mono break-all text-foreground">
                {encrypted || "enc:v1:..."}
              </code>
            </div>
            {isStored && !isRevealed && (
              <Button onClick={runDecryption} size="sm" variant="outline" className="h-8 text-xs gap-1">
                <Unlock className="h-3 w-3" />
                Show decryption
              </Button>
            )}
          </div>
        </StageCard>

        {isRevealed && (
          <>
            <AnimatedArrow active={isRevealed} />
            <StageCard
              title="4. Decrypted only when needed"
              icon={<Unlock className="h-4 w-4 text-green-500" />}
              active={isRevealed}
              completed={isRevealed}
            >
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  When a workflow runs, devdock decrypts the config in memory, uses the secret for that request, and keeps no plaintext cache.
                </p>
                <div className="rounded border border-green-500/30 bg-green-500/5 p-2">
                  <div className="text-[10px] text-muted-foreground mb-1">Decrypted value</div>
                  <code className="text-xs font-mono text-green-700 dark:text-green-400">{decrypted}</code>
                </div>
              </div>
            </StageCard>
          </>
        )}
      </div>

      {/* Details */}
      <div className="rounded-lg border border-border/60 p-4 space-y-3">
        <h3 className="text-sm font-medium">What this means in practice</h3>
        <ul className="space-y-2 text-xs text-muted-foreground">
          <li className="flex items-start gap-2">
            <Lock className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
            <span>Every connection config is encrypted as a single AES-256-GCM ciphertext before the DB <code className="bg-muted px-1 rounded">INSERT</code>.</span>
          </li>
          <li className="flex items-start gap-2">
            <Key className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
            <span>The master key is loaded from <code className="bg-muted px-1 rounded">DEVDOCK_MASTER_KEY</code> at runtime and never persisted.</span>
          </li>
          <li className="flex items-start gap-2">
            <Database className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
            <span>Backups, logs, and replicas only contain ciphertext. A leaked DB dump is not enough to read your secrets.</span>
          </li>
          <li className="flex items-start gap-2">
            <Shield className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
            <span>GCM adds an authentication tag: tampered ciphertext is rejected on decryption.</span>
          </li>
        </ul>
      </div>

      {/* Setup note */}
      <div className="rounded-lg border border-dashed border-border/60 p-4 space-y-2">
        <p className="text-xs font-medium">Self-hosted setup</p>
        <p className="text-xs text-muted-foreground">
          Set <code className="bg-muted px-1 rounded">DEVDOCK_MASTER_KEY</code> to a base64-encoded 32-byte key or a strong passphrase. If you rotate the key, re-save your connections so they are encrypted with the new key.
        </p>
      </div>

      {/* Navigation */}
      <div className="flex gap-4">
        <Link href="/docs/connections" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
          <ArrowRight className="h-3 w-3 rotate-180" />
          Previous: Connections & Triggers
        </Link>
        <Link href="/docs/nodes" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
          Next: Node Types
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}
