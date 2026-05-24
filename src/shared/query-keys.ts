export const expensesKeys = {
  all: ["expenses"] as const,
  categories: () => ["expenses", "categories"] as const,
  routines: () => ["expenses", "routines"] as const,
  events: () => ["expenses", "events"] as const,
  prediction: () => ["expenses", "prediction"] as const,
}

export default expensesKeys
