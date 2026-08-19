# UIAP — Universal Intelligent Application Platform

See `PROJECT_IDENTITY.md` for the official name and scope.

This is the shared development workspace for **UIAP — Universal Intelligent Application Platform**. The College Biometric Attendance bundle is the first complete demonstration bundle, not the platform's definition. Open this folder in both Antigravity IDE and Codex.

## Working areas

| Path              | Purpose                                                                    |
| ----------------- | -------------------------------------------------------------------------- |
| `apps/`           | Deployable applications: UIAP Edge API and React Web/PWA.                  |
| `packages/`       | Reusable UIAP Core and Module SDK packages.                                |
| `modules/`        | Future installable UIAP modules; each module owns its code and migrations. |
| `firmware/`       | ESP32/R307 firmware, added only during the final hardware stage.           |
| `infrastructure/` | Local PostgreSQL and deployment configuration.                             |
| `docs/`           | Architecture, API, and setup documentation.                                |
| `coordination/`   | Human-readable collaboration files. Not application code.                  |
| `scripts/`        | Safe local development, verification, and packaging scripts.               |
| `tests/`          | Cross-component integration and end-to-end tests.                          |

## Before implementation

1. Antigravity records its completed work, current problem, and evidence in `coordination/ANTIGRAVITY_STATUS.md`.
2. Codex reviews the source and status, then writes the next bounded instruction in `coordination/CODEX_INSTRUCTIONS.md`.
3. The active task is claimed and tracked in `coordination/TASK_BOARD.md`.
4. No task is marked done until its required checks are run and their results are recorded.

See `coordination/PROTOCOL.md` for the full workflow.
