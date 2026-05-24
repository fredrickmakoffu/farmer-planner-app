import { useCallback, useEffect, useRef, useState } from "react"
import {
  Animated,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
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
import type { Routine } from "@/modules/expenses/domain/entities/routine"
import type { RoutineRepository } from "@/modules/expenses/domain/repositories/routine-repository"
import type { Category } from "@/modules/expenses/domain/entities/category"
import type { CategoryRepository } from "@/modules/expenses/domain/repositories/category-repository"
import {
  paper, paper2, card, ink, ink2, ink3, ink4,
  coral500, coral600, hairline,
  catClay, catMango, catFern, catLake, catOrchid, catStone,
  spacing, radii, elevation, duration,
} from "@/theme/tapp-tokens"
import { typography } from "@/theme/typography"
import { CategoryDisc, ICON_OPTIONS } from "./CategoriesScreen"

// ---- helpers ---------------------------------------------------------------

const PALETTE = [
  { color: catClay }, { color: catMango }, { color: catFern },
  { color: catLake }, { color: catOrchid }, { color: catStone },
]

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

function daysLabel(mask: number): string {
  if (mask === 127) return "Every day"
  if (mask === 62) return "Weekdays"
  if (mask === 65) return "Weekends"
  const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
  return names.filter((_, i) => (mask >> i) & 1).join(", ")
}

function formatAmount(n: number): string {
  return n.toLocaleString("en-KE")
}

const TIME_SLOTS = [
  { label: "Early morning", start: 300, end: 420 },
  { label: "Morning",       start: 420, end: 600 },
  { label: "Midday",        start: 600, end: 720 },
  { label: "Lunch",         start: 720, end: 840 },
  { label: "Afternoon",     start: 840, end: 1020 },
  { label: "Evening",       start: 1020, end: 1200 },
  { label: "Night",         start: 1200, end: 1380 },
]

type SlotDef = typeof TIME_SLOTS[number]

// Group routines by time slot, preserving sort_order within each group.
// Routines with no matching predefined slot are collected into an "Other" group.
function groupBySlot(routines: Routine[]): { slot: SlotDef | null; label: string; items: Routine[] }[] {
  const result: { slot: SlotDef | null; label: string; items: Routine[] }[] = []
  const used = new Set<number>()

  for (const slot of TIME_SLOTS) {
    const items = routines
      .filter((r) => r.time_start === slot.start && r.time_end === slot.end)
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    if (items.length > 0) {
      result.push({ slot, label: slot.label, items })
      items.forEach((r) => used.add(r.id!))
    }
  }

  const other = routines.filter((r) => r.id != null && !used.has(r.id!))
  if (other.length > 0) {
    result.push({ slot: null, label: "Other", items: other })
  }

  return result
}

// ---- Edit / Add sheet -------------------------------------------------------

type SheetMode = "edit" | "add"

type EditSheetProps = {
  visible: boolean
  mode: SheetMode
  routine: Routine | null
  categories: Category[]
  onSave: (data: Omit<Routine, "id">, id?: number) => void
  onDelete: (id: number) => void
  onClose: () => void
  onCategoriesChanged: () => void
}

function EditRoutineSheet({ visible, mode, routine, categories, onSave, onDelete, onClose, onCategoriesChanged }: EditSheetProps) {
  const slideAnim = useRef(new Animated.Value(600)).current

  const [label, setLabel] = useState("")
  const [amount, setAmount] = useState("")
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null)
  const [selectedSlot, setSelectedSlot] = useState(0)
  const [days, setDays] = useState<127 | 62 | 65>(127)

  // Inline new-category form
  const [newCatOpen, setNewCatOpen] = useState(false)
  const [newCatName, setNewCatName] = useState("")
  const [newCatColor, setNewCatColor] = useState(catClay)
  const [newCatIcon, setNewCatIcon] = useState("silverware-fork-knife")
  const [newCatSaving, setNewCatSaving] = useState(false)

  useEffect(() => {
    if (visible) {
      if (routine) {
        setLabel(routine.name)
        setAmount(routine.default_amount > 0 ? String(routine.default_amount) : "")
        setSelectedCategoryId(routine.category_id ?? null)
        const slotIdx = TIME_SLOTS.findIndex(
          (s) => s.start === routine.time_start && s.end === routine.time_end,
        )
        setSelectedSlot(slotIdx >= 0 ? slotIdx : 0)
        const d = routine.days_of_week
        setDays(d === 127 ? 127 : d === 62 ? 62 : d === 65 ? 65 : 127)
      } else {
        setLabel("")
        setAmount("")
        setSelectedCategoryId(categories.length ? (categories[0].id ?? null) : null)
        setSelectedSlot(0)
        setDays(127)
      }
      Animated.timing(slideAnim, { toValue: 0, duration: duration.base, useNativeDriver: true }).start()
    } else {
      Animated.timing(slideAnim, { toValue: 600, duration: duration.fast, useNativeDriver: true }).start()
    }
  }, [visible, routine])

  function handleSave() {
    const n = parseFloat(amount)
    if (!label.trim() || isNaN(n) || n <= 0 || selectedCategoryId == null) return
    onSave(
      {
        name: label.trim(),
        category_id: selectedCategoryId,
        time_start: TIME_SLOTS[selectedSlot].start,
        time_end: TIME_SLOTS[selectedSlot].end,
        days_of_week: days,
        is_high_confidence: false,
        default_amount: n,
      },
      routine?.id,
    )
  }

  const canSave = label.trim().length > 0 && parseFloat(amount) > 0 && selectedCategoryId != null

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
      onCategoriesChanged()
    } finally {
      setNewCatSaving(false)
    }
  }

  return (
    <Modal visible={visible} transparent statusBarTranslucent animationType="none" onRequestClose={onClose}>
      <Pressable style={$scrim} onPress={onClose} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={$kavWrap}
        pointerEvents="box-none"
      >
        <Animated.View style={[$sheet, { transform: [{ translateY: slideAnim }] }]}>
          <View style={$handle} />

          <View style={$sheetHeader}>
            <Text style={$sheetTitle}>{mode === "add" ? "New routine" : "Edit routine"}</Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={20} color={ink3} />
            </Pressable>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={$sheetScrollContent}>
            {/* Label */}
            <Text style={$fieldLabel}>Label</Text>
            <TextInput
              style={$textInput}
              value={label}
              onChangeText={setLabel}
              placeholder="e.g. morning matatu"
              placeholderTextColor={ink4}
            />

            {/* Amount */}
            <Text style={$fieldLabel}>Amount (KSh)</Text>
            <View style={$amountRow}>
              <Text style={$amountPrefix}>KSh</Text>
              <TextInput
                style={[$textInput, $amountField]}
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
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={$pillScroll}
              contentContainerStyle={$pillScrollContent}
            >
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

            {/* Inline new-category form */}
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
                  {PALETTE.map((p) => (
                    <Pressable
                      key={p.color}
                      onPress={() => setNewCatColor(p.color)}
                      style={[$miniSwatch, { backgroundColor: p.color }, newCatColor === p.color && $miniSwatchActive]}
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
                  style={({ pressed }) => [$confirmSmall, (!newCatName.trim() || newCatSaving) && { opacity: 0.45 }, pressed && { opacity: 0.75 }]}
                >
                  <Text style={$confirmSmallText}>Add &amp; select</Text>
                </Pressable>
              </View>
            )}

            {/* Time slot */}
            <Text style={$fieldLabel}>When</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={$pillScroll}
              contentContainerStyle={$pillScrollContent}
            >
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
                const lbl = d === 127 ? "Every day" : d === 62 ? "Weekdays" : "Weekends"
                return (
                  <Pressable
                    key={d}
                    onPress={() => setDays(d)}
                    style={[$dayBtn, days === d && $dayBtnActive]}
                  >
                    <Text style={[$dayBtnText, days === d && $dayBtnTextActive]}>{lbl}</Text>
                  </Pressable>
                )
              })}
            </View>

            {/* Actions */}
            <Pressable
              onPress={handleSave}
              style={({ pressed }) => [$saveBtn, !canSave && $saveBtnDisabled, pressed && canSave && $saveBtnPressed]}
              disabled={!canSave}
            >
              <Text style={$saveBtnText}>{mode === "add" ? "Add routine" : "Save changes"}</Text>
            </Pressable>

            {mode === "edit" && routine?.id != null && (
              <Pressable
                onPress={() => onDelete(routine.id!)}
                style={({ pressed }) => [$deleteBtn, pressed && { opacity: 0.7 }]}
              >
                <Ionicons name="trash-outline" size={16} color={coral500} />
                <Text style={$deleteBtnText}>Delete routine</Text>
              </Pressable>
            )}
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

