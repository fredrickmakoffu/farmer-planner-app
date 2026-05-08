/**
 * Tapp Design Tokens
 *
 * Single source of truth for colors, spacing, radii, elevation, and type.
 * All values are derived from the Tapp design system (tapp-design-system export).
 *
 * Usage: import { tappColors, tappSpacing, tappRadii, tappElevation } from "@/theme/tapp-tokens"
 */

// ---------------------------------------------------------------------------
// Surfaces & backgrounds
// ---------------------------------------------------------------------------
export const paper = "#FAF8F4" // warm cream — page background
export const paper2 = "#F5F2EC" // subtle inset / hover
export const card = "#FFFFFF" // elevated card surface
export const cardBorder = "rgba(196, 185, 172, 0.7)"

// ---------------------------------------------------------------------------
// Ink — warm-tinted text hierarchy
// ---------------------------------------------------------------------------
export const ink = "#1F1C18" // primary text
export const ink2 = "#5A5147" // secondary
export const ink3 = "#8A8076" // tertiary / captions
export const ink4 = "#B8AEA4" // placeholder / disabled
export const hairline = "#E8E0D8" // dividers

// ---------------------------------------------------------------------------
// Brand — Tapp Coral
// The tap button and the only full-saturation accent in the app.
// Use coral500 once per screen maximum.
// ---------------------------------------------------------------------------
export const coral50 = "#FBF3EF"
export const coral100 = "#F5DDD4"
export const coral300 = "#E8AE99"
export const coral500 = "#C2664A" // core accent — warmer, calmer oklch(0.66 0.155 30)
export const coral600 = "#A8563C" // pressed state
export const coral700 = "#8A4230" // deep / on dark
export const coral900 = "#3D1E14" // ink on coral surface

// ---------------------------------------------------------------------------
// Heat indicators — budget utilization
// Use the *-bg variants for progress bar fills; *foreground for text/icons
// ---------------------------------------------------------------------------
export const heatGood = "#3E9E6A" // under budget
export const heatGoodBg = "#D4EFE2"
export const heatWarn = "#B08A1A" // approaching
export const heatWarnBg = "#F0E5B4"
export const heatOver = "#C2664A" // over (same family as coral)
export const heatOverBg = "#F5DDD4"

// ---------------------------------------------------------------------------
// Category palette — 6 tones at roughly equal lightness
// ---------------------------------------------------------------------------
export const catClay = "#C97A4A" // food / dining
export const catMango = "#C4A028" // groceries
export const catFern = "#4E9A6A" // transport
export const catLake = "#3D7AB5" // utilities
export const catOrchid = "#9050B8" // leisure
export const catStone = "#7A7468" // misc / other

export const categoryColors = [catClay, catMango, catFern, catLake, catOrchid, catStone] as const
export type CategoryColor = (typeof categoryColors)[number]

// ---------------------------------------------------------------------------
// Status — non-budget signals
// ---------------------------------------------------------------------------
export const info = "#3D7AB5"
export const infoBg = "#D8E8F5"
export const shadowEvt = "#B0A898" // shadow / draft event ghost

// ---------------------------------------------------------------------------
// Spacing scale — 4px base
// ---------------------------------------------------------------------------
export const spacing = {
  s1: 4,
  s2: 8,
  s3: 12,
  s4: 16,
  s5: 20, // phone edge gutter
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
// Elevation (shadow objects for React Native)
// ---------------------------------------------------------------------------
export const elevation = {
  card: {
    shadowColor: "#1F1C18",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
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
  tapButton: {
    shadowColor: coral500,
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

// ---------------------------------------------------------------------------
// Convenience palette object (mirrors Ignite palette shape)
// ---------------------------------------------------------------------------
export const tappPalette = {
  paper,
  paper2,
  card,
  cardBorder,
  ink,
  ink2,
  ink3,
  ink4,
  hairline,
  coral50,
  coral100,
  coral300,
  coral500,
  coral600,
  coral700,
  coral900,
  heatGood,
  heatGoodBg,
  heatWarn,
  heatWarnBg,
  heatOver,
  heatOverBg,
  catClay,
  catMango,
  catFern,
  catLake,
  catOrchid,
  catStone,
  info,
  infoBg,
  shadowEvt,
} as const
