/*
  Database bootstrap — expo-sqlite v55 (SDK 55) synchronous API.
  openDatabaseSync returns a SQLiteDatabase with runSync / getAllSync / getFirstSync / execSync.
  The old openDatabase / transaction / executeSql callback API is gone.
*/
import * as SQLite from "expo-sqlite"

export type Db = SQLite.SQLiteDatabase

export function getDatabase(): Db {
  return SQLite.openDatabaseSync("tapp.db")
}

/** Run a single DDL statement, silently ignoring errors (e.g. duplicate column). */
function runDdlSafe(db: Db, sql: string): void {
  try {
    db.execSync(sql)
  } catch {
    // already applied — ignore
  }
}

export function initDatabase(): Db {
  const db = getDatabase()

  // Base schema — idempotent CREATE TABLE IF NOT EXISTS
  const createStatements = [
    `CREATE TABLE IF NOT EXISTS categories (
       id INTEGER PRIMARY KEY AUTOINCREMENT,
       name TEXT NOT NULL,
       color_hex TEXT NOT NULL DEFAULT '#CCCCCC',
       default_amount INTEGER,
       icon TEXT NOT NULL DEFAULT 'dots-horizontal',
       is_system INTEGER NOT NULL DEFAULT 0
     );`,
    `CREATE TABLE IF NOT EXISTS routines (
       id INTEGER PRIMARY KEY AUTOINCREMENT,
       name TEXT NOT NULL,
       category_id INTEGER NOT NULL DEFAULT 0,
       time_start INTEGER NOT NULL DEFAULT 0,
       time_end INTEGER NOT NULL DEFAULT 1439,
       days_of_week INTEGER NOT NULL DEFAULT 127,
       is_high_confidence INTEGER NOT NULL DEFAULT 0,
       default_amount INTEGER NOT NULL DEFAULT 0
     );`,
    `CREATE TABLE IF NOT EXISTS expense_events (
       id INTEGER PRIMARY KEY AUTOINCREMENT,
       amount INTEGER NOT NULL,
       category_id INTEGER,
       created_at INTEGER NOT NULL
     );`,
    `CREATE TABLE IF NOT EXISTS outbox (
       id INTEGER PRIMARY KEY AUTOINCREMENT,
       payload TEXT NOT NULL,
       created_at INTEGER NOT NULL
     );`,
    `CREATE TABLE IF NOT EXISTS sync_checkpoints (
       id INTEGER PRIMARY KEY AUTOINCREMENT,
       last_synced_at INTEGER
     );`,
  ]

  for (const sql of createStatements) {
    db.execSync(sql)
  }

  // Additive migrations — safe on existing DBs
  const alterStatements = [
    `ALTER TABLE categories ADD COLUMN color_hex TEXT NOT NULL DEFAULT '#CCCCCC';`,
    `ALTER TABLE categories ADD COLUMN default_amount INTEGER;`,
    `ALTER TABLE categories ADD COLUMN icon TEXT NOT NULL DEFAULT 'dots-horizontal';`,
    `ALTER TABLE categories ADD COLUMN is_system INTEGER NOT NULL DEFAULT 0;`,
    `ALTER TABLE routines ADD COLUMN category_id INTEGER NOT NULL DEFAULT 0;`,
    `ALTER TABLE routines ADD COLUMN time_start INTEGER NOT NULL DEFAULT 0;`,
    `ALTER TABLE routines ADD COLUMN time_end INTEGER NOT NULL DEFAULT 1439;`,
    `ALTER TABLE routines ADD COLUMN days_of_week INTEGER NOT NULL DEFAULT 127;`,
    `ALTER TABLE routines ADD COLUMN is_high_confidence INTEGER NOT NULL DEFAULT 0;`,
    `ALTER TABLE routines ADD COLUMN default_amount INTEGER NOT NULL DEFAULT 0;`,
    `ALTER TABLE expense_events ADD COLUMN confirmed_at INTEGER;`,
    `ALTER TABLE routines ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;`,
    `ALTER TABLE expense_events ADD COLUMN notes TEXT;`,
  ]

  for (const sql of alterStatements) {
    runDdlSafe(db, sql)
  }

  seedDefaultCategories(db)

  return db
}

// ---------------------------------------------------------------------------
// Default categories — idempotent seed
// ---------------------------------------------------------------------------

type SeedCategory = { name: string; color_hex: string; icon: string }

const DEFAULT_CATEGORIES: SeedCategory[] = [
  { name: "Food",      color_hex: "#C97A4A", icon: "silverware-fork-knife" },
  { name: "Transport", color_hex: "#4E9A6A", icon: "bus"                   },
  { name: "Groceries", color_hex: "#C4A028", icon: "cart"                  },
  { name: "Utilities", color_hex: "#3D7AB5", icon: "lightning-bolt"        },
  { name: "Leisure",   color_hex: "#9050B8", icon: "movie-open"            },
  { name: "Health",    color_hex: "#3E9E6A", icon: "medical-bag"           },
  { name: "Shopping",  color_hex: "#C2664A", icon: "shopping"              },
  { name: "Misc",      color_hex: "#7A7468", icon: "dots-horizontal"       },
]

function seedDefaultCategories(db: Db): void {
  for (const cat of DEFAULT_CATEGORIES) {
    db.runSync(
      `INSERT INTO categories (name, color_hex, default_amount, icon, is_system)
       SELECT ?, ?, NULL, ?, 1
       WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = ?);`,
      [cat.name, cat.color_hex, cat.icon, cat.name],
    )
  }
}
