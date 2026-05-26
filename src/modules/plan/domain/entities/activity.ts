// Pure domain types — no framework imports

export type Priority = "High" | "Medium" | "Low"

export type PlanActivity = {
  id: string
  name: string
  icon: string
  priority: Priority
  durationMinutes: number
  done: boolean
  aiTip?: string
  tools?: string[]
}
