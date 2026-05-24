import { useEffect, useState } from "react"
import {
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

import { Text } from "@/components/Text"
import { container } from "@/bootstrap/container"
import { createCategory } from "@/modules/expenses/application/create-category"
import type { Category } from "@/modules/expenses/domain/entities/category"
import type { Routine } from "@/modules/expenses/domain/entities/routine"
import type { CategoryRepository } from "@/modules/expenses/domain/repositories/category-repository"
import {
  paper,
  paper2,
  card,
  ink,
  ink2,
  ink3,
  ink4,
  coral500,
  coral600,
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
} from "@/theme/tapp-tokens"
import { typography } from "@/theme/typography"
import { CategoryDisc, ICON_OPTIONS } from "../CategoriesScreen"

// ---- helpers ---------------------------------------------------------------

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

function minutesToLabel(m: number): string {
  const h = Math.floor(m / 60)
  const min = m % 60
  const ampm = h < 12 ? "AM" : "PM"
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  return min === 0 ? `${h12}${ampm}` : `${h12}:${String(min).padStart(2, "0")}${ampm}`
}

function slotLabel(start: number, end: number): string {
  return `${minutesToLabel(start)} – ${minutesToLabel(end)}`
}

function timeProximity(routine: Routine, nowMinutes: number): number {
  // Distance from nowMinutes to the routine's window
  if (nowMinutes >= routine.time_start && nowMinutes < routine.time_end) return 0
  return Math.min(
    Math.abs(routine.time_start - nowMinutes),
    Math.abs(routine.time_end - nowMinutes),
  )
}

function formatAmount(n: number): string {
  return n.toLocaleString("en-KE")
}

const TIME_SLOTS = [
  { label: "Early morning", start: 300, end: 420 },
  { label: "Morning", start: 420, end: 600 },
  { label: "Midday", start: 600, end: 720 },
  { label: "Lunch", start: 720, end: 840 },
  { label: "Afternoon", start: 840, end: 1020 },
  { label: "Evening", start: 1020, end: 1200 },
  { label: "Night", start: 1200, end: 1380 },
]

function closestSlotIndex(nowMinutes: number): number {
  let best = 0
  let bestDist = Infinity
  TIME_SLOTS.forEach((s, i) => {
    const d = Math.min(Math.abs(s.start - nowMinutes), Math.abs(s.end - nowMinutes))
    if (nowMinutes >= s.start && nowMinutes < s.end) { best = i; bestDist = 0 }
    else if (d < bestDist) { bestDist = d; best = i }
  })
  return best
}

// ---- PickRoutineSheet props -------------------------------------------------

export type PickRoutineSheetProps = {
  visible: boolean
  routines: Routine[]
  categories: Category[]
  nowMinutes: number
  onLog: (categoryId: number, amount: number) => void
  onSaveRoutineAndLog: (routine: Omit<Routine, "id">) => void
  onClose: () => void
}

// ---- Routine Row (pick mode) -----------------------------------------------

type RoutineRowProps = {
  routine: Routine
  category: Category | undefined
  isFirst: boolean
  onTap: (routine: Routine, amount: number) => void
}

function RoutineRow({ routine, category, isFirst, onTap }: RoutineRowProps) {
  const [expanded, setExpanded] = useState(false)
  const [draftAmount, setDraftAmount] = useState(
    routine.default_amount > 0 ? String(routine.default_amount) : "",
  )

  const color = resolveCategoryColor(category?.name, category?.color_hex)
  const hasAmount = routine.default_amount > 0

  function handlePress() {
    if (hasAmount) {
      onTap(routine, routine.default_amount)
    } else {
      setExpanded(true)
    }
  }

  function handleConfirm() {
    const n = parseFloat(draftAmount)
    if (!isNaN(n) && n > 0) onTap(routine, n)
  }

  return (
    <View style={!isFirst ? $rowBorder : undefined}>
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [$routineRow, pressed && $rowPressed]}
      >
        <CategoryDisc color={color} icon={category?.icon ?? "dots-horizontal"} size={28} />
        <View style={$rowMid}>
          <Text style={$routineName}>{routine.name}</Text>
          <Text style={$routineMeta}>{slotLabel(routine.time_start, routine.time_end)}</Text>
        </View>
        <View style={$rowRight}>
          {hasAmount ? (
            <Text style={$routineAmount}>KSh {formatAmount(routine.default_amount)}</Text>
          ) : (
            <Text style={$setAmountHint}>set amount</Text>
          )}
          <Ionicons name={hasAmount ? "chevron-forward" : "add-circle-outline"} size={16} color={ink4} />
        </View>
      </Pressable>

      {expanded && (
        <View style={$inlineAmountRow}>
          <Text style={$inlineAmountPrefix}>KSh</Text>
          <TextInput
            style={$inlineAmountInput}
            value={draftAmount}
            onChangeText={setDraftAmount}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor={ink4}
            autoFocus
          />
          <Pressable
            onPress={handleConfirm}
            style={({ pressed }) => [$confirmSmall, pressed && { opacity: 0.75 }]}
          >
            <Text style={$confirmSmallText}>Log</Text>
          </Pressable>
        </View>
      )}
    </View>
  )
}

