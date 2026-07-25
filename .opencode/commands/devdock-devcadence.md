---
description: DevCadence workflow with devdock SME for repo-aware collaboration
agent: build
---

skill({ name: "devcadence" })
skill({ name: "devdock-sme" })

Activate DevCadence protocol for devdock with repo-specific context.

## Usage

/devdock-devcadence <mode> [args]

Modes:
- standup — define today's tasks, create ticket
- pair — passive mode, answer questions, caveman Full
- review — check code against ticket, approve or request changes
- checkout — wrap up, update progress, estimate remaining

Utilities (outside chain, no log):
- config — view/edit project config (log dir, git control, etc.)
- extensions — list sibling commands that extend DevCadence
- new-extension — scaffold a new sibling command with domain SME

## Per-Project Config

# Project Config
# - Log dir: ~/docs/devdock/
# - Progress: ~/docs/devdock/progress.json
# - Ticket format: dd-01
# - Git control: manual
# - User role: dev-lead
# - Caveman level: full

## Rules

- Each mode reads from previous in chain: checkout → standup → pair → review → checkout
- Global logs (global: true) scanned on every mode start
- On review approval: auto-update progress.json + advance ticket + append to humanLog
- Pair and review use caveman Full mode (terse, ~55% token reduction)
- Standup and checkout use normal tone
- Utility modes (config/extensions/new-extension) are standalone — no log, no chain validation