// ---- Draggable routine row -------------------------------------------------

const ROW_HEIGHT_ESTIMATE = 66 // used for swap threshold calculation

type DragCallbacks = {
  onDragStart: (routineId: number, index: number) => void
  onDragMove: (dy: number) => void
  onDragEnd: () => void
}

type RoutineRowProps = {
  routine: Routine
  category: Category | undefined
  index: number
  isFirst: boolean
  showDragHandle: boolean
  showOrderBadge: boolean
  isDragging: boolean
  dragAnim: Animated.Value
  dragCallbacks: DragCallbacks
  onPress: (routine: Routine) => void
}

function RoutineRow({
  routine, category, index, isFirst, showDragHandle, showOrderBadge,
  isDragging, dragAnim, dragCallbacks, onPress,
}: RoutineRowProps) {
  const color = category?.color_hex ?? catStone

  const callbacksRef = useRef(dragCallbacks)
  callbacksRef.current = dragCallbacks

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        callbacksRef.current.onDragStart(routine.id!, index)
      },
      onPanResponderMove: (_, gs) => callbacksRef.current.onDragMove(gs.dy),
      onPanResponderRelease: () => callbacksRef.current.onDragEnd(),
      onPanResponderTerminate: () => callbacksRef.current.onDragEnd(),
    }),
  ).current

  return (
    <Animated.View
      style={[
        $rowOuter,
        !isFirst && $rowBorder,
        isDragging && $rowDragging,
        isDragging && { transform: [{ translateY: dragAnim }], zIndex: 10 },
      ]}
    >
      <Pressable
        onPress={() => !isDragging && onPress(routine)}
        style={({ pressed }) => [$rowInner, pressed && !isDragging && $rowPressed]}
      >
        <View style={[$colorBar, { backgroundColor: color }]} />
        <View style={$rowContent}>
          <View style={$rowTop}>
            <View style={$routineNameRow}>
              {showOrderBadge && (
                <View style={$orderBadge}>
                  <Text style={$orderBadgeText}>{index + 1}</Text>
                </View>
              )}
              <Text style={$routineName}>{routine.name}</Text>
            </View>
            <Text style={$routineAmount}>
              {routine.default_amount > 0
                ? `KSh ${formatAmount(routine.default_amount)}`
                : "—"}
            </Text>
          </View>
          <View style={$rowBottom}>
            <Text style={$routineMeta}>
              {category?.name ?? "Unknown"} · {daysLabel(routine.days_of_week)}
            </Text>
          </View>
        </View>
      </Pressable>

      {showDragHandle ? (
        <View {...panResponder.panHandlers} style={$dragHandleWrap} hitSlop={8}>
          <Ionicons name="reorder-three-outline" size={22} color={isDragging ? coral500 : ink4} />
        </View>
      ) : (
        <Pressable onPress={() => onPress(routine)} style={$chevronWrap} hitSlop={8}>
          <Ionicons name="chevron-forward" size={16} color={ink4} />
        </Pressable>
      )}
    </Animated.View>
  )
}

