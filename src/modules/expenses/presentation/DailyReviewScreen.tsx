import { useMemo, useState } from "react"
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
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons"
import DateTimePicker from "@react-native-community/datetimepicker"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { container } from "@/bootstrap/container"
import { Text } from "@/components/Text"
import { confirmDay } from "@/modules/expenses/application/confirm-day"
import { deleteExpense } from "@/modules/expenses/application/delete-expense"
import { updateExpense } from "@/modules/expenses/application/update-expense"
import type { Category } from "@/modules/expenses/domain/entities/category"
import type { ExpenseEvent } from "@/modules/expenses/domain/entities/expense-event"
import type { CategoryRepository } from "@/modules/expenses/domain/repositories/category-repository"
import type { ExpenseEventRepository } from "@/modules/expenses/domain/repositories/expense-event-repository"
import { expensesKeys } from "@/shared/query-keys"
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
} from "@/theme/tapp-tokens"
import { typography } from "@/theme/typography"
import { ConfirmDaySheet } from "./review/ConfirmDaySheet"
import { EditExpenseSheet } from "./review/EditExpenseSheet"

// ---- Helpers ---------------------------------------------------------------

function getDateRange(date: Date): { start: number; end: number } {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0).getTime()
  const end = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    23,
    59,
    59,
    999,
  ).getTime()
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
  food: catClay,
  lunch: catClay,
  dinner: catClay,
  groceries: catMango,
  transport: catFern,
  matatu: catFern,
  uber: catFern,
  utilities: catLake,
  airtime: catLake,
  leisure: catOrchid,
  coffee: catOrchid,
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

// ---- Time slot grouping ----------------------------------------------------

// Mirrors PickRoutineSheet slots but extends to full 24-hour coverage.
const REVIEW_SLOTS = [
  { label: "Early morning", start: 0, end: 420 }, // midnight – 7 AM
  { label: "Morning", start: 420, end: 600 }, // 7 – 10 AM
  { label: "Midday", start: 600, end: 720 }, // 10 AM – 12 PM
  { label: "Lunch", start: 720, end: 840 }, // 12 – 2 PM
  { label: "Afternoon", start: 840, end: 1020 }, // 2 – 5 PM
  { label: "Evening", start: 1020, end: 1200 }, // 5 – 8 PM
  { label: "Night", start: 1200, end: 1440 }, // 8 PM – midnight
]

type SlotDef = (typeof REVIEW_SLOTS)[number]

type TimeGroup = {
  slot: SlotDef
  events: ExpenseEvent[]
  total: number
}

function slotTimeRange(slot: SlotDef): string {
  const fmt = (m: number) => {
    const h = Math.floor(m / 60) % 24
    const min = m % 60
    const ampm = h < 12 ? "AM" : "PM"
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
    return min === 0 ? `${h12} ${ampm}` : `${h12}:${String(min).padStart(2, "0")} ${ampm}`
  }
  return `${fmt(slot.start)} – ${fmt(slot.end === 1440 ? 0 : slot.end)}`
}

function groupEventsByTimeSlot(events: ExpenseEvent[]): TimeGroup[] {
  const map = new Map<string, TimeGroup>()

  for (const ev of events) {
    const minutes = ev.created_at
      ? new Date(ev.created_at).getHours() * 60 + new Date(ev.created_at).getMinutes()
      : 0
    const slot =
      REVIEW_SLOTS.find((s) => minutes >= s.start && minutes < s.end) ??
      REVIEW_SLOTS[REVIEW_SLOTS.length - 1]

    if (!map.has(slot.label)) {
      map.set(slot.label, { slot, events: [], total: 0 })
    }
    const g = map.get(slot.label)!
    g.events.push(ev)
    g.total += ev.amount ?? 0
  }

  // Return in chronological slot order, only slots that have events
  return REVIEW_SLOTS.map((s) => map.get(s.label)).filter(Boolean) as TimeGroup[]
}

// ---- Event row (used inside time groups) -----------------------------------

function EventRow({
  event,
  category,
  isFirst,
  onPress,
}: {
  event: ExpenseEvent
  category: Category | null
  isFirst: boolean
  onPress: (ev: ExpenseEvent) => void
}) {
  const color = resolveCategoryColor(category?.name, category?.color_hex)
  const isConfirmed = event.confirmed_at != null

  return (
    <Pressable
      onPress={() => onPress(event)}
      style={({ pressed }) => [$rowOuter, !isFirst && $rowBorder, pressed && $rowPressed]}
    >
      <View style={[$colorBar, { backgroundColor: color }]} />
      <View style={$rowContent}>
        <View style={$rowTop}>
          <Text style={$rowName} numberOfLines={1}>
            {category?.name ?? "Expense"}
          </Text>
          <View style={$rowRight}>
            <Text style={$rowAmount}>{"KSh " + formatAmount(event.amount)}</Text>
            {isConfirmed ? (
              <Ionicons name="checkmark-circle" size={15} color={coral500} />
            ) : (
              <Ionicons name="chevron-forward" size={14} color={ink4} />
            )}
          </View>
        </View>
        <Text style={$rowMeta} numberOfLines={2}>
          {formatTimestamp(event.created_at)}
          {event.category_id == null ? " · no category" : ""}
          {event.notes ? " · " + event.notes : ""}
        </Text>
      </View>
    </Pressable>
  )
}

