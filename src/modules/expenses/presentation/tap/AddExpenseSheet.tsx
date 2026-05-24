import { useEffect, useRef, useState } from "react"
import {
  Animated,
  Easing,
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
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { Text } from "@/components/Text"
import type { Category } from "@/modules/expenses/domain/entities/category"
import {
  paper,
  card,
  hairline,
  ink,
  ink2,
  ink3,
  ink4,
  coral500,
  coral600,
  catClay,
  catMango,
  catFern,
  catLake,
  catOrchid,
  catStone,
  spacing,
  radii,
  elevation,
  duration,
} from "@/theme/tapp-tokens"
import { typography } from "@/theme/typography"

import { CategoryDisc, ICON_OPTIONS } from "../CategoriesScreen"

const PALETTE = [
  { color: catClay },
  { color: catMango },
  { color: catFern },
  { color: catLake },
  { color: catOrchid },
  { color: catStone },
]

// ---- New-category sub-sheet ------------------------------------------------

type NewCategorySheetProps = {
  visible: boolean
  onClose: () => void
  onSave: (name: string, colorHex: string, icon: string) => void
}

function NewCategorySheet({ visible, onClose, onSave }: NewCategorySheetProps) {
  const insets = useSafeAreaInsets()
  const slideAnim = useRef(new Animated.Value(500)).current
  const [modalVisible, setModalVisible] = useState(false)
  const [name, setName] = useState("")
  const [selectedIcon, setSelectedIcon] = useState("silverware-fork-knife")
  const [selectedColor, setSelectedColor] = useState(catClay)
  const [error, setError] = useState("")

  useEffect(() => {
    if (visible) {
      setModalVisible(true)
      setName("")
      setSelectedIcon("silverware-fork-knife")
      setSelectedColor(catClay)
      setError("")
    }
    Animated.timing(slideAnim, {
      toValue: visible ? 0 : 500,
      duration: visible ? 320 : duration.base,
      easing: visible ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished && !visible) setModalVisible(false)
    })
  }, [visible, slideAnim])

  function handleSave() {
    if (!name.trim()) {
      setError("Enter a name.")
      return
    }
    onSave(name.trim(), selectedColor, selectedIcon)
  }

  return (
    <Modal
      visible={modalVisible}
      transparent
      statusBarTranslucent
      animationType="none"
      onRequestClose={onClose}
    >
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

          <View style={$headerRow}>
            <View>
              <Text style={$eyebrow}>New category</Text>
              <Text style={$title}>Create category</Text>
            </View>
            <CategoryDisc color={selectedColor} icon={selectedIcon} size={40} />
          </View>

          <Text style={$fieldLabel}>Name</Text>
          <View style={[$nameRow, error ? $amountRowError : null]}>
            <TextInput
              style={$nameInput}
              value={name}
              onChangeText={(t) => {
                setName(t)
                setError("")
              }}
              placeholder="e.g. Coffee"
              placeholderTextColor={ink4}
              returnKeyType="done"
              onSubmitEditing={handleSave}
              autoFocus
            />
          </View>
          {error ? <Text style={$errorText}>{error}</Text> : null}

          <Text style={[$fieldLabel, { marginTop: spacing.s4 }]}>Icon</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={$iconScroll}
          >
            {ICON_OPTIONS.map((icon) => {
              const active = selectedIcon === icon
              return (
                <Pressable
                  key={icon}
                  onPress={() => setSelectedIcon(icon)}
                  style={[$iconCell, active && { backgroundColor: selectedColor, borderColor: selectedColor }]}
                  hitSlop={4}
                >
                  <MaterialCommunityIcons
                    name={icon as any}
                    size={18}
                    color={active ? "white" : ink3}
                  />
                </Pressable>
              )
            })}
          </ScrollView>

          <Text style={[$fieldLabel, { marginTop: spacing.s4 }]}>Color</Text>
          <View style={$colorRow}>
            {PALETTE.map((p) => (
              <Pressable
                key={p.color}
                onPress={() => setSelectedColor(p.color)}
                style={[$swatch, { backgroundColor: p.color }, selectedColor === p.color && $swatchActive]}
                hitSlop={6}
              >
                {selectedColor === p.color && (
                  <Ionicons name="checkmark" size={14} color="white" />
                )}
              </Pressable>
            ))}
          </View>

          <View style={$actions}>
            <Pressable style={$ghostBtn} onPress={onClose}>
              <Text style={$ghostBtnText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [$primaryBtn, pressed && $primaryBtnPressed]}
              onPress={handleSave}
            >
              <Text style={$primaryBtnText}>Create</Text>
            </Pressable>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

// ---- Main sheet ------------------------------------------------------------

type Props = {
  visible: boolean
  categories: Category[]
  onClose: () => void
  onAdd: (amount: number, categoryId: number | null, notes: string | null) => void
  onCreateCategory: (name: string, colorHex: string, icon: string) => Promise<Category>
}

export function AddExpenseSheet({ visible, categories, onClose, onAdd, onCreateCategory }: Props) {
  const insets = useSafeAreaInsets()
  const slideAnim = useRef(new Animated.Value(400)).current
  const amountRef = useRef<TextInput>(null)

  const [modalVisible, setModalVisible] = useState(false)
  const [amountText, setAmountText] = useState("")
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null)
  const [notes, setNotes] = useState("")
  const [error, setError] = useState("")
  const [newCatSheetOpen, setNewCatSheetOpen] = useState(false)

  useEffect(() => {
    if (visible) {
      setModalVisible(true)
      setAmountText("")
      setSelectedCategoryId(null)
      setNotes("")
      setError("")
    }
    Animated.timing(slideAnim, {
      toValue: visible ? 0 : 400,
      duration: visible ? 360 : duration.base,
      easing: visible ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished && visible) amountRef.current?.focus()
      if (finished && !visible) setModalVisible(false)
    })
  }, [visible, slideAnim])

  function handleAdd() {
    const parsed = parseFloat(amountText.replace(/,/g, ""))
    if (isNaN(parsed) || parsed <= 0) {
      setError("Enter a valid amount.")
      return
    }
    onAdd(Math.round(parsed), selectedCategoryId, notes.trim() || null)
    onClose()
  }

  async function handleCreateCategory(name: string, colorHex: string, icon: string) {
    setNewCatSheetOpen(false)
    const created = await onCreateCategory(name, colorHex, icon)
    setSelectedCategoryId(created.id ?? null)
  }

  return (
    <>
      <Modal
        visible={modalVisible}
        transparent
        statusBarTranslucent
        animationType="none"
        onRequestClose={onClose}
      >
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

            <View style={$headerRow}>
              <View>
                <Text style={$eyebrow}>Manual entry</Text>
                <Text style={$title}>Add expense</Text>
              </View>
            </View>

            <Text style={$fieldLabel}>Amount (KSh)</Text>
            <View style={[$amountRow, error ? $amountRowError : null]}>
              <Text style={$currencyPrefix}>KSh</Text>
              <TextInput
                ref={amountRef}
                style={$amountInput}
                value={amountText}
                onChangeText={(t) => {
                  setAmountText(t)
                  setError("")
                }}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={ink4}
                returnKeyType="done"
                onSubmitEditing={handleAdd}
                selectTextOnFocus
              />
            </View>
            {error ? <Text style={$errorText}>{error}</Text> : null}

            <Text style={[$fieldLabel, { marginTop: spacing.s4 }]}>Category</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={$categoryScroll}
            >
              {categories.map((cat) => {
                const isSelected = selectedCategoryId === cat.id
                return (
                  <Pressable
                    key={String(cat.id)}
                    style={[
                      $categoryPill,
                      isSelected && {
                        backgroundColor: cat.color_hex + "20",
                        borderColor: cat.color_hex,
                      },
                    ]}
                    onPress={() => setSelectedCategoryId(cat.id ?? null)}
                  >
                    <CategoryDisc color={cat.color_hex} icon={cat.icon} size={24} />
                    <Text
                      style={[
                        $categoryPillText,
                        isSelected && { color: cat.color_hex, fontFamily: typography.primary.medium },
                      ]}
                    >
                      {cat.name}
                    </Text>
                  </Pressable>
                )
              })}

              {/* Create new category */}
              <Pressable style={[$categoryPill, $newCatPill]} onPress={() => setNewCatSheetOpen(true)}>
                <View style={$newCatDisc}>
                  <MaterialCommunityIcons name="plus" size={13} color={ink3} />
                </View>
                <Text style={$newCatText}>New</Text>
              </Pressable>
            </ScrollView>

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

            <View style={$actions}>
              <Pressable style={$ghostBtn} onPress={onClose}>
                <Text style={$ghostBtnText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [$primaryBtn, pressed && $primaryBtnPressed]}
                onPress={handleAdd}
              >
                <Text style={$primaryBtnText}>Add</Text>
              </Pressable>
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>

      <NewCategorySheet
        visible={newCatSheetOpen}
        onClose={() => setNewCatSheetOpen(false)}
        onSave={handleCreateCategory}
      />
    </>
  )
}

