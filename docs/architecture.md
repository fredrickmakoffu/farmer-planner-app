# Tapit Mobile Architecture

## Goals

For the implementation sequence derived from this document and the PRD, see [docs/start-here.md](./start-here.md).

This architecture is optimized for a React Native application built on Ignite Red with Expo Router, targeting long-term product development rather than prototype speed. The priorities are:

- feature isolation and predictable growth
- explicit boundaries between business rules, orchestration, and platform concerns
- offline-capable data flows suitable for a budgeting product
- high confidence releases with fast local development
- a codebase that multiple engineers can change safely

The current repository already starts from a modern baseline: Expo SDK 55, React Native 0.83, React 19, Expo Router, MMKV, Jest, and Maestro. The recommendation is to keep the Ignite developer experience, but move the application code to a domain-oriented modular structure with stricter dependency rules.

## Recommended Stack

Keep:

- Expo + prebuild workflow
- Expo Router for navigation
- Ignite Red built-in components and theming/styling practices as the default presentation foundation
- MMKV for small, fast key-value persistence
- Jest + React Native Testing Library for unit and component tests
- Maestro for end-to-end flows
- EAS Build and EAS Update for release delivery

Add:

- `@tanstack/react-query` for server state, caching, retries, invalidation, and sync triggers
- `zustand` for lightweight app state that is not server state
- `zod` for runtime validation of API payloads, storage payloads, and navigation params
- `react-hook-form` for non-trivial forms
- `expo-sqlite` plus `drizzle-orm` for durable structured local data and migrations
- `expo-notifications` for push and local notifications
- `expo-task-manager` and `expo-background-task` for opportunistic background work
- `expo-secure-store` for secrets such as refresh tokens or device credentials
- Sentry for crash reporting, tracing, and release health

Use selectively:

- feature flags with LaunchDarkly or ConfigCat if rollout control is needed
- OpenAPI code generation if the backend contract is mature enough to justify it

Avoid adding a second UI framework unless a specific capability is missing and the team agrees the tradeoff is worth it. The default assumption is that shared UI should build on Ignite Red components, presets, and theme tokens.

## Architectural Style

Use modular clean architecture with DDD-inspired boundaries, but keep it pragmatic. Every feature owns its business language and its implementation details.

Each feature is split into four layers:

1. `domain`: entities, value objects, domain services, domain errors, repository contracts
2. `application`: use cases, commands, queries, DTO mappers, orchestration, policies
3. `infrastructure`: API clients, local database repositories, notification adapters, sync adapters
4. `presentation`: screens, hooks, view models, components, route bindings

Rules:

- `domain` depends on nothing from React Native, Expo, transport, or storage
- `application` depends on `domain` only
- `infrastructure` implements contracts defined by `domain` or `application`
- `presentation` can depend on `application` and shared UI, but not on raw infrastructure details
- cross-feature imports go through published feature entry points, never deep imports into another feature's internals

This gives strong boundaries without forcing overly abstract code everywhere.

## Target Folder Structure

```text
src/
  app/                              # Expo Router route files only
    _layout.tsx
    (authenticated)/
    (public)/
  modules/
    budgeting/
      domain/
        entities/
        value-objects/
        repositories/
        services/
      application/
        use-cases/
        queries/
        commands/
        dto/
      infrastructure/
        api/
        db/
        mappers/
        repositories/
      presentation/
        screens/
        components/
        hooks/
        view-models/
      index.ts
    households/
    notifications/
    auth/
  shared/
    domain/
    application/
    infrastructure/
      api/
      database/
      background/
      notifications/
      telemetry/
    presentation/
      components/
      hooks/
      navigation/
      theme/
    config/
    utils/
  bootstrap/
    app-bootstrap.ts
    container.ts
    query-client.ts
    store.ts
```

Keep Expo Router route files very thin. Each route should only bind URL parameters, auth guards, and a feature screen:

```tsx
export { BudgetOverviewScreen as default } from "@/modules/budgeting/presentation/screens/BudgetOverviewScreen"
```