// ---- Add form (add mode) ---------------------------------------------------

type AddFormProps = {
  categories: Category[]
  nowMinutes: number
  onSave: (routine: Omit<Routine, "id">) => void
  onCategoryCreated: (cat: Category) => void
  onBack: () => void
}

const PALETTE_COLORS = [catClay, catMango, catFern, catLake, catOrchid, catStone]

function AddForm({ categories, nowMinutes, onSave, onCategoryCreated, onBack }: AddFormProps) {
  const [label, setLabel] = useState("")
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(
    categories.length ? (categories[0].id ?? null) : null,
  )

  // Auto-select first category once categories load (in case they weren't ready on mount)
  useEffect(() => {
    if (selectedCategoryId == null && categories.length > 0) {
      setSelectedCategoryId(categories[0].id ?? null)
    }
  }, [categories])
  const [amount, setAmount] = useState("")
  const [selectedSlot, setSelectedSlot] = useState(closestSlotIndex(nowMinutes))
  const [days, setDays] = useState<127 | 62 | 65>(127)

  const [newCatOpen, setNewCatOpen] = useState(false)
  const [newCatName, setNewCatName] = useState("")
  const [newCatColor, setNewCatColor] = useState(catClay)
  const [newCatIcon, setNewCatIcon] = useState("silverware-fork-knife")
  const [newCatSaving, setNewCatSaving] = useState(false)

  async function handleNewCatSave() {
    if (!newCatName.trim()) return
    setNewCatSaving(true)
    try {
      const repo = container.resolve<CategoryRepository>("categoryRepository")
      if (!repo) return
      const created = await createCategory(repo, newCatName.trim(), newCatColor, newCatIcon, false)
      setSelectedCategoryId(created.id ?? null)
      setNewCatOpen(false)
      setNewCatName("")
      onCategoryCreated(created)
    } catch (err) {
      console.error("handleNewCatSave: failed to create category", err)
    } finally {
      setNewCatSaving(false)
    }
  }

  function handleSave() {
    const n = parseFloat(amount)
    if (!label.trim()) return
    if (isNaN(n) || n <= 0) return
    if (selectedCategoryId == null) return
    onSave({
      name: label.trim(),
      category_id: selectedCategoryId,
      time_start: TIME_SLOTS[selectedSlot].start,
      time_end: TIME_SLOTS[selectedSlot].end,
      days_of_week: days,
      is_high_confidence: false,
      default_amount: n,
    })
  }

  const canSave = label.trim().length > 0 && parseFloat(amount) > 0 && selectedCategoryId != null

  return (
    <View style={$addForm}>
      <Pressable onPress={onBack} style={$backRow}>
        <Ionicons name="chevron-back" size={16} color={ink3} />
        <Text style={$backText}>Back to routines</Text>
      </Pressable>

      <Text style={$addFormTitle}>Add a routine for this time</Text>

      {/* Label */}
      <Text style={$fieldLabel}>Label</Text>
      <TextInput
        style={$textInput}
        value={label}
        onChangeText={setLabel}
        placeholder="e.g. going to work"
        placeholderTextColor={ink4}
      />

      {/* Amount */}
      <Text style={$fieldLabel}>Amount (KSh)</Text>
      <View style={$amountInputRow}>
        <Text style={$amountPrefix}>KSh</Text>
        <TextInput
          style={[$textInput, $amountInputField]}
          value={amount}
          onChangeText={setAmount}
          keyboardType="numeric"
          placeholder="0"
          placeholderTextColor={ink4}
        />
      </View>

      {/* Category */}
      <View style={$catLabelRow}>
        <Text style={$fieldLabel}>Category</Text>
        <Pressable onPress={() => { setNewCatOpen((v) => !v); setNewCatName("") }} hitSlop={8}>
          <Text style={$newCatLink}>{newCatOpen ? "Cancel" : "+ New category"}</Text>
        </Pressable>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={$catScroll} contentContainerStyle={$catScrollContent}>
        {categories.map((cat) => {
          const active = cat.id === selectedCategoryId
          return (
            <Pressable
              key={String(cat.id)}
              onPress={() => setSelectedCategoryId(cat.id ?? null)}
              style={[$catPill, active && { backgroundColor: cat.color_hex, borderColor: cat.color_hex }]}
            >
              <CategoryDisc color={cat.color_hex} icon={cat.icon ?? "dots-horizontal"} size={20} />
              <Text style={[$catPillText, active && $catPillTextActive]}>{cat.name}</Text>
            </Pressable>
          )
        })}
      </ScrollView>
      {newCatOpen && (
        <View style={$newCatForm}>
          <TextInput
            style={$textInput}
            value={newCatName}
            onChangeText={setNewCatName}
            placeholder="Category name"
            placeholderTextColor={ink4}
            autoFocus
          />
          <View style={$newCatColorRow}>
            {PALETTE_COLORS.map((c) => (
              <Pressable
                key={c}
                onPress={() => setNewCatColor(c)}
                style={[$miniSwatch, { backgroundColor: c }, newCatColor === c && $miniSwatchActive]}
                hitSlop={6}
              />
            ))}
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={$iconScrollContent}>
            {ICON_OPTIONS.map((ic) => (
              <Pressable
                key={ic}
                onPress={() => setNewCatIcon(ic)}
                style={[$iconCell, newCatIcon === ic && $iconCellActive]}
              >
                <MaterialCommunityIcons name={ic as any} size={18} color={newCatIcon === ic ? "white" : ink3} />
              </Pressable>
            ))}
          </ScrollView>
          <Pressable
            onPress={handleNewCatSave}
            disabled={newCatSaving || !newCatName.trim()}
            style={({ pressed }) => [$confirmSmallBtn, (!newCatName.trim() || newCatSaving) && { opacity: 0.45 }, pressed && { opacity: 0.75 }]}
          >
            <Text style={$confirmSmallText}>Add &amp; select</Text>
          </Pressable>
        </View>
      )}

      {/* Time slot */}
      <Text style={$fieldLabel}>When</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={$catScroll} contentContainerStyle={$catScrollContent}>
        {TIME_SLOTS.map((slot, i) => (
          <Pressable
            key={i}
            onPress={() => setSelectedSlot(i)}
            style={[$slotPill, i === selectedSlot && $slotPillActive]}
          >
            <Text style={[$slotPillText, i === selectedSlot && $slotPillTextActive]}>
              {slot.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Days */}
      <Text style={$fieldLabel}>Days</Text>
      <View style={$daysRow}>
        {([127, 62, 65] as const).map((d) => {
          const dLabel = d === 127 ? "Every day" : d === 62 ? "Weekdays" : "Weekends"
          return (
            <Pressable
              key={d}
              onPress={() => setDays(d)}
              style={[$dayBtn, days === d && $dayBtnActive]}
            >
              <Text style={[$dayBtnText, days === d && $dayBtnTextActive]}>{dLabel}</Text>
            </Pressable>
          )
        })}
      </View>

      <Pressable
        onPress={handleSave}
        style={({ pressed }) => [$saveBtn, !canSave && $saveBtnDisabled, pressed && canSave && $saveBtnPressed]}
        disabled={!canSave}
      >
        <Text style={$saveBtnText}>Save &amp; log</Text>
      </Pressable>
    </View>
  )
}

// ---- Main sheet ------------------------------------------------------------

export function PickRoutineSheet({
  visible,
  routines,
  categories,
  nowMinutes,
  onLog,
  onSaveRoutineAndLog,
  onClose,
}: PickRoutineSheetProps) {
  const [mode, setMode] = useState<"pick" | "add">("pick")
  const [localCategories, setLocalCategories] = useState<Category[]>(categories)

  // Keep localCategories in sync when the parent reloads categories (async data arrives)
  useEffect(() => { setLocalCategories(categories) }, [categories])

  const categoryMap = new Map(categories.map((c) => [c.id, c]))

  const sorted = [...routines].sort((a, b) => timeProximity(a, nowMinutes) - timeProximity(b, nowMinutes))

  function handleTap(routine: Routine, amount: number) {
    onLog(routine.category_id, amount)
  }

  function handleSaveRoutine(routine: Omit<Routine, "id">) {
    onSaveRoutineAndLog(routine)
  }

  const h = Math.floor(nowMinutes / 60)
  const min = nowMinutes % 60
  const timeStr = `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`

  return (
    <Modal visible={visible} transparent statusBarTranslucent animationType="none" onRequestClose={onClose}>
      <Pressable style={$scrim} onPress={onClose} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={$kavWrap}
        pointerEvents="box-none"
      >
        <View style={$sheet}>
          {/* Handle */}
          <View style={$handle} />

          {mode === "pick" ? (
            <>
              <View style={$sheetHeader}>
                <View>
                  <Text style={$sheetTitle}>No routine for {timeStr}</Text>
                  <Text style={$sheetSub}>Pick a routine to log against</Text>
                </View>
                <Pressable onPress={onClose} hitSlop={12}>
                  <Ionicons name="close" size={20} color={ink3} />
                </Pressable>
              </View>

              <ScrollView style={$sheetScroll} contentContainerStyle={$sheetScrollContent} keyboardShouldPersistTaps="handled">
                {sorted.length === 0 ? (
                  <View style={$noRoutinesWrap}>
                    <MaterialCommunityIcons name="clock-outline" size={32} color={ink4} />
                    <Text style={$noRoutinesText}>No routines yet</Text>
                  </View>
                ) : (
                  <View style={$card}>
                    {sorted.map((r, i) => (
                      <RoutineRow
                        key={String(r.id)}
                        routine={r}
                        category={r.category_id ? categoryMap.get(r.category_id) : undefined}
                        isFirst={i === 0}
                        onTap={handleTap}
                      />
                    ))}
                  </View>
                )}

                <Pressable
                  onPress={() => setMode("add")}
                  style={({ pressed }) => [$addRoutineBtn, pressed && { opacity: 0.75 }]}
                >
                  <Ionicons name="add-circle-outline" size={18} color={coral500} />
                  <Text style={$addRoutineBtnText}>Add routine for this time</Text>
                </Pressable>
              </ScrollView>
            </>
          ) : (
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 24 }}>
              <AddForm
                categories={localCategories}
                nowMinutes={nowMinutes}
                onSave={handleSaveRoutine}
                onCategoryCreated={(cat) => setLocalCategories((prev) => [...prev, cat])}
                onBack={() => setMode("pick")}
              />
            </ScrollView>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

export default PickRoutineSheet

// ---- Styles ----------------------------------------------------------------

const $scrim: ViewStyle = {
  position: "absolute",
  top: 0, bottom: 0, left: 0, right: 0,
  backgroundColor: "rgba(0,0,0,0.35)",
}

const $kavWrap: ViewStyle = {
  position: "absolute",
  bottom: 0, left: 0, right: 0,
}

const $sheet: ViewStyle = {
  backgroundColor: paper,
  borderTopLeftRadius: radii.xl,
  borderTopRightRadius: radii.xl,
  maxHeight: "85%",
  ...elevation.card,
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
  alignItems: "flex-start",
  paddingHorizontal: spacing.s5,
  paddingBottom: spacing.s3,
}

const $sheetTitle: TextStyle = {
  fontSize: 17, color: ink,
  fontFamily: typography.primary.semiBold,
}

const $sheetSub: TextStyle = {
  fontSize: 13, color: ink3,
  fontFamily: typography.primary.normal,
  marginTop: 2,
}

const $sheetScroll: ViewStyle = { flexGrow: 0 }

const $sheetScrollContent = {
  paddingHorizontal: spacing.s5,
  paddingBottom: spacing.s6,
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

const $rowBorder: ViewStyle = {
  borderTopWidth: 1,
  borderTopColor: hairline,
}

const $routineRow: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  paddingVertical: spacing.s3,
  paddingHorizontal: spacing.s4,
  gap: spacing.s3,
  backgroundColor: card,
}

const $rowPressed: ViewStyle = { backgroundColor: paper2 }

const $dot: ViewStyle = {
  width: 10, height: 10, borderRadius: 5, flexShrink: 0,
}

const $rowMid: ViewStyle = { flex: 1 }

const $routineName: TextStyle = {
  fontSize: 15, color: ink,
  fontFamily: typography.primary.normal,
}

const $routineMeta: TextStyle = {
  fontSize: 12, color: ink3,
  fontFamily: typography.primary.normal,
  marginTop: 2,
}

const $rowRight: ViewStyle = {
  flexDirection: "row", alignItems: "center", gap: spacing.s1,
}

const $routineAmount: TextStyle = {
  fontSize: 14, color: ink,
  fontFamily: typography.mono.normal,
}

const $setAmountHint: TextStyle = {
  fontSize: 12, color: coral500,
  fontFamily: typography.primary.normal,
}

const $inlineAmountRow: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.s2,
  paddingHorizontal: spacing.s4,
  paddingVertical: spacing.s2,
  backgroundColor: paper2,
  borderTopWidth: 1,
  borderTopColor: hairline,
}

const $inlineAmountPrefix: TextStyle = {
  fontSize: 14, color: ink3,
  fontFamily: typography.mono.normal,
}

const $inlineAmountInput: TextStyle = {
  flex: 1,
  fontSize: 18, color: ink,
  fontFamily: typography.mono.normal,
  paddingVertical: 4,
}

const $confirmSmall: ViewStyle = {
  backgroundColor: coral500,
  borderRadius: radii.pill,
  paddingHorizontal: spacing.s3,
  paddingVertical: spacing.s1 + 2,
}

const $confirmSmallText: TextStyle = {
  fontSize: 13, color: "white",
  fontFamily: typography.primary.medium,
}

// ---- No routines -----------------------------------------------------------

const $noRoutinesWrap: ViewStyle = {
  alignItems: "center",
  paddingVertical: spacing.s6,
  gap: spacing.s2,
}

const $noRoutinesText: TextStyle = {
  fontSize: 14, color: ink4,
  fontFamily: typography.primary.normal,
}

// ---- Add routine button ---------------------------------------------------

const $addRoutineBtn: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.s2,
  paddingVertical: spacing.s3,
  alignSelf: "center",
}

const $addRoutineBtnText: TextStyle = {
  fontSize: 14, color: coral500,
  fontFamily: typography.primary.medium,
}

// ---- Add form styles -------------------------------------------------------

const $addForm: ViewStyle = {
  paddingHorizontal: spacing.s5,
  paddingTop: spacing.s2,
  gap: spacing.s3,
}

const $backRow: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.s1,
  marginBottom: spacing.s1,
}

const $backText: TextStyle = {
  fontSize: 13, color: ink3,
  fontFamily: typography.primary.normal,
}

const $addFormTitle: TextStyle = {
  fontSize: 17, color: ink,
  fontFamily: typography.primary.semiBold,
  marginBottom: spacing.s1,
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

const $amountInputRow: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.s2,
}

const $amountPrefix: TextStyle = {
  fontSize: 15, color: ink3,
  fontFamily: typography.mono.normal,
}

const $amountInputField: TextStyle = { flex: 1 }

const $catScroll: ViewStyle = { flexGrow: 0 }

const $catScrollContent = {
  gap: spacing.s2,
  paddingBottom: spacing.s1,
}

const $catPill: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.s1 + 2,
  paddingVertical: spacing.s1 + 2,
  paddingHorizontal: spacing.s3,
  borderRadius: radii.pill,
  backgroundColor: card,
  borderWidth: 1,
  borderColor: hairline,
}

const $catDot: ViewStyle = { width: 8, height: 8, borderRadius: 4 }

const $catPillText: TextStyle = {
  fontSize: 13, color: ink2,
  fontFamily: typography.primary.normal,
}

const $catPillTextActive: TextStyle = { color: "white" }

const $slotPill: ViewStyle = {
  paddingVertical: spacing.s1 + 2,
  paddingHorizontal: spacing.s3,
  borderRadius: radii.pill,
  backgroundColor: card,
  borderWidth: 1,
  borderColor: hairline,
}

const $slotPillActive: ViewStyle = {
  backgroundColor: ink,
  borderColor: ink,
}

const $slotPillText: TextStyle = {
  fontSize: 13, color: ink2,
  fontFamily: typography.primary.normal,
}

const $slotPillTextActive: TextStyle = { color: "white" }

const $daysRow: ViewStyle = {
  flexDirection: "row",
  gap: spacing.s2,
}

const $dayBtn: ViewStyle = {
  flex: 1,
  paddingVertical: spacing.s2,
  borderRadius: radii.md,
  backgroundColor: card,
  borderWidth: 1,
  borderColor: hairline,
  alignItems: "center",
}

const $dayBtnActive: ViewStyle = {
  backgroundColor: ink,
  borderColor: ink,
}

const $dayBtnText: TextStyle = {
  fontSize: 12, color: ink2,
  fontFamily: typography.primary.normal,
}

const $dayBtnTextActive: TextStyle = { color: "white" }

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

// ---- Inline new-category form ----------------------------------------------

const $catLabelRow: ViewStyle = {
  flexDirection: "row", justifyContent: "space-between", alignItems: "center",
}

const $newCatLink: TextStyle = {
  fontSize: 12, color: coral500,
  fontFamily: typography.primary.medium,
}

const $newCatForm: ViewStyle = {
  backgroundColor: paper2,
  borderRadius: radii.md,
  borderWidth: 1, borderColor: hairline,
  padding: spacing.s3,
  gap: spacing.s3,
}

const $newCatColorRow: ViewStyle = { flexDirection: "row", gap: spacing.s2 }

const $miniSwatch: ViewStyle = { width: 28, height: 28, borderRadius: 14 }

const $miniSwatchActive: ViewStyle = { borderWidth: 2.5, borderColor: ink }

const $iconScrollContent = { gap: spacing.s2, paddingVertical: spacing.s1 }

const $iconCell: ViewStyle = {
  width: 36, height: 36, borderRadius: radii.md,
  alignItems: "center", justifyContent: "center",
  backgroundColor: card,
  borderWidth: 1, borderColor: hairline,
}

const $iconCellActive: ViewStyle = { backgroundColor: ink, borderColor: ink }

const $confirmSmallBtn: ViewStyle = {
  backgroundColor: coral500,
  borderRadius: radii.pill,
  paddingHorizontal: spacing.s4,
  paddingVertical: spacing.s2,
  alignItems: "center",
  alignSelf: "flex-end",
}
