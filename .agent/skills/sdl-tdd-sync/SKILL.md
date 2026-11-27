---
name: sdl-tdd-sync
description: >-
  Automatically synchronizes newly added requirements in docs/6_STATUS_UPDATE.xlsx
  (Requirements tab) or defects in docs/6_STATUS_UPDATE.xlsx (Defects tab) into
  docs/9_TECHNICAL_DESIGN_DOC.md using the SDL_SB subagent with verified,
  codebase-grounded 4-layer technical plans and unit testing steps. Activate
  whenever a new Requirement (US-*) or Defect (DEF-*) is added.
---

# SDL-to-TDD Automatic Sync Runbook

Use this skill immediately whenever a new Requirement is added to `docs/6_STATUS_UPDATE.xlsx` (`Requirements` tab) or a new Defect is added to `docs/6_STATUS_UPDATE.xlsx` (`Defects` tab).

## Steps

1. **Launch a Fresh `SDL_SB` Subagent Per Sync Task (No Long-Lived Reuse):**
   - Invoke `SDL_SB` directly via `invoke_subagent(TypeName="SDL_SB", ...)` (natively defined in `.agent/agents/SDL_SB/agent.md`). If `SDL_SB` is not yet registered in the current conversation's runtime tool list, read `.agent/agents/SDL_SB/agent.md`, register it with `define_subagent(Name="SDL_SB", EnableWriteTools=True, ...)`, and launch it with `invoke_subagent`.
   - **Always spawn a brand-new `SDL_SB` instance** for each new Requirement/Defect sync batch — **never reuse** a previously completed `SDL_SB` subagent across unrelated tasks. Only use `send_message` to an active `SDL_SB` `conversationId` if it asks a clarifying question or needs a targeted fix for the **same** in-flight sync task.

2. **Pass the New Requirement/Defect Details:**
   - Provide the exact new Requirement ID(s) (`US-*`) or Defect ID(s) (`DEF-*`) and their row details from `docs/6_STATUS_UPDATE.xlsx` (`Requirements` or `Defects` tab).
   - `SDL_SB`'s native definition (`.agent/agents/SDL_SB/agent.md`) already enforces codebase inspection, ID-based lookup on `docs/9_TECHNICAL_DESIGN_DOC.md` (never reading it in full), the 5-column 4-layer TDD matrix, explicit target file paths, and concrete unit testing commands.

3. **Independently Verify & Log Before Reporting:**
   - Run a Python check against `docs/9_TECHNICAL_DESIGN_DOC.md` verifying:
     - Every table row has exactly `6` `|` delimiters (`0` malformed rows).
     - All `US-*` IDs match `docs/6_STATUS_UPDATE.xlsx` (`Requirements` tab) 1:1.
     - All cited existing repository file paths exist on disk (`0` missing files).
   - Append a brief dated entry to `docs/7_MEMORY_LOG.md` via `write_file(Append=True)` (never read the full memory log).

4. **Retire the Completed `SDL_SB` Subagent:**
   - Once Step 3 verification passes, terminate the finished `SDL_SB` instance immediately via `manage_subagents(Action="kill", ConversationIds=[<sdl_conversation_id>])` so idle subagents do not linger or get accidentally reused in later turns.
