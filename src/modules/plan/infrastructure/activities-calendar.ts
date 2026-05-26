// Full-month farming activity calendar
// Used as the local data source when the API is unreachable.
// Generates a deterministic schedule for any date — same date always returns the same set.

import type { PlanActivity, Priority } from "../domain/entities/activity"

// ---------------------------------------------------------------------------
// Activity template pool
// ---------------------------------------------------------------------------

type Template = {
  name: string
  icon: string
  priority: Priority
  durationMinutes: number
  aiTip?: string
  tools?: string[]
}

const POOL: readonly Template[] = [
  // ── Irrigation ──────────────────────────────────────────────────────────
  {
    name: "Water crops",
    icon: "💧",
    priority: "High",
    durationMinutes: 20,
    aiTip: "Water before 9am to cut evaporation loss by up to 30%. Focus on the root zone, not the leaves.",
    tools: ["Hose", "Watering can"],
  },
  {
    name: "Check irrigation system",
    icon: "💦",
    priority: "Medium",
    durationMinutes: 15,
    aiTip: "Look for blocked drippers and pressure drops. A clogged line wastes water and stresses plants.",
  },
  {
    name: "Repair irrigation pipe",
    icon: "🔩",
    priority: "High",
    durationMinutes: 40,
    tools: ["Pipe repair kit", "Duct tape", "Pliers"],
  },

  // ── Soil & fertilisation ────────────────────────────────────────────────
  {
    name: "Apply fertiliser",
    icon: "🌿",
    priority: "Medium",
    durationMinutes: 30,
    aiTip: "Apply NPK 17:17:17 at the base of mature plants. Avoid contact with leaves — it causes burns.",
    tools: ["Gloves", "Spreader"],
  },
  {
    name: "Prepare compost bed",
    icon: "♻️",
    priority: "Low",
    durationMinutes: 45,
    aiTip: "Layer brown (dry) and green (wet) material at 3:1. Turn the pile to speed up decomposition.",
    tools: ["Fork", "Gloves"],
  },
  {
    name: "Soil pH & moisture test",
    icon: "🧪",
    priority: "Medium",
    durationMinutes: 20,
    aiTip: "Optimal pH for tomatoes and kale is 6.0–7.0. Add agricultural lime if reading is below 5.5.",
    tools: ["pH kit", "Moisture probe"],
  },
  {
    name: "Top-dress mature crops",
    icon: "🌱",
    priority: "Medium",
    durationMinutes: 35,
    aiTip: "CAN (calcium ammonium nitrate) at 2 weeks post-germination boosts leafy growth.",
    tools: ["Gloves", "Spreader"],
  },

  // ── Pest & disease ──────────────────────────────────────────────────────
  {
    name: "Pest & disease inspection",
    icon: "🔍",
    priority: "High",
    durationMinutes: 25,
    aiTip: "Check undersides of leaves for aphids and whitefly eggs. Early detection prevents crop loss.",
    tools: ["Magnifying glass", "Log book"],
  },
  {
    name: "Apply pesticide spray",
    icon: "🫧",
    priority: "High",
    durationMinutes: 30,
    aiTip: "Spray at dusk to protect beneficial insects like bees. Avoid spraying before expected rain.",
    tools: ["Knapsack sprayer", "PPE mask", "Gloves"],
  },

  // ── Harvesting ──────────────────────────────────────────────────────────
  {
    name: "Harvest kale",
    icon: "🥬",
    priority: "High",
    durationMinutes: 45,
    aiTip: "Cut outer leaves only — leave the crown intact for regrowth. Harvest before 8am for best texture.",
    tools: ["Harvest basket", "Knife", "Gloves"],
  },
  {
    name: "Harvest tomatoes",
    icon: "🍅",
    priority: "High",
    durationMinutes: 40,
    aiTip: "Pick firm, fully coloured fruit. Leave any green tomatoes on the vine to ripen naturally.",
    tools: ["Harvest basket", "Gloves"],
  },
  {
    name: "Harvest beans",
    icon: "🫘",
    priority: "High",
    durationMinutes: 50,
    aiTip: "Harvest when pods are firm and snap cleanly. Overripe pods reduce yield on the next flush.",
    tools: ["Harvest basket", "Gloves"],
  },
  {
    name: "Sort and grade produce",
    icon: "📦",
    priority: "Medium",
    durationMinutes: 35,
    aiTip: "Grade A: firm, unblemished, uniform size. Remove rotten items immediately — one bad one spreads.",
  },

  // ── Planting ────────────────────────────────────────────────────────────
  {
    name: "Transplant seedlings",
    icon: "🌱",
    priority: "High",
    durationMinutes: 60,
    aiTip: "Transplant in the evening or on overcast days to minimise transplant shock.",
    tools: ["Trowel", "Gloves", "Watering can"],
  },
  {
    name: "Prepare seedbeds",
    icon: "🪴",
    priority: "Medium",
    durationMinutes: 50,
    aiTip: "Loosen soil to at least 20cm depth. Add compost to improve water retention.",
    tools: ["Hoe", "Rake", "Fork"],
  },

  // ── Weeding ─────────────────────────────────────────────────────────────
  {
    name: "Weed maize rows",
    icon: "🌽",
    priority: "Medium",
    durationMinutes: 60,
    aiTip: "Weed when soil is moist for easier removal. Stay 5cm from the stem to avoid root damage.",
    tools: ["Hand hoe", "Gloves"],
  },
  {
    name: "Weed bean rows",
    icon: "🫘",
    priority: "Medium",
    durationMinutes: 45,
    tools: ["Hand hoe", "Gloves"],
  },

  // ── Livestock ───────────────────────────────────────────────────────────
  {
    name: "Morning livestock check",
    icon: "🐄",
    priority: "High",
    durationMinutes: 20,
    aiTip: "Check temperature, gait, and appetite. Any animal off-feed needs same-day attention.",
    tools: ["Thermometer", "Log book"],
  },
  {
    name: "Clean water troughs",
    icon: "🪣",
    priority: "High",
    durationMinutes: 20,
    aiTip: "Dirty troughs spread waterborne illness. Scrub and refill every 48 hours minimum.",
    tools: ["Brush", "Disinfectant", "Bucket"],
  },
  {
    name: "Distribute morning feed",
    icon: "🌾",
    priority: "High",
    durationMinutes: 25,
    aiTip: "Weigh feed portions — eyeballing causes inconsistency and hidden under-nutrition.",
  },
  {
    name: "Morning milking session",
    icon: "🥛",
    priority: "High",
    durationMinutes: 35,
    aiTip: "Milk at the same time each day. Irregular milking reduces yield by up to 15%.",
    tools: ["Milking pail", "Udder cloth", "Teat dip"],
  },
  {
    name: "Record milk yield",
    icon: "📋",
    priority: "Low",
    durationMinutes: 10,
    aiTip: "A sudden drop of >10% signals stress, illness, or feed issues. Investigate immediately.",
    tools: ["Measuring jug", "Log book"],
  },

  // ── Maintenance ─────────────────────────────────────────────────────────
  {
    name: "Repair fence line",
    icon: "🔧",
    priority: "Medium",
    durationMinutes: 60,
    tools: ["Wire cutters", "Pliers", "Straining wire", "Gloves"],
  },
  {
    name: "Tool maintenance",
    icon: "🛠️",
    priority: "Low",
    durationMinutes: 25,
    aiTip: "Clean and oil all cutting tools after use. Rust shortens tool life by 50%.",
    tools: ["Oil", "Wire brush", "Sharpening stone"],
  },

  // ── Market & admin ───────────────────────────────────────────────────────
  {
    name: "Prepare market delivery",
    icon: "🚛",
    priority: "High",
    durationMinutes: 30,
    aiTip: "Pre-cool produce in shade before loading. Heat wilts leafy greens in under 2 hours.",
  },
  {
    name: "Update farm journal",
    icon: "📓",
    priority: "Low",
    durationMinutes: 15,
    aiTip: "Record yield, inputs, and observations. Patterns in your journal predict next season's problems.",
  },
  {
    name: "Plan next week tasks",
    icon: "📅",
    priority: "Medium",
    durationMinutes: 20,
  },
  {
    name: "Log weather conditions",
    icon: "🌡️",
    priority: "Low",
    durationMinutes: 10,
  },
]

