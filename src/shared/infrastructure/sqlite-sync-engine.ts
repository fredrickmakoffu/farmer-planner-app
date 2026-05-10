import type { Db } from "@/shared/infrastructure/database"
import type SyncEngine from "@/shared/contracts/sync"

export class SqliteSyncEngine implements SyncEngine {
  private db: Db

  constructor(db: Db) {
    if (!db) throw new Error("Database instance required for SqliteSyncEngine")
    this.db = db
  }

  enqueue(payload: unknown): Promise<void> {
    this.db.runSync(
      `INSERT INTO outbox (payload, created_at) VALUES (?, ?);`,
      [JSON.stringify(payload), Date.now()],
    )
    return Promise.resolve()
  }

  flush(): Promise<void> {
    const rows = this.db.getAllSync(
      `SELECT id, payload FROM outbox ORDER BY created_at ASC;`,
    ) as { id: number; payload: string }[]

    if (rows.length === 0) return Promise.resolve()

    // Minimal flush: remove all outbox rows (real impl would POST then delete)
    this.db.withTransactionSync(() => {
      for (const row of rows) {
        this.db.runSync(`DELETE FROM outbox WHERE id = ?;`, [row.id])
      }
    })
    return Promise.resolve()
  }
}

export default SqliteSyncEngine
