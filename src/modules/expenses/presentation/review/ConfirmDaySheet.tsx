import { useEffect, useRef } from "react"
import { Animated, Modal, Pressable, View, ViewStyle, TextStyle } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"

import { Text } from "@/components/Text"
import {
  paper, card, hairline,
  ink, ink3,
  coral500, coral600,
  spacing, radii, elevation, duration,
} from "@/theme/tapp-tokens"
import { typography } from "@/theme/typography"

type Props = {
  visible: boolean
  dateLabel: string
  tapCount: number
  total: number
  onClose: () => void
  onConfirm: () => void
}

function formatAmount(n: number): string {
  return n.toLocaleString("en-KE")
}

export function ConfirmDaySheet({ visible, dateLabel, tapCount, total, onClose, onConfirm }: Props) {
  const insets = useSafeAreaInsets()
  const slideAnim = useRef(new Animated.Value(400)).current

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: visible ? 0 : 400,
      duration: visible ? duration.base : duration.fast,
      useNativeDriver: true,
    }).start()
  }, [visible, slideAnim])

  return (
    <Modal visible={visible} transparent statusBarTranslucent animationType="none" onRequestClose={onClose}>
      <Pressable style={$scrim} onPress={onClose} />
      <Animated.View
        style={[
          $sheet,
          { paddingBottom: insets.bottom + spacing.s6, transform: [{ translateY: slideAnim }] },
        ]}
      >
        <View style={$handle} />

        <View style={$iconWrap}>
          <Ionicons name="checkmark-circle" size={40} color={coral500} />
        </View>

        <Text style={$title}>Confirm {dateLabel}?</Text>
        <Text style={$summary}>
          {tapCount} {tapCount === 1 ? "tap" : "taps"} · KSh {formatAmount(total)}
        </Text>
        <Text style={$hint}>You can still edit individual items after confirming.</Text>

        <View style={$actions}>
          <Pressable style={$ghostBtn} onPress={onClose}>
            <Text style={$ghostBtnText}>Cancel</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [$primaryBtn, pressed && $primaryBtnPressed]}
            onPress={onConfirm}
          >
            <Text style={$primaryBtnText}>Confirm day</Text>
          </Pressable>
        </View>
      </Animated.View>
    </Modal>
  )
}

// ---- Styles ----------------------------------------------------------------

const $scrim: ViewStyle = {
  position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
  backgroundColor: "rgba(31, 28, 24, 0.45)",
}

const $sheet: ViewStyle = {
  position: "absolute", bottom: 0, left: 0, right: 0,
  backgroundColor: card,
  borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl,
  paddingHorizontal: spacing.s5,
  paddingTop: spacing.s3,
  alignItems: "center",
  ...elevation.sheet,
}

const $handle: ViewStyle = {
  width: 36, height: 4, borderRadius: 2,
  backgroundColor: hairline,
  alignSelf: "center", marginBottom: spacing.s5,
}

const $iconWrap: ViewStyle = {
  marginBottom: spacing.s3,
}

const $title: TextStyle = {
  fontSize: 22, letterSpacing: -0.3,
  color: ink, fontFamily: typography.primary.semiBold,
  textAlign: "center",
}

const $summary: TextStyle = {
  fontSize: 15, color: ink3,
  fontFamily: typography.mono.normal,
  textAlign: "center",
  marginTop: spacing.s2,
}

const $hint: TextStyle = {
  fontSize: 13, color: ink3,
  fontFamily: typography.primary.normal,
  textAlign: "center",
  marginTop: spacing.s2,
  paddingHorizontal: spacing.s4,
}

const $actions: ViewStyle = {
  flexDirection: "row", gap: spacing.s3,
  marginTop: spacing.s6,
  alignSelf: "stretch",
}

const $ghostBtn: ViewStyle = {
  flex: 1, paddingVertical: spacing.s3,
  borderRadius: radii.pill, alignItems: "center",
  borderWidth: 1, borderColor: hairline,
}

const $ghostBtnText: TextStyle = {
  fontSize: 15, color: ink3, fontFamily: typography.primary.medium,
}

const $primaryBtn: ViewStyle = {
  flex: 2, paddingVertical: spacing.s3,
  borderRadius: radii.pill, alignItems: "center",
  backgroundColor: coral500,
  ...elevation.tapButton,
}

const $primaryBtnPressed: ViewStyle = { backgroundColor: coral600, transform: [{ scale: 0.97 }] }

const $primaryBtnText: TextStyle = {
  fontSize: 15, color: "white", fontFamily: typography.primary.medium,
}