// ---- Draggable group -------------------------------------------------------

type DraggableGroupProps = {
  slot: SlotDef | null
  label: string
  items: Routine[]
  categoryMap: Map<number, Category>
  onEdit: (routine: Routine) => void
  onReorder: (updates: { id: number; sort_order: number }[]) => void
  setScrollEnabled: (enabled: boolean) => void
}

function DraggableRoutineGroup({
  slot, label, items, categoryMap, onEdit, onReorder, setScrollEnabled,
}: DraggableGroupProps) {
  const [order, setOrder] = useState<Routine[]>(items)
  const orderRef = useRef<Routine[]>(items)

  const draggingIdRef = useRef<number | null>(null)
  const draggingIndexRef = useRef(-1)
  const effectiveDyBaseRef = useRef(0)
  const dragAnim = useRef(new Animated.Value(0)).current

  // Sync prop changes (from parent reload after save/delete)
  useEffect(() => {
    setOrder(items)
    orderRef.current = items
  }, [items])

  function onDragStart(routineId: number, index: number) {
    draggingIdRef.current = routineId
    draggingIndexRef.current = index
    effectiveDyBaseRef.current = 0
    setScrollEnabled(false)
  }

  function onDragMove(dy: number) {
    if (draggingIdRef.current === null) return

    const visualDy = dy - effectiveDyBaseRef.current
    dragAnim.setValue(visualDy)

    const ci = draggingIndexRef.current
    const len = orderRef.current.length

    if (visualDy > ROW_HEIGHT_ESTIMATE / 2 && ci < len - 1) {
      // Swap with item below
      const nextOrder = [...orderRef.current]
      ;[nextOrder[ci], nextOrder[ci + 1]] = [nextOrder[ci + 1], nextOrder[ci]]
      orderRef.current = nextOrder
      draggingIndexRef.current = ci + 1
      effectiveDyBaseRef.current += ROW_HEIGHT_ESTIMATE
      dragAnim.setValue(dy - effectiveDyBaseRef.current)
      setOrder(nextOrder)
    } else if (visualDy < -ROW_HEIGHT_ESTIMATE / 2 && ci > 0) {
      // Swap with item above
      const nextOrder = [...orderRef.current]
      ;[nextOrder[ci], nextOrder[ci - 1]] = [nextOrder[ci - 1], nextOrder[ci]]
      orderRef.current = nextOrder
      draggingIndexRef.current = ci - 1
      effectiveDyBaseRef.current -= ROW_HEIGHT_ESTIMATE
      dragAnim.setValue(dy - effectiveDyBaseRef.current)
      setOrder(nextOrder)
    }
  }

  function onDragEnd() {
    const finalOrder = orderRef.current
    draggingIdRef.current = null
    draggingIndexRef.current = -1
    effectiveDyBaseRef.current = 0
    dragAnim.setValue(0)
    setScrollEnabled(true)
    onReorder(finalOrder.map((r, i) => ({ id: r.id!, sort_order: i })))
  }

  const showDragHandle = order.length > 1
  const [draggingId, setDraggingId] = useState<number | null>(null)

  // Keep draggingId state in sync with ref (for visual feedback)
  const wrappedOnDragStart = useCallback((routineId: number, index: number) => {
    setDraggingId(routineId)
    onDragStart(routineId, index)
  }, [])

  const wrappedOnDragEnd = useCallback(() => {
    setDraggingId(null)
    onDragEnd()
  }, [])

  const callbacks: DragCallbacks = {
    onDragStart: wrappedOnDragStart,
    onDragMove,
    onDragEnd: wrappedOnDragEnd,
  }

  return (
    <View style={$groupSection}>
      {/* Slot header */}
      <View style={$slotHeaderRow}>
        <Text style={$slotHeaderLabel}>{label}</Text>
        {slot && (
          <Text style={$slotHeaderTime}>{slotLabel(slot.start, slot.end)}</Text>
        )}
        {showDragHandle && (
          <Text style={$slotHint}>drag to reorder</Text>
        )}
      </View>

      {/* Routines card */}
      <View style={$groupCard}>
        {order.map((routine, index) => (
          <RoutineRow
            key={String(routine.id)}
            routine={routine}
            category={routine.category_id != null ? categoryMap.get(routine.category_id) : undefined}
            index={index}
            isFirst={index === 0}
            showDragHandle={showDragHandle}
            showOrderBadge={showDragHandle}
            isDragging={draggingId === routine.id}
            dragAnim={dragAnim}
            dragCallbacks={callbacks}
            onPress={onEdit}
          />
        ))}
      </View>
    </View>
  )
}

