import { useEffect, useRef, useState } from "react"
import {
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  TextInput,
  View,
  ViewStyle,
  TextStyle,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

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
  currentName: string
  onClose: () => void
  onSave: (name: string) => void
}

export function FamilyNameSheet({ visible, currentName, onClose, onSave }: Props) {
  const insets = useSafeAreaInsets()
  const slideAnim = useRef(new Animated.Value(300)).current
  const [name, setName] = useState(currentName)
  const [error, setError] = useState("")

  useEffect(() => {
    if (visible) {
      setName(currentName)
      setError("")
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: duration.base,
        useNativeDriver: true,
      }).start()
    } else {
      Animated.timing(slideAnim, {
        toValue: 300,
        duration: duration.fast,
        useNativeDriver: true,
      }).start()
    }
  }, [visible, currentName, slideAnim])

  function handleSave() {
    const trimmed = name.trim()
    if (!trimmed) { setError("Family name can't be empty."); return }
    onSave(trimmed)
    onClose()
  }

  return (
    <Modal visible={visible} transparent statusBarTranslucent animationType="none" onRequestClose={onClose}>
      <Pressable style={$scrim} onPress={onClose} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={$outer}
        pointerEvents="box-none"
      >
        <Animated.View
          style={[
            $sheet,
            { paddingBottom: insets.bottom + spacing.s6, transform: [{ translateY: slideAnim }] },
          ]}
        >
          <View style={$handle} />
          <Text style={$eyebrow}>Family</Text>
          <Text style={$title}>What's your family name?</Text>

          <TextInput
            style={[$input, error ? $inputError : null]}
            value={name}
            onChangeText={(t) => { setName(t); setError("") }}
            placeholder="The Mwangi Family"
            placeholderTextColor={ink4}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleSave}
            maxLength={40}
          />
          {error ? <Text style={$errorText}>{error}</Text> : null}

          <View style={$actions}>
            <Pressable style={$ghostBtn} onPress={onClose}>
              <Text style={$ghostBtnText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [$primaryBtn, pressed && $primaryBtnPressed]}
              onPress={handleSave}
            >
              <Text style={$primaryBtnText}>Save</Text>
            </Pressable>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

// ---- Styles ----------------------------------------------------------------

const $scrim: ViewStyle = {
  position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
  backgroundColor: "rgba(31, 28, 24, 0.45)",
}

const $outer: ViewStyle = {
  position: "absolute", bottom: 0, left: 0, right: 0,
}

const $sheet: ViewStyle = {
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
  marginTop: spacing.s1, marginBottom: spacing.s4,
}

const $input: TextStyle = {
  paddingVertical: spacing.s3 + 1,
  paddingHorizontal: spacing.s4,
  borderWidth: 1, borderColor: hairline,
  borderRadius: radii.md,
  fontSize: 17, color: ink,
  fontFamily: typography.primary.normal,
  backgroundColor: paper,
  marginBottom: spacing.s2,
}

const $inputError: TextStyle = { borderColor: coral500 }

const $errorText: TextStyle = {
  fontSize: 13, color: coral600,
  fontFamily: typography.primary.normal,
  marginBottom: spacing.s3,
}

const $actions: ViewStyle = {
  flexDirection: "row", gap: spacing.s3, marginTop: spacing.s4,
}

const $ghostBtn: ViewStyle = {
  flex: 1, paddingVertical: spacing.s3,
  borderRadius: radii.pill, alignItems: "center",
  borderWidth: 1, borderColor: hairline,
}

const $ghostBtnText: TextStyle = {
  fontSize: 15, color: ink2, fontFamily: typography.primary.medium,
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
