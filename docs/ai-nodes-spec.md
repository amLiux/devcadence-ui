# AI Nodes Specification

## Overview

DevDock's AI nodes (Prompt, Classify, Extract) use a layered system prompt architecture that combines **Personas**, **Context**, and **Memory** from the database with node-specific instructions. This document defines how these layers compose, how they're fetched, and the prompt templates for each node type.

---

## System Prompt Architecture

Every AI call builds its system prompt from up to 4 layers, assembled in this order:

```
┌─────────────────────────────────────────┐
│  1. Persona (identity & tone)           │
│  2. Context (project/task knowledge)    │
│  3. Memory (persistent instructions)    │
│  4. Node instructions (task-specific)   │
└─────────────────────────────────────────┘
```

### Assembly Logic

```typescript
async function buildSystemPrompt(nodeMeta: Record<string, string>): Promise<string> {
  const parts: string[] = [];

  // 1. Persona
  if (nodeMeta.personaId) {
    const persona = await prisma.aIPersona.findUnique({ where: { id: nodeMeta.personaId } });
    if (persona) {
      parts.push(`# Identity\nYou are ${persona.name}.\n\n${persona.systemPrompt}`);
      if (persona.tone) parts.push(`Tone: ${persona.tone}`);
    }
  }

  // 2. Context
  if (nodeMeta.contextIds?.length) {
    const contexts = await prisma.aIContext.findMany({
      where: { id: { in: nodeMeta.contextIds } },
    });
    if (contexts.length) {
      const ctxBlock = contexts.map(c => `## ${c.name}\n${c.content}`).join("\n\n");
      parts.push(`# Context\n${ctxBlock}`);
    }
  }

  // 3. Memory
  if (nodeMeta.memoryIds?.length) {
    const memories = await prisma.aIMemory.findMany({
      where: { id: { in: nodeMeta.memoryIds } },
    });
    if (memories.length) {
      const memBlock = memories.map(m => `## ${m.name}\n${m.content}`).join("\n\n");
      parts.push(`# Memory\n${memBlock}`);
    }
  }

  // 4. Node-specific instructions (always present)
  parts.push(nodeInstructions);

  return parts.join("\n\n---\n\n");
}
```

---

## AI Models

### AIPersona

Defines **who** the AI is. Controls identity, expertise, and communication style.

| Field | Purpose | Example |
|-------|---------|---------|
| `name` | Display name + reference in prompt | "Senior Dev-Lead" |
| `systemPrompt` | Core identity definition | "You are a senior dev-lead with 15 years..." |
| `tone` | Communication style hint | "Concise, technical, no fluff" |
| `description` | Human-readable summary | "Used for code review and PR analysis" |

### AIContext

Defines **what** the AI knows about the current task/project. Injected knowledge.

| Field | Purpose | Example |
|-------|---------|---------|
| `name` | Label for the context block | "Project Architecture" |
| `content` | Knowledge to inject | "This is a Next.js 15 app using Prisma..." |
| `description` | When to use this context | "Include when working on backend tasks" |

### AIMemory

Defines **persistent rules** the AI must always follow. Instructions that apply across all tasks.

| Field | Purpose | Example |
|-------|---------|---------|
| `name` | Label for the memory block | "Coding Standards" |
| `content` | Rules and instructions | "Always use TypeScript strict mode..." |
| `description` | Scope of these rules | "Apply to all code generation tasks" |

### AIPrompt

Reusable prompt templates with `{{variable}}` placeholders.

| Field | Purpose | Example |
|-------|---------|---------|
| `name` | Template name | "PR Review" |
| `template` | Prompt with variables | "Review this PR: {{pr_description}}" |
| `description` | What this template does | "Analyzes PR for bugs and improvements" |

---

## Node Prompt Templates

### Prompt Node

The general-purpose AI node. Full control over system prompt and user message.

**Default system prompt** (when no persona/context/memory selected):

```
You are a helpful assistant. Be concise and accurate.
```

**With persona "Dev-Lead" + context "Project Rules":**

```
# Identity
You are Senior Dev-Lead.

You are a senior dev-lead with 15 years of experience in full-stack development.
You specialize in Next.js, TypeScript, and PostgreSQL.
You write concise, production-ready code.

Tone: Concise, technical, no fluff

---

# Context
## Project Architecture
This is a Next.js 15 app using Prisma ORM with PostgreSQL.
The app uses App Router, server components by default, and client components only when needed.

---

# Instructions
Answer the user's question based on the context above.
If the question is about code, provide working code examples.
If the question is about architecture, explain trade-offs.
```

**User message**: The prompt field, with `{{expressions}}` resolved.

---

### Classify Node

Classifies text into predefined categories. Shorter, more focused prompt.

**System prompt template:**

```
# Identity
{persona block if selected}