// ---- Time group card -------------------------------------------------------

function TimeGroupCard({
  group,
  categoryMap,
  onPressEvent,
}: {
  group: TimeGroup
  categoryMap: Map<number, Category>
  onPressEvent: (ev: ExpenseEvent) => void
}) {
  const tapCount = group.events.length

  return (
    <View style={$groupSection}>
      {/* Slot header — outside the card, matching routines style */}
      <View style={$slotHeaderRow}>
        <Text style={$slotHeaderLabel}>{group.slot.label}</Text>
        <Text style={$slotHeaderTime}>{slotTimeRange(group.slot)}</Text>
        <Text style={$slotHeaderTotal}>
          {"KSh " + formatAmount(group.total)}
          {"  ·  "}
          {tapCount} {tapCount === 1 ? "tap" : "taps"}
        </Text>
      </View>

      {/* Events card */}
      <View style={$card}>
        {group.events.map((ev, i) => (
          <EventRow
            key={String(ev.id ?? i)}
            event={ev}
            category={
              ev.category_id != null ? (categoryMap.get(ev.category_id as number) ?? null) : null
            }
            isFirst={i === 0}
            onPress={onPressEvent}
          />
        ))}
      </View>
    </View>
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

  const queryClient = useQueryClient()

  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  })
  const [editingEvent, setEditingEvent] = useState<ExpenseEvent | null>(null)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [showConfirmSheet, setShowConfirmSheet] = useState(false)

  const { data: allEvents = [], isLoading: loading } = useQuery({
    queryKey: expensesKeys.events(),
    queryFn: () => container.resolve<ExpenseEventRepository>("expenseEventRepository")!.findAll(),
  })

  const { data: allCategories = [] } = useQuery({
    queryKey: expensesKeys.categories(),
    queryFn: () => container.resolve<CategoryRepository>("categoryRepository")!.findAll(),
  })

  const categoryMap = useMemo(() => {
    const map = new Map<number, Category>()
    for (const cat of allCategories) {
      if (cat.id != null) map.set(cat.id, cat)
    }
    return map
  }, [allCategories])

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      amount,
      categoryId,
      notes,
    }: {
      id: number
      amount: number
      categoryId: number | null
      notes: string | null
    }) => {
      const expenseRepo = container.resolve<ExpenseEventRepository>("expenseEventRepository")!
      const sync = container.resolve<any>("syncEngine")
      return updateExpense(expenseRepo, id, amount, categoryId, sync, notes)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: expensesKeys.events() }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => {
      const expenseRepo = container.resolve<ExpenseEventRepository>("expenseEventRepository")!
      const sync = container.resolve<any>("syncEngine")
      return deleteExpense(expenseRepo, id, sync)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: expensesKeys.events() }),
  })

  const confirmMutation = useMutation({
    mutationFn: () => {
      const expenseRepo = container.resolve<ExpenseEventRepository>("expenseEventRepository")!
      const sync = container.resolve<any>("syncEngine")
      const { start, end } = getDateRange(selectedDate)
      return confirmDay(expenseRepo, start, end, sync)
    },
    onSuccess: () => {
      setShowConfirmSheet(false)
      queryClient.invalidateQueries({ queryKey: expensesKeys.events() })
    },
  })

  function handleSave(id: number, amount: number, categoryId: number | null, notes: string | null) {
    updateMutation.mutate({ id, amount, categoryId, notes })
  }

  function handleConfirmDay() {
    confirmMutation.mutate()
  }

  function handleDelete(id: number) {
    deleteMutation.mutate(id)
  }

  const { start: dayStart, end: dayEnd } = getDateRange(selectedDate)
  const events = allEvents.filter(
    (e) => (e.created_at ?? 0) >= dayStart && (e.created_at ?? 0) <= dayEnd,
  )

  const tapCount = events.length
  const dayTotal = events.reduce((s, e) => s + (e.amount ?? 0), 0)
  const isDayConfirmed = tapCount > 0 && events.every((e) => e.confirmed_at != null)

  const todayFlag = isToday(selectedDate)

  return (
    <View style={[$screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={$header}>
        <Text style={$eyebrow}>Daily review</Text>
        <View style={$dayNavRow}>
          <Pressable
            onPress={() => setSelectedDate((d) => addDays(d, -1))}
            hitSlop={12}
            style={$navBtn}
          >
            <Ionicons name="chevron-back" size={20} color={ink2} />
          </Pressable>
          <Pressable style={$dayNavCenter} onPress={() => setShowDatePicker(true)} hitSlop={8}>
            <Text style={$dayName}>{getDayNavLabel(selectedDate)}</Text>
            {!todayFlag && <Text style={$dayFull}>{getDateLabel(selectedDate)}</Text>}
          </Pressable>
          <Pressable
            onPress={() => setSelectedDate((d) => addDays(d, 1))}
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
              {/* Time slot group cards */}
              {groupEventsByTimeSlot(events).map((group) => (
                <TimeGroupCard
                  key={group.slot.label}
                  group={group}
                  categoryMap={categoryMap}
                  onPressEvent={setEditingEvent}
                />
              ))}

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
        categories={allCategories}
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
  fontSize: 11,
  letterSpacing: 1.4,
  textTransform: "uppercase",
  color: ink3,
  fontFamily: typography.primary.normal,
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
  fontSize: 36,
  lineHeight: 40,
  letterSpacing: -0.5,
  color: ink,
  fontFamily: typography.primary.bold,
}

const $dayFull: TextStyle = {
  fontSize: 13,
  color: ink3,
  fontFamily: typography.primary.normal,
  marginTop: 1,
}

const $subHeader: TextStyle = {
  fontSize: 13,
  color: ink3,
  fontFamily: typography.primary.normal,
  marginTop: 4,
}

const $scrollContent = {
  paddingHorizontal: spacing.s5,
  paddingTop: spacing.s2,
  gap: spacing.s3,
}

const $loadingWrap: ViewStyle = {
  flex: 1,
  alignItems: "center",
  justifyContent: "center",
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

const $rowPressed: ViewStyle = { backgroundColor: paper2 }

const $rowOuter: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  backgroundColor: card,
}

const $rowBorder: ViewStyle = {
  borderTopWidth: 1,
  borderTopColor: hairline,
}

const $colorBar: ViewStyle = {
  width: 4,
  height: 36,
  borderRadius: 2,
  flexShrink: 0,
  marginLeft: spacing.s4,
}

const $rowContent: ViewStyle = {
  flex: 1,
  gap: 2,
  paddingVertical: spacing.s3 + 2,
  paddingLeft: spacing.s3,
  paddingRight: spacing.s4,
}

const $rowTop: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
}

const $rowName: TextStyle = {
  fontSize: 15,
  color: ink,
  fontFamily: typography.primary.normal,
  flex: 1,
}

const $rowMeta: TextStyle = {
  fontSize: 12,
  color: ink3,
  fontFamily: typography.primary.normal,
}

const $rowRight: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.s1,
}