// ---- Empty state -----------------------------------------------------------

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <View style={$emptyWrap}>
      <MaterialCommunityIcons name="clock-time-four-outline" size={48} color={ink4} />
      <Text style={$emptyTitle}>No routines yet</Text>
      <Text style={$emptySub}>
        Routines let Tapp predict what you spend and when, so tapping logs in one shot.
      </Text>
      <Pressable
        onPress={onAdd}
        style={({ pressed }) => [$addFirstBtn, pressed && { opacity: 0.75 }]}
      >
        <Text style={$addFirstBtnText}>Add your first routine</Text>
      </Pressable>
    </View>
  )
}

// ---- Main screen -----------------------------------------------------------

export function RoutinesScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()

  const [routines, setRoutines] = useState<Routine[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [categoryMap, setCategoryMap] = useState<Map<number, Category>>(new Map())
  const [loading, setLoading] = useState(true)
  const [editingRoutine, setEditingRoutine] = useState<Routine | null>(null)
  const [sheetMode, setSheetMode] = useState<"edit" | "add">("add")
  const [sheetOpen, setSheetOpen] = useState(false)
  const [scrollEnabled, setScrollEnabled] = useState(true)

  const loadData = useCallback(async () => {
    const routineRepo = container.resolve<RoutineRepository>("routineRepository")
    const categoryRepo = container.resolve<CategoryRepository>("categoryRepository")
    if (!routineRepo || !categoryRepo) { setLoading(false); return }

    const [allRoutines, allCategories] = await Promise.all([
      routineRepo.findAll(),
      categoryRepo.findAll(),
    ])

    const map = new Map<number, Category>()
    for (const cat of allCategories) {
      if (cat.id != null) map.set(cat.id, cat)
    }

    setRoutines(allRoutines)
    setCategories(allCategories)
    setCategoryMap(map)
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  function openAdd() {
    setEditingRoutine(null)
    setSheetMode("add")
    setSheetOpen(true)
  }

  function openEdit(routine: Routine) {
    setEditingRoutine(routine)
    setSheetMode("edit")
    setSheetOpen(true)
  }

  const handleSave = useCallback(async (data: Omit<Routine, "id">, id?: number) => {
    setSheetOpen(false)
    const routineRepo = container.resolve<RoutineRepository>("routineRepository")
    if (!routineRepo) return
    if (id != null) {
      const existing = routines.find((r) => r.id === id)
      await routineRepo.update({ ...data, id, sort_order: existing?.sort_order ?? 0 })
    } else {
      await routineRepo.create(data)
    }
    loadData()
  }, [loadData, routines])

  const handleDelete = useCallback(async (id: number) => {
    setSheetOpen(false)
    const routineRepo = container.resolve<RoutineRepository>("routineRepository")
    if (!routineRepo) return
    await routineRepo.delete(id)
    loadData()
  }, [loadData])

  const handleReorder = useCallback(async (updates: { id: number; sort_order: number }[]) => {
    const routineRepo = container.resolve<RoutineRepository>("routineRepository")
    if (!routineRepo) return
    await routineRepo.updateSortOrders(updates)
    loadData()
  }, [loadData])

  const groups = groupBySlot(routines)

  return (
    <View style={[$screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={$header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={$backBtn}>
          <Ionicons name="chevron-back" size={22} color={ink} />
        </Pressable>
        <View style={$headerCenter}>
          <Text style={$headerTitle}>Routines</Text>
        </View>
        <Pressable onPress={openAdd} hitSlop={12} style={$addBtn}>
          <Ionicons name="add" size={24} color={coral500} />
        </Pressable>
      </View>

      {loading ? (
        <View style={$loadingWrap}>
          <ActivityIndicator color={coral500} />
        </View>
      ) : routines.length === 0 ? (
        <EmptyState onAdd={openAdd} />
      ) : (
        <ScrollView
          scrollEnabled={scrollEnabled}
          contentContainerStyle={[$scrollContent, { paddingBottom: insets.bottom + 32 }]}
          showsVerticalScrollIndicator={false}
        >
          <Text style={$sectionLabel}>
            {routines.length} {routines.length === 1 ? "routine" : "routines"} · grouped by time
          </Text>

          {groups.map((group) => (
            <DraggableRoutineGroup
              key={group.slot ? `${group.slot.start}-${group.slot.end}` : "other"}
              slot={group.slot}
              label={group.label}
              items={group.items}
              categoryMap={categoryMap}
              onEdit={openEdit}
              onReorder={handleReorder}
              setScrollEnabled={setScrollEnabled}
            />
          ))}

          <Text style={$hint}>
            Tap a routine to edit · drag ≡ to reorder within a time slot
          </Text>
        </ScrollView>
      )}

      <EditRoutineSheet
        visible={sheetOpen}
        mode={sheetMode}
        routine={editingRoutine}
        categories={categories}
        onSave={handleSave}
        onDelete={handleDelete}
        onClose={() => setSheetOpen(false)}
        onCategoriesChanged={loadData}
      />
    </View>
  )
}

export default RoutinesScreen

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
  gap: spacing.s3,
}

const $sectionLabel: TextStyle = {
  fontSize: 11, letterSpacing: 1.2, textTransform: "uppercase",
  color: ink3, fontFamily: typography.primary.normal,
}

// ---- Group section ---------------------------------------------------------

const $groupSection: ViewStyle = {
  gap: spacing.s2,
}

const $slotHeaderRow: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.s2,
}

const $slotHeaderLabel: TextStyle = {
  fontSize: 13, color: ink2,
  fontFamily: typography.primary.semiBold,
}

const $slotHeaderTime: TextStyle = {
  fontSize: 11, color: ink4,
  fontFamily: typography.primary.normal,
}

const $slotHint: TextStyle = {
  fontSize: 10, color: ink4,
  fontFamily: typography.primary.normal,
  marginLeft: "auto",
}

// ---- Group card + rows -----------------------------------------------------

const $groupCard: ViewStyle = {
  backgroundColor: card,
  borderRadius: radii.lg,
  borderWidth: 1,
  borderColor: hairline,
  ...elevation.card,
  overflow: "visible", // allow dragged row shadow to escape the card bounds
}

const $rowOuter: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  backgroundColor: card,
  borderRadius: radii.md,
}

const $rowBorder: ViewStyle = {
  borderTopWidth: 1,
  borderTopColor: hairline,
}

const $rowDragging: ViewStyle = {
  backgroundColor: paper2,
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.12,
  shadowRadius: 8,
  elevation: 6,
}

const $rowInner: ViewStyle = {
  flex: 1,
  flexDirection: "row",
  alignItems: "center",
  paddingVertical: spacing.s3 + 2,
  paddingLeft: spacing.s4,
  gap: spacing.s3,
}

const $rowPressed: ViewStyle = { backgroundColor: paper2 }

const $colorBar: ViewStyle = {
  width: 4, height: 36, borderRadius: 2, flexShrink: 0,
}

const $rowContent: ViewStyle = { flex: 1, gap: 2 }

const $rowTop: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
}

const $routineNameRow: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.s2,
  flex: 1,
}