This prevents routing concerns from becoming the application architecture.

## Styling System

Use Ignite Red styling practices as the default and only introduce exceptions deliberately.

Rules:

- presentation code builds on Ignite's `Screen`, `Text`, `Button`, `TextField`, `Header`, `Card`, `EmptyState`, `Icon`, and related components before creating new primitives
- styling stays colocated with the component using bare objects and themed style functions, not `StyleSheet.create()` as a default
- themed style variables use the existing Ignite `$` convention
- shared visual variants should be exposed through component presets rather than repeated inline style arrays
- app-wide tokens continue to live in the Ignite theme system under shared theme modules

Practical direction:

- extend Ignite presets before inventing parallel component APIs
- prefer small wrappers around Ignite components when a feature needs domain-specific presentation
- add new generic UI components only through generators so file shape and conventions stay consistent

This keeps the presentation layer aligned with Ignite's strengths and avoids creating a fragmented design system.

## Core Design Principles

### Entities and Value Objects

Use classes or immutable factory objects for concepts with business rules, for example `Money`, `BudgetPeriod`, `CategoryAllocation`, `Transaction`, `HouseholdMember`. Domain objects should enforce invariants at creation time.

Examples:

- `Money` guarantees currency and decimal handling rules
- `BudgetPeriod` guarantees valid date range boundaries
- `Transaction` enforces allowed state transitions

Prefer value objects over primitive strings and numbers whenever a value carries domain meaning.

### Use Cases

Every user-visible action should map to an application use case. Examples:

- `CreateBudgetUseCase`
- `CaptureExpenseUseCase`
- `InviteHouseholdMemberUseCase`
- `AcknowledgeNotificationUseCase`
- `RunSyncUseCase`

Use cases receive ports or repositories through constructor injection and return typed results. They should not know about React components, navigation, or Expo APIs.

### Repositories and Ports

Repository contracts live in `domain` or `application`. Implementations live in `infrastructure`.

Examples:

- `BudgetRepository`
- `TransactionRepository`
- `SyncCheckpointRepository`
- `NotificationGateway`
- `BackgroundTaskScheduler`

This allows tests to swap implementations easily and stops feature code from importing SDKs directly.

## State and Data Management

Treat state as four separate categories.

### 1. Server State

Use TanStack Query for anything retrieved from or synchronized with the backend.

See [ADR-001: Adopt TanStack Query for Server State](./adr/001-adopt-tanstack-query.md).

Responsibilities:

- request lifecycle
- cache invalidation
- stale-while-revalidate behavior
- background refetch on app focus or reconnect
- optimistic updates when the backend supports them
- retry and backoff policies

Guidelines:

- never store remote collections directly in Zustand
- define query keys centrally per feature
- keep query functions in infrastructure adapters, not in screens
- validate responses with Zod before mapping into domain or application DTOs

### 2. Durable Local Structured State

Use SQLite with Drizzle for data that must survive restarts and support querying, sorting, joins, and offline workflows.

See [ADR-002: Use SQLite and Drizzle for Durable Local Data](./adr/002-use-sqlite-and-drizzle.md).

Use it for:

- budgets
- transactions
- categories
- sync checkpoints
- notification inbox records
- outbox commands waiting for server sync

### 3. Device Key-Value State

Keep MMKV for lightweight, non-relational values:

- theme selection
- onboarding completion
- last selected household ID
- feature flag cache
- recent UI preferences

Do not store secrets in MMKV. Use Secure Store for secrets.

### 4. UI and Interaction State

Use component state first. Use Zustand only for shared client-side coordination that is not durable and not server-owned.

Examples:

- active draft transaction state across multiple screens
- currently selected filters shared across tabs
- transient notification banner queue

If a piece of state does not need to survive process death or power meaningful queries, it should not go into SQLite.

## Data Flow

Default write flow:

