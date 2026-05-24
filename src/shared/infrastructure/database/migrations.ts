import migration_20260524_000001 from "./migrations/2026_05_24_000001_create_categories_table"
import migration_20260524_000002 from "./migrations/2026_05_24_000002_create_routines_table"
import migration_20260524_000003 from "./migrations/2026_05_24_000003_create_expense_events_table"
import migration_20260524_000004 from "./migrations/2026_05_24_000004_create_outbox_table"
import migration_20260524_000005 from "./migrations/2026_05_24_000005_create_sync_checkpoints_table"

// Add new migration imports here as the schema evolves.
// Order matters — migrations are applied in the sequence they appear in this array.
// Never remove or reorder past entries.

export interface Migration {
  id: number
  name: string
  /** Returns statements to apply this migration (run in a transaction). */
  up: () => string[]
  /** Returns statements to reverse this migration (run in a transaction). */
  down: () => string[]
}

export const MIGRATIONS: Migration[] = [
  migration_20260524_000001,
  migration_20260524_000002,
  migration_20260524_000003,
  migration_20260524_000004,
  migration_20260524_000005,
]