// ---- Shared styles ---------------------------------------------------------

const $scrim: ViewStyle = {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: "rgba(31, 28, 24, 0.45)",
}

const $outer: ViewStyle = {
  position: "absolute",
  bottom: 0,
  left: 0,
  right: 0,
}

const $sheet: ViewStyle = {
  backgroundColor: card,
  borderTopLeftRadius: radii.xl,
  borderTopRightRadius: radii.xl,
  paddingHorizontal: spacing.s5,
  paddingTop: spacing.s3,
  ...elevation.sheet,
}

const $handle: ViewStyle = {
  width: 36,
  height: 4,
  borderRadius: 2,
  backgroundColor: hairline,
  alignSelf: "center",
  marginBottom: spacing.s4,
}

const $headerRow: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: spacing.s4,
}

const $eyebrow: TextStyle = {
  fontSize: 11,
  letterSpacing: 1.4,
  textTransform: "uppercase",
  color: ink3,
  fontFamily: typography.primary.normal,
}

const $title: TextStyle = {
  fontSize: 22,
  letterSpacing: -0.3,
  color: ink,
  fontFamily: typography.primary.semiBold,
  marginTop: spacing.s1,
}

const $fieldLabel: TextStyle = {
  fontSize: 12,
  letterSpacing: 0.5,
  textTransform: "uppercase",
  color: ink3,
  fontFamily: typography.primary.normal,
  marginBottom: spacing.s2,
}

