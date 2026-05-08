import { tappPalette } from "./tapp-tokens"

/**
 * Tapp semantic color tokens.
 *
 * Use the semantic names (background, text, tint, etc.) in Ignite components.
 * Import raw palette values from tapp-tokens.ts for screen-level styling.
 */
const palette = {
  // Surfaces
  neutral100: tappPalette.card, // white — elevated card
  neutral200: tappPalette.paper, // warm cream — page background
  neutral300: tappPalette.paper2, // subtle inset
  neutral400: tappPalette.hairline, // dividers
  neutral500: tappPalette.ink4, // disabled / placeholder
  neutral600: tappPalette.ink3, // tertiary text
  neutral700: tappPalette.ink2, // secondary text
  neutral800: tappPalette.ink, // primary text
  neutral900: "#0E0C09",

  // Brand — coral
  primary100: tappPalette.coral100,
  primary200: tappPalette.coral300,
  primary300: tappPalette.coral300,
  primary400: tappPalette.coral500,
  primary500: tappPalette.coral500,
  primary600: tappPalette.coral600,

  // Heat
  secondary100: tappPalette.heatGoodBg,
  secondary200: tappPalette.heatGood,
  secondary300: tappPalette.heatWarnBg,
  secondary400: tappPalette.heatWarn,
  secondary500: tappPalette.heatOver,

  // Error / over-budget
  angry100: tappPalette.heatOverBg,
  angry500: tappPalette.heatOver,

  accent100: tappPalette.infoBg,
  accent200: tappPalette.infoBg,
  accent300: tappPalette.info,
  accent400: tappPalette.info,
  accent500: tappPalette.info,

  overlay20: "rgba(31, 28, 24, 0.2)",
  overlay50: "rgba(31, 28, 24, 0.5)",
} as const

export const colors = {
  palette,
  transparent: "rgba(0, 0, 0, 0)",
  text: palette.neutral800,
  textDim: palette.neutral700,
  background: palette.neutral200,
  border: palette.neutral400,
  tint: palette.primary500,
  tintInactive: palette.neutral400,
  separator: palette.neutral400,
  error: palette.angry500,
  errorBackground: palette.angry100,
} as const
