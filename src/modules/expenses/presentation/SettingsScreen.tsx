import { Pressable, View, ViewStyle, TextStyle } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons"
import { useRouter } from "expo-router"

import { Text } from "@/components/Text"
import {
  paper, paper2, card, ink, ink2, ink3, ink4,
  coral500, hairline, spacing, radii, elevation,
} from "@/theme/tapp-tokens"
import { typography } from "@/theme/typography"

// ---- Nav row ----------------------------------------------------------------

type NavRowProps = {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"]
  iconColor: string
  label: string
  description: string
  onPress: () => void
  isFirst?: boolean
}

function NavRow({ icon, iconColor, label, description, onPress, isFirst }: NavRowProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [$row, !isFirst && $rowBorder, pressed && $rowPressed]}
    >
      <View style={[$iconWrap, { backgroundColor: iconColor + "22" }]}>
        <MaterialCommunityIcons name={icon} size={20} color={iconColor} />
      </View>
      <View style={$rowMid}>
        <Text style={$rowLabel}>{label}</Text>
        <Text style={$rowDesc}>{description}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={ink4} />
    </Pressable>
  )
}

// ---- Main screen ------------------------------------------------------------

export function SettingsScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()

  return (
    <View style={[$screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={$header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={$backBtn}>
          <Ionicons name="chevron-back" size={22} color={ink} />
        </Pressable>
        <View style={$headerCenter}>
          <Text style={$headerTitle}>Settings</Text>
        </View>
        <View style={$backBtn} />
      </View>

      <View style={[$content, { paddingBottom: insets.bottom + 32 }]}>
        <Text style={$sectionLabel}>Spending</Text>
        <View style={$card}>
          <NavRow
            isFirst
            icon="clock-time-four-outline"
            iconColor={coral500}
            label="Routines"
            description="Configure when and what you spend"
            onPress={() => router.push("/routines" as any)}
          />
          <NavRow
            icon="tag-outline"
            iconColor={ink2}
            label="Categories"
            description="Manage expense categories and icons"
            onPress={() => router.push("/categories" as any)}
          />
        </View>
      </View>
    </View>
  )
}

export default SettingsScreen

// ---- Styles ----------------------------------------------------------------

const $screen: ViewStyle = { flex: 1, backgroundColor: paper }

const $header: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  paddingHorizontal: spacing.s4,
  paddingTop: spacing.s3,
  paddingBottom: spacing.s3,
  borderBottomWidth: 1,
  borderBottomColor: hairline,
}

const $backBtn: ViewStyle = { width: 36, alignItems: "flex-start" }
const $headerCenter: ViewStyle = { flex: 1, alignItems: "center" }

const $headerTitle: TextStyle = {
  fontSize: 17, color: ink,
  fontFamily: typography.primary.semiBold,
}

const $content: ViewStyle = {
  paddingHorizontal: spacing.s5,
  paddingTop: spacing.s5,
  gap: spacing.s2,
}

const $sectionLabel: TextStyle = {
  fontSize: 11, letterSpacing: 1.2, textTransform: "uppercase",
  color: ink3, fontFamily: typography.primary.normal,
  marginBottom: spacing.s1,
}

const $card: ViewStyle = {
  backgroundColor: card,
  borderRadius: radii.lg,
  borderWidth: 1,
  borderColor: hairline,
  ...elevation.card,
  overflow: "hidden",
}

const $row: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  paddingVertical: spacing.s3 + 2,
  paddingHorizontal: spacing.s4,
  gap: spacing.s3,
  backgroundColor: card,
}

const $rowBorder: ViewStyle = { borderTopWidth: 1, borderTopColor: hairline }
const $rowPressed: ViewStyle = { backgroundColor: paper2 }

const $iconWrap: ViewStyle = {
  width: 36, height: 36, borderRadius: radii.md,
  alignItems: "center", justifyContent: "center",
  flexShrink: 0,
}

const $rowMid: ViewStyle = { flex: 1, gap: 2 }

const $rowLabel: TextStyle = {
  fontSize: 15, color: ink,
  fontFamily: typography.primary.medium,
}

const $rowDesc: TextStyle = {
  fontSize: 12, color: ink3,
  fontFamily: typography.primary.normal,
}
