export type Routine = {
  id?: number
  name: string
  category_id: number
  /** Minutes from midnight (0–1439). e.g. 7:00am = 420 */
  time_start: number
  /** Minutes from midnight (0–1439). e.g. 9:00am = 540 */
  time_end: number
  /**
   * Bitmask of active days: bit 0 = Sunday … bit 6 = Saturday.
   * 0x7F (127) = every day, 0x1F (31) = Mon–Fri.
   */
  days_of_week: number
  /** When true the system may generate a Shadow Event if no tap is recorded. */
  is_high_confidence: boolean
  /** Default expense amount in KSh for this routine window (0 = not set). */
  default_amount: number
  /** Display order within the same time slot group (0 = first to be predicted). */
  sort_order?: number
}

export default Routine
