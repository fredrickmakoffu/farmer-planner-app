import { useCallback, useEffect, useState } from "react"
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  View,
  ViewStyle,
  TextStyle,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons"
import DateTimePicker from "@react-native-community/datetimepicker"

import { Text } from "@/components/Text"
import { container } from "@/bootstrap/container"
import { confirmDay } from "@/modules/expenses/application/confirm-day"
import { deleteExpense } from "@/modules/expenses/application/delete-expense"
import { updateExpense } from "@/modules/expenses/application/update-expense"
import type { Category } from "@/modules/expenses/domain/entities/category"
import type { CategoryRepository } from "@/modules/expenses/domain/repositories/category-repository"
import type { ExpenseEvent } from "@/modules/expenses/domain/entities/expense-event"
import type { ExpenseEventRepository } from "@/modules/expenses/domain/repositories/expense-event-repository"
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
  shadowEvt,
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
import { ConfirmDaySheet } from "./review/ConfirmDaySheet"
import { EditExpenseSheet } from "./review/EditExpenseSheet"

// ---- Helpers ---------------------------------------------------------------

function getDateRange(date: Date): { start: number; end: number } {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0).getTime()
  const end = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999).getTime()
  return { start, end }
}

function isToday(date: Date): boolean {
  const today = new Date()
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  )
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function getDayNavLabel(date: Date): string {
  if (isToday(date)) return "Today"
  return date.toLocaleDateString("en-KE", { weekday: "short", day: "numeric", month: "short" })
}

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

function formatAmount(n: number): string {
  return n.toLocaleString("en-KE")
}

function formatTimestamp(ts?: number): string {
  if (!ts) return ""
  return new Date(ts).toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" })
}

function getDayName(date: Date): string {
  return date.toLocaleDateString("en-KE", { weekday: "long" })
}

function getDateLabel(date: Date): string {
  return date.toLocaleDateString("en-KE", { day: "numeric", month: "long" })
}

// ---- Category Disc ---------------------------------------------------------

function CategoryDisc({ color, isShadow }: { color: string; isShadow?: boolean }) {
  return (
    <View style={[$disc, { backgroundColor: isShadow ? shadowEvt : color }]}>
      {isShadow ? (
        <Ionicons name="help-outline" size={14} color="white" />
      ) : (
        <MaterialCommunityIcons name="silverware-fork-knife" size={14} color="white" />
      )}
    </View>
  )
}

// ---- Event Row -------------------------------------------------------------

type EventRowItem = {
  event: ExpenseEvent
  category: Category | null
  isFirst: boolean
  onPress: (event: ExpenseEvent) => void
}

function EventRow({ event, category, isFirst, onPress }: EventRowItem) {
  const isShadow = false
  const color = resolveCategoryColor(category?.name, category?.color_hex)
  const isConfirmed = event.confirmed_at != null

  return (
    <Pressable
      onPress={() => onPress(event)}
      style={({ pressed }) => [
        $row,
        !isFirst && $rowBorder,
        isShadow && $shadowRow,
        pressed && $rowPressed,
      ]}
    >
      <CategoryDisc color={color} isShadow={isShadow} />

      <View style={$rowMid}>
        <Text style={[$rowName, isShadow && $rowNameShadow]}>
          {category?.name ?? "Expense"}
        </Text>
        <Text style={$rowMeta}>
          {formatTimestamp(event.created_at)}
          {event.category_id == null ? " · no category" : ""}
        </Text>
      </View>

      <View style={$rowRight}>
        <Text style={$rowAmount}>{"KSh " + formatAmount(event.amount)}</Text>
        {isConfirmed ? (
          <Ionicons name="checkmark-circle" size={15} color={coral500} />
        ) : (
          <Ionicons name="chevron-forward" size={14} color={ink4} />
        )}
      </View>
    </Pressable>
  )
}

// ---- Empty state -----------------------------------------------------------

function EmptyState() {
  return (
    <View style={$emptyWrap}>
      <MaterialCommunityIcons name="gesture-tap" size={48} color={ink4} />
      <Text style={$emptyTitle}>No taps yet.</Text>
      <Text style={$emptySub}>Place the widget on your home screen to start.</Text>
    </View>
  )
}

// ---- Main Screen -----------------------------------------------------------