const $amountRow: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.s2,
  borderWidth: 1,
  borderColor: hairline,
  borderRadius: radii.md,
  paddingHorizontal: spacing.s4,
  backgroundColor: paper,
}

const $amountRowError: ViewStyle = { borderColor: coral500 }

const $currencyPrefix: TextStyle = {
  fontSize: 16,
  color: ink3,
  fontFamily: typography.mono.normal,
}

const $amountInput: TextStyle = {
  flex: 1,
  paddingVertical: spacing.s3 + 2,
  fontSize: 24,
  letterSpacing: -0.5,
  color: ink,
  fontFamily: typography.mono.normal,
}

const $nameRow: ViewStyle = {
  borderWidth: 1,
  borderColor: hairline,
  borderRadius: radii.md,
  paddingHorizontal: spacing.s4,
  backgroundColor: paper,
}

const $nameInput: TextStyle = {
  paddingVertical: spacing.s3 + 2,
  fontSize: 16,
  color: ink,
  fontFamily: typography.primary.normal,
}

const $errorText: TextStyle = {
  fontSize: 13,
  color: coral600,
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
  gap: 8,
  paddingVertical: spacing.s2,
  paddingHorizontal: spacing.s3,
  borderRadius: radii.pill,
  borderWidth: 1,
  borderColor: hairline,
  backgroundColor: card,
}

const $categoryPillText: TextStyle = {
  fontSize: 14,
  color: ink2,
  fontFamily: typography.primary.normal,
}

const $newCatPill: ViewStyle = {
  borderStyle: "dashed",
}

const $newCatDisc: ViewStyle = {
  width: 24,
  height: 24,
  borderRadius: 12,
  borderWidth: 1.5,
  borderColor: ink3,
  alignItems: "center",
  justifyContent: "center",
}

const $newCatText: TextStyle = {
  fontSize: 14,
  color: ink3,
  fontFamily: typography.primary.normal,
}

const $iconScroll = {
  gap: spacing.s2,
  paddingBottom: spacing.s1,
}

const $iconCell: ViewStyle = {
  width: 36,
  height: 36,
  borderRadius: radii.sm,
  borderWidth: 1,
  borderColor: hairline,
  backgroundColor: card,
  alignItems: "center",
  justifyContent: "center",
}

const $colorRow: ViewStyle = {
  flexDirection: "row",
  gap: spacing.s3,
}

const $swatch: ViewStyle = {
  width: 32,
  height: 32,
  borderRadius: 16,
  alignItems: "center",
  justifyContent: "center",
}

const $swatchActive: ViewStyle = {
  transform: [{ scale: 1.15 }],
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
  flexDirection: "row",
  gap: spacing.s3,
  marginTop: spacing.s5,
}

const $ghostBtn: ViewStyle = {
  flex: 1,
  paddingVertical: spacing.s3,
  borderRadius: radii.pill,
  alignItems: "center",
  borderWidth: 1,
  borderColor: hairline,
}

const $ghostBtnText: TextStyle = {
  fontSize: 15,
  color: ink2,
  fontFamily: typography.primary.medium,
}

const $primaryBtn: ViewStyle = {
  flex: 2,
  paddingVertical: spacing.s3,
  borderRadius: radii.pill,
  alignItems: "center",
  backgroundColor: coral500,
  ...elevation.tapButton,
}

const $primaryBtnPressed: ViewStyle = { backgroundColor: coral600, transform: [{ scale: 0.97 }] }

const $primaryBtnText: TextStyle = {
  fontSize: 15,
  color: "white",
  fontFamily: typography.primary.medium,
}
