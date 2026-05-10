/*
  Database bootstrap moved here per ADR-002.
  This file initializes the on-device SQLite database and runs basic migrations.
*/
import * as SQLite from "expo-sqlite"

export function getDatabase() {
  const sqlite: any = SQLite
  if (typeof sqlite.openDatabase === "function") return sqlite.openDatabase("tapp.db")
  if (typeof sqlite.openDatabaseSync === "function") return sqlite.openDatabaseSync("tapp.db")
  throw new Error("expo-sqlite: openDatabase is not available in this runtime")
}

function createInMemoryDb() {
  console.warn("DB: creating in-memory fallback database (dev only)")

  const state: any = {
    categories: [],
    routines: [],
    expense_events: [],
    outbox: [],
    checkpoints: [],
    nextCategoryId: 0,
    nextRoutineId: 0,
    nextExpenseId: 0,
    nextOutboxId: 0,
  }

  function makeRows(items: any[]) {
    return {
      length: items.length,
      item: (i: number) => items[i],
    }
  }

  const tx = {
    executeSql(sql: string, params: any[] = [], success?: Function, error?: Function) {
      try {
        const s = sql.trim()

        if (/^CREATE TABLE IF NOT EXISTS/i.test(s) || /^ALTER TABLE/i.test(s)) {
          success && success(tx, { rows: makeRows([]) })
          return
        }

        // Categories: INSERT (name, color_hex, default_amount, icon, is_system)
        if (
          /^INSERT\s+INTO\s+categories\s*\(name\s*,\s*color_hex\s*,\s*default_amount\s*,\s*icon\s*,\s*is_system\)\s*VALUES\s*\(\?\s*,\s*\?\s*,\s*\?\s*,\s*\?\s*,\s*\?\)/i.test(s)
        ) {
          const [name, color_hex, default_amount, icon, is_system] = params
          const id = ++state.nextCategoryId
          state.categories.push({ id, name, color_hex, default_amount: default_amount ?? null, icon: icon ?? "dots-horizontal", is_system: is_system ?? 0 })
          success && success(tx, { insertId: id, rows: makeRows([]) })
          return
        }

        // Categories: SELECT ALL
        if (
          /^SELECT\s+id\s*,\s*name\s*,\s*color_hex\s*,\s*default_amount\s*,\s*icon\s*,\s*is_system\s+FROM\s+categories;?$/i.test(s)
        ) {
          success && success(tx, { rows: makeRows(state.categories) })
          return
        }

        // Categories: SELECT BY ID
        if (
          /^SELECT\s+id\s*,\s*name\s*,\s*color_hex\s*,\s*default_amount\s*,\s*icon\s*,\s*is_system\s+FROM\s+categories\s+WHERE\s+id\s*=\s*\?\s+LIMIT\s+1;?$/i.test(s)
        ) {
          const id = params[0]
          const rows = state.categories.filter((c: any) => c.id === id)
          success && success(tx, { rows: makeRows(rows) })
          return
        }

        // Categories: UPDATE
        if (
          /^UPDATE\s+categories\s+SET\s+name\s*=\s*\?\s*,\s*color_hex\s*=\s*\?\s*,\s*default_amount\s*=\s*\?\s*,\s*icon\s*=\s*\?\s*,\s*is_system\s*=\s*\?\s+WHERE\s+id\s*=\s*\?/i.test(s)
        ) {
          const [name, color_hex, default_amount, icon, is_system, id] = params
          const item = state.categories.find((c: any) => c.id === id)
          if (item) Object.assign(item, { name, color_hex, default_amount, icon, is_system })
          success && success(tx, { rows: makeRows([]) })
          return
        }

        // Categories: DELETE
        if (/^DELETE\s+FROM\s+categories\s+WHERE\s+id\s*=\s*\?/i.test(s)) {
          state.categories = state.categories.filter((c: any) => c.id !== params[0])
          success && success(tx, { rows: makeRows([]) })
          return
        }

        // Routines: INSERT (name, category_id, time_start, time_end, days_of_week, is_high_confidence, default_amount)
        if (/^INSERT\s+INTO\s+routines\s*\(/i.test(s)) {
          const [name, category_id, time_start, time_end, days_of_week, is_high_confidence, default_amount] = params
          const id = ++state.nextRoutineId
          state.routines.push({
            id, name, category_id, time_start, time_end,
            days_of_week, is_high_confidence, default_amount: default_amount ?? 0,
          })
          success && success(tx, { insertId: id, rows: makeRows([]) })
          return
        }

        // Routines: SELECT ALL
        if (/^SELECT\s+.*\s+FROM\s+routines;?$/i.test(s) && !/WHERE/i.test(s)) {
          success && success(tx, { rows: makeRows(state.routines) })
          return
        }

        // Routines: SELECT BY ID
        if (/^SELECT\s+.*\s+FROM\s+routines\s+WHERE\s+id\s*=\s*\?\s+LIMIT\s+1;?$/i.test(s)) {
          const id = params[0]
          const rows = state.routines.filter((r: any) => r.id === id)
          success && success(tx, { rows: makeRows(rows) })
          return
        }

        // Routines: UPDATE
        if (/^UPDATE\s+routines\s+SET\s+name\s*=\s*\?.*WHERE\s+id\s*=\s*\?/i.test(s)) {
          const [name, category_id, time_start, time_end, days_of_week, is_high_confidence, default_amount, id] = params
          const item = state.routines.find((r: any) => r.id === id)
          if (item) Object.assign(item, { name, category_id, time_start, time_end, days_of_week, is_high_confidence, default_amount: default_amount ?? 0 })
          success && success(tx, { rows: makeRows([]) })
          return
        }

        // Routines: DELETE
        if (/^DELETE\s+FROM\s+routines\s+WHERE\s+id\s*=\s*\?/i.test(s)) {
          state.routines = state.routines.filter((r: any) => r.id !== params[0])
          success && success(tx, { rows: makeRows([]) })
          return
        }

        // Expense events: INSERT
        if (
          /^INSERT\s+INTO\s+expense_events\s*\(amount\s*,\s*category_id\s*,\s*created_at\)\s*VALUES\s*\(\?\s*,\s*\?\s*,\s*\?\)/i.test(
            s,
          )
        ) {
          const [amount, categoryId, createdAt] = params
          const id = ++state.nextExpenseId
          state.expense_events.push({
            id,
            amount,
            category_id: categoryId ?? null,
            created_at: createdAt,
          })
          success && success(tx, { insertId: id, rows: makeRows([]) })
          return
        }

        // Expense events: SELECT ALL
        if (
          /^SELECT\s+id\s*,\s*amount\s*,\s*category_id\s*,\s*created_at\s+FROM\s+expense_events\s+ORDER\s+BY\s+created_at\s+DESC;?$/i.test(
            s,
          )
        ) {
          const rows = [...state.expense_events].sort(
            (a: any, b: any) => (b.created_at || 0) - (a.created_at || 0),
          )
          success && success(tx, { rows: makeRows(rows) })
          return
        }

        // Expense events: SELECT BY ID
        if (
          /^SELECT\s+id\s*,\s*amount\s*,\s*category_id\s*,\s*created_at\s+FROM\s+expense_events\s+WHERE\s+id\s*=\s*\?\s+LIMIT\s+1;?$/i.test(
            s,
          )
        ) {
          const rows = state.expense_events.filter((e: any) => e.id === params[0])
          success && success(tx, { rows: makeRows(rows) })
          return
        }

        // Expense events: DELETE
        if (/^DELETE\s+FROM\s+expense_events\s+WHERE\s+id\s*=\s*\?/i.test(s)) {
          state.expense_events = state.expense_events.filter((e: any) => e.id !== params[0])
          success && success(tx, { rows: makeRows([]) })
          return
        }

        // Outbox: INSERT
        if (
          /^INSERT\s+INTO\s+outbox\s*\(payload\s*,\s*created_at\)\s*VALUES\s*\(\?\s*,\s*\?\)/i.test(
            s,
          )
        ) {
          const [payload, createdAt] = params
          const id = ++state.nextOutboxId
          state.outbox.push({ id, payload, created_at: createdAt })
          success && success(tx, { insertId: id, rows: makeRows([]) })
          return
        }

        // Outbox: SELECT
        if (
          /^SELECT\s+id\s*,\s*payload\s+FROM\s+outbox\s+ORDER\s+BY\s+created_at\s+ASC;?$/i.test(s)
        ) {
          success && success(tx, { rows: makeRows(state.outbox) })
          return
        }

        // Outbox: DELETE
        if (/^DELETE\s+FROM\s+outbox\s+WHERE\s+id\s*=\s*\?/i.test(s)) {
          state.outbox = state.outbox.filter((o: any) => o.id !== params[0])
          success && success(tx, { rows: makeRows([]) })
          return
        }

        console.warn("DB: fakeDB unrecognized SQL:", sql)
        success && success(tx, { rows: makeRows([]) })
      } catch (err) {
        console.error("DB: fake executeSql error", err)
        if (typeof error === "function") error(err)
      }
    },
  }

  return {
    transaction(fn: Function, error?: Function, success?: Function) {
      try {
        fn(tx)
        if (typeof success === "function") setTimeout(success, 0)
      } catch (e) {
        if (typeof error === "function") error(e)
      }
    },
    sql: undefined,
    databasePath: ":memory:",
    options: {},
    nativeDatabase: {},
  }
}

/** Run a single ALTER TABLE statement, silently ignoring "duplicate column" errors. */
function runAlterSafe(db: any, sql: string): Promise<void> {
  return new Promise<void>((resolve) => {
    db.transaction(
      (tx: any) => tx.executeSql(sql, []),
      () => resolve(), // SQLite errors on duplicate columns — treat as already applied
      () => resolve(),
    )
  })
}

export async function initDatabase() {
  console.debug("DB: initDatabase() opening database")
  let db: any = getDatabase()

  try {
    console.debug("DB: instance type:", typeof db)
    try {
      console.debug("DB: transaction =>", typeof db?.transaction)
      console.debug("DB: exec =>", typeof db?.exec)
      console.debug("DB: run =>", typeof db?.run)
      if (db && typeof db === "object") console.debug("DB: keys =>", Object.keys(db))
      try {
        console.debug("DB: sql =>", typeof db?.sql)
      } catch (e) {
        console.debug("DB: error while introspecting db.sql", e)
      }
      if (db?.nativeDatabase) {
        try {
          console.debug("DB: nativeDatabase type =>", typeof db.nativeDatabase)
          try {
            console.debug(
              "DB: nativeDatabase keys =>",
              Object.keys(db.nativeDatabase || {}).slice(0, 50),
            )
          } catch (e) {
            console.debug("DB: error while introspecting nativeDatabase keys", e)
          }
        } catch (e) {
          console.debug("DB: error while introspecting nativeDatabase", e)
        }
      }
    } catch (e) {
      console.debug("DB: error while introspecting db", e)
    }

    if (!db || typeof db.transaction !== "function") {
      if (typeof __DEV__ !== "undefined" && __DEV__) {
        console.warn("DB: native transaction API missing — using in-memory fallback (dev only)")
        db = createInMemoryDb()
      } else {
        console.error("DB: invalid database instance - transaction is not a function")
        throw new Error(
          "DB: transaction is not a function. The native `expo-sqlite` binding may be missing or incompatible.",
        )
      }
    }
  } catch (err: any) {
    throw err
  }

  // Base schema — idempotent CREATE TABLE statements with all current columns
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

  await new Promise<void>((resolve, reject) => {
    db.transaction(
      (tx: any) => {
        for (const s of createStatements) tx.executeSql(s, [])
      },
      (error: any) => {
        console.error("DB: transaction error", error)
        reject(error)
      },
      () => {
        console.debug("DB: transaction success")
        resolve()
      },
    )
  })

  // Additive migrations — safe to run on existing DBs that predate the new columns.
  // Each ALTER TABLE is isolated; SQLite errors on duplicate columns are swallowed.
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
  ]

  for (const sql of alterStatements) {
    await runAlterSafe(db, sql)
  }

  return db
}