export function DailyReviewScreen() {
  const insets = useSafeAreaInsets()

  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  })
  const [allEvents, setAllEvents] = useState<ExpenseEvent[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [categoryMap, setCategoryMap] = useState<Map<number, Category>>(new Map())
  const [loading, setLoading] = useState(true)
  const [editingEvent, setEditingEvent] = useState<ExpenseEvent | null>(null)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [showConfirmSheet, setShowConfirmSheet] = useState(false)

  const loadData = useCallback(async () => {
    const expenseRepo = container.resolve<ExpenseEventRepository>("expenseEventRepository")
    const categoryRepo = container.resolve<CategoryRepository>("categoryRepository")
    if (!expenseRepo || !categoryRepo) { setLoading(false); return }

    const [fetchedEvents, allCategories] = await Promise.all([
      expenseRepo.findAll(),
      categoryRepo.findAll(),
    ])

    const map = new Map<number, Category>()
    for (const cat of allCategories) {
      if (cat.id != null) map.set(cat.id, cat)
    }

    setAllEvents(fetchedEvents)
    setCategories(allCategories)
    setCategoryMap(map)
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const handleSave = useCallback(async (id: number, amount: number, categoryId: number | null) => {
    const expenseRepo = container.resolve<ExpenseEventRepository>("expenseEventRepository")
    const sync = container.resolve<any>("syncEngine")
    if (!expenseRepo) return
    await updateExpense(expenseRepo, id, amount, categoryId, sync)
    loadData()
  }, [loadData])

  const handleConfirmDay = useCallback(async () => {
    const expenseRepo = container.resolve<ExpenseEventRepository>("expenseEventRepository")
    const sync = container.resolve<any>("syncEngine")
    if (!expenseRepo) return
    const { start, end } = getDateRange(selectedDate)
    await confirmDay(expenseRepo, start, end, sync)
    setShowConfirmSheet(false)
    loadData()
  }, [selectedDate, loadData])

  const handleDelete = useCallback(async (id: number) => {
    const expenseRepo = container.resolve<ExpenseEventRepository>("expenseEventRepository")
    const sync = container.resolve<any>("syncEngine")
    if (!expenseRepo) return
    await deleteExpense(expenseRepo, id, sync)
    loadData()
  }, [loadData])

  const { start: dayStart, end: dayEnd } = getDateRange(selectedDate)
  const events = allEvents.filter(e => (e.created_at ?? 0) >= dayStart && (e.created_at ?? 0) <= dayEnd)

  const tapCount = events.length
  const dayTotal = events.reduce((s, e) => s + (e.amount ?? 0), 0)
  const isDayConfirmed = tapCount > 0 && events.every(e => e.confirmed_at != null)

  const todayFlag = isToday(selectedDate)

  return (
    <View style={[$screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={$header}>
        <Text style={$eyebrow}>Daily review</Text>
        <View style={$dayNavRow}>
          <Pressable
            onPress={() => setSelectedDate(d => addDays(d, -1))}
            hitSlop={12}
            style={$navBtn}
          >
            <Ionicons name="chevron-back" size={20} color={ink2} />
          </Pressable>
          <Pressable style={$dayNavCenter} onPress={() => setShowDatePicker(true)} hitSlop={8}>
            <Text style={$dayName}>{getDayNavLabel(selectedDate)}</Text>
            {!todayFlag && (
              <Text style={$dayFull}>{getDateLabel(selectedDate)}</Text>
            )}
          </Pressable>
          <Pressable
            onPress={() => setSelectedDate(d => addDays(d, 1))}
            hitSlop={12}
            style={$navBtn}
            disabled={todayFlag}
          >
            <Ionicons name="chevron-forward" size={20} color={todayFlag ? ink4 : ink2} />
          </Pressable>
        </View>
        <Text style={$subHeader}>
          {todayFlag ? getDateLabel(selectedDate) + " · " : ""}
          {tapCount} {tapCount === 1 ? "tap" : "taps"}
          {tapCount > 0 ? " · KSh " + formatAmount(dayTotal) : ""}
          {isDayConfirmed ? " · confirmed" : ""}
        </Text>
      </View>

      {loading ? (
        <View style={$loadingWrap}>
          <ActivityIndicator color={coral500} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[$scrollContent, { paddingBottom: insets.bottom + 88 }]}
          showsVerticalScrollIndicator={false}
        >
          {events.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              {/* Events card */}
              <View style={$card}>
                {events.map((ev, i) => (
                  <EventRow
                    key={String(ev.id ?? i)}
                    event={ev}
                    category={ev.category_id != null ? (categoryMap.get(ev.category_id as number) ?? null) : null}
                    isFirst={i === 0}
                    onPress={setEditingEvent}
                  />
                ))}
              </View>

              {/* Daily total row */}
              <View style={$totalRow}>
                <Text style={$totalLabel}>{todayFlag ? "Total today" : "Total"}</Text>
                <Text style={$totalAmount}>{"KSh " + formatAmount(dayTotal)}</Text>
              </View>

              {/* Confirm day CTA */}
              {isDayConfirmed ? (
                <View style={$confirmedBadge}>
                  <Ionicons name="checkmark-circle" size={16} color={coral500} />
                  <Text style={$confirmedBadgeText}>Day confirmed</Text>
                </View>
              ) : todayFlag ? (
                <Pressable
                  style={({ pressed }) => [$confirmBtn, pressed && $confirmBtnPressed]}
                  onPress={() => setShowConfirmSheet(true)}
                >
                  <Text style={$confirmBtnText}>Confirm day</Text>
                </Pressable>
              ) : null}
            </>
          )}
        </ScrollView>
      )}

      <EditExpenseSheet
        visible={editingEvent !== null}
        event={editingEvent}
        categories={categories}
        onClose={() => setEditingEvent(null)}
        onSave={handleSave}
        onDelete={handleDelete}
      />

      <ConfirmDaySheet
        visible={showConfirmSheet}
        dateLabel={getDayNavLabel(selectedDate)}
        tapCount={tapCount}
        total={dayTotal}
        onClose={() => setShowConfirmSheet(false)}
        onConfirm={handleConfirmDay}
      />

      {/* Date picker — modal sheet on iOS, native dialog on Android */}
      {Platform.OS === "ios" ? (
        <Modal visible={showDatePicker} transparent animationType="slide">
          <View style={$pickerBackdrop}>
            <View style={$pickerSheet}>
              <View style={$pickerToolbar}>
                <Pressable onPress={() => setShowDatePicker(false)} hitSlop={12}>
                  <Text style={$pickerDone}>Done</Text>
                </Pressable>
              </View>
              <DateTimePicker
                value={selectedDate}
                mode="date"
                display="spinner"
                maximumDate={new Date()}
                onChange={(_, date) => {
                  if (date) {
                    const d = new Date(date)
                    d.setHours(0, 0, 0, 0)
                    setSelectedDate(d)
                  }
                }}
              />
            </View>
          </View>
        </Modal>
      ) : (
        showDatePicker && (
          <DateTimePicker
            value={selectedDate}
            mode="date"
            display="default"
            maximumDate={new Date()}
            onChange={(_, date) => {
              setShowDatePicker(false)
              if (date) {
                const d = new Date(date)
                d.setHours(0, 0, 0, 0)
                setSelectedDate(d)
              }
            }}
          />
        )
      )}
    </View>
  )
}

export default DailyReviewScreen

// ---- Styles ----------------------------------------------------------------

const $screen: ViewStyle = { flex: 1, backgroundColor: paper }

const $header: ViewStyle = {
  paddingHorizontal: spacing.s5,
  paddingTop: spacing.s4,
  paddingBottom: spacing.s3,
}

const $eyebrow: TextStyle = {
  fontSize: 11, letterSpacing: 1.4, textTransform: "uppercase",
  color: ink3, fontFamily: typography.primary.normal,
}

const $dayNavRow: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  marginTop: 4,
}

const $navBtn: ViewStyle = {
  paddingVertical: 4,
  paddingHorizontal: 2,
}

const $dayNavCenter: ViewStyle = {
  flex: 1,
}

const $dayName: TextStyle = {
  fontSize: 36, lineHeight: 40, letterSpacing: -0.5,
  color: ink, fontFamily: typography.primary.bold,
}

const $dayFull: TextStyle = {
  fontSize: 13, color: ink3,
  fontFamily: typography.primary.normal,
  marginTop: 1,
}

const $subHeader: TextStyle = {
  fontSize: 13, color: ink3,
  fontFamily: typography.primary.normal,
  marginTop: 4,
}

const $scrollContent = {
  paddingHorizontal: spacing.s5,
  paddingTop: spacing.s2,
  gap: spacing.s3,
}

const $loadingWrap: ViewStyle = {
  flex: 1, alignItems: "center", justifyContent: "center",
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

const $row: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.s3,
  paddingVertical: spacing.s3,
  paddingHorizontal: spacing.s4,
  backgroundColor: card,
}

const $rowBorder: ViewStyle = {
  borderTopWidth: 1,
  borderTopColor: hairline,
}

const $rowPressed: ViewStyle = { backgroundColor: paper2 }
const $shadowRow: ViewStyle = { backgroundColor: paper2 }

const $disc: ViewStyle = {
  width: 28, height: 28, borderRadius: 14,
  alignItems: "center", justifyContent: "center",
  flexShrink: 0,
}

const $rowMid: ViewStyle = { flex: 1 }

const $rowName: TextStyle = {
  fontSize: 15, color: ink,
  fontFamily: typography.primary.normal,
}

const $rowNameShadow: TextStyle = { fontStyle: "italic", color: ink2 }

const $rowMeta: TextStyle = {
  fontSize: 12, color: ink3,
  fontFamily: typography.primary.normal,
  marginTop: 2,
}

const $rowRight: ViewStyle = {
  flexDirection: "row", alignItems: "center", gap: spacing.s1,
}

const $rowAmount: TextStyle = {
  fontSize: 14, color: ink,
  fontFamily: typography.mono.normal,
}

// ---- Total row -------------------------------------------------------------

const $totalRow: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "baseline",
  paddingHorizontal: spacing.s1,
  marginTop: spacing.s1,
}

