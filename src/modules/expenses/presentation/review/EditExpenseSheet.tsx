import { useEffect, useRef, useState } from "react"
import {
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
  ViewStyle,
  TextStyle,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"

import { Text } from "@/components/Text"
import type { Category } from "@/modules/expenses/domain/entities/category"
import type { ExpenseEvent } from "@/modules/expenses/domain/entities/expense-event"
import {
  paper, card, hairline,
  ink, ink2, ink3, ink4,
  coral500, coral600,
  catClay, catMango, catFern, catLake, catOrchid, catStone,
  spacing, radii, elevation, duration,
} from "@/theme/tapp-tokens"
import { typography } from "@/theme/typography"

// ---- Category color resolution (mirrors the screen helper) -----------------

const CATEGORY_COLOR_MAP: Record<string, string> = {
  food: catClay, lunch: catClay, dinner: catClay,
  groceries: catMango,
  transport: catFern, matatu: catFern, uber: catFern,
  utilities: catLake, airtime: catLake,
  leisure: catOrchid, coffee: catOrchid,
  misc: catStone,
}

function resolveCategoryColor(name?: string, hex?: string): string {
  if (name) {
    const mapped = CATEGORY_COLOR_MAP[name.toLowerCase()]
    if (mapped) return mapped
  }
  return hex ?? catStone
}

// ---- Props -----------------------------------------------------------------

type Props = {
  visible: boolean
  event: ExpenseEvent | null
  categories: Category[]
  onClose: () => void
  onSave: (id: number, amount: number, categoryId: number | null, notes: string | null) => void
  onDelete: (id: number) => void
}

// ---- Component -------------------------------------------------------------

export function EditExpenseSheet({ visible, event, categories, onClose, onSave, onDelete }: Props) {
  const insets = useSafeAreaInsets()
  const slideAnim = useRef(new Animated.Value(400)).current

  const [amountText, setAmountText] = useState("")
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null)
  const [notes, setNotes] = useState("")
  const [error, setError] = useState("")

  useEffect(() => {
    if (visible && event) {
      setAmountText(String(event.amount ?? ""))
      setSelectedCategoryId(event.category_id as number | null ?? null)
      setNotes(event.notes ?? "")
      setError("")
    }
    Animated.timing(slideAnim, {
      toValue: visible ? 0 : 400,
      duration: visible ? duration.base : duration.fast,
      useNativeDriver: true,
    }).start()
  }, [visible, event, slideAnim])

  function handleSave() {
    const parsed = parseFloat(amountText.replace(/,/g, ""))
    if (isNaN(parsed) || parsed <= 0) {
      setError("Enter a valid amount.")
      return
    }
    if (event?.id == null) return
    onSave(event.id, Math.round(parsed), selectedCategoryId, notes.trim() || null)
    onClose()
  }

  function handleDelete() {
    if (event?.id == null) return
    onDelete(event.id)
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
          {/* Handle */}
          <View style={$handle} />

          {/* Header row */}
          <View style={$headerRow}>
            <View>
              <Text style={$eyebrow}>Edit expense</Text>
              <Text style={$title}>Correct the details</Text>
            </View>
            <Pressable style={$deleteBtn} onPress={handleDelete} hitSlop={8}>
              <Ionicons name="trash-outline" size={18} color={coral500} />
            </Pressable>
          </View>

          {/* Amount input */}
          <Text style={$fieldLabel}>Amount (KSh)</Text>
          <View style={[$amountRow, error ? $amountRowError : null]}>
            <Text style={$currencyPrefix}>KSh</Text>
            <TextInput
              style={$amountInput}
              value={amountText}
              onChangeText={(t) => { setAmountText(t); setError("") }}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={ink4}
              returnKeyType="done"
              onSubmitEditing={handleSave}
              selectTextOnFocus
            />
          </View>
          {error ? <Text style={$errorText}>{error}</Text> : null}

          {/* Category picker */}
          <Text style={[$fieldLabel, { marginTop: spacing.s4 }]}>Category</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={$categoryScroll}
          >
            {/* None option */}
            <Pressable
              style={[$categoryPill, selectedCategoryId === null && $categoryPillActive]}
              onPress={() => setSelectedCategoryId(null)}
            >
              <Text style={[$categoryPillText, selectedCategoryId === null && $categoryPillTextActive]}>
                None
              </Text>
            </Pressable>

            {categories.map((cat) => {
              const isSelected = selectedCategoryId === cat.id
              const color = resolveCategoryColor(cat.name, cat.color_hex)
              return (
                <Pressable
                  key={String(cat.id)}
                  style={[$categoryPill, isSelected && { backgroundColor: color, borderColor: color }]}
                  onPress={() => setSelectedCategoryId(cat.id ?? null)}
                >
                  <View style={[$catDot, { backgroundColor: isSelected ? "white" : color }]} />
                  <Text style={[$categoryPillText, isSelected && $categoryPillTextActive]}>
                    {cat.name}
                  </Text>
                </Pressable>
              )
            })}
          </ScrollView>

          {/* Notes */}
          <Text style={[$fieldLabel, { marginTop: spacing.s4 }]}>Note (optional)</Text>
          <TextInput
            style={$notesInput}
            value={notes}
            onChangeText={setNotes}
            placeholder="What was this for?"
            placeholderTextColor={ink4}
            multiline
            maxLength={200}
            returnKeyType="done"
            blurOnSubmit
          />

          {/* Actions */}
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

const $headerRow: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "flex-start",
  marginBottom: spacing.s4,
}

const $eyebrow: TextStyle = {
  fontSize: 11, letterSpacing: 1.4, textTransform: "uppercase",
  color: ink3, fontFamily: typography.primary.normal,
}

const $title: TextStyle = {
  fontSize: 22, letterSpacing: -0.3,
  color: ink, fontFamily: typography.primary.semiBold,
  marginTop: spacing.s1,
}

const $deleteBtn: ViewStyle = {
  width: 38, height: 38, borderRadius: 19,
  backgroundColor: coral500 + "14",
  alignItems: "center", justifyContent: "center",
  marginTop: spacing.s1,
}

const $fieldLabel: TextStyle = {
  fontSize: 12, letterSpacing: 0.5, textTransform: "uppercase",
  color: ink3, fontFamily: typography.primary.normal,
  marginBottom: spacing.s2,
}

const $amountRow: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.s2,
  borderWidth: 1, borderColor: hairline,
  borderRadius: radii.md,
  paddingHorizontal: spacing.s4,
  backgroundColor: paper,
}

