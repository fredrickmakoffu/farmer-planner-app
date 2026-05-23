export type ExpenseEvent = {
  id?: number
  amount: number
  category_id?: number | null
  created_at?: number
  confirmed_at?: number | null
}

export default ExpenseEvent
