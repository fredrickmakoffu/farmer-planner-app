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
  ActivityIndicator,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons"
import { useRouter } from "expo-router"

import { Text } from "@/components/Text"
import { container } from "@/bootstrap/container"
import { createCategory } from "@/modules/expenses/application/create-category"
import type { Category } from "@/modules/expenses/domain/entities/category"
import type { CategoryRepository } from "@/modules/expenses/domain/repositories/category-repository"
import {
  paper, paper2, card, ink, ink2, ink3, ink4,
  coral500, coral600, hairline,
  catClay, catMango, catFern, catLake, catOrchid, catStone,
  spacing, radii, elevation, duration,
} from "@/theme/tapp-tokens"
import { typography } from "@/theme/typography"

// ---- Constants -------------------------------------------------------------

export const ICON_OPTIONS = [
  "silverware-fork-knife",
  "cart",
  "bus",
  "lightning-bolt",
  "movie-open",
  "coffee",
  "medical-bag",
  "shopping",
  "home",
  "airplane",
  "dumbbell",
  "cellphone",
  "school",
  "book-open-variant",
  "heart",
  "dots-horizontal",
] as const

export type CategoryIconName = (typeof ICON_OPTIONS)[number]

const PALETTE = [
  { key: "clay",   color: catClay,   label: "Clay" },
  { key: "mango",  color: catMango,  label: "Mango" },
  { key: "fern",   color: catFern,   label: "Fern" },
  { key: "lake",   color: catLake,   label: "Lake" },
  { key: "orchid", color: catOrchid, label: "Orchid" },
  { key: "stone",  color: catStone,  label: "Stone" },
]

// ---- Category disc ---------------------------------------------------------

export function CategoryDisc({
  color, icon, size = 36,
}: { color: string; icon: string; size?: number }) {
  return (
    <View style={[$disc, { width: size, height: size, borderRadius: size / 2, backgroundColor: color }]}>
      <MaterialCommunityIcons
        name={icon as any}
        size={Math.round(size * 0.44)}
        color="white"
      />
    </View>
  )
}

// ---- Icon picker -----------------------------------------------------------

function IconPicker({ selected, onSelect }: { selected: string; onSelect: (icon: string) => void }) {
  return (
    <View style={$iconGrid}>
      {ICON_OPTIONS.map((icon) => {
        const active = selected === icon
        return (
          <Pressable
            key={icon}
            onPress={() => onSelect(icon)}
            style={[$iconCell, active && $iconCellActive]}
            hitSlop={4}
          >
            <MaterialCommunityIcons name={icon as any} size={20} color={active ? "white" : ink3} />
          </Pressable>
        )
      })}
    </View>
  )
}

// ---- Color picker ----------------------------------------------------------

function ColorPicker({ selected, onSelect }: { selected: string; onSelect: (c: string) => void }) {
  return (
    <View style={$colorRow}>
      {PALETTE.map((p) => (
        <Pressable
          key={p.key}
          onPress={() => onSelect(p.color)}
          style={[$swatch, { backgroundColor: p.color }, selected === p.color && $swatchActive]}
          accessibilityLabel={p.label}
          hitSlop={6}
        >
          {selected === p.color && <Ionicons name="checkmark" size={16} color="white" />}
        </Pressable>
      ))}
    </View>
  )
}

// ---- Edit / Add sheet ------------------------------------------------------

type SheetMode = "add" | "edit"

type SheetProps = {
  visible: boolean
  mode: SheetMode
  category: Category | null
  onSave: (data: Omit<Category, "id">, id?: number) => void
  onDelete: (id: number) => void
  onClose: () => void
}

