import { Platform } from "react-native"
import {
  SpaceGrotesk_300Light as spaceGroteskLight,
  SpaceGrotesk_400Regular as spaceGroteskRegular,
  SpaceGrotesk_500Medium as spaceGroteskMedium,
  SpaceGrotesk_600SemiBold as spaceGroteskSemiBold,
  SpaceGrotesk_700Bold as spaceGroteskBold,
} from "@expo-google-fonts/space-grotesk"
import {
  SpaceMono_400Regular as spaceMonoRegular,
} from "@expo-google-fonts/space-mono"

export const customFontsToLoad = {
  spaceGroteskLight,
  spaceGroteskRegular,
  spaceGroteskMedium,
  spaceGroteskSemiBold,
  spaceGroteskBold,
  spaceMonoRegular,
}

const fonts = {
  spaceGrotesk: {
    light: "spaceGroteskLight",
    normal: "spaceGroteskRegular",
    medium: "spaceGroteskMedium",
    semiBold: "spaceGroteskSemiBold",
    bold: "spaceGroteskBold",
  },
  // SpaceMono: used for ALL numeric amounts and percentages (Tapp design rule)
  spaceMono: {
    normal: "spaceMonoRegular",
  },
  helveticaNeue: {
    // iOS only
    thin: "HelveticaNeue-Thin",
    light: "HelveticaNeue-Light",
    normal: "Helvetica Neue",
    medium: "HelveticaNeue-Medium",
  },
  courier: {
    // iOS only
    normal: "Courier",
  },
  sansSerif: {
    // Android only
    thin: "sans-serif-thin",
    light: "sans-serif-light",
    normal: "sans-serif",
    medium: "sans-serif-medium",
  },
  monospace: {
    // Android only
    normal: "monospace",
  },
}

export const typography = {
  fonts,
  /** Body and UI text — SpaceGrotesk */
  primary: fonts.spaceGrotesk,
  /** Alternate for system-default secondary text */
  secondary: Platform.select({ ios: fonts.helveticaNeue, android: fonts.sansSerif }),
  /** Mono font for all numeric amounts (Tapp design rule) */
  mono: fonts.spaceMono,
  /** Legacy alias */
  code: Platform.select({ ios: fonts.courier, android: fonts.monospace }),
}
