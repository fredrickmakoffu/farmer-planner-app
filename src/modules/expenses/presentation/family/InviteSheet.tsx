import { useEffect, useRef, useState } from "react"
import {
  Animated,
  Clipboard,
  Modal,
  Pressable,
  TextInput,
  View,
  ViewStyle,
  TextStyle,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"

import { Text } from "@/components/Text"
import {
  paper,
  ink, ink2, ink3, ink4,
  coral500, coral600,
  card, hairline,
  spacing, radii, elevation, duration,
} from "@/theme/tapp-tokens"
import { typography } from "@/theme/typography"

type Props = {
  visible: boolean
  familyCode: string
  onClose: () => void
}

export function InviteSheet({ visible, familyCode, onClose }: Props) {
  const insets = useSafeAreaInsets()
  const slideAnim = useRef(new Animated.Value(400)).current
  const [copied, setCopied] = useState(false)
  const [joinCode, setJoinCode] = useState("")
  const [joinMode, setJoinMode] = useState(false)

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: visible ? 0 : 400,
      duration: visible ? duration.base : duration.fast,
      useNativeDriver: true,
    }).start()
    if (!visible) { setJoinMode(false); setJoinCode(""); setCopied(false) }
  }, [visible, slideAnim])

  function handleCopy() {
    Clipboard.setString(familyCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

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
        <Text style={$eyebrow}>Invite to family</Text>

        {!joinMode ? (
          <>
            <Text style={$title}>Share your family code</Text>
            <Text style={$body}>Anyone with this code can join your family on Tapp.</Text>

            {/* Code display */}
            <View style={$codeBox}>
              <Text style={$codeText}>{familyCode}</Text>
              <Pressable
                style={({ pressed }) => [$copyBtn, pressed && $copyBtnPressed]}
                onPress={handleCopy}
              >
                <Ionicons
                  name={copied ? "checkmark" : "copy-outline"}
                  size={18}
                  color={copied ? coral500 : ink3}
                />
                <Text style={[$copyBtnText, copied && { color: coral500 }]}>
                  {copied ? "Copied" : "Copy"}
                </Text>
              </Pressable>
            </View>

            {/* Share button */}
            <Pressable
              style={({ pressed }) => [$primaryBtn, pressed && $primaryBtnPressed]}
              onPress={() => {}}
            >
              <Ionicons name="share-outline" size={18} color="white" />
              <Text style={$primaryBtnText}>Share invite link</Text>
            </Pressable>

            {/* Divider */}
            <View style={$divider}>
              <View style={$dividerLine} />
              <Text style={$dividerText}>or</Text>
              <View style={$dividerLine} />
            </View>

            <Pressable style={$ghostBtn} onPress={() => setJoinMode(true)}>
              <Text style={$ghostBtnText}>Join with a code</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text style={$title}>Join a family</Text>
            <Text style={$body}>Enter the code shared by your family coordinator.</Text>

            <TextInput
              style={$joinInput}
              value={joinCode}
              onChangeText={(t) => setJoinCode(t.toUpperCase())}
              placeholder="TAPP-XXXXXX"
              placeholderTextColor={ink4}
              autoCapitalize="characters"
              autoFocus
            />

            <View style={$actionRow}>
              <Pressable style={$ghostBtn} onPress={() => setJoinMode(false)}>
                <Text style={$ghostBtnText}>Back</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  $primaryBtn, { flex: 2 },
                  pressed && $primaryBtnPressed,
                  !joinCode.trim() && $primaryBtnDisabled,
                ]}
                disabled={!joinCode.trim()}
                onPress={() => {}}
              >
                <Text style={$primaryBtnText}>Request to join</Text>
              </Pressable>
            </View>
          </>
        )}
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
  position: "absolute", left: 0, right: 0, bottom: 0,
  backgroundColor: card,
  borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl,
  paddingHorizontal: spacing.s5,
  paddingTop: spacing.s3,
  ...elevation.sheet,
}

const $handle: ViewStyle = {
  width: 36, height: 4, borderRadius: 2,
  backgroundColor: hairline,
  alignSelf: "center", marginBottom: spacing.s4,
}

const $eyebrow: TextStyle = {
  fontSize: 11, letterSpacing: 1.4, textTransform: "uppercase",
  color: ink3, fontFamily: typography.primary.normal,
}

const $title: TextStyle = {
  fontSize: 22, letterSpacing: -0.3,
  color: ink, fontFamily: typography.primary.semiBold,
  marginTop: spacing.s1, marginBottom: spacing.s2,
}

const $body: TextStyle = {
  fontSize: 14, color: ink3,
  fontFamily: typography.primary.normal,
  lineHeight: 20, marginBottom: spacing.s5,
}

const $codeBox: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  backgroundColor: paper,
  borderRadius: radii.md,
  borderWidth: 1, borderColor: hairline,
  paddingVertical: spacing.s4,
  paddingHorizontal: spacing.s4,
  marginBottom: spacing.s4,
}

const $codeText: TextStyle = {
  fontSize: 22, letterSpacing: 2,
  color: ink, fontFamily: typography.mono.normal,
}

const $copyBtn: ViewStyle = {
  flexDirection: "row", alignItems: "center", gap: 5,
  paddingVertical: spacing.s2, paddingHorizontal: spacing.s3,
  borderRadius: radii.md, backgroundColor: card,
  borderWidth: 1, borderColor: hairline,
}

const $copyBtnPressed: ViewStyle = { backgroundColor: paper }

const $copyBtnText: TextStyle = {
  fontSize: 13, color: ink3, fontFamily: typography.primary.normal,
}

const $primaryBtn: ViewStyle = {
  flexDirection: "row", alignItems: "center", justifyContent: "center",
  gap: spacing.s2,
  backgroundColor: coral500,
  borderRadius: radii.pill,
  paddingVertical: spacing.s3 + 1,
  ...elevation.tapButton,
  marginBottom: spacing.s3,
}

const $primaryBtnPressed: ViewStyle = { backgroundColor: coral600, transform: [{ scale: 0.97 }] }
const $primaryBtnDisabled: ViewStyle = { backgroundColor: ink4 }

const $primaryBtnText: TextStyle = {
  fontSize: 15, color: "white", fontFamily: typography.primary.medium,
}

const $divider: ViewStyle = {
  flexDirection: "row", alignItems: "center",
  gap: spacing.s3, marginVertical: spacing.s2,
}

const $dividerLine: ViewStyle = {
  flex: 1, height: 1, backgroundColor: hairline,
}

const $dividerText: TextStyle = {
  fontSize: 12, color: ink4, fontFamily: typography.primary.normal,
}

const $ghostBtn: ViewStyle = {
  flex: 1,
  paddingVertical: spacing.s3,
  borderRadius: radii.pill,
  alignItems: "center",
  borderWidth: 1, borderColor: hairline,
  marginBottom: spacing.s2,
}

const $ghostBtnText: TextStyle = {
  fontSize: 15, color: ink2, fontFamily: typography.primary.medium,
}

const $joinInput: TextStyle = {
  paddingVertical: spacing.s4,
  paddingHorizontal: spacing.s4,
  borderWidth: 1, borderColor: hairline,
  borderRadius: radii.md,
  fontSize: 20, letterSpacing: 2,
  color: ink, fontFamily: typography.mono.normal,
  backgroundColor: paper,
  marginBottom: spacing.s5,
  textAlign: "center",
}

const $actionRow: ViewStyle = {
  flexDirection: "row", gap: spacing.s3,
}
