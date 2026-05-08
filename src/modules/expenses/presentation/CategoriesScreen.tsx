import { useCallback, useEffect, useRef, useState } from "react"
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
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons"

import { Text } from "@/components/Text"
import { container } from "@/bootstrap/container"
import { createCategory } from "@/modules/expenses/application/create-category"
import type { Category } from "@/modules/expenses/domain/entities/category"
import type { CategoryRepository } from "@/modules/expenses/domain/repositories/category-repository"
import {
  paper,
  paper2,
  ink,
  ink2,
  ink3,
  ink4,
  coral500,
  coral600,
  card,
  hairline,
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

// ---- Color palette ---------------------------------------------------------

const PALETTE = [
  { key: "clay",   color: catClay,   label: "Clay" },
  { key: "mango",  color: catMango,  label: "Mango" },
  { key: "fern",   color: catFern,   label: "Fern" },
  { key: "lake",   color: catLake,   label: "Lake" },
  { key: "orchid", color: catOrchid, label: "Orchid" },
  { key: "stone",  color: catStone,  label: "Stone" },
] as const

// ---- Category Disc ---------------------------------------------------------

function CategoryDisc({ color, size = 36 }: { color: string; size?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <MaterialCommunityIcons name="silverware-fork-knife" size={size * 0.44} color="white" />
    </View>
  )
}

// ---- Color picker ----------------------------------------------------------

function ColorPicker({
  selected,
  onSelect,
}: {
  selected: string
  onSelect: (color: string) => void
}) {
  return (
    <View style={$colorRow}>
      {PALETTE.map((p) => {
        const isSelected = selected === p.color
        return (
          <Pressable
            key={p.key}
            onPress={() => onSelect(p.color)}
            style={[$colorSwatch, { backgroundColor: p.color }, isSelected && $colorSwatchSelected]}
            accessibilityLabel={p.label}
            hitSlop={6}
          >
            {isSelected && (
              <Ionicons name="checkmark" size={16} color="white" />
            )}
          </Pressable>
        )
      })}
    </View>
  )
}

// ---- Add-Category sheet ----------------------------------------------------

function AddCategorySheet({
  visible,
  onClose,
  onSaved,
}: {
  visible: boolean
  onClose: () => void
  onSaved: (cat: Category) => void
}) {
  const insets = useSafeAreaInsets()
  const slideAnim = useRef(new Animated.Value(300)).current

  const [name, setName] = useState("")
  const [selectedColor, setSelectedColor] = useState(catClay)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (visible) {
      setName("")
      setSelectedColor(catClay)
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
  }, [visible, slideAnim])

  async function handleSave() {
    if (!name.trim()) { setError("Name is required."); return }
    setSaving(true)
    setError("")
    try {
      const repo = container.resolve<CategoryRepository>("categoryRepository")
      if (!repo) throw new Error("Repository unavailable")
      const cat = await createCategory(repo, name.trim(), selectedColor)
      onSaved(cat)
      onClose()
    } catch (e: any) {
      setError(e?.message ?? "Couldn't save.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      {/* Scrim */}
      <Pressable style={$scrim} onPress={onClose} />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={$sheetOuter}
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

          <Text style={$sheetEyebrow}>Add category</Text>
          <Text style={$sheetTitle}>What is it?</Text>

          {/* Color preview + input row */}
          <View style={$inputRow}>
            <CategoryDisc color={selectedColor} size={40} />
            <TextInput
              style={$nameInput}
              value={name}
              onChangeText={(t) => { setName(t); setError("") }}
              placeholder="Category name"
              placeholderTextColor={ink4}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleSave}
            />
          </View>

          {error ? <Text style={$errorText}>{error}</Text> : null}

          {/* Color picker */}
          <Text style={$pickerLabel}>Color</Text>
          <ColorPicker selected={selectedColor} onSelect={setSelectedColor} />

          {/* Actions */}
          <View style={$sheetActions}>
            <Pressable style={$ghostBtn} onPress={onClose}>
              <Text style={$ghostBtnText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [$primaryBtn, pressed && $primaryBtnPressed, saving && $primaryBtnDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              <Text style={$primaryBtnText}>{saving ? "Saving…" : "Save"}</Text>
            </Pressable>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

// ---- Category row ----------------------------------------------------------

function CategoryRow({ category, isFirst }: { category: Category; isFirst: boolean }) {
  const color = category.color_hex
  return (
    <View style={[$catRow, !isFirst && $catRowBorder]}>
      <CategoryDisc color={color} size={36} />
      <Text style={$catName}>{category.name}</Text>
      <View style={[$catColorChip, { backgroundColor: color + "22", borderColor: color + "55" }]}>
        <View style={[$catColorDot, { backgroundColor: color }]} />
        <Text style={[$catColorLabel, { color }]}>
          {PALETTE.find((p) => p.color === color)?.label ?? "Custom"}
        </Text>
      </View>
    </View>
  )
}

// ---- Main screen -----------------------------------------------------------

export function CategoriesScreen() {
  const insets = useSafeAreaInsets()
  const [categories, setCategories] = useState<Category[]>([])
  const [sheetOpen, setSheetOpen] = useState(false)

  const loadCategories = useCallback(async () => {
    const repo = container.resolve<CategoryRepository>("categoryRepository")
    if (!repo) return
    const all = await repo.findAll()
    setCategories(all)
  }, [])

  useEffect(() => { loadCategories() }, [loadCategories])

  function handleSaved(cat: Category) {
    setCategories((prev) => [...prev, cat])
  }

  return (
    <View style={[$screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={$header}>
        <View>
          <Text style={$eyebrow}>Settings</Text>
          <Text style={$title}>Categories</Text>
        </View>
        <Pressable
          onPress={() => setSheetOpen(true)}
          style={$addBtn}
          accessibilityLabel="Add category"
          hitSlop={8}
        >
          <Ionicons name="add" size={22} color={coral500} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[$scrollContent, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {categories.length === 0 ? (
          <View style={$emptyWrap}>
            <MaterialCommunityIcons name="tag-outline" size={40} color={ink4} />
            <Text style={$emptyTitle}>No categories yet.</Text>
            <Text style={$emptySub}>Tap + to add your first one.</Text>
          </View>
        ) : (
          <View style={$card}>
            {categories.map((cat, i) => (
              <CategoryRow key={String(cat.id ?? i)} category={cat} isFirst={i === 0} />
            ))}
          </View>
        )}

        {/* Add inline CTA at the bottom */}
        <Pressable style={$addRowBtn} onPress={() => setSheetOpen(true)}>
          <Ionicons name="add-circle-outline" size={20} color={coral500} />
          <Text style={$addRowBtnText}>Add category</Text>
        </Pressable>
      </ScrollView>

      <AddCategorySheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onSaved={handleSaved}
      />
    </View>
  )
}

export default CategoriesScreen

// ---- Styles ----------------------------------------------------------------

const $screen: ViewStyle = { flex: 1, backgroundColor: paper }

const $header: ViewStyle = {
  flexDirection: "row",
  alignItems: "flex-start",
  justifyContent: "space-between",
  paddingHorizontal: spacing.s5,
  paddingTop: spacing.s4,
  paddingBottom: spacing.s3,
}

const $eyebrow: TextStyle = {
  fontSize: 11, letterSpacing: 1.4, textTransform: "uppercase",
  color: ink3, fontFamily: typography.primary.normal,
}

const $title: TextStyle = {
  fontSize: 28, lineHeight: 32, letterSpacing: -0.3,
  color: ink, fontFamily: typography.primary.bold, marginTop: 3,
}

const $addBtn: ViewStyle = {
  width: 36, height: 36, borderRadius: 18,
  backgroundColor: coral500 + "18",
  alignItems: "center", justifyContent: "center",
  marginTop: spacing.s2,
}

const $scrollContent = {
  paddingHorizontal: spacing.s5,
  paddingTop: spacing.s2,
  gap: spacing.s3,
}

// ---- Card + rows -----------------------------------------------------------

const $card: ViewStyle = {
  backgroundColor: card,
  borderRadius: radii.lg,
  borderWidth: 1,
  borderColor: hairline,
  ...elevation.card,
  overflow: "hidden",
}

const $catRow: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.s3,
  paddingVertical: spacing.s3,
  paddingHorizontal: spacing.s4,
  backgroundColor: card,
}

const $catRowBorder: ViewStyle = {
  borderTopWidth: 1,
  borderTopColor: hairline,
}

const $catName: TextStyle = {
  flex: 1,
  fontSize: 15,
  color: ink,
  fontFamily: typography.primary.normal,
}

const $catColorChip: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  gap: 5,
  paddingVertical: 3,
  paddingHorizontal: 9,
  borderRadius: radii.pill,
  borderWidth: 1,
}

const $catColorDot: ViewStyle = {
  width: 7, height: 7, borderRadius: 4,
}

const $catColorLabel: TextStyle = {
  fontSize: 12,
  fontFamily: typography.primary.normal,
}

// ---- Add row CTA -----------------------------------------------------------

const $addRowBtn: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.s2,
  paddingVertical: spacing.s3,
  paddingHorizontal: spacing.s1,
}

const $addRowBtnText: TextStyle = {
  fontSize: 15, color: coral500, fontFamily: typography.primary.normal,
}

// ---- Bottom sheet ----------------------------------------------------------

const $scrim: ViewStyle = {
  position: "absolute",
  inset: 0 as any,
  top: 0, left: 0, right: 0, bottom: 0,
  backgroundColor: "rgba(31, 28, 24, 0.4)",
}

const $sheetOuter: ViewStyle = {
  position: "absolute",
  bottom: 0, left: 0, right: 0,
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
  width: 36, height: 4, borderRadius: 2,
  backgroundColor: hairline,
  alignSelf: "center",
  marginBottom: spacing.s4,
}

const $sheetEyebrow: TextStyle = {
  fontSize: 11, letterSpacing: 1.4, textTransform: "uppercase",
  color: ink3, fontFamily: typography.primary.normal,
}

const $sheetTitle: TextStyle = {
  fontSize: 22, letterSpacing: -0.3,
  color: ink, fontFamily: typography.primary.semiBold,
  marginTop: spacing.s1, marginBottom: spacing.s4,
}

const $inputRow: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.s3,
  marginBottom: spacing.s4,
}

const $nameInput: TextStyle = {
  flex: 1,
  paddingVertical: spacing.s3,
  paddingHorizontal: spacing.s3,
  borderWidth: 1,
  borderColor: hairline,
  borderRadius: radii.md,
  fontSize: 15,
  color: ink,
  fontFamily: typography.primary.normal,
  backgroundColor: paper,
}

const $errorText: TextStyle = {
  fontSize: 13, color: coral600,
  fontFamily: typography.primary.normal,
  marginBottom: spacing.s3,
}

const $pickerLabel: TextStyle = {
  fontSize: 13, color: ink3,
  fontFamily: typography.primary.normal,
  marginBottom: spacing.s3,
}

const $colorRow: ViewStyle = {
  flexDirection: "row",
  gap: spacing.s3,
  marginBottom: spacing.s5,
}

const $colorSwatch: ViewStyle = {
  width: 38, height: 38,
  borderRadius: 19,
  alignItems: "center", justifyContent: "center",
}

const $colorSwatchSelected: ViewStyle = {
  borderWidth: 2.5,
  borderColor: "white",
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.2,
  shadowRadius: 4,
  elevation: 3,
}

const $sheetActions: ViewStyle = {
  flexDirection: "row",
  gap: spacing.s3,
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
  fontSize: 15, color: ink2,
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
const $primaryBtnDisabled: ViewStyle = { backgroundColor: ink4 }

const $primaryBtnText: TextStyle = {
  fontSize: 15, color: "white",
  fontFamily: typography.primary.medium,
}

// ---- Empty state -----------------------------------------------------------

const $emptyWrap: ViewStyle = {
  alignItems: "center", paddingVertical: spacing.s16, gap: spacing.s3,
}

const $emptyTitle: TextStyle = {
  fontSize: 16, color: ink3,
  fontFamily: typography.primary.semiBold, marginTop: spacing.s2,
}

const $emptySub: TextStyle = {
  fontSize: 13, color: ink4,
  fontFamily: typography.primary.normal, textAlign: "center",
}