const $rowAmount: TextStyle = {
  fontSize: 14,
  color: ink,
  fontFamily: typography.mono.normal,
}

// ---- Group section header (outside card, matches routines style) ------------

const $groupSection: ViewStyle = {
  gap: spacing.s2,
}

const $slotHeaderRow: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.s2,
  paddingHorizontal: spacing.s1,
}

const $slotHeaderLabel: TextStyle = {
  fontSize: 13,
  color: ink2,
  fontFamily: typography.primary.semiBold,
}

const $slotHeaderTime: TextStyle = {
  fontSize: 11,
  color: ink4,
  fontFamily: typography.primary.normal,
}

const $slotHeaderTotal: TextStyle = {
  marginLeft: "auto" as any,
  fontSize: 12,
  color: ink3,
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
  fontSize: 13,
  color: ink3,
  fontFamily: typography.primary.normal,
}

const $totalAmount: TextStyle = {
  fontSize: 16,
  color: ink,
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
  fontSize: 15,
  color: "white",
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
  fontSize: 15,
  color: coral500,
  fontFamily: typography.primary.medium,
  letterSpacing: 0.1,
}

// ---- Empty state -----------------------------------------------------------

const $emptyWrap: ViewStyle = {
  alignItems: "center",
  justifyContent: "center",
  paddingVertical: spacing.s16,
  gap: spacing.s3,
}

const $emptyTitle: TextStyle = {
  fontSize: 17,
  color: ink3,
  fontFamily: typography.primary.semiBold,
  marginTop: spacing.s2,
}

const $emptySub: TextStyle = {
  fontSize: 13,
  color: ink4,
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
