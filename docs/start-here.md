# Tapp Start Here

This document turns the product and architecture documents into an execution order. It answers two questions:

- where do we begin
- what should be built next

Use this as the working implementation checklist until a more detailed project board exists.

## Where To Begin

Begin with architecture-enabling work, not feature polish.

The first implementation goal is to make the repo capable of supporting the chosen architecture before building major product flows on top of the current Ignite baseline. That means the initial work should focus on:

1. bootstrap and dependency wiring
2. local database foundation
3. server-state foundation
4. module scaffolding and boundary enforcement
5. one thin vertical slice of the real product

Do not start with charts, AI features, family dashboards, or polished reporting screens. Those depend on foundations that are not in place yet.

## First Working Slice

The first slice to build should be:

1. local category and routine setup
2. single-tap local expense event creation
3. daily review list for local events

Why this slice first:

- it proves the core product loop from the PRD
- it exercises local storage, use cases, presentation, and tests
- it avoids premature backend and sync complexity while still aligning with the long-term architecture

## Task List

## Phase 0: Repo Foundation

### 0.1 Align the repo with the architecture

- create `src/bootstrap`
- create `src/modules`
- create `src/shared`
- define public entry-point conventions for modules
- keep `src/app` limited to Expo Router bindings

Done when:

- the target folders exist
- new code has a clear home that matches the architecture doc

### 0.2 Add architecture enforcement

- add or tighten dependency-cruiser rules
- block `presentation` from importing infrastructure implementations directly
- block cross-feature deep imports
- block shared code from depending on feature modules

Done when:

- `pnpm run depcruise` fails on boundary violations

### 0.3 Add a contributor entry path

- link this doc from the README
- link this doc from the architecture doc
- keep ADR index visible from README and architecture docs

Done when:

- a new contributor can find product, architecture, ADRs, and task order from the README

## Phase 1: Application Bootstrap

### 1.1 Implement bootstrap composition

- create `src/bootstrap/app-bootstrap.ts`
- create `src/bootstrap/container.ts`
- create `src/bootstrap/query-client.ts`
- move startup orchestration out of `src/app/_layout.tsx`

Done when:

- the root layout stays thin
- startup order follows ADR-004

### 1.2 Define core shared interfaces

- define storage and database bootstrap contracts
- define API client creation boundary
- define sync engine placeholder contract
- define notification and telemetry placeholders where needed

Done when:

- application layer code can receive dependencies without importing SDKs directly

### 1.3 Add bootstrap tests

- add focused tests for bootstrap readiness logic
- add test helpers for injecting fake dependencies or providers

Done when:

- container wiring can be exercised without booting the full app

## Phase 2: Local Data Foundation

### 2.1 Add SQLite and Drizzle

- install and configure `expo-sqlite` and `drizzle-orm`
- create the shared database bootstrap module
- define the first migration flow

Done when:

- the app can initialize the database and run migrations successfully

### 2.2 Create the initial schema

- add tables for categories
- add tables for routines
- add tables for expense events
- add tables for outbox and sync checkpoints, even if the first slice uses them minimally

Done when:

- the schema supports the first local product slice

### 2.3 Add repository integration tests

- test migrations
- test repository CRUD for the initial entities
- test failure behavior for bad migrations or invalid reads

Done when:

- repository tests run against a test database and cover the initial schema paths

## Phase 3: Server-State Foundation

### 3.1 Add TanStack Query

- install `@tanstack/react-query`
- create the shared query client
- add app-level provider wiring through bootstrap

Done when:

- screens and hooks can consume QueryClient-backed hooks through app providers

### 3.2 Define query conventions

- create per-feature query key factories
- define infrastructure query functions location
- add test helpers for QueryClient-backed hooks

Done when:

- server-state code has one clear pattern before backend-heavy features arrive

## Phase 4: Module Scaffolding

### 4.1 Create the first real module

Start with a `budgeting` or `expenses` module that owns the tap-and-review loop.

- add `domain`
- add `application`
- add `infrastructure`
- add `presentation`
- add `index.ts`

Done when:

- one real feature exists under `src/modules` and route files import it through an entry point

### 4.2 Customize generators

- adapt `ignite/templates` so generated code matches the module architecture
- generate generic shared components through Ignite templates only
- consider adding templates for feature modules, screens, and use cases

Done when:

- new generated files no longer assume the legacy flat Ignite structure

## Phase 5: First Product Slice

### 5.1 Category and routine setup

- implement category creation
- implement routine creation and editing
- persist both locally
- add unit and integration tests beside the feature code

### 5.2 Single-tap local expense logging

- implement the tap use case
- write expense events locally first
- surface predicted category from routine rules
- keep latency low and UI feedback immediate
- add tests for prediction and persistence behavior

### 5.3 Daily review

- implement the daily event list
- support category correction
- support amount entry and editing
- support delete behavior
- add tests for the review flow

Done when:

- the user can configure routines, tap to log locally, and review the day without backend dependency

## Phase 6: Sync and Multi-Device Foundations

Only start this after the local slice is stable.

- implement outbox writing from use cases
- define sync transport interfaces
- add checkpoint handling
- build a first sync runner for foreground and reconnect scenarios
- add telemetry around pending sync work and failure reasons

Done when:

- local writes can be safely represented as future sync work even before the full backend feature set is complete

## Testing Expectations By Phase

- every phase should land with tests in the same pull request
- unit tests cover value objects, validators, and use cases
- integration tests cover repositories, hooks, and screen-to-use-case flows
- Maestro coverage begins once the first user-visible slice is stable enough to automate

## Suggested Immediate Next Tasks

If starting today, do these next:

1. scaffold `src/bootstrap`, `src/modules`, and `src/shared`
2. implement `app-bootstrap.ts` and `container.ts`
3. add SQLite plus Drizzle and the first migration
4. add TanStack Query provider wiring
5. create the first `expenses` or `budgeting` module skeleton
6. build local category and routine setup
7. build single-tap local event creation
8. build daily review for local events

## What Not To Start With

- AI features
- analytics dashboards
- cloud-only flows
- advanced reports
- deep visual polish before the core tap loop works
- broad refactors that do not move the repo toward the target architecture

## Related Docs

- [README](../README.md)
- [Architecture](./architecture.md)
- [ADR Index](./adr/README.md)
- [PRD](./prd-docs/%23%20Tapp%20%E2%80%94%20Single-Button%20Family%20Budgeting%20PRD.md)