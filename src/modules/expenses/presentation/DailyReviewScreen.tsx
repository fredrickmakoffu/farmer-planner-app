import { useCallback, useEffect, useState } from "react"
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  View,
  ViewStyle,
  TextStyle,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons"

import { Text } from "@/components/Text"
import { container } from "@/bootstrap/container"
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
import { EditExpenseSheet } from "./review/EditExpenseSheet"

// ---- Helpers ---------------------------------------------------------------

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
          {event.category_id != null ? "predicted" : "unassigned"}
          {" · "}
          {formatTimestamp(event.created_at)}
        </Text>
      </View>

      <View style={$rowRight}>
        <Text style={$rowAmount}>{"KSh " + formatAmount(event.amount)}</Text>
        <Ionicons name="chevron-forward" size={14} color={ink4} />
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
  const today = new Date()

  const [events, setEvents] = useState<ExpenseEvent[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [categoryMap, setCategoryMap] = useState<Map<number, Category>>(new Map())
  const [loading, setLoading] = useState(true)
  const [editingEvent, setEditingEvent] = useState<ExpenseEvent | null>(null)

  const loadData = useCallback(async () => {
    const expenseRepo = container.resolve<ExpenseEventRepository>("expenseEventRepository")
    const categoryRepo = container.resolve<CategoryRepository>("categoryRepository")
    if (!expenseRepo || !categoryRepo) { setLoading(false); return }

    const [allEvents, allCategories] = await Promise.all([
      expenseRepo.findAll(),
      categoryRepo.findAll(),
    ])

    const map = new Map<number, Category>()
    for (const cat of allCategories) {
      if (cat.id != null) map.set(cat.id, cat)
    }

    setEvents(allEvents)
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

  const handleDelete = useCallback(async (id: number) => {
    const expenseRepo = container.resolve<ExpenseEventRepository>("expenseEventRepository")
    const sync = container.resolve<any>("syncEngine")
    if (!expenseRepo) return
    await deleteExpense(expenseRepo, id, sync)
    loadData()
  }, [loadData])

  const confirmedCount = events.length
  const dayTotal = events.reduce((s, e) => s + (e.amount ?? 0), 0)

  return (
    <View style={[$screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={$header}>
        <View>
          <Text style={$eyebrow}>Daily review</Text>
          <Text style={$dayName}>{getDayName(today)}</Text>
          <Text style={$subHeader}>
            {getDateLabel(today)}
            {" · "}
            {confirmedCount} {confirmedCount === 1 ? "tap" : "taps"}
          </Text>
        </View>
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
                <Text style={$totalLabel}>Total today</Text>
                <Text style={$totalAmount}>{"KSh " + formatAmount(dayTotal)}</Text>
              </View>

              {/* Confirm day CTA */}
              <Pressable style={({ pressed }) => [$confirmBtn, pressed && $confirmBtnPressed]}>
                <Text style={$confirmBtnText}>Confirm day</Text>
              </Pressable>
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

const $dayName: TextStyle = {
  fontSize: 38, lineHeight: 42, letterSpacing: -0.5,
  color: ink, fontFamily: typography.primary.bold,
  marginTop: 4,
}

const $subHeader: TextStyle = {
  fontSize: 13, color: ink3,
  fontFamily: typography.primary.normal,
  marginTop: 3,
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
