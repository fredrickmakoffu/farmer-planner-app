import { MIGRATIONS } from "./migrations"

import type { Db } from "./index"

function createMigrationsTable(db: Db): void {
  db.execSync(
    `CREATE TABLE IF NOT EXISTS _migrations (
       id         INTEGER PRIMARY KEY,
       name       TEXT    NOT NULL,
       applied_at INTEGER NOT NULL
     )`,
  )
}

function appliedMigrationIds(db: Db): Set<number> {
  const rows = db.getAllSync<{ id: number }>("SELECT id FROM _migrations")
  return new Set(rows.map((r) => r.id))
}

/**
 * If the DB was created by the old idempotent initDatabase() it won't have a
 * _migrations table, but it already has the full schema. Stamp every known
 * migration as applied so the runner skips them rather than re-running DDL.
 */
function isLegacyDatabase(db: Db): boolean {
  const row = db.getFirstSync<{ n: number }>(
    `SELECT COUNT(*) AS n FROM sqlite_master WHERE type='table' AND name='categories'`,
  )
  return (row?.n ?? 0) > 0
}

function stampAll(db: Db, applied: Set<number>): void {
  const now = Date.now()
  for (const m of MIGRATIONS) {
    if (!applied.has(m.id)) {
      db.runSync(`INSERT OR IGNORE INTO _migrations (id, name, applied_at) VALUES (?, ?, ?)`, [
        m.id,
        m.name,
        now,
      ])
    }
  }
}

export function runMigrations(db: Db): void {
  createMigrationsTable(db)

  const applied = appliedMigrationIds(db)

  // Legacy database created by the old initDatabase() — stamp and skip.
  if (applied.size === 0 && isLegacyDatabase(db)) {
    stampAll(db, applied)
    return
  }

  for (const migration of MIGRATIONS) {
    if (applied.has(migration.id)) continue

    db.withTransactionSync(() => {
      for (const sql of migration.up()) {
        db.execSync(sql)
      }
      db.runSync(`INSERT INTO _migrations (id, name, applied_at) VALUES (?, ?, ?)`, [
        migration.id,
        migration.name,
        Date.now(),
      ])
    })

    console.debug(`MIGRATIONS: applied ${migration.name}`)
  }
}

/**
 * Roll back the last `steps` applied migrations in reverse order.
 * Intended for development use — call from app-bootstrap in dev mode if needed.
 */
export function rollbackMigration(db: Db, steps = 1): void {
  createMigrationsTable(db)

  const applied = appliedMigrationIds(db)

  const toRollback = [...MIGRATIONS]
    .filter((m) => applied.has(m.id))
    .sort((a, b) => b.id - a.id)
    .slice(0, steps)

  for (const migration of toRollback) {
    db.withTransactionSync(() => {
      for (const sql of migration.down()) {
        db.execSync(sql)
      }
      db.runSync(`DELETE FROM _migrations WHERE id = ?`, [migration.id])
    })

    console.debug(`MIGRATIONS: rolled back ${migration.name}`)
  }
}
