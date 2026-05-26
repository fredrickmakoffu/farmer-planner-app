// Mock data — replace with API responses when backend is available

export type Priority = "High" | "Medium" | "Low"

export type PlanActivity = {
  id: string
  name: string
  priority: Priority
  durationMinutes: number
  done: boolean
  icon: string
  aiTip?: string
  tools?: string[]
}

export const MOCK_PLAN_ACTIVITIES: PlanActivity[] = [
  {
    id: "plan-1",
    name: "Water tomatoes",
    priority: "High",
    durationMinutes: 15,
    done: false,
    icon: "💧",
    aiTip: "Soil moisture is critically low. Water deeply at the plant base, not from above.",
    tools: ["Watering can", "Gloves", "Notebook"],
  },
  {
    id: "plan-2",
    name: "Apply fertiliser",
    priority: "Medium",
    durationMinutes: 30,
    done: true,
    icon: "🌿",
  },
  {
    id: "plan-3",
    name: "Check livestock health",
    priority: "High",
    durationMinutes: 20,
    done: false,
    icon: "🐄",
    aiTip: "Check for signs of bloat or lethargy. The recent heat may have affected hydration levels.",
    tools: ["Thermometer", "Water bucket"],
  },
  {
    id: "plan-4",
    name: "Harvest kale",
    priority: "Medium",
    durationMinutes: 45,
    done: false,
    icon: "🥬",
    aiTip: "Outer leaves are ready. Harvest in the morning for best texture and shelf life.",
    tools: ["Harvest basket", "Gloves", "Knife"],
  },
  {
    id: "plan-5",
    name: "Prepare compost bed",
    priority: "Low",
    durationMinutes: 60,
    done: false,
    icon: "♻️",
  },
]

export const MOCK_CHAT_SUGGESTIONS = [
  "Audit my farm plan",
  "Crops look unhealthy",
  "Rain update",
  "Pest alert",
]

export const MOCK_BOT_GREETING =
  "Hi! I'm your AI farming assistant 🌾 Ask me anything about today's plan."
