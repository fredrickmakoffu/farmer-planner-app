# Tapp Start Here

This document turns the product and architecture documents into an execution order. It answers two questions:

- where do we begin
- what should be built next

Use this as the working implementation checklist until a more detailed project board exists.

For code quality and implementation guardrails while executing this plan, see `AGENTS.md` and `docs/CODE_QUALITY.md`.

## Where To Begin

Begin with architecture-enabling work, not feature polish.

The first implementation goal is to make the repo capable of supporting the chosen architecture before building major product flows on top of the current Ignite baseline. That means the initial work should focus on:

1. bootstrap and dependency wiring
2. local database foundation
3. server-state foundation
4. module scaffolding and boundary enforcement
5. one thin vertical slice of the real product

Do not start with charts, AI features, family dashboards, or polished reporting screens. Those depend on foundations that are not in place yet.

## Recent implementation summary (what we changed)

The following is a short, factual list of changes that were implemented while advancing the start-here checklist. Where practical, files are referenced so you can review or iterate quickly.

- Bootstrap & composition
  - Added `src/bootstrap/app-bootstrap.ts` — central init and `container` registration.
  - Added `src/bootstrap/container.ts` — a tiny DI container (register/resolve).
  - Added `src/bootstrap/query-client.ts` and exposed a shared QueryClient.
  - Added `src/bootstrap/AppProviders.tsx` and simplified `src/app/_layout.tsx` to use it; provider wiring (QueryClient, Theme, SafeArea, Keyboard) now lives in `AppProviders`. Added development startup logs to help diagnose bootstrap failures.
  - Added `src/bootstrap/register-infrastructure.ts` to centralize creation/registration of infrastructure implementations (sqlite repos).
  - Added a lightweight migration runner `src/bootstrap/migration-runner.ts` and invoked it from `app-bootstrap` so generated SQL under `drizzle/migrations` can be applied in dev/node environments.

- Local DB & migrations
  - Added `src/shared/infrastructure/database/index.ts` with `getDatabase()` and `initDatabase()` (idempotent CREATE TABLE statements).
  - Scaffolding for Drizzle exists under `drizzle/` (schema + initial SQL migration); `drizzle-kit` and `drizzle-orm` were added as dev dependencies for migration generation.
  - The app bootstrap now attempts to apply SQL migrations in dev (falls back gracefully on native runtimes).
  - Added a development-only in-memory DB fallback when the native `expo-sqlite` transaction API is not available (`initDatabase()` falls back in `__DEV__`). This allows UI work to continue without rebuilding a dev-client. (File: `src/shared/infrastructure/database/index.ts`)

- Shared contracts
  - Added minimal shared contracts for boundaries: `src/shared/contracts/database.ts`, `api.ts`, `sync.ts`, and `telemetry.ts` so application code can depend on interfaces rather than SDKs.

- Expenses module (first feature slice)
  - Scaffolded `src/modules/expenses` with layered structure:
    - `domain/entities`: `category.ts`, `routine.ts`, `expense-event.ts`
    - `domain/repositories`: repository interfaces for categories, routines, and expense events
    - `application`: use-cases (`create-category`, `create-expense`, `delete-expense`, `predict-category`)
    - `infrastructure/sqlite`: `SqliteCategoryRepository`, `SqliteRoutineRepository`, `SqliteExpenseEventRepository` using the container-registered DB
    - `presentation`: minimal screens `CategoriesScreen`, `TapToLogScreen`, `DailyReviewScreen` updated to resolve repos from the container instead of constructing them directly
  - Added route wrappers under `src/app/expenses/*` so the module is visitable via Expo Router (`/expenses`, `/expenses/categories`, `/expenses/tap`, `/expenses/review`).
  - Implemented a small V1 prediction engine and integrated it into the tap flow (time-of-day buckets + historical fallback). See `src/modules/expenses/application/predict-category.ts` and `TapToLogScreen` usage.
  - Implemented application-level enqueueing of outbox entries in `create-expense` and a minimal `SqliteSyncEngine` that persists outbox rows and supports a best-effort `flush()` (dev-friendly). See `src/shared/infrastructure/sqlite-sync-engine.ts`.
  - Implemented a `deleteExpense` application use-case and added a Delete action in `DailyReviewScreen` that enqueues a deletion to the outbox.

- Server-state and query patterns
  - Installed `@tanstack/react-query` and added a shared query client.
  - Added a small `src/shared/query-keys.ts` with basic key factories for the expenses feature.

- Tests and CI hygiene
  - Added `test/bootstrap.container.test.ts` to validate the container wiring.
  - Added `test/expenses.repository.integration.test.ts` which runs against `expo-sqlite`; it is skipped by default and can be run with `RUN_NATIVE_INTEGRATION_TESTS=1 pnpm test` on a device/emulator.

- Misc
  - Added a placeholder `ignite/templates/module/README.md` for future generator template work.
  - Updated `docs/migrations.md` (local notes) and `docs/start-here.md` progress annotations.
  - Committed and pushed the above changes to the `main` branch.

## Task List (current status)

The checklist below mirrors the high-level phases from the original document with up-to-date status and short notes where further work remains.

### Phase 0: Repo Foundation

- [x] create `src/bootstrap`
- [x] create `src/modules` (scaffolded `expenses` module)
- [x] create `src/shared`
- [x] define public entry-point conventions for modules (module `index.ts` entrypoints added)
- [x] keep `src/app` limited to Expo Router bindings (`_layout.tsx` now thin)

### Phase 1: Application Bootstrap

