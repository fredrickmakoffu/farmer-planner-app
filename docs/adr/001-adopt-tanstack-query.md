# ADR-001: Adopt TanStack Query for Server State

## Status

Accepted

## Context

The app needs a clear distinction between server-owned state and client-owned state. The current Ignite baseline does not yet provide a dedicated server-state solution, but the architecture requires:

- normalized handling of loading, error, retry, and refresh states
- cache invalidation after commands and mutations
- stale-while-revalidate behavior
- reconnect and foreground refetch support
- a consistent hook model across modules
- compatibility with offline-aware reads and writes

Without a dedicated server-state layer, screens and feature hooks tend to accumulate transport, retry, and cache concerns directly in presentation code.

## Decision

Adopt TanStack Query as the default server-state library for all remote data retrieval and mutation orchestration.

Rules:

- all backend reads exposed to presentation code go through feature query hooks backed by TanStack Query
- query functions live in infrastructure adapters, not in route files or screen components
- query keys are defined centrally by feature
- mutation success updates either invalidate or optimistically update relevant queries
- responses are validated at the infrastructure boundary before entering application or domain layers
- TanStack Query is not the source of truth for durable business data that must survive restarts offline; that responsibility belongs to the local database

## Consequences

Positive:

- consistent handling of loading, stale, retry, and error states across features
- less bespoke cache code in screens and hooks
- simpler background refresh on app foreground and reconnect
- clearer separation between server state, UI state, and durable local state

Tradeoffs:

- adds another core dependency and mental model for the team
- requires discipline around query keys and invalidation to avoid cache drift
- some reads will need explicit coordination between React Query and the local database

Operational implications:

- create a shared query client in `src/bootstrap/query-client.ts`
- define per-feature query key factories
- add testing helpers for QueryClient-backed hooks and screens

## Implementation Note (2026-05-24)

TanStack Query is fully wired. The shared query client lives in `src/bootstrap/query-client.ts` and is mounted in `AppProviders`. Per-feature query key factories are in `src/shared/query-keys.ts`. All five product screens (`TapToLogScreen`, `DailyReviewScreen`, `CategoriesScreen`, `RoutinesScreen`, `FamilyScreen`) have been migrated from manual `useState`/`loadData` callbacks to `useQuery` and `useMutation` (PR #20).

## Alternatives Considered

### Zustand for remote state

Rejected because it would blur the line between server state and client-owned state, and would require the team to rebuild cache invalidation, retries, staleness, and refresh logic manually.

### Raw hooks and custom fetch logic

Rejected because it does not scale well across modules and encourages duplicated loading, caching, and error-handling behavior.

### Apollo or Relay

Rejected for now because the current stack is not GraphQL-first and the added abstraction is not justified by the present backend assumptions.
