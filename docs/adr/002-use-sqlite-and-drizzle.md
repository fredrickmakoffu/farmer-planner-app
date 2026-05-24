# ADR-002: Use SQLite and Drizzle for Durable Local Data

## Status

Accepted

## Context

The application is expected to support budgeting workflows, history, offline access, sync checkpoints, and durable device-side records. MMKV is already present and works well for fast key-value storage, but it is not a good fit for relational data, queryable history, migrations, or conflict-aware synchronization.

The architecture needs a local store that supports:

- structured tables and explicit schemas
- forward migrations
- indexed queries and joins
- durable offline reads
- an outbox and sync metadata
- repository-backed abstractions instead of ad hoc blobs

## Decision

Use SQLite as the durable on-device database and Drizzle ORM as the schema and query layer.

Scope:

- SQLite stores business data that must survive restarts and support offline-first behavior
- Drizzle defines schema, migrations, and typed query access
- MMKV remains in use only for lightweight preferences and non-secret key-value state
- Secure Store is used for secrets

Tables in the current schema:

- categories
- routines
- expense_events
- outbox
- sync_checkpoints

Future iterations will add `households`, `members`, `budgets`, `budget_categories`, `notifications_inbox` as those features are built.

## Consequences

Positive:

- durable structured storage that matches the local-first architecture
- migration support for evolving features
- typed query and repository implementations
- explicit foundation for sync metadata and outbox processing

Tradeoffs:

- adds database complexity to the mobile app
- requires migration discipline during feature development
- increases testing scope because repository and migration paths need coverage

Operational implications:

- create a shared database bootstrap module under `src/shared/infrastructure/database`
- commit migrations to source control
- block app startup on failed required migrations
- add integration tests for repositories against a test database

## Implementation Note (2026-05-24)

The migration runner is a custom sequential runner, not `drizzle-kit push` or `drizzle-kit generate`. Each migration is a TypeScript file with `up()` and `down()` functions tracked by a `_migrations` table. `drizzle-kit` is not used at runtime. See [docs/migrations.md](../migrations.md) for the full workflow.

## Alternatives Considered

### MMKV only

Rejected because it is not sufficient for relational querying, versioned schema evolution, or robust offline synchronization.

### Raw SQLite without ORM

Rejected for now because the team benefits from typed schema definitions, centralized migrations, and a more maintainable query layer.

### WatermelonDB or Realm

Rejected for now because SQLite plus Drizzle is a smaller and more explicit fit for the current architecture, with fewer additional abstractions than a heavier mobile database framework.
