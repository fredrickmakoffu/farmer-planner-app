import * as SQLite from "expo-sqlite"

import { runMigrations } from "./migrator"

export type Db = SQLite.SQLiteDatabase

export function getDatabase(): Db {
  return SQLite.openDatabaseSync("tapp.db")
}

export function initDatabase(): Db {
  const db = getDatabase()
  runMigrations(db)
  return db
}
