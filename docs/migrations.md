# Migrations

This is the canonical reference for how Tapp manages its on-device SQLite schema. Read this before adding any new table, column, or data change.

Related references:

- Architecture decisions: [docs/architecture.md](./architecture.md)
- SQLite and Drizzle ADR: [docs/adr/002-use-sqlite-and-drizzle.md](./adr/002-use-sqlite-and-drizzle.md)
- Code quality rules: [docs/CODE_QUALITY.md](./CODE_QUALITY.md)

---

## How It Works

Tapp uses a custom sequential migration runner. There is no external migration CLI and no connection to `drizzle-kit push` or `drizzle-kit generate` at runtime.

The runner lives at `src/shared/infrastructure/database/migrator.ts`. At app startup it:

1. Creates a `_migrations` table if it does not exist.
2. Reads all migration IDs already recorded in `_migrations`.
3. For each migration in `MIGRATIONS` that has not been applied, runs its `up()` statements inside a single `withTransactionSync` transaction, then records the migration ID.
4. Skips migrations that are already recorded.

**Legacy DB detection:** if the `_migrations` table is empty but the `categories` table already exists (created by the old `initDatabase()` approach), the runner stamps all migrations as applied without re-running DDL. This preserves existing dev data across the upgrade.

---

## File Structure

```
src/shared/infrastructure/database/
  migrations/
    2026_05_24_000001_create_categories_table.ts
    2026_05_24_000002_create_routines_table.ts
    2026_05_24_000003_create_expense_events_table.ts
    2026_05_24_000004_create_outbox_table.ts
    2026_05_24_000005_create_sync_checkpoints_table.ts
  migrations.ts     ← import list + MIGRATIONS array
  migrator.ts       ← runner: runMigrations(), rollbackMigration()
  index.ts          ← getDatabase(), initDatabase()
scripts/
  make-migration.js ← generator script
```

Individual migration files own their own `up()` and `down()` logic. `migrations.ts` is only an ordered import list. The runner does not touch individual files.

---

## Adding a New Migration

### Step 1 — Generate the file

```bash
pnpm migrate:make <migration_name>
```

The name should be lowercase with underscores and describe the change precisely:

```bash
pnpm migrate:make create_budgets_table
pnpm migrate:make add_currency_column_to_expense_events
pnpm migrate:make seed_default_budget_periods
```

The script places the new file in `src/shared/infrastructure/database/migrations/` with:
- Today's date as the prefix (`YYYY_MM_DD`)
- A zero-padded sequence number (next available ID)
- Your migration name as the suffix

It also prints exactly what to add to `migrations.ts`.

### Step 2 — Fill in `up()` and `down()`

Open the generated file and complete both functions:

```typescript
import type { Migration } from "../migrations"

function up(): string[] {
  return [
    `CREATE TABLE IF NOT EXISTS budgets (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT    NOT NULL,
      amount     INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    )`,
  ]
}

function down(): string[] {
  return [`DROP TABLE IF EXISTS budgets`]
}

const migration: Migration = {
  id: 6,
  name: "2026_05_25_000006_create_budgets_table",
  up,
  down,
}

export default migration
```

`up()` and `down()` are plain functions that return arrays of SQL strings. Because they are functions, you can compose them from named helpers:

```typescript
function createTable(): string {
  return `CREATE TABLE IF NOT EXISTS budgets (...)`
}

function seedDefaults(): string[] {
  return [/* INSERT statements */]
}

function up(): string[] {
  return [createTable(), ...seedDefaults()]
}
```

### Step 3 — Register in `migrations.ts`

Add the import and append to the array. The generator prints the exact lines:

```typescript
// migrations.ts
import migration_20260525_000006 from "./migrations/2026_05_25_000006_create_budgets_table"

export const MIGRATIONS: Migration[] = [
  // ...existing migrations...
  migration_20260525_000006,
]
```

Order in the array is the order of application. Never reorder or remove existing entries.

---

## Writing `up()`

`up()` runs inside a transaction. If any statement throws, the entire migration is rolled back and the error propagates to the bootstrap, preventing the app from starting in a broken state.

**Rules:**

- Use `CREATE TABLE IF NOT EXISTS` for new tables — safe to re-run if stamping fails mid-way.
- Use `ALTER TABLE ... ADD COLUMN` for additive column changes. SQLite does not support dropping columns; plan for that in a separate migration.
- Seed data belongs in `up()` alongside the table creation it depends on. Guard inserts with `WHERE NOT EXISTS` to make them idempotent.
- Multiple statements are fine — the whole array runs as one transaction.
- Do not mix DDL and DML across unrelated tables in a single migration. Keep each migration focused on one change.

**Common patterns:**

```sql
-- Add a new table
CREATE TABLE IF NOT EXISTS budgets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL
)

-- Add a column to an existing table
ALTER TABLE expense_events ADD COLUMN currency TEXT NOT NULL DEFAULT 'KES'

-- Idempotent seed insert
INSERT INTO categories (name, icon, is_system)
SELECT 'Bills', 'receipt', 1
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Bills')
```

---

## Writing `down()`

`down()` must reverse exactly what `up()` did. The runner applies `down()` statements inside a transaction and removes the migration record from `_migrations`.

**Rules:**

- `DROP TABLE IF EXISTS` for tables created in `up()`.
- For `ADD COLUMN`, SQLite does not support `DROP COLUMN` before version 3.35. If the minimum SQLite version in the Expo SDK supports it, use `ALTER TABLE ... DROP COLUMN`. Otherwise, the rollback may require recreating the table without the column — document this clearly.
- Seed data inserted in `up()` is automatically removed when the table is dropped. If you seeded into an existing table, the `down()` must explicitly delete those rows.

---

## Rolling Back (Development Only)

`rollbackMigration` is exported from `migrator.ts` and can be called from `app-bootstrap.ts` during development:

```typescript
import { rollbackMigration } from "@/shared/infrastructure/database/migrator"

// Roll back the last applied migration
rollbackMigration(db, 1)

// Roll back the last 3 applied migrations
rollbackMigration(db, 3)
```

Rollback is a development tool. It is not designed for production use — on-device SQLite databases belong to users and cannot be reached from a desktop script.

---

## Rules

1. **Never edit a past migration.** Once a migration is applied it is permanent. Add a new migration to change what a past one did.
2. **Prefer additive changes.** Add columns and tables before removing them. Multi-phase approach for destructive changes: add new structure → dual-write → backfill → remove old in a later migration.
3. **Never remove or reorder entries in `MIGRATIONS`.** IDs must remain stable — the runner uses them to track what has been applied.
4. **`down()` must mirror `up()` exactly.** An incomplete rollback leaves the database in an undefined state.
5. **One concern per migration file.** A migration that adds a table and unrelated columns to another table is harder to roll back and harder to review.
6. **Migration IDs are sequential integers starting at 1.** The generator assigns the next available ID automatically. Never reuse an ID.

---

## Testing

Every migration that creates a table used by a repository should have at least a basic integration test verifying that the table and its columns exist after the migration runs.

Pattern: open an in-memory or temp-file SQLite database, run `runMigrations(db)`, then assert against the schema using `SELECT * FROM sqlite_master` or by exercising the repository methods that depend on it.

Add migration integration tests alongside the repository tests that depend on the new schema.