- [x] create `src/bootstrap/app-bootstrap.ts`
- [x] create `src/bootstrap/container.ts` (singleton `container` exported)
- [x] create `src/bootstrap/query-client.ts` and wired it to providers
- [x] move startup orchestration out of `src/app/_layout.tsx` (moved to `AppProviders`)
- [x] provider wiring consolidated in `src/bootstrap/AppProviders.tsx` (added development startup logs)
- [x] added a migration runner invoked during bootstrap in dev
- [x] added `src/bootstrap/register-infrastructure.ts` and registered infra implementations after DB init

### 1.2 Define core shared interfaces

- [x] define storage and database bootstrap contracts (`src/shared/contracts/database.ts`)
- [x] define API client creation boundary (`src/shared/contracts/api.ts`)
- [x] define sync engine placeholder contract (`src/shared/contracts/sync.ts`)
- [x] define notification and telemetry placeholders (`src/shared/contracts/telemetry.ts`)

### 1.3 Add bootstrap tests

- [x] add focused tests for bootstrap readiness logic (`test/bootstrap.container.test.ts`)
- [x] add test helpers for injecting fake dependencies or providers (container makes this easy)

### Phase 2: Local Data Foundation

- [x] install and configure `expo-sqlite` and add `initDatabase()`
- [x] Drizzle packages added (CLI + ORM) and initial `drizzle` scaffolding created
- [x] created idempotent `initDatabase()` that creates the initial schema (categories, routines, expense_events, outbox, sync_checkpoints)
- [x] added a dev-friendly migration runner to apply `drizzle/migrations/*.sql` in Node/dev environments
- [x] added a development-only in-memory DB fallback when native sqlite binding is missing (dev convenience only)
- [ ] Drizzle runtime integration for device DB (apply migrations from inside the native app deterministically) — deferred / planned

### Phase 3: Server-State Foundation

- [x] install `@tanstack/react-query`
- [x] create shared query client and wire provider via `AppProviders`
- [x] added basic query key factories (`src/shared/query-keys.ts`)
- [ ] finalize query conventions (per-feature keys & testing helpers) — more refinement to follow

### Phase 4: Module Scaffolding

- [x] added `src/modules/expenses` with `domain`, `application`, `infrastructure`, and `presentation` scaffolding
- [x] created route wrappers under `src/app/expenses` so module screens are directly navigable
- [x] added generator template placeholder under `ignite/templates/module`
- [ ] integrate generator templates into Ignite flow (future work)
- [x] refactored presentation to resolve repos from `container` instead of constructing infra directly (boundary enforcement in practice)
- [ ] add dependency-cruiser rules in CI to enforce boundaries (pending)

### Phase 5: First Product Slice

#### 5.1 Category and routine setup

- [x] implement category creation repository and minimal CRUD UI (`CategoriesScreen`)
- [x] routine repository implemented (editing UI and polish pending)
- [x] persisted locally via `expo-sqlite` (or in-memory fallback when native binding is missing)
- [x] unit and integration test scaffolds added (integration test skipped by default)

#### 5.2 Single-tap local expense logging

- [x] basic tap use-case implemented (`TapToLogScreen` creates expense events)
- [x] V1 prediction implemented and integrated into tap (time-of-day buckets + historical fallback) — further improvements planned (routine-driven prediction, learning)

#### 5.3 Daily review

- [x] minimal daily review list implemented (`DailyReviewScreen`)
- [x] delete flow implemented and enqueues outbox entries (edit flows, amount corrections, notes UX still needed)
- [ ] edit/UX polish for daily review and routines — pending

### Phase 6: Sync and Multi-Device Foundations

- [x] created `outbox` and `sync_checkpoints` tables in `initDatabase()`
- [x] added `SyncEngine` contract placeholder
- [x] implemented a minimal `SqliteSyncEngine` that persists outbox rows and supports a best-effort `flush()` (dev-friendly). Application writes enqueue to outbox via the `createExpense` and `deleteExpense` use-cases.
- [ ] design and implement a robust sync runner and outbox processing (retries, idempotence, HTTP sender, background flush) — future work

## Tests and how to run the native integration

The repository includes a repository integration test for the sqlite-backed category repository. It is skipped by default because it requires a runtime that provides `expo-sqlite` (device or emulator).

To run the native integration test on a device or emulator:

```bash
RUN_NATIVE_INTEGRATION_TESTS=1 pnpm test
```

Unit tests (Node/Jest) can be run normally with:

```bash
pnpm test
```

## What remains (short list)

- Decide whether to implement a robust on-device Drizzle runtime migration runner or keep idempotent `initDatabase()` and use `drizzle-kit` in development.
- Implement prediction rules that use `routines` (V1 prediction exists; integrate routine windows + user-configured routines and learn corrections).
- Add edit flows and UX polish for daily review (amount edits, notes), and add tests for these flows.
- Harden and add more repository and use-case tests; determine CI strategy for running integration tests on emulators or devices.
- Add dependency-cruiser rules and enable them in CI to enforce architecture boundaries.
- Implement a production-quality sync runner and outbox processing with retries, idempotence, and network sender.
- Remove the development-only in-memory DB fallback before release (or guard it behind a clear runtime flag).

---

If you want, I can now:

1. implement the on-device migration runner that applies `drizzle/migrations/*.sql` deterministically (takes a bit more care), or
2. keep the current idempotent `initDatabase()` approach and focus on expanding the expenses feature (prediction, edit flows, tests).

Tell me which of the two above you prefer and I’ll proceed. If you only wanted the doc updated, this is complete.
