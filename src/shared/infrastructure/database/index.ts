import * as SQLite from "expo-sqlite"

import { runMigrations } from "./migrator"

export type Db = SQLite.SQLiteDatabase

export async function getDatabase(): Promise<Db> {
  return SQLite.openDatabaseAsync("tapp.db")
}

export async function initDatabase(): Promise<Db> {
  const db = await getDatabase()
  runMigrations(db)
  return db
}