const $orderBadge: ViewStyle = {
  width: 18, height: 18, borderRadius: 9,
  backgroundColor: hairline,
  alignItems: "center", justifyContent: "center",
  flexShrink: 0,
}

const $orderBadgeText: TextStyle = {
  fontSize: 10, color: ink3,
  fontFamily: typography.primary.semiBold,
  lineHeight: 18,
}

const $rowBottom: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
}

const $routineName: TextStyle = {
  fontSize: 15, color: ink,
  fontFamily: typography.primary.medium,
  flex: 1,
}

const $routineAmount: TextStyle = {
  fontSize: 14, color: ink,
  fontFamily: typography.mono.normal,
  flexShrink: 0,
}

const $routineMeta: TextStyle = {
  fontSize: 12, color: ink3,
  fontFamily: typography.primary.normal,
}

const $dragHandleWrap: ViewStyle = {
  width: 44, height: 44,
  alignItems: "center", justifyContent: "center",
  flexShrink: 0,
}

const $chevronWrap: ViewStyle = {
  width: 36, height: 44,
  alignItems: "center", justifyContent: "center",
  flexShrink: 0,
}

// ---- Hint ------------------------------------------------------------------

const $hint: TextStyle = {
  fontSize: 12, color: ink4,
  fontFamily: typography.primary.normal,
  textAlign: "center",
  paddingHorizontal: spacing.s4,
}