1. Screen dispatches a use case
2. Use case validates command input
3. Use case writes to local store immediately when offline-first behavior is required
4. Use case appends a sync command to the outbox
5. Query cache is updated optimistically or invalidated
6. Background or foreground sync reconciles with backend

Default read flow:

1. Screen subscribes to a view model hook
2. Hook reads from local query or React Query selector
3. Hook exposes UI-ready state only
4. Background refresh updates cache and local database behind the scenes

## Database Strategy

For a budgeting app, a local-first database is justified. Use SQLite plus Drizzle ORM rather than using MMKV as a pseudo-database.

### Schema Design Principles

- model aggregates explicitly, not generic JSON blobs
- prefer append-only event or ledger tables for financial records where auditability matters
- store monetary amounts in minor units, for example cents, plus ISO currency
- include `server_id`, `local_id`, `version`, `updated_at`, `deleted_at`, `sync_status`
- keep tables feature-owned, but expose cross-feature read models where needed
- include metadata tables such as `schema_migrations`, `sync_state`, and `outbox`

Recommended core tables:

- `households`
- `members`
- `budgets`
- `budget_categories`
- `transactions`
- `transaction_attachments`
- `recurring_rules`
- `notifications_inbox`
- `outbox`
- `sync_checkpoints`

### Query Patterns and Abstractions

- repositories hide SQL from the rest of the app
- application code works with DTOs and domain entities, not raw rows
- introduce dedicated read repositories for dashboard and timeline screens where joins are complex
- prefer explicit query objects over exposing arbitrary filtering everywhere

Examples:

- `GetBudgetSummaryQuery`
- `ListTransactionsForPeriodQuery`
- `GetUnreadNotificationsQuery`

### Migrations and Versioning

Use forward-only SQL migrations generated and reviewed in source control.

Rules:

- every schema change gets a numbered migration
- every migration is deterministic and idempotent where possible
- destructive changes happen in phases: add new column, dual-write, backfill, remove old column later
- app startup must block feature access if a required migration fails

Versioning strategy:

- database schema version is independent from app version
- sync payload version is independent from schema version
- API version compatibility lives at the transport boundary

### Evolving Schemas Safely

When new features are added:

- prefer additive changes first
- backfill locally during migration or lazily on read, depending on cost
- preserve unknown server fields in mapping layers only if required for compatibility
- keep mappers version-aware during rolling backend deployments

### Offline-First and Sync Strategy

Use a local-first model for financial workflows.

See [ADR-003: Define a Local-First Sync Engine Contract](./adr/003-sync-engine-contract.md).

Recommended sync model:

- local DB is the primary read model on device
- backend remains source of truth across devices
- user actions create outbox entries with deterministic command IDs
- sync engine pushes commands, receives acknowledgements, then applies server snapshots or deltas
- conflict policy is explicit per aggregate, not generic

Conflict rules should be domain-specific:

- transaction edits: last-write-wins is usually acceptable only with visible audit metadata
- budget totals: prefer server conflict response plus user-visible reconciliation flow
- member permissions: server authoritative

Do not promise true cron-like offline background sync on iOS. Mobile OS constraints mean sync should be opportunistic: on app foreground, on push trigger, on connectivity regain, and during permitted background windows.

## Background Processing

Background execution in mobile must be designed around platform limits.

Recommended model:

- server-scheduled work for anything business-critical or time-sensitive
- device background tasks only for opportunistic refresh, cleanup, retry, and notification preparation

Implementation:

- wrap `expo-task-manager` and `expo-background-task` behind a `BackgroundTaskScheduler` port
- register tasks in a single bootstrap module
- keep tasks idempotent and short-running
- persist checkpoints so tasks can resume safely

Use cases for on-device background tasks:

- flush outbox when network returns
- prefetch latest household summary
- expire local caches
- reconcile notification inbox state

If the product later requires guaranteed periodic jobs or long-running background uploads, plan for targeted native extensions with Android WorkManager and iOS BGTaskScheduler support. Do not architect the first version assuming both platforms will honor exact schedules.