---

# Context
{context block if selected}

---

# Instructions
Classify the following text into exactly one of these categories: {categories}

Rules:
- Respond with ONLY the category name, nothing else.
- Do not add explanations, punctuation, or formatting.
- If the text could fit multiple categories, pick the most specific one.
- If no category fits, respond with "other".

Categories: {categories}
```

**User message**: The text to classify, with expressions resolved.

---

### Extract Node

Extracts structured data from text. Returns JSON.

**System prompt template:**

```
# Identity
{persona block if selected}

---

# Context
{context block if selected}

---

# Instructions
Extract the following fields from the text: {fields}

Rules:
- Respond with a valid JSON object.
- Each key must be one of the requested field names.
- If a field is not found in the text, use null.
- Do NOT include any markdown formatting, code blocks, or explanations.
- Just the raw JSON object.

Fields to extract: {fields}
```

**User message**: The text to extract from, with expressions resolved.

---

## Node Settings UI

Each AI node gets these selector fields in its settings panel:

### Metadata Fields

| Field | Type | Description |
|-------|------|-------------|
| `personaId` | Select (from DB) | Which persona to use |
| `contextIds` | Multi-select (from DB) | Which context blocks to include |
| `memoryIds` | Multi-select (from DB) | Which memory rules to apply |
| `promptTemplateId` | Select (from DB) | Reuse a saved prompt template |

### Fallback Behavior

When no records exist in the database:

1. **No personas** → Show link to `/ai` with message: "Create a Persona to define how the AI responds"
2. **No contexts** → Show info: "No context loaded. AI will use general knowledge."
3. **No memories** → Show info: "No memory rules set. AI follows default behavior."
4. **No prompt templates** → Hide the template selector, show manual prompt input

All selectors are **optional**. The AI works without any of them — they just make it better.

---

## Prompt Template Variables

Saved `AIPrompt` templates can use `{{expression}}` syntax:

```markdown
## PR Review Template

Review the following pull request:

**Title**: {{previousStep.title}}
**Description**: {{previousStep.body}}
**Files changed**: {{previousStep.files}}

Focus on:
1. Potential bugs
2. Performance issues
3. Security concerns
4. Code style consistency

Respond in markdown format.
```

When a user selects a template, its `template` content populates the prompt field. The user can then modify it or use it as-is.

---

## Example Configurations

### Dev-Lead Persona

**Name**: Senior Dev-Lead
**System Prompt**:
```
You are a senior dev-lead with 15+ years of experience. You've led teams of 5-20 engineers across multiple projects. You specialize in:

- Full-stack TypeScript (Next.js, Node.js)
- PostgreSQL and Prisma ORM
- CI/CD pipelines and DevOps
- Code review and architecture decisions

You communicate concisely. You prefer code over words. When reviewing code, you focus on:
1. Correctness and edge cases
2. Performance implications
3. Security vulnerabilities
4. Maintainability and readability

You don't sugarcoat feedback. If code is bad, say so. If it's good, say why.
```

**Tone**: Direct, technical, no filler

### Code Review Context

**Name**: Project Standards
**Content**:
```
This project uses:
- Next.js 15 with App Router
- TypeScript strict mode
- Prisma ORM with PostgreSQL
- Tailwind CSS for styling
- Zod for validation

Conventions:
- Server components by default, "use client" only when needed
- All database queries go through Prisma
- API routes use NextResponse
- Components are in src/components/
- Utilities are in src/lib/
```

### Coding Standards Memory

**Name**: Always Follow
**Content**:
```
Rules to always follow:
- Never use `any` type. Use `unknown` and narrow.
- Always handle errors with try/catch.
- Use early returns over nested ifs.
- Prefer `const` over `let`.
- Destructure when accessing 2+ properties.
- Use template literals over string concatenation.
- No console.log in production code.
- All functions must have explicit return types.
```

---

## Implementation Checklist

### Phase 1: Wire up selectors
- [ ] Add `personaId`, `contextIds`, `memoryIds` to all 3 AI node metadata
- [ ] Create fetch hooks for personas, contexts, memories
- [ ] Add Select/MultiSelect components in node settings
- [ ] Implement `buildSystemPrompt()` in ai.ts handler

### Phase 2: Prompt templates
- [ ] Add `promptTemplateId` selector to Prompt node
- [ ] On template select, populate prompt field with template content
- [ ] Allow template editing after selection

### Phase 3: UI polish
- [ ] Empty state messages with links to `/ai` page
- [ ] Preview system prompt before running (optional)
- [ ] Show which persona/context/memory are active in node header