// ---- Empty state -----------------------------------------------------------

const $emptyWrap: ViewStyle = {
  flex: 1, alignItems: "center", justifyContent: "center",
  paddingHorizontal: spacing.s8, gap: spacing.s3,
}

const $emptyTitle: TextStyle = {
  fontSize: 17, color: ink3,
  fontFamily: typography.primary.semiBold,
  marginTop: spacing.s2,
}

const $emptySub: TextStyle = {
  fontSize: 13, color: ink4,
  fontFamily: typography.primary.normal,
  textAlign: "center",
  lineHeight: 20,
}

const $addFirstBtn: ViewStyle = {
  marginTop: spacing.s2,
  paddingVertical: spacing.s3,
  paddingHorizontal: spacing.s5,
  borderRadius: radii.pill,
  backgroundColor: coral500,
  ...elevation.tapButton,
}

const $addFirstBtnText: TextStyle = {
  fontSize: 14, color: "white",
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

const $sheetTitle: TextStyle = {
  fontSize: 17, color: ink,
  fontFamily: typography.primary.semiBold,
}

const $sheetScrollContent = {
  paddingHorizontal: spacing.s5,
  paddingTop: spacing.s4,
  paddingBottom: spacing.s8,
  gap: spacing.s3,
}

// ---- Form fields -----------------------------------------------------------

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

const $amountRow: ViewStyle = {
  flexDirection: "row", alignItems: "center", gap: spacing.s2,
}

const $amountPrefix: TextStyle = {
  fontSize: 15, color: ink3,
  fontFamily: typography.mono.normal,
}

const $amountField: TextStyle = { flex: 1 }

const $pillScroll: ViewStyle = { flexGrow: 0 }

const $pillScrollContent = {
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
  borderWidth: 1, borderColor: hairline,
}

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
  borderWidth: 1, borderColor: hairline,
}

