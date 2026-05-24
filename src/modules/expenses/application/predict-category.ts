import type { CategoryRepository } from "@/modules/expenses/domain/repositories/category-repository"
import type { ExpenseEventRepository } from "@/modules/expenses/domain/repositories/expense-event-repository"
import type { RoutineRepository } from "@/modules/expenses/domain/repositories/routine-repository"

export type PredictionSource = "routine" | "history" | "fallback"

export type PredictionResult = {
  categoryId: number | null
  defaultAmount: number
  source: PredictionSource
  routineName?: string  // the user's label, e.g. "going to work"
}

/** Convert a Date to minutes from midnight (0–1439). */
function toMinutes(date: Date): number {
  return date.getHours() * 60 + date.getMinutes()
}

/**
 * Returns the JS day-of-week bit for a Date.
 * Sunday=bit0 … Saturday=bit6, matching the Routine.days_of_week bitmask.
 */
function dayBit(date: Date): number {
  return 1 << date.getDay()
}

/**
 * V2 prediction pipeline:
 * 1. Match current time + day against user-configured routine windows (primary).
 *    When multiple routines share a time slot, the one predicted is determined by
 *    how many expenses have already been logged in that window today (round-robin
 *    by sort_order so the first tap → routine #1, second tap → routine #2, etc.).
 * 2. Fall back to historical frequency for the same time-of-day window.
 * 3. Fall back to the first category found.
 *
 * Returns { categoryId, defaultAmount, source }.
 */
export async function predictCategory(
  categoryRepo: CategoryRepository,
  expenseRepo: ExpenseEventRepository,
  routineRepo?: RoutineRepository,
  nowMs?: number,
): Promise<PredictionResult> {
  const now = new Date(nowMs ?? Date.now())
  const currentMinutes = toMinutes(now)
  const currentDayBit = dayBit(now)

  // Fetch all events up front — used for both routine tap-count and history fallback
  const events = await expenseRepo.findAll()

  // 1. Routine-window match
  if (routineRepo) {
    const routines = await routineRepo.findAll()
    const matches = routines
      .filter(
        (r) =>
          r.category_id &&
          (r.days_of_week & currentDayBit) !== 0 &&
          currentMinutes >= r.time_start &&
          currentMinutes < r.time_end,
      )
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))

    if (matches.length > 0) {
      const { time_start, time_end } = matches[0]

      // Count expenses logged today within this time window to pick the next routine
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
      const todayEnd = todayStart + 86_400_000
      const tapsInWindow = events.filter((e) => {
        if (!e.created_at) return false
        return (
          e.created_at >= todayStart &&
          e.created_at < todayEnd &&
          toMinutes(new Date(e.created_at)) >= time_start &&
          toMinutes(new Date(e.created_at)) < time_end
        )
      })

      const match = matches[tapsInWindow.length % matches.length]
      return {
        categoryId: match.category_id,
        defaultAmount: match.default_amount ?? 0,
        source: "routine",
        routineName: match.name,
      }
    }
  }

  // 2. Historical frequency fallback — find the most common category used within
  //    ±90 minutes of the current time across all past events
  const WINDOW_MINUTES = 90
  const eventsInWindow = events.filter((e) => {
    if (!e.created_at) return false
    const pastMinutes = toMinutes(new Date(e.created_at))
    const diff = Math.abs(pastMinutes - currentMinutes)
    return Math.min(diff, 1440 - diff) <= WINDOW_MINUTES
  })

  if (eventsInWindow.length > 0) {
    const counts = new Map<number, number>()
    for (const ev of eventsInWindow) {
      if (!ev.category_id) continue
      counts.set(ev.category_id as number, (counts.get(ev.category_id as number) ?? 0) + 1)
    }
    let bestId: number | null = null
    let bestCount = 0
    for (const [id, c] of counts.entries()) {
      if (c > bestCount) { bestCount = c; bestId = id }
    }
    if (bestId !== null) return { categoryId: bestId, defaultAmount: 0, source: "history" }
  }

  // 3. First category fallback
  const categories = await categoryRepo.findAll()
  return {
    categoryId: categories.length ? (categories[0].id ?? null) : null,
    defaultAmount: 0,
    source: "fallback",
  }
}

export default predictCategory
