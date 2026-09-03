# Cleft Portfolio Guide

This document gives reviewers a fast path through the project without changing the operational README.

## What to review

- `frontend/` is the production Next.js application.
- `backend/` is the production NestJS API with Prisma and PostgreSQL.
- `edit_front_end/` is an archived standalone design prototype. It is retained to show the UI iteration process; it contains mock data and is not part of the production runtime.
- `output/pdf/SUMMARY.pdf` contains the detailed architecture, data flow, API, database model, deployment notes, and known limitations.

## Portfolio highlights

- Same-origin API proxy with Google OAuth and rotating JWT refresh tokens in HTTP-only cookies.
- Per-item ALL/PARTIAL bill splitting with deterministic cent allocation.
- PostgreSQL schema managed through committed Prisma migrations.
- Docker Compose startup ordering and health checks for the complete stack.
- Unit tests for bill rules, component tests for shared UI, browser tests for guest/demo journeys, and an API smoke test covering persistence.
- GitHub Actions validates all three code areas on every push and pull request.

## No-login product preview

Run the frontend and open `/demo`. The route uses deterministic sample data and does not read or write a user account, local draft, or database.

## Verification matrix

| Area | Automated checks |
|---|---|
| Backend | ESLint, TypeScript, Vitest unit tests, Nest build, Prisma migration, API integration smoke test |
| Frontend | Next.js ESLint, TypeScript, Vitest unit/component tests, production build, Playwright E2E |
| Design prototype | Production Vite build with vendor code splitting |
| Dependencies | Lockfiles committed for reproducible `npm ci` installs |

## Suggested interview walkthrough

1. Open `/demo` to explain the bill and participant model.
2. Compare the deterministic cent allocation in Frontend and Backend.
3. Show the Prisma transaction that creates a party, its items, participants, consumptions, and history atomically.
4. Show the CI workflow and explain the difference between unit, component, E2E, and integration coverage.
5. Use `output/pdf/SUMMARY.pdf` to discuss current limitations and the next production-hardening steps.