const $slotPillActive: ViewStyle = { backgroundColor: ink, borderColor: ink }

const $slotPillText: TextStyle = {
  fontSize: 13, color: ink2,
  fontFamily: typography.primary.normal,
}

const $slotPillTextActive: TextStyle = { color: "white" }

const $daysRow: ViewStyle = { flexDirection: "row", gap: spacing.s2 }

const $dayBtn: ViewStyle = {
  flex: 1, paddingVertical: spacing.s2,
  borderRadius: radii.md,
  backgroundColor: card,
  borderWidth: 1, borderColor: hairline,
  alignItems: "center",
}

const $dayBtnActive: ViewStyle = { backgroundColor: ink, borderColor: ink }

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

const $newCatColorRow: ViewStyle = {
  flexDirection: "row", gap: spacing.s2,
}

const $miniSwatch: ViewStyle = {
  width: 28, height: 28, borderRadius: 14,
}

const $miniSwatchActive: ViewStyle = {
  borderWidth: 2.5, borderColor: ink,
}

const $iconScrollContent = {
  gap: spacing.s2,
  paddingVertical: spacing.s1,
}

const $iconCell: ViewStyle = {
  width: 36, height: 36, borderRadius: radii.md,
  alignItems: "center", justifyContent: "center",
  backgroundColor: card,
  borderWidth: 1, borderColor: hairline,
}

const $iconCellActive: ViewStyle = { backgroundColor: ink, borderColor: ink }

const $confirmSmall: ViewStyle = {
  backgroundColor: coral500,
  borderRadius: radii.pill,
  paddingHorizontal: spacing.s4,
  paddingVertical: spacing.s2,
  alignItems: "center",
  alignSelf: "flex-end",
}

const $confirmSmallText: TextStyle = {
  fontSize: 13, color: "white",
  fontFamily: typography.primary.medium,
}