## Notifications

### Delivery Architecture

Start with `expo-notifications` and hide it behind a `NotificationGateway`.

Flow:

1. backend emits domain event
2. notification service decides channel, payload, and audience
3. push sent through Expo Push Service initially
4. app receives push, stores notification record locally, routes user to the correct screen
5. local notifications are scheduled for reminders that can be computed on-device

This keeps the initial implementation fast while preserving the option to move later to direct FCM/APNs, OneSignal, or Braze if segmentation or analytics requirements grow.

### Notification Types

- remote push for cross-device or backend-triggered events
- local notifications for reminders, scheduled nudges, or post-sync alerts
- in-app inbox for durable history and read state

### User Interaction Flow

- every notification payload carries a typed `target` contract
- app boot processes cold-start notification intent before rendering the final route
- taps map to an application command or navigation intent, not directly to arbitrary screens
- notification read state is persisted and synchronized

Suggested payload contract:

```ts
type NotificationTarget =
  | { type: "transaction"; transactionId: string }
  | { type: "budget-period"; budgetId: string; periodId: string }
  | { type: "household-invite"; inviteId: string }
```

## Feature Development Workflow

### Conventions for New Features

Every new feature should be created under `src/modules/<feature>` and include:

- `domain`
- `application`
- `infrastructure`
- `presentation`
- `index.ts`
- tests beside the code they verify

Definition of done for a new feature:

- use cases defined
- repository contracts defined
- DTO and schema validation defined
- presentation entry points defined
- dependency rules pass
- tests added at the correct layers
- docs updated if the feature changes architecture or workflows

Scaffolding policy:

- use Ignite generators for generic reusable components
- customize `ignite/templates` so generated files match this architecture instead of the legacy flat app structure
- add project-specific generators for feature modules, use cases, repositories, and screens if the built-in ones are not enough
- update generators intentionally with `ignite-cli update` only after reviewing template drift and preserving local conventions

### Dependency Boundaries

Enforce boundaries with dependency-cruiser.

Rules to add:

- route files in `src/app` may only import feature presentation entry points and shared navigation/bootstrap modules
- `presentation` cannot import infrastructure implementations directly
- modules cannot deep-import internals from sibling modules
- shared packages cannot depend on feature modules

### Reusability and Shared Components

Keep reusable code in `src/shared`, but move only stable abstractions there. Shared code should be earned, not guessed early.

Promote to shared only when one of these is true:

- used by at least two modules with the same semantics
- clearly platform-level, for example telemetry, auth session, database bootstrap
- part of the design system

Generic components should be generated first, then adapted. Do not hand-roll a new shared component shape when an Ignite component or preset extension would solve the same problem.

### Enforcing Consistency

- use code generators for new module scaffolds
- add import aliases and entry-point exports only
- require architecture checks in CI
- maintain ADRs for high-impact design decisions

## Testing Strategy

Use a layered strategy with narrow, fast tests first.

Testing is part of feature delivery, not a cleanup step. When a feature is added, its tests are added in the same pull request and live beside the code they verify so there is a one-to-one relationship between shipped behavior and available automated coverage.

Follow Ignite's testing posture pragmatically: write tests, not too many, mostly integration. Keep unit tests for logic-heavy code, use integration tests for feature slices, and rely on Maestro for the most important end-to-end user journeys.

### Unit Tests

Focus on:

- value objects and domain entities
- use cases with fake repositories
- mapping functions and validators
- utility functions with financial or date logic

Tools:

- Jest
- plain test doubles
- snapshot tests only for stable presentational output, not as the default

Placement:

- colocate `.test.ts` and `.test.tsx` files with feature code whenever possible
- use the top-level `test` directory only for shared setup, global mocks, and cross-cutting test utilities

### Integration Tests

Focus on:

- repository implementations against a test SQLite database
- API clients and response mapping
- React Query hooks with mocked transport
- screen plus view-model integration with React Native Testing Library