// ---------------------------------------------------------------------------
// Deterministic schedule generator (LCG seeded by date)
// ---------------------------------------------------------------------------

function lcgStep(seed: number): number {
  // Knuth's LCG — same seed always produces same sequence
  return ((seed * 1664525 + 1013904223) >>> 0)
}

export function buildActivitiesForDate(dateStr: string): PlanActivity[] {
  const [y, m, d] = dateStr.split("-").map(Number)

  const thisDate = new Date(y, m - 1, d)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  thisDate.setHours(0, 0, 0, 0)
  const isPast = thisDate < today

  // Seed uniquely identifies the date
  let seed = y * 10000 + m * 100 + d

  // Pick 3–5 distinct activities from the pool
  const count = 3 + (seed % 3)
  const indices: number[] = []

  while (indices.length < count) {
    seed = lcgStep(seed)
    const idx = seed % POOL.length
    if (!indices.includes(idx)) indices.push(idx)
  }

  return indices.map((idx, i) => {
    const t = POOL[idx]
    return {
      id: `${dateStr}-${i}`,
      name: t.name,
      icon: t.icon,
      priority: t.priority,
      durationMinutes: t.durationMinutes,
      // For past days mark the first two as done so the progress bar feels alive
      done: isPast ? i < 2 : false,
      aiTip: t.aiTip,
      tools: t.tools,
    }
  })
}
