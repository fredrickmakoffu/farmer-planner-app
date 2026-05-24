# ADR-004: Use Composition-Root Dependency Injection and Thin App Bootstrap

## Status

Accepted

## Context

The architecture already commits to explicit boundaries between domain, application, infrastructure, and presentation. The remaining implementation risk is how those layers are actually wired together at runtime.

Without a clear bootstrap and dependency-injection strategy, the codebase will tend to drift toward:

- screens importing infrastructure implementations directly
- singleton-heavy modules with hidden global state
- startup logic spread across route files, hooks, and utilities
- difficult-to-test use cases that construct their own dependencies
- inconsistent lifecycle handling for config, telemetry, database, session restore, notifications, and sync registration

This is especially important in the current Ignite and Expo Router setup because the root layout is the first obvious place to initialize everything, which can easily turn it into a large untestable shell component.

## Decision

Use a composition-root approach to dependency injection with a thin app bootstrap layer.

Rules:

- all infrastructure implementations are instantiated in a small number of bootstrap modules, not inside feature screens or use cases
- constructor injection is the default for application services and use cases
- route files and screen components depend on application-facing hooks, factories, or providers, not concrete infrastructure classes
- the root layout remains thin and delegates startup orchestration to `src/bootstrap/app-bootstrap.ts`
- shared dependency registration lives in `src/bootstrap/container.ts`
- dependencies with process lifetime, such as query client, database handle, API client, telemetry client, and sync engine, are created once in the composition root and exposed through explicit interfaces

Recommended bootstrap order:

1. load config and environment
2. initialize telemetry and crash reporting
3. initialize database and run required migrations
4. restore secure session state
5. create shared clients such as QueryClient and API adapters
6. register notifications and background tasks
7. render routes after bootstrap readiness is confirmed

Recommended dependency model:

- `domain` defines contracts where needed
- `application` receives dependencies through constructors or factory functions
- `infrastructure` implements the contracts
- `bootstrap` composes concrete implementations and exposes them to presentation through providers or typed service accessors

Do not introduce a heavyweight DI framework unless the manual composition model becomes demonstrably unmanageable. Start with explicit factories, modules, and providers.

## Consequences

Positive:

- use cases remain easy to unit test with fake dependencies
- startup behavior becomes explicit and easier to reason about
- presentation code is less likely to bypass architecture boundaries
- global resources such as database and query client get a single well-defined lifecycle
- the root layout stays small and focused on rendering

Tradeoffs:

- requires disciplined wiring rather than ad hoc imports
- introduces some boilerplate in factories and provider setup
- developers need to understand where dependencies are registered before adding new infrastructure

Operational implications:

- create `src/bootstrap/app-bootstrap.ts` for startup sequencing and readiness
- create `src/bootstrap/container.ts` for dependency wiring
- add test helpers that can substitute the container or inject fake providers
- keep feature entry points small and prevent direct construction of infrastructure classes in presentation code

## Implementation Note (2026-05-24)

The composition-root approach is fully implemented. `src/bootstrap/` contains: `app-bootstrap.ts` (startup sequencing), `container.ts` (singleton DI container), `register-infrastructure.ts` (wires SQLite repos into the container), `query-client.ts` (shared QueryClient), `AppProviders.tsx` (mounts all providers), `migration-runner.ts` (invokes `runMigrations` at startup), and `notifications.ts` (registers notification handlers). The root `_layout.tsx` stays thin and delegates to `AppProviders`.

## Alternatives Considered

### Direct imports and module singletons everywhere

Rejected because it hides dependencies, weakens testability, and encourages presentation-to-infrastructure coupling.

### Service locator pattern exposed broadly across the app

Rejected as the primary pattern because it can turn dependency flow into hidden global lookup. A small internal container is acceptable at the composition root, but feature code should still receive explicit dependencies.

### Heavyweight DI framework

Rejected for now because the current app size and stack do not justify the added abstraction and indirection. Manual composition is sufficient and easier for the team to reason about.
