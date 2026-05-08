import { View } from "react-native"

import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { paper, ink3, spacing } from "@/theme/tapp-tokens"

export function FamilyScreen() {
  return (
    <Screen style={$screen} preset="scroll">
      <View style={$placeholder}>
        <Text style={$label}>Family view</Text>
        <Text style={$sub}>Coming soon</Text>
      </View>
    </Screen>
  )
}

export default FamilyScreen

const $screen = { backgroundColor: paper }
const $placeholder = { flex: 1, alignItems: "center" as const, justifyContent: "center" as const, padding: spacing.s8, marginTop: 120 }
const $label = { fontSize: 20, color: ink3 }
const $sub = { fontSize: 14, color: ink3, marginTop: spacing.s2 }
