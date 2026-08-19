# UIAP Collaboration Protocol

## Source of truth

`apps/`, `packages/`, `modules/`, `firmware/`, `infrastructure/`, `scripts/`, `tests/`, and `docs/` are the project source of truth. The coordination files communicate intent and verification; they never replace code review or tests.

## File ownership

| File                    | Primary writer                    | Other party may do                               |
| ----------------------- | --------------------------------- | ------------------------------------------------ |
| `ANTIGRAVITY_STATUS.md` | Antigravity                       | Read; add a dated review note only.              |
| `CODEX_INSTRUCTIONS.md` | Codex                             | Read; acknowledge completion in the status file. |
| `TASK_BOARD.md`         | Either, one task update at a time | Update task state using the format below.        |
| `DECISIONS.md`          | Either                            | Add only agreed, durable architecture decisions. |

Do not erase the other person's notes. Add a new dated entry or update only the task row you own.

## Task protocol

Use task IDs in the form `UIAP-001`, `UIAP-002`, and so on. Each task must include:

- objective and acceptance criteria;
- allowed paths (avoid unrelated edits);
- dependencies and risks;
- required commands/checks; and
- a status: `BACKLOG`, `READY`, `IN_PROGRESS`, `BLOCKED`, `REVIEW`, or `DONE`.

Only one task is `IN_PROGRESS` per implementer. A task becomes `REVIEW` only after all required checks pass. It becomes `DONE` after source review confirms the acceptance criteria.

## Handoff cycle

1. Codex inspects the current tree, status, task board, and recent changes.
2. Codex places one clear next task in `CODEX_INSTRUCTIONS.md` and marks it `READY`.
3. Antigravity marks it `IN_PROGRESS`, implements only within the allowed paths, and does not silently change requirements.
4. Antigravity runs the listed checks, records exact results in `ANTIGRAVITY_STATUS.md`, and marks the task `REVIEW` (or `BLOCKED`).
5. Codex reviews the diff and evidence. Codex either records a follow-up task or marks it `DONE`.

## User shortcut

When the user tells Codex **"anti scan"**, it means Antigravity has finished its current work. Codex must then read `ANTIGRAVITY_STATUS.md`, inspect the real source changes and Git diff, run or verify the required checks where possible, and write the review or next instruction. The status file alone is not sufficient evidence.

## Build, test, and error checks

Before implementation starts, define the canonical commands in `docs/DEVELOPMENT.md`. Each implementation task must run the applicable checks:

1. formatter/linter;
2. type or compile check;
3. unit tests;
4. migration validation when database files change; and
5. relevant integration tests when APIs, events, or devices change.

Record the command, result, and any failure in the status file. Never report a check as passed if it was not run.

## Blockers and conflicts

Mark a task `BLOCKED` immediately when requirements conflict, an expected file is missing, a build fails unexpectedly, or an edit would cross module ownership. Include: what happened, exact error, affected paths, attempted remedy, and the smallest decision needed.

## Git-safe rules

- Work on a named branch; do not develop directly on `main`.
- Inspect `git status` and `git diff` before and after each task.
- Make small, single-purpose commits using `UIAP-###: concise summary`.
- Do not commit secrets, `.env` files, local databases, device templates, build output, or credentials.
- Do not use reset, force-push, history rewriting, or broad file deletion without explicit approval.
- Resolve merge conflicts in source files first; then update the coordination files with the outcome.

## UIAP architectural guardrails

- Core owns users, roles, permissions, module lifecycle, events, device registry, audit logging, and local platform services.
- Each module owns its own tables and migrations.
- Modules communicate through Core events; they do not write directly to other modules' tables.
- For the fingerprint demo, identity mapping is `device ID + sensor slot ID -> student`; a sensor slot alone is never an identity.
- UIAP Edge remains local-first. Student and attendance data stay in the organization-local PostgreSQL database.