function CategorySheet({ visible, mode, category, onSave, onDelete, onClose }: SheetProps) {
  const slideAnim = useRef(new Animated.Value(600)).current

  const [name, setName] = useState("")
  const [color, setColor] = useState(catClay)
  const [icon, setIcon] = useState<string>("dots-horizontal")

  const isSystem = category?.is_system ?? false

  useEffect(() => {
    if (visible) {
      if (category) {
        setName(category.name)
        setColor(category.color_hex)
        setIcon(category.icon ?? "dots-horizontal")
      } else {
        setName("")
        setColor(catClay)
        setIcon("silverware-fork-knife")
      }
      Animated.timing(slideAnim, { toValue: 0, duration: duration.base, useNativeDriver: true }).start()
    } else {
      Animated.timing(slideAnim, { toValue: 600, duration: duration.fast, useNativeDriver: true }).start()
    }
  }, [visible, category])

  function handleSave() {
    if (!name.trim()) return
    onSave({ name: name.trim(), color_hex: color, icon, is_system: isSystem }, category?.id)
  }

  const canSave = name.trim().length > 0

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Pressable style={$scrim} onPress={onClose} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={$kavWrap}
        pointerEvents="box-none"
      >
        <Animated.View style={[$sheet, { transform: [{ translateY: slideAnim }] }]}>
          <View style={$handle} />

          <View style={$sheetHeader}>
            <View style={$sheetTitleRow}>
              <CategoryDisc color={color} icon={icon} size={32} />
              <Text style={$sheetTitle}>
                {mode === "add" ? "New category" : isSystem ? "Edit appearance" : "Edit category"}
              </Text>
            </View>
            <Pressable onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={20} color={ink3} />
            </Pressable>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={$sheetContent}>
            {/* Name — locked for system categories */}
            <Text style={$fieldLabel}>Name</Text>
            <TextInput
              style={[$textInput, isSystem && $textInputLocked]}
              value={name}
              onChangeText={setName}
              placeholder="Category name"
              placeholderTextColor={ink4}
              editable={!isSystem}
              autoFocus={mode === "add"}
            />
            {isSystem && (
              <Text style={$lockedHint}>System categories can't be renamed.</Text>
            )}

            {/* Color */}
            <Text style={$fieldLabel}>Colour</Text>
            <ColorPicker selected={color} onSelect={setColor} />

            {/* Icon */}
            <Text style={$fieldLabel}>Icon</Text>
            <IconPicker selected={icon} onSelect={setIcon} />

            <Pressable
              onPress={handleSave}
              style={({ pressed }) => [$saveBtn, !canSave && $saveBtnDisabled, pressed && canSave && $saveBtnPressed]}
              disabled={!canSave}
            >
              <Text style={$saveBtnText}>{mode === "add" ? "Add category" : "Save changes"}</Text>
            </Pressable>

            {mode === "edit" && !isSystem && category?.id != null && (
              <Pressable
                onPress={() => onDelete(category.id!)}
                style={({ pressed }) => [$deleteBtn, pressed && { opacity: 0.7 }]}
              >
                <Ionicons name="trash-outline" size={16} color={coral500} />
                <Text style={$deleteBtnText}>Delete category</Text>
              </Pressable>
            )}
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

// ---- Category row ----------------------------------------------------------

type RowProps = {
  category: Category
  isFirst: boolean
  onPress: (c: Category) => void
}

function CategoryRow({ category, isFirst, onPress }: RowProps) {
  return (
    <Pressable
      onPress={() => onPress(category)}
      style={({ pressed }) => [$row, !isFirst && $rowBorder, pressed && $rowPressed]}
    >
      <CategoryDisc color={category.color_hex} icon={category.icon ?? "dots-horizontal"} size={36} />
      <View style={$rowMid}>
        <Text style={$rowName}>{category.name}</Text>
        {category.is_system && <Text style={$systemBadge}>system</Text>}
      </View>
      <Ionicons name="chevron-forward" size={16} color={ink4} />
    </Pressable>
  )
}

// ---- Main screen -----------------------------------------------------------

export function CategoriesScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()

  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [sheetMode, setSheetMode] = useState<"add" | "edit">("add")
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)

  const loadData = useCallback(async () => {
    const repo = container.resolve<CategoryRepository>("categoryRepository")
    if (!repo) { setLoading(false); return }
    const all = await repo.findAll()
    // System categories first, then user-created
    setCategories([
      ...all.filter((c) => c.is_system),
      ...all.filter((c) => !c.is_system),
    ])
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  function openAdd() {
    setEditingCategory(null)
    setSheetMode("add")
    setSheetOpen(true)
  }

  function openEdit(cat: Category) {
    setEditingCategory(cat)
    setSheetMode("edit")
    setSheetOpen(true)
  }

  const handleSave = useCallback(async (data: Omit<Category, "id">, id?: number) => {
    setSheetOpen(false)
    const repo = container.resolve<CategoryRepository>("categoryRepository")
    if (!repo) return
    if (id != null) {
      await repo.update({ ...data, id })
    } else {
      await createCategory(repo, data.name, data.color_hex, data.icon, data.is_system)
    }
    loadData()
  }, [loadData])

  const handleDelete = useCallback(async (id: number) => {
    setSheetOpen(false)
    const repo = container.resolve<CategoryRepository>("categoryRepository")
    if (!repo) return
    await repo.delete(id)
    loadData()
  }, [loadData])

  const systemCats = categories.filter((c) => c.is_system)
  const userCats = categories.filter((c) => !c.is_system)

  return (
    <View style={[$screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={$header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={$backBtn}>
          <Ionicons name="chevron-back" size={22} color={ink} />
        </Pressable>
        <View style={$headerCenter}>
          <Text style={$headerTitle}>Categories</Text>
        </View>
        <Pressable onPress={openAdd} hitSlop={12} style={$addBtn}>
          <Ionicons name="add" size={24} color={coral500} />
        </Pressable>
      </View>

      {loading ? (
        <View style={$loadingWrap}>
          <ActivityIndicator color={coral500} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[$scrollContent, { paddingBottom: insets.bottom + 32 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* System categories */}
          <Text style={$sectionLabel}>Tapp defaults</Text>
          <View style={$card}>
            {systemCats.map((cat, i) => (
              <CategoryRow key={String(cat.id)} category={cat} isFirst={i === 0} onPress={openEdit} />
            ))}
          </View>
          <Text style={$sectionHint}>These can't be deleted or renamed, but you can change their colour and icon.</Text>

          {/* User categories */}
          {userCats.length > 0 && (
            <>
              <Text style={[$sectionLabel, { marginTop: spacing.s4 }]}>Your categories</Text>
              <View style={$card}>
                {userCats.map((cat, i) => (
                  <CategoryRow key={String(cat.id)} category={cat} isFirst={i === 0} onPress={openEdit} />
                ))}
              </View>
            </>
          )}

          <Pressable
            onPress={openAdd}
            style={({ pressed }) => [$addRowBtn, pressed && { opacity: 0.75 }]}
          >
            <Ionicons name="add-circle-outline" size={18} color={coral500} />
            <Text style={$addRowBtnText}>Add category</Text>
          </Pressable>
        </ScrollView>
      )}

      <CategorySheet
        visible={sheetOpen}
        mode={sheetMode}
        category={editingCategory}
        onSave={handleSave}
        onDelete={handleDelete}
        onClose={() => setSheetOpen(false)}
      />
    </View>
  )
}

export default CategoriesScreen

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
const $addBtn: ViewStyle = { width: 36, alignItems: "flex-end" }
const $headerCenter: ViewStyle = { flex: 1, alignItems: "center" }

const $headerTitle: TextStyle = {
  fontSize: 17, color: ink,
  fontFamily: typography.primary.semiBold,
}

const $loadingWrap: ViewStyle = {
  flex: 1, alignItems: "center", justifyContent: "center",
}

const $scrollContent = {
  paddingHorizontal: spacing.s5,
  paddingTop: spacing.s4,
  gap: spacing.s2,
}

const $sectionLabel: TextStyle = {
  fontSize: 11, letterSpacing: 1.2, textTransform: "uppercase",
  color: ink3, fontFamily: typography.primary.normal,
  marginBottom: spacing.s1,
}

const $sectionHint: TextStyle = {
  fontSize: 12, color: ink4,
  fontFamily: typography.primary.normal,
  lineHeight: 17,
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
  paddingVertical: spacing.s3,
  paddingHorizontal: spacing.s4,
  gap: spacing.s3,
  backgroundColor: card,
}

const $rowBorder: ViewStyle = { borderTopWidth: 1, borderTopColor: hairline }
const $rowPressed: ViewStyle = { backgroundColor: paper2 }

const $rowMid: ViewStyle = {
  flex: 1,
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.s2,
}

const $rowName: TextStyle = {
  fontSize: 15, color: ink,
  fontFamily: typography.primary.normal,
}

const $systemBadge: TextStyle = {
  fontSize: 10, color: ink4,
  fontFamily: typography.primary.normal,
  letterSpacing: 0.5,
  textTransform: "uppercase",
}

const $disc: ViewStyle = {
  alignItems: "center", justifyContent: "center", flexShrink: 0,
}

const $addRowBtn: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.s2,
  paddingVertical: spacing.s3,
  alignSelf: "center",
  marginTop: spacing.s2,
}

const $addRowBtnText: TextStyle = {
  fontSize: 14, color: coral500,
  fontFamily: typography.primary.medium,
}

// ---- Sheet -----------------------------------------------------------------

const $scrim: ViewStyle = {
  position: "absolute", top: 0, bottom: 0, left: 0, right: 0,
  backgroundColor: "rgba(0,0,0,0.35)",
}

const $kavWrap: ViewStyle = {
  position: "absolute", bottom: 0, left: 0, right: 0,
}

const $sheet: ViewStyle = {
  backgroundColor: paper,
  borderTopLeftRadius: radii.xl,
  borderTopRightRadius: radii.xl,
  maxHeight: "90%",
  ...elevation.sheet,
}

const $handle: ViewStyle = {
  width: 36, height: 4, borderRadius: 2,
  backgroundColor: hairline,
  alignSelf: "center",
  marginTop: spacing.s2,
  marginBottom: spacing.s2,
}

const $sheetHeader: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  paddingHorizontal: spacing.s5,
  paddingBottom: spacing.s3,
  borderBottomWidth: 1,
  borderBottomColor: hairline,
}

const $sheetTitleRow: ViewStyle = {
  flexDirection: "row", alignItems: "center", gap: spacing.s3,
}

const $sheetTitle: TextStyle = {
  fontSize: 17, color: ink,
  fontFamily: typography.primary.semiBold,
}

const $sheetContent = {
  paddingHorizontal: spacing.s5,
  paddingTop: spacing.s4,
  paddingBottom: spacing.s8,
  gap: spacing.s3,
}

const $fieldLabel: TextStyle = {
  fontSize: 11, letterSpacing: 1.2, textTransform: "uppercase",
  color: ink3, fontFamily: typography.primary.normal,
}

const $textInput: TextStyle = {
  backgroundColor: card,
  borderWidth: 1, borderColor: hairline,
  borderRadius: radii.md,
  paddingHorizontal: spacing.s3,
  paddingVertical: spacing.s2 + 2,
  fontSize: 15, color: ink,
  fontFamily: typography.primary.normal,
}

const $textInputLocked: TextStyle = {
  opacity: 0.5,
}

const $lockedHint: TextStyle = {
  fontSize: 12, color: ink4,
  fontFamily: typography.primary.normal,
  marginTop: -spacing.s1,
}

// ---- Icon grid -------------------------------------------------------------

const $iconGrid: ViewStyle = {
  flexDirection: "row",
  flexWrap: "wrap",
  gap: spacing.s2,
}

const $iconCell: ViewStyle = {
  width: 44, height: 44, borderRadius: radii.md,
  alignItems: "center", justifyContent: "center",
  backgroundColor: card,
  borderWidth: 1, borderColor: hairline,
}

const $iconCellActive: ViewStyle = {
  backgroundColor: ink,
  borderColor: ink,
}

// ---- Color row -------------------------------------------------------------

const $colorRow: ViewStyle = {
  flexDirection: "row",
  gap: spacing.s2,
  flexWrap: "wrap",
}

const $swatch: ViewStyle = {
  width: 36, height: 36, borderRadius: 18,
  alignItems: "center", justifyContent: "center",
}

const $swatchActive: ViewStyle = {
  borderWidth: 2, borderColor: ink,
}

// ---- Save / Delete ---------------------------------------------------------

const $saveBtn: ViewStyle = {
  backgroundColor: coral500,
  borderRadius: radii.pill,
  paddingVertical: spacing.s3 + 1,
  alignItems: "center",
  ...elevation.tapButton,
  marginTop: spacing.s2,
}

const $saveBtnDisabled: ViewStyle = { opacity: 0.45 }

const $saveBtnPressed: ViewStyle = {
  backgroundColor: coral600,
  transform: [{ scale: 0.97 }],
}

const $saveBtnText: TextStyle = {
  fontSize: 15, color: "white",
  fontFamily: typography.primary.medium,
  letterSpacing: 0.1,
}

const $deleteBtn: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  gap: spacing.s2,
  paddingVertical: spacing.s3,
}

const $deleteBtnText: TextStyle = {
  fontSize: 14, color: coral500,
  fontFamily: typography.primary.normal,
}
