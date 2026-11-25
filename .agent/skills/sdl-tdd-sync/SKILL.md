---
name: sdl-tdd-sync
description: >-
  Automatically synchronizes newly added requirements in docs/2_PRD.md or defects
  in docs/11_DEFECTS.md into docs/9_TECHNICAL_DESIGN_DOC.md using the SDL_SB
  subagent with verified, codebase-grounded 4-layer technical plans and unit
  testing steps. Activate whenever a new Requirement (US-*) or Defect (DEF-*) is added.
---

# SDL-to-TDD Automatic Sync Runbook

Use this skill immediately whenever a new Requirement is added to `docs/2_PRD.md` or a new Defect is added to `docs/11_DEFECTS.md`.

## Steps

1. **Ensure `SDL_SB` Subagent Exists:**
   - Call `manage_subagents(Action="list")` to check if an `SDL_SB` subagent is already active in this conversation.
   - If active, reuse its `conversationId` via `send_message`.
   - If not yet defined in a fresh conversation, read the `SDL_SB Prompt` block in `docs/10_Agent_Prompts`, define `SDL_SB` with `define_subagent(EnableWriteTools=True)`, and launch it with `invoke_subagent`.

2. **Dispatch Focused Technical Design Task to `SDL_SB`:**
   - Provide the exact new Requirement ID(s) (`US-*`) or Defect ID(s) (`DEF-*`) and their line numbers in `docs/2_PRD.md` / `docs/11_DEFECTS.md`.
   - Instruct `SDL_SB` to:
     1. Inspect the relevant actual project files first (`core/models.py`, `core/business_objects/`, `core/schemas/`, `core/api/v1/`, `core/auth/scoping.py`, `frontend/app/`, `frontend/components/widgets/`, `frontend/app/lib/api.ts`, `tests/`) — **never assume or invent file paths, classes, or methods** (explicitly label any brand-new files/classes to be created).
     2. Insert new `US-*` rows in the matching process position (or append new `DEF-*` rows at the bottom of Section 2) in `docs/9_TECHNICAL_DESIGN_DOC.md` using the exact 5-column matrix:
        `Requirement Id | Requirement Description | Technical Implementation Plan | Unit Testing Steps | Status`
     3. Structure `Technical Implementation Plan` into clear, new-developer-friendly 4-layer steps (1. Data/Migration/RLS, 2. Business Object & Rule Gates, 3. Schemas & Scoped API Routes, 4. Frontend Client, Portable Widget & Portal Route) and provide concrete `pytest` / `tsc` / ESLint / `npm run build` / Playwright commands in `Unit Testing Steps`.
     4. **Explicit Target File Paths:** Explicitly name the exact workspace-relative file path(s) (and target class/function/line area where applicable) where the developer must make each change across every layer (marking brand-new files clearly as `[New File]`).
     5. Update Section 1's User Story / Defect summary count if changed.
     6. Modify **only** `docs/9_TECHNICAL_DESIGN_DOC.md` (no application code changes).

3. **Independently Verify Before Reporting:**
   - Run a Python check against `docs/9_TECHNICAL_DESIGN_DOC.md` verifying:
     - Every table row has exactly `6` `|` delimiters (`0` malformed rows).
     - All `US-*` IDs match `docs/2_PRD.md` 1:1.
     - All cited existing repository file paths exist on disk (`0` missing files).
   - Append a brief dated entry to `docs/7_MEMORY_LOG.md`.
