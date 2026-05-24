# AGENTS.md — Tapp Engineering Agent Instructions

> This file guides GitHub Copilot and any AI agent working in this codebase.
> Read this before making changes. Use it together with the product, architecture, and ADR documents.

---

## Project Identity

**Tapp** is a React Native family budgeting app built on Ignite Red, Expo Router, and Expo SDK 55. The product is designed around a single low-friction expense logging loop: tap once when money is spent, then review and correct later.

The app is being built as a **local-first mobile product** with strong architectural boundaries, explicit synchronization rules, and a presentation layer that follows Ignite Red components and styling conventions.

Core references:

- Product requirements: [docs/prd-docs/# Tapp — Single-Button Family Budgeting PRD.md](docs/prd-docs/%23%20Tapp%20%E2%80%94%20Single-Button%20Family%20Budgeting%20PRD.md)
- Architecture: [docs/architecture.md](docs/architecture.md)
- ADR index: [docs/adr/README.md](docs/adr/README.md)
- Start here / execution order: [docs/start-here.md](docs/start-here.md)
- Code quality guide: [docs/CODE_QUALITY.md](docs/CODE_QUALITY.md)

---

## Tech Stack

| Technology                             | Role                                  | Status                            |
| -------------------------------------- | ------------------------------------- | --------------------------------- |
| React Native 0.83                      | Mobile runtime                        | Active                            |
| React 19                               | UI runtime                            | Active                            |
| Expo SDK 55                            | App platform                          | Active                            |
| Expo Router                            | Navigation                            | Active                            |
| Ignite Red                             | UI components and styling conventions | Active                            |
| TypeScript 5.9                         | Language                              | Active                            |
| MMKV                                   | Lightweight key-value storage         | Active                            |
| Jest + `@testing-library/react-native` | Unit and component testing            | Active                            |
| Maestro                                | End-to-end testing                    | Active                            |
| dependency-cruiser                     | Boundary enforcement                  | Active                            |
| TanStack Query                         | Server state                          | Approved direction, not yet wired |
| SQLite + Drizzle                       | Durable local data                    | Approved direction, not yet wired |
| Zod + react-hook-form                  | Validation and forms                  | Approved direction, not yet wired |

Critical note:

1. Do not introduce a different server-state library.
2. Do not introduce a second design system or UI framework.
3. Do not store durable relational business data in MMKV.
4. Do not put business-critical correctness behind background execution windows.

---

## Developer Workflows

| Task                    | Command                    |
| ----------------------- | -------------------------- |
| Start dev client        | `pnpm run start`           |
| Run Android             | `pnpm run android`         |
| Run iOS                 | `pnpm run ios`             |
| Run web                 | `pnpm run web`             |
| Typecheck               | `pnpm run compile`         |
| Lint and fix            | `pnpm run lint`            |
| Lint check              | `pnpm run lint:check`      |
| Boundary checks         | `pnpm run depcruise`       |
| Unit tests              | `pnpm run test`            |
| Watch tests             | `pnpm run test:watch`      |
| Maestro flows           | `pnpm run test:maestro`    |
| Align Expo dependencies | `pnpm run align-deps`      |
| Create a migration      | `pnpm migrate:make <name>` |

Use local EAS build scripts from `package.json` for simulator, device, preview, and production builds.

---

## Directory Conventions

Target structure:

```text
src/
  app/             # Expo Router route bindings only
  bootstrap/       # Startup orchestration and dependency wiring
  modules/         # Feature modules
  shared/          # Stable shared abstractions and platform services
```

Module structure:

```text
src/modules/{feature}/
  domain/
  application/
  infrastructure/
  presentation/
  index.ts
```

Seven hard rules:

1. If code belongs to one feature, it belongs under `src/modules/{feature}`.
2. Route files under `src/app` stay thin and should only bind route concerns to feature entry points.
3. Presentation code must not import infrastructure implementations directly.
4. Cross-feature imports must go through public entry points, never deep imports into another module.
5. Shared code does not depend on feature modules.
6. Secrets belong in secure storage or backend-managed flows, never MMKV.
7. Durable schema changes require a migration file via `pnpm migrate:make` — see [docs/migrations.md](docs/migrations.md).

---

## The Four-Layer Mobile Architecture

```text
Presentation     -> screens, hooks for UI binding, components
Application      -> use cases, commands, queries, orchestration
Domain           -> entities, value objects, policies, repository contracts
Infrastructure   -> API adapters, database repos, notification adapters, sync adapters
```

Dependency rule: layers depend inward only.

- `presentation` may depend on `application` and shared UI utilities
- `application` may depend on `domain`
- `infrastructure` implements `domain` and `application` contracts
- `domain` depends on no React Native, Expo, storage SDK, or transport details

---

## Layer Contracts

### Presentation Layer

✅ MUST:

- use Ignite Red components first: `Screen`, `Text`, `Button`, `TextField`, `Header`, `Card`, `EmptyState`, `Icon`
- keep route files thin
- use local state only for local interaction concerns
- prefer `FlatList` or `SectionList` for unbounded mobile lists
- keep styles colocated and themed using Ignite conventions

❌ NEVER:

- import raw API clients or database adapters directly
- place business rules in screens or JSX branches when they belong in domain or application code
- use `ScrollView` for large, changing datasets when virtualization is needed
- block startup with unrelated initialization logic in route files

### Application Layer

✅ MUST:

- expose use cases and orchestration for user-facing actions
- receive dependencies through constructors or factories
- coordinate local writes, outbox creation, and sync triggers where appropriate
- remain free of JSX and UI rendering concerns

❌ NEVER:

- construct infrastructure implementations inside use cases
- import Expo or React Native SDK modules directly unless the abstraction is explicitly application-owned
- hide side effects in utility functions with unclear ownership

### Domain Layer

✅ MUST:

- remain pure TypeScript
- model business concepts such as money, routines, budget periods, transactions, and conflict policies
- enforce invariants at creation boundaries
- be straightforward to unit test without React Native or Expo

❌ NEVER:

- import React, React Native, Expo, database clients, or HTTP clients
- access storage, network, or device APIs

### Infrastructure Layer

✅ MUST:

- contain transport, storage, database, notification, and background task adapters
- implement repository or port contracts defined elsewhere
- map raw external data into validated internal shapes
- isolate platform-specific concerns behind stable interfaces

❌ NEVER:

- leak implementation details into presentation files
- define core business rules that belong in domain or application

---

## React Native and Expo Rules

1. Use Ignite styling practices by default: themed style functions, `$` naming, preset-based reuse, and no `StyleSheet.create()` unless there is a clear measured need.
2. Prefer the app's wrapper components over raw React Native `Text`, `Button`, and `TextInput`.
3. Safe area handling should go through the existing `Screen` component or `react-native-safe-area-context`, not ad hoc layout padding.
4. Keep `src/app/_layout.tsx` thin. Startup orchestration belongs in bootstrap modules, per ADR-004.
5. Background tasks are opportunistic. Do not design correctness around exact schedules on iOS or Android.
6. Use Expo-aligned dependency updates. Do not upgrade React Native independently of Expo.
7. For icons and splash assets, use Ignite generators instead of hand-editing platform assets.

---

## State, Data, and Storage Rules

1. Treat server state, durable local data, device preferences, and UI state as separate categories.
2. MMKV is for preferences and lightweight device state, not relational business data.
3. When SQLite and Drizzle land, persisted business data must go through repositories and migrations.
4. All sync-capable writes should be designed so they can evolve into local-first plus outbox behavior.
5. Parse and validate external data at boundaries. Do not spread raw backend payload shapes through the app.

---

## Testing Rules

1. Tests ship with the feature, not after the feature.
2. Use Jest for unit and integration tests.
3. Use `@testing-library/react-native` for component and screen behavior.
4. Use Maestro for core end-to-end user journeys.
5. Co-locate tests with the feature code when possible.
6. Prioritize tests for domain logic, repositories, use cases, and critical screen flows.

Definition of done for new feature work:

- feature code lives in the correct layer
- boundaries are respected
- tests are added in the same pull request
- documentation is updated if the work changes architecture, sync, storage, or startup behavior

---

## Mobile Performance Rules

1. Optimize for perceived responsiveness on mid-range devices.
2. The tap-to-log loop is latency-sensitive and should stay lean.
3. Memoize heavy list rows and expensive derived values when profiling shows churn.
4. Prefer virtualization over rendering long lists eagerly.
5. Avoid large anonymous inline objects and handlers in hot rendering paths when they trigger unnecessary re-renders.
6. Keep development-only tooling such as Reactotron out of production behavior.

---

## Security Baseline

Before shipping any feature, verify:

1. No secrets or tokens are stored in MMKV.
2. No sensitive data is logged.
3. Persisted data shapes are versioned when they are durable.
4. Tenant or household boundaries are respected in data access assumptions.
5. SMS-related work, if introduced later, remains local-only unless architecture and legal guidance change.

---

## Active Implementation Phase

Current implementation sequence is defined in [docs/start-here.md](docs/start-here.md).

**Currently active:** Phase 0 / Phase 1 foundation work

Focus now:

- scaffold `src/bootstrap`, `src/modules`, and `src/shared`
- move startup wiring out of `_layout.tsx`
- add database and server-state foundations
- create the first real product slice under the new module structure

---

## Progress Tracker

### Phase 0 — Repo Foundation

- [ ] Create `src/bootstrap`
- [ ] Create `src/modules`
- [ ] Create `src/shared`
- [ ] Tighten dependency-cruiser rules for module boundaries

### Phase 1 — Application Bootstrap

- [ ] Create `src/bootstrap/app-bootstrap.ts`
- [ ] Create `src/bootstrap/container.ts`
- [ ] Create `src/bootstrap/query-client.ts`
- [ ] Move startup orchestration out of `src/app/_layout.tsx`

### Phase 2 — Local Data Foundation

- [ ] Add SQLite and Drizzle
- [ ] Add first schema and migration flow
- [ ] Add repository integration tests

### Phase 3 — Server-State Foundation

- [ ] Add TanStack Query
- [ ] Add app-level provider wiring
- [ ] Define query key conventions

### Phase 4 — Module Scaffolding

- [ ] Create first real feature module
- [ ] Adapt Ignite generators to target module structure

### Phase 5 — First Product Slice

- [ ] Category and routine setup
- [ ] Single-tap local expense logging
- [ ] Daily review for local events

---

_This file is the source of truth for agent-oriented implementation rules in this repo. Keep it aligned with the architecture doc, ADRs, and start-here task list._# AGENTS.md — Tapp Engineering Agent Instructions

> This file guides GitHub Copilot Agent and any AI agent working in this codebase.
> Read this before making changes. Use it together with the architecture, ADRs, and start-here task list.

---

## Project Identity

**Tapp** is a React Native family budgeting app built on Ignite Red, Expo Router, and Expo SDK 55. The product is designed around a single low-friction interaction: tap once at the point of spend, persist locally immediately, then review and correct later.

This codebase is moving from the default Ignite baseline to a **modular, domain-oriented mobile architecture** with explicit boundaries between:

- `domain`
- `application`
- `infrastructure`
- `presentation`

The goal is not to preserve Ignite's default folder layout. The goal is to keep Ignite's strengths while reshaping the codebase around product domains and mobile-first operational constraints.

Key references:

- Architecture: [docs/architecture.md](docs/architecture.md)
- ADR index: [docs/adr/README.md](docs/adr/README.md)
- Start here: [docs/start-here.md](docs/start-here.md)
- Code quality guide: [docs/code-quality.md](docs/code-quality.md)
- Product requirements: [docs/prd-docs/# Tapp — Single-Button Family Budgeting PRD.md](docs/prd-docs/%23%20Tapp%20%E2%80%94%20Single-Button%20Family%20Budgeting%20PRD.md)

---

## Current Phase

**Active implementation phase:** Foundation and bootstrap alignment.

Current focus:

- establish `src/bootstrap`, `src/modules`, and `src/shared`
- move startup orchestration out of `src/app/_layout.tsx`
- add SQLite plus Drizzle
- add TanStack Query wiring
- enforce architecture boundaries before building major feature breadth

Do not optimize for short-term speed by adding feature code directly into the legacy flat structure if it creates more migration work later.

---

## Tech Stack

### Current baseline

- React 19
- React Native 0.83
- Expo SDK 55
- Expo Router
- Ignite Red components, theming, and generators
- MMKV
- Jest + React Native Testing Library
- Maestro
- Apisauce
- i18next

### Target additions already chosen in architecture

- TanStack Query for server state
- SQLite + Drizzle for durable local data
- Zod for runtime validation
- react-hook-form for forms
- expo-notifications
- expo-secure-store
- Sentry

### Critical note

When choosing an implementation:

1. **Navigation** → use Expo Router route bindings only in `src/app`
2. **Presentation** → use Ignite Red components and styling conventions first
3. **Server state** → use TanStack Query once wired; do not invent bespoke screen-level fetch state patterns
4. **Durable local data** → use SQLite plus Drizzle, not MMKV
5. **Preferences** → use MMKV
6. **Secrets** → use Secure Store, never MMKV
7. **Transport** → use infrastructure adapters around Apisauce, never raw `fetch` in screens
8. **Validation** → use Zod at trust boundaries
9. **Forms** → use react-hook-form for non-trivial forms
10. **Logging** → keep debug tooling in development only; do not add stray `console.*` calls in app code

---

## Developer Workflows

| Task                       | Command                    |
| -------------------------- | -------------------------- |
| Start dev client           | `pnpm run start`           |
| Run Android                | `pnpm run android`         |
| Run iOS                    | `pnpm run ios`             |
| Run web                    | `pnpm run web`             |
| Typecheck                  | `pnpm run compile`         |
| Lint check                 | `pnpm run lint:check`      |
| Lint and fix               | `pnpm run lint`            |
| Dependency boundaries      | `pnpm run depcruise`       |
| Unit and integration tests | `pnpm run test`            |
| Jest watch mode            | `pnpm run test:watch`      |
| Maestro flows              | `pnpm run test:maestro`    |
| Align Expo dependencies    | `pnpm run align-deps`      |
| Clean prebuild             | `pnpm run prebuild:clean`  |
| Create a migration         | `pnpm migrate:make <name>` |

---

## Directory Conventions

Target shape:

```text
src/
  app/                  # Expo Router route files only
  modules/              # Feature modules
  shared/               # Stable cross-feature code
  bootstrap/            # App startup and dependency composition
```

Rules:

1. Route files in `src/app` are thin bindings only.
2. Feature code belongs under `src/modules/<feature>`.
3. Shared cross-feature code belongs in `src/shared` only after it is truly shared.
4. Startup sequencing and dependency composition belong in `src/bootstrap`.
5. Cross-feature imports go through feature entry points, never deep imports into internals.

---

## Mobile-Specific Delivery Rules

1. **Offline-first matters.** Do not make core product flows depend on immediate network availability.
2. **Tap latency matters.** The main logging action should stay fast and local-first.
3. **Background execution is limited.** Never design business-critical correctness around guaranteed background task timing.
4. **Platform APIs stay behind ports.** Notifications, storage, background tasks, and native integrations belong in infrastructure adapters.
5. **Cold-start cost matters.** Keep root startup logic thin and explicit.
6. **Battery and memory matter.** Avoid chatty polling, oversized in-memory caches, and unnecessary rerenders.
7. **Safe areas, keyboard behavior, and accessibility are product quality concerns, not polish.**

---

## Styling and UI Rules

1. Use Ignite Red built-in components before creating new primitives.
2. Follow Ignite styling practices: colocated themed style functions and `$`-prefixed style variables.
3. Prefer preset extension over one-off inline styling when a pattern repeats.
4. Do not introduce a second UI framework without a specific documented gap.
5. Use the app's wrapper components instead of raw `Text`, `Button`, and `TextInput` from `react-native` when the project already provides wrappers.
6. Keep route components thin; move product UI into feature screens and components.

---

## Architectural Model

Each feature should move toward this layered structure:

```text
modules/{feature}/
  domain/
  application/
  infrastructure/
  presentation/
  index.ts
```

### Layer Contracts

**Presentation**

- may use React, React Native, Expo Router bindings, and shared UI
- may call application-facing hooks or receive props
- must not import concrete infrastructure implementations directly
- must not contain business rules that belong in domain or application

**Application**

- orchestrates use cases, commands, queries, policies, and view-model shaping
- receives dependencies explicitly through constructors or factories
- must not import React Native SDKs directly

**Domain**

- holds business rules, invariants, entities, value objects, and repository contracts
- must remain framework-agnostic and independently testable
- must not import React, Expo, or transport libraries

**Infrastructure**

- implements ports for APIs, storage, notifications, database, sync, and background work
- must not leak SDK details into presentation code

---

## Code Quality Rules

### State separation

- server state is not UI state
- durable local data is not MMKV preference state
- device preferences are not secrets
- presentation state should stay local unless sharing is required

### Data fetching

- do not fetch directly in route files
- do not add `useEffect + fetch` patterns for server-owned data
- keep query functions and API adapters in infrastructure code

### Storage

- MMKV is for lightweight preferences only
- Secure Store is for secrets only
- SQLite is for structured, durable, queryable business data

### Imports

- prefer `@/` imports for app code
- keep import ordering consistent with ESLint rules
- do not deep-import across feature boundaries

### Typing

- no casual `any`
- validate unknown inputs at boundaries
- keep feature-local types near the feature
- keep global types rare and intentional

### Forms

- use react-hook-form for non-trivial forms
- validate with Zod when validation is introduced
- keep form submission state explicit

### Testing

- write tests in the same PR as the feature work
- colocate tests with the code they verify where practical
- unit test domain logic and use cases
- integration test repositories, hooks, and screen-to-use-case flows
- use Maestro for critical user journeys

### Logging and debug tooling

- Reactotron remains development-only
- do not commit debug-only behavior into production flows
- keep logs intentional and low-noise

---

## Anti-Patterns To Avoid

- business logic in route files or JSX-heavy components
- screens importing API clients directly
- storing structured app data in MMKV blobs
- secrets in MMKV
- cross-feature deep imports
- startup logic scattered across screens and utilities
- background logic that assumes iOS or Android will run on an exact schedule
- generic utility dumping grounds for feature-specific code
- adding new features without tests

---

## Refactoring Priorities

1. establish bootstrap and composition root
2. add local database foundation
3. add server-state foundation
4. enforce dependency boundaries
5. build the first real feature slice in the new module structure

If there is tension between adding new functionality quickly and preserving the target architecture, prefer the path that reduces future migration cost unless the user explicitly asks for a temporary shortcut.

---

## Feature-Specific Guardrails For Tapp

1. The single-tap logging path is sacred. Do not add friction casually.
2. Daily review is part of the core loop, not a secondary admin screen.
3. Family sync and reporting should not be built before the local event flow is solid.
4. AI and SMS features are later-phase capabilities; do not let them distort the MVP architecture.
5. Financial data requires careful handling of correctness, auditability, and trust.

---

## Documentation Rules

Update docs when changes affect:

- architecture boundaries
- storage responsibilities
- sync behavior
- bootstrap sequencing
- feature onboarding expectations
- developer workflows

If a change materially alters an expensive or cross-cutting technical decision, add or update an ADR.

---

## Source Of Truth

When guidance conflicts:

1. ADRs override generic preferences
2. architecture doc defines the target structure
3. start-here doc defines execution order
4. this file defines implementation and code quality rules for agents

Keep this file aligned with the repo as the architecture becomes real.
