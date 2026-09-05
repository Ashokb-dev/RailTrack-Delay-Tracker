# AGENTS.md

## Project

RailTrack AI is an Indian Railway live train tracking
and future-station delay prediction application.

## Objective

Provide:
- live train information
- station-by-station journey information
- future station delay predictions
- ETA information
- delay visualization

## Architecture

Frontend:
- React
- Vite
- Tailwind

Backend:
- Node.js
- Express

ML:
- Python
- XGBoost

External API:
- RailRadar

## Engineering Rules

1. Preserve the existing architecture unless explicitly instructed otherwise.
2. Prefer minimal changes over rewrites.
3. Do not fabricate data.
4. Do not fabricate model accuracy.
5. Do not replace ML functionality with mock/rule-based behavior unless explicitly requested.
6. Do not remove working functionality while fixing another feature.
7. Never modify secrets or commit .env files.
8. Do not install unnecessary dependencies.
9. Prefer existing dependencies.
10. Run relevant tests after every meaningful change.

## Autonomous Execution Rules

Before modifying code:
- inspect the existing implementation
- understand dependencies
- identify the root cause

After modifying code:
- run tests
- run type checking/linting where applicable
- run the build where applicable
- verify the behavior

Never mark a task complete merely because code was written.

A task is complete only when its acceptance criteria
have been verified.

## Git Rules

Before a significant task:
- ensure the working tree is clean
- create a checkpoint commit

After successfully completing a task:
- run verification
- create a descriptive commit

Never rewrite published history.

## Blocking Conditions

Stop instead of guessing when:
- required credentials are unavailable
- required external services are unavailable
- required model/data artifacts are missing
- requirements are ambiguous
- a destructive operation is required
- tests cannot establish whether the change works