Use MSW or transport-level mocks where practical.

Integration tests are the default test type for new feature work because they exercise the architecture boundaries that matter most: screen or hook to use case to repository or adapter.

### End-to-End Tests

Keep Maestro and cover the core revenue and retention paths:

- onboarding
- sign in and session restore
- create household
- create budget
- capture expense
- sync after reconnect
- notification open flow

Policy:

- Maestro remains the default end-to-end framework because it is already installed and aligned with Ignite
- each major feature should either extend an existing Maestro flow or add a focused new one when the feature changes a core user journey
- do not merge critical product flows without either Maestro coverage or an explicit reason documented in the PR

### Tooling and CI Integration

Minimum CI gates:

- typecheck
- lint
- unit and integration tests
- dependency boundary checks
- Maestro smoke flow on a nightly build or pre-release branch

Recommended scripts to standardize:

- `pnpm compile`
- `pnpm lint:check`
- `pnpm test -- --runInBand`
- `pnpm depcruise`

Test ownership rule:

- if a module exists, it should have corresponding unit or integration coverage in that module
- if a workflow crosses modules and matters to users, it should have Maestro coverage
- missing tests are treated as missing deliverables, not backlog polish

## Deployment and Release Process

### Environment Management

Use three runtime environments:

- development
- staging
- production

Rules:

- environment configuration is centralized in `src/shared/config`
- no direct `process.env` reads outside configuration modules
- runtime secrets are delivered through EAS secrets or the backend, never committed
- app config and update channels map cleanly to environment names

### CI/CD Workflows

Recommended pipeline:

1. pull request: lint, typecheck, unit tests, boundary checks
2. merge to `main`: build internal preview artifacts for QA
3. tag or release branch: build signed binaries through EAS
4. post-release: rollout OTA updates only within compatible runtime versions

Suggested platform setup:

- GitHub Actions for CI orchestration
- EAS Build for signed builds
- EAS Update channels per environment
- Sentry releases tied to app version and git SHA

Release automation should borrow the useful parts of Ignite's own release discipline, especially conventional commit semantics and automated changelog generation, but app releases themselves should be fully handled by CI/CD rather than manual operator-driven steps.

### Versioning and Release Strategy

- semantic versioning for product releases
- native build number auto-increment per platform
- `runtimeVersion` pinned to native compatibility boundaries
- OTA updates used for JS-only fixes and copy changes, not native capability shifts
- conventional commits are required so release notes and version bumps can be derived automatically in CI

### Rollbacks and Monitoring

- rollback OTA updates through EAS Update channel controls
- rollback native builds via store phased rollout controls
- track crashes, ANRs, slow launches, failed sync jobs, and notification delivery rates
- define alerts for sync failure spikes and critical screen crash-free rate degradation

## Asset and Icon Workflow

Static assets remain under `assets`, with image and icon generation following Ignite conventions.

Rules:

- use Ignite's app-icon generator for launcher and app icon generation instead of manually editing platform asset folders
- use Ignite's splash-screen generator for splash assets and keep the template inputs under `ignite/templates/splash-screen`
- when `app.config.ts` requires manual config updates after generation, treat those updates as part of the asset change, not a separate cleanup step
- preserve generator input filenames and required source dimensions so regeneration stays reliable

Operationally, icon and splash changes should be reproducible from source assets committed under `ignite/templates`, not from one-off edits in native folders.

## Team Collaboration

### Git Workflow

Use trunk-based development with short-lived branches unless release complexity forces a stricter branching model.

Rules:

- branch from `main`
- keep PRs small and feature-scoped
- squash merge by default
- use release branches only for store submission stabilization when needed

### Pull Requests and Code Reviews

Every PR should include:

- problem statement
- approach summary
- screenshots or recordings for UI changes
- testing evidence
- migration or rollout notes if applicable

Reviewers should focus on:

- boundary violations
- correctness of domain rules
- offline and sync implications
- missing telemetry and test coverage

### Coding Standards and Linting

- TypeScript strict mode stays on
- enforce import boundaries with dependency-cruiser
- use Prettier and ESLint in CI and pre-commit hooks
- validate schemas at all trust boundaries
- ban direct SDK imports outside approved infrastructure modules where feasible

### Documentation Practices

Maintain:

- this architecture document
- ADRs in `docs/adr` with the index at [docs/adr/README.md](./adr/README.md)
- feature RFCs for larger changes
- runbooks for release, incident response, and environment setup

### Onboarding and Knowledge Sharing

New engineers should be able to answer these questions within the first week:

- where new features live
- how data flows from route to use case to repository
- how local persistence and sync work
- how to run tests and release builds

Support that with:

- a setup guide
- a module template generator
- recorded walkthroughs for architecture and release flow

## Modernizing the Current Ignite Project

The current app is already on a current Expo and React Native baseline. The modernization work should focus less on chasing versions and more on hardening structure and operational tooling.

### Immediate Changes

1. create `src/modules` and migrate feature code out of generic `screens`, `services`, and `utils` buckets
2. introduce TanStack Query and a shared query client
3. introduce SQLite plus Drizzle for structured local data
4. move secrets to Secure Store
5. wrap notifications, background work, storage, and transport behind ports
6. add Sentry and release health monitoring
7. enforce import boundaries in dependency-cruiser and CI
8. customize Ignite generators to output code that matches the module architecture and styling conventions
9. codify Ignite component and preset usage so new UI follows one styling model

### Dependency Guidance

Keep current core versions aligned with the installed Expo SDK. Do not manually upgrade React Native independently of Expo. Use this sequence for future upgrades:

1. upgrade Ignite template guidance
2. upgrade Expo SDK
3. run `expo install --fix`
4. update native config through prebuild and verify iOS and Android
5. run smoke tests on device builds before widening rollout

### Suggested Near-Term Package Additions

```bash
pnpm add @tanstack/react-query zustand zod react-hook-form drizzle-orm expo-notifications expo-task-manager expo-background-task expo-secure-store expo-sqlite @sentry/react-native
```

If backend contracts are stable, also consider:

```bash
pnpm add openapi-fetch
```

### Packages to Keep but Constrain

- `apisauce` can remain as the low-level HTTP adapter, but only inside infrastructure modules
- `react-native-mmkv` should remain limited to preferences, lightweight caches, and non-secret device state
- Reactotron stays development-only and must not leak into production architecture decisions

### Generator Usage Policy

- use `ignite-cli generate component` for new generic shared components
- customize `ignite/templates/component` so generated components default to the Ignite theme hook, `$` style naming, and colocated tests where appropriate
- use generators as the default entry point for new reusable UI so the codebase stays structurally consistent
- review generated output before commit; generators enforce shape, but architecture rules still govern boundaries

## Reference Bootstrap Composition

At app startup, initialize in this order:

See [ADR-004: Use Composition-Root Dependency Injection and Thin App Bootstrap](./adr/004-dependency-injection-and-bootstrap.md).

1. config and env
2. telemetry
3. database and migrations
4. secure session restore
5. query client
6. notifications and background task registration
7. route rendering

Keep the root layout thin and move bootstrap orchestration into `src/bootstrap/app-bootstrap.ts`.

## Non-Negotiable Guardrails

- no screen talks directly to raw API clients
- no feature stores remote entities as ad hoc component state
- no secrets in MMKV
- no unversioned storage payloads for durable data
- no cross-feature deep imports
- no business-critical logic depending solely on background execution windows

## Final Recommendation

Use a local-first, modular clean architecture with React Query for server state, SQLite plus Drizzle for durable offline data, MMKV for lightweight preferences, and Expo platform services wrapped behind infrastructure ports. Keep Ignite for productivity, but stop organizing feature code around generic technical folders. Organize the app around domains and use cases, enforce boundaries in CI, and treat sync, notification handling, and release operations as first-class architecture concerns from the start.
