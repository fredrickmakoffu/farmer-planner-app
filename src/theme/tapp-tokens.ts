// Design tokens for Jipange Bana farmer planning app

// ---------------------------------------------------------------------------
// Surfaces & backgrounds
// ---------------------------------------------------------------------------
export const paper = "#FAF8F4"
export const paper2 = "#F5F2EC"
export const paperCool = "hsl(210, 1%, 98%)"   // cool near-white for Home screen bg
export const card = "#FFFFFF"
export const cardBorder = "rgba(196, 185, 172, 0.7)"

// ---------------------------------------------------------------------------
// Ink — warm-tinted text hierarchy
// ---------------------------------------------------------------------------
export const ink = "#1F1C18"
export const ink2 = "#5A5147"
export const ink3 = "#8A8076"
export const ink4 = "#B8AEA4"
export const hairline = "#E8E0D8"

// ---------------------------------------------------------------------------
// Brand — Forest Green
// The primary accent. Use forest500 once per screen maximum.
// ---------------------------------------------------------------------------
export const forest50 = "#EBF5EB"
export const forest100 = "#C5E1C5"
export const forest300 = "#78B878"
export const forest500 = "#2A5C2A"  // core CTA / active state
export const forest600 = "#1C3F1C"  // pressed state
export const forest700 = "#102610"  // deep / on dark
export const forest900 = "#061006"  // ink on forest surface

// ---------------------------------------------------------------------------
// Status colors
// ---------------------------------------------------------------------------
export const statusGood = "#3E9E6A"
export const statusGoodBg = "#D4EFE2"
export const statusWarn = "#B08A1A"
export const statusWarnBg = "#F0E5B4"
export const statusBad = "#C2664A"
export const statusBadBg = "#F5DDD4"

// ---------------------------------------------------------------------------
// Spacing scale — 4px base
// ---------------------------------------------------------------------------
export const spacing = {
  s1: 4,
  s2: 8,
  s3: 12,
  s4: 16,
  s5: 20,
  s6: 24,
  s8: 32,
  s10: 40,
  s12: 48,
  s16: 64,
} as const

// ---------------------------------------------------------------------------
// Border radius
// ---------------------------------------------------------------------------
export const radii = {
  xs: 4,
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  pill: 999,
} as const

// ---------------------------------------------------------------------------
// Elevation
// ---------------------------------------------------------------------------
export const elevation = {
  card: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
  },
  sheet: {
    shadowColor: "#1F1C18",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
  fab: {
    shadowColor: forest500,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 18,
    elevation: 10,
  },
} as const

// ---------------------------------------------------------------------------
// Motion durations (ms)
// ---------------------------------------------------------------------------
export const duration = {
  fast: 120,
  base: 220,
  slow: 420,
} as const