const $amountRowError: ViewStyle = { borderColor: coral500 }

const $currencyPrefix: TextStyle = {
  fontSize: 16, color: ink3,
  fontFamily: typography.mono.normal,
}

const $amountInput: TextStyle = {
  flex: 1,
  paddingVertical: spacing.s3 + 2,
  fontSize: 24, letterSpacing: -0.5,
  color: ink, fontFamily: typography.mono.normal,
}

const $errorText: TextStyle = {
  fontSize: 13, color: coral600,
  fontFamily: typography.primary.normal,
  marginTop: spacing.s1,
}

const $categoryScroll = {
  gap: spacing.s2,
  paddingBottom: spacing.s1,
}

const $categoryPill: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  gap: 6,
  paddingVertical: spacing.s2,
  paddingHorizontal: spacing.s3,
  borderRadius: radii.pill,
  borderWidth: 1,
  borderColor: hairline,
  backgroundColor: card,
}

const $categoryPillActive: ViewStyle = {
  backgroundColor: ink,
  borderColor: ink,
}

const $categoryPillText: TextStyle = {
  fontSize: 14, color: ink2,
  fontFamily: typography.primary.normal,
}

const $categoryPillTextActive: TextStyle = {
  color: "white",
  fontFamily: typography.primary.medium,
}

const $catDot: ViewStyle = {
  width: 7, height: 7, borderRadius: 4,
}

const $notesInput: TextStyle = {
  borderWidth: 1,
  borderColor: hairline,
  borderRadius: radii.md,
  backgroundColor: paper,
  paddingHorizontal: spacing.s4,
  paddingVertical: spacing.s3,
  fontSize: 15,
  color: ink,
  fontFamily: typography.primary.normal,
  minHeight: 72,
  textAlignVertical: "top",
}

const $actions: ViewStyle = {
  flexDirection: "row", gap: spacing.s3, marginTop: spacing.s5,
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