const $totalLabel: TextStyle = {
  fontSize: 13, color: ink3,
  fontFamily: typography.primary.normal,
}

const $totalAmount: TextStyle = {
  fontSize: 16, color: ink,
  fontFamily: typography.mono.normal,
  letterSpacing: -0.3,
}

// ---- Confirm button --------------------------------------------------------

const $confirmBtn: ViewStyle = {
  backgroundColor: coral500,
  borderRadius: radii.pill,
  paddingVertical: spacing.s3 + 1,
  alignItems: "center",
  justifyContent: "center",
  ...elevation.tapButton,
  marginTop: spacing.s2,
}

const $confirmBtnPressed: ViewStyle = {
  backgroundColor: coral600,
  transform: [{ scale: 0.97 }],
}

const $confirmBtnText: TextStyle = {
  fontSize: 15, color: "white",
  fontFamily: typography.primary.medium,
  letterSpacing: 0.1,
}

const $confirmedBadge: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  gap: spacing.s2,
  borderRadius: radii.pill,
  borderWidth: 1.5,
  borderColor: coral500,
  paddingVertical: spacing.s3,
  marginTop: spacing.s2,
}

const $confirmedBadgeText: TextStyle = {
  fontSize: 15, color: coral500,
  fontFamily: typography.primary.medium,
  letterSpacing: 0.1,
}

// ---- Empty state -----------------------------------------------------------

const $emptyWrap: ViewStyle = {
  alignItems: "center", justifyContent: "center",
  paddingVertical: spacing.s16, gap: spacing.s3,
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
  paddingHorizontal: spacing.s8,
}

// ---- Date picker (iOS modal) ------------------------------------------------

const $pickerBackdrop: ViewStyle = {
  flex: 1,
  justifyContent: "flex-end",
  backgroundColor: "rgba(0,0,0,0.35)",
}

const $pickerSheet: ViewStyle = {
  backgroundColor: card,
  borderTopLeftRadius: radii.xl,
  borderTopRightRadius: radii.xl,
  paddingBottom: 32,
}

const $pickerToolbar: ViewStyle = {
  flexDirection: "row",
  justifyContent: "flex-end",
  paddingHorizontal: spacing.s5,
  paddingVertical: spacing.s3,
  borderBottomWidth: 1,
  borderBottomColor: hairline,
}

const $pickerDone: TextStyle = {
  fontSize: 16,
  color: coral500,
  fontFamily: typography.primary.medium,
}
