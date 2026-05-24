# ADR-003: Define a Local-First Sync Engine Contract

## Status

Accepted

## Context

The architecture calls for local-first behavior for critical budgeting workflows. That means users must be able to read and often write meaningful data without immediate network availability, while the backend remains authoritative across devices.

The hard part is not only choosing offline storage, but defining the contract between feature use cases, the local database, and the sync process. Without a contract, each feature would invent its own retry, reconciliation, and conflict behavior.

The app needs a sync model that supports:

- local writes when network is unavailable or unreliable
- deterministic retry of commands
- replay-safe transport behavior
- explicit conflict handling per aggregate
- resumable background or foreground sync runs
- observability into failed and pending sync work

## Decision

Adopt a local-first sync contract built around an outbox, checkpoints, and explicit repository responsibilities.

Contract:

1. feature use cases write accepted business changes to the local database first when the workflow is designed to work offline
2. the same use case appends a sync command to an outbox table with a deterministic command ID
3. a sync engine reads pending commands, sends them to the backend, and records acknowledgements or failures
4. server responses update local state through repository or mapper layers rather than directly mutating UI state
5. the sync engine tracks checkpoints for incremental pulls or server snapshots
6. conflicts are handled per aggregate with explicit policies, not a single generic merge rule

Sync contract interfaces should include, at minimum:

- `OutboxRepository`
- `SyncCheckpointRepository`
- `SyncTransport`
- `SyncEngine`
- `ConflictResolver` or aggregate-specific conflict policies

Execution model:

- sync runs on app foreground, reconnect, explicit user action, push-triggered refresh, and permitted background opportunities
- sync tasks must be idempotent and resumable
- business-critical correctness must not depend on guaranteed background execution windows

## Consequences

Positive:

- consistent offline write behavior across modules
- deterministic retry and better observability of pending work
- clear architecture boundary between feature commands and synchronization mechanics
- reduced risk of screens implementing their own ad hoc sync logic

Tradeoffs:

- more moving parts than direct online-only API writes
- requires careful backend contract design for idempotency and replay safety
- aggregate-specific conflict policies must be designed intentionally

Operational implications:

- create shared sync infrastructure under `src/shared/infrastructure`
- add telemetry for outbox depth, sync duration, and sync failure reasons
- document conflict rules per aggregate in feature docs or future ADRs

## Implementation Note (2026-05-24)

The contract is partially implemented. `outbox` and `sync_checkpoints` tables exist in the schema. The `SyncEngine` interface is defined in `src/shared/contracts/sync.ts`. A minimal `SqliteSyncEngine` in `src/shared/infrastructure/sqlite-sync-engine.ts` persists outbox rows and supports a best-effort `flush()` for development use only. Production sync (retries, idempotence, HTTP sender, background flush) is not yet built — it is the prerequisite for multi-device and family features.

## Alternatives Considered

### Online-only writes with opportunistic caching

Rejected because it does not meet the local-first requirement for a budgeting product and creates a fragile user experience under poor connectivity.

### Full event sourcing on device

Rejected for now because it adds complexity beyond what the current product needs. The architecture only requires an outbox plus durable read models, not a full event-sourced client.

### Generic last-write-wins for all conflicts

Rejected because different aggregates have different correctness requirements. Transactions, budgets, membership, and permissions cannot all be reconciled safely with one blanket rule.
