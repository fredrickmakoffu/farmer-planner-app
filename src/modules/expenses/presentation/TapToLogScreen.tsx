import { useCallback, useEffect, useRef, useState } from "react"
import { Animated, Pressable, View, ViewStyle, TextStyle } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { LinearGradient } from "expo-linear-gradient"
import { MaterialCommunityIcons } from "@expo/vector-icons"
import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"

import { Text } from "@/components/Text"
import { container } from "@/bootstrap/container"
import { createExpense } from "@/modules/expenses/application/create-expense"
import { predictCategory } from "@/modules/expenses/application/predict-category"
import type { Category } from "@/modules/expenses/domain/entities/category"
import type { CategoryRepository } from "@/modules/expenses/domain/repositories/category-repository"
import type { ExpenseEventRepository } from "@/modules/expenses/domain/repositories/expense-event-repository"
import type { RoutineRepository } from "@/modules/expenses/domain/repositories/routine-repository"
import type { Routine } from "@/modules/expenses/domain/entities/routine"
import type { ExpenseEvent } from "@/modules/expenses/domain/entities/expense-event"
import { PickRoutineSheet } from "./tap/PickRoutineSheet"
import {
  paper,
  ink,
  ink2,
  ink3,
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

// Map lowercase category names to design-system palette colors
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

function resolveCategoryColor(name?: string, colorHex?: string): string {
  if (name) {
    const mapped = CATEGORY_COLOR_MAP[name.toLowerCase()]
    if (mapped) return mapped
  }
  return colorHex ?? catStone
}

function formatAmount(amount: number): string {
  return amount.toLocaleString("en-KE")
}

function formatTimestamp(ts?: number): string {
  if (!ts) return ""
  try {
    return new Date(ts).toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" })
  } catch {
    return ""
  }
}

// ---- Category Pill -------------------------------------------------------
function CategoryPill({
  color, label, amount, source,
}: {
  color: string
  label: string
  amount: number
  source: "routine" | "history" | "fallback"
}) {
  const suffix = amount > 0
    ? ` · KSh ${formatAmount(amount)}`
    : source === "history"
    ? " · past"
    : ""
  return (
    <View style={[$pill, { borderColor: hairline }]}>
      <View style={[$pillDot, { backgroundColor: color }]} />
      <Text style={$pillText}>{label}{suffix}</Text>
    </View>
  )
}

// ---- Category Disc -------------------------------------------------------
function CategoryDisc({ color }: { color: string }) {
  return (
    <View style={[$disc, { backgroundColor: color }]}>
      <MaterialCommunityIcons name="silverware-fork-knife" size={14} color="white" />
    </View>
  )
}

// ---- Last-event card -------------------------------------------------------
function LastEventCard({
  event,
  category,
}: {
  event: ExpenseEvent
  category: Category | null
}) {
  const color = resolveCategoryColor(category?.name, category?.color_hex)
  return (
    <View style={$eventCard}>
      <CategoryDisc color={color} />
      <View style={$eventContent}>
        <Text style={$eventLabel}>
          {"Logged. "}
          <Text style={$eventMono}>{category?.name ?? "Expense"}.</Text>
        </Text>
        <Text style={$eventMeta}>
          {formatTimestamp(event.created_at)}{" · "}
          <Text style={$eventMetaMono}>{"KSh " + formatAmount(event.amount)}</Text>
        </Text>
      </View>
    </View>
  )
}

// ---- Main screen -----------------------------------------------------------
export function TapToLogScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const scaleAnim = useRef(new Animated.Value(1)).current

  const [total, setTotal] = useState(0)
  const [predictedCategory, setPredictedCategory] = useState<Category | null>(null)
  const [prediction, setPrediction] = useState<{ amount: number; source: "routine" | "history" | "fallback"; routineName?: string }>({ amount: 0, source: "fallback" })
  const [lastEvent, setLastEvent] = useState<ExpenseEvent | null>(null)
  const [lastCategory, setLastCategory] = useState<Category | null>(null)
  const [allRoutines, setAllRoutines] = useState<Routine[]>([])
  const [allCategories, setAllCategories] = useState<Category[]>([])
  const [pickSheetOpen, setPickSheetOpen] = useState(false)
  const [nowMinutes, setNowMinutes] = useState(0)

  const loadData = useCallback(async () => {
    const expenseRepo = container.resolve<ExpenseEventRepository>("expenseEventRepository")
    const categoryRepo = container.resolve<CategoryRepository>("categoryRepository")
    const routineRepo = container.resolve<RoutineRepository>("routineRepository")
    if (!expenseRepo || !categoryRepo) return

    const [allEvents, result, cats, routines] = await Promise.all([
      expenseRepo.findAll(),
      predictCategory(categoryRepo, expenseRepo, routineRepo),
      categoryRepo.findAll(),
      routineRepo ? routineRepo.findAll() : Promise.resolve([]),
    ])

    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
    const todayEnd = todayStart + 86_400_000
    const todayEvents = allEvents.filter(
      (e) => e.created_at >= todayStart && e.created_at < todayEnd,
    )

    const todayTotal = todayEvents.reduce((sum, e) => sum + (e.amount ?? 0), 0)
    setTotal(todayTotal)
    setPrediction({ amount: result.defaultAmount, source: result.source, routineName: result.routineName })
    setAllCategories(cats)
    setAllRoutines(routines)

    setNowMinutes(now.getHours() * 60 + now.getMinutes())

    if (result.categoryId != null) {
      const cat = await categoryRepo.findById(result.categoryId)
      setPredictedCategory(cat ?? null)
    }

    // findAll returns DESC order; todayEvents[0] is the most recent today
    if (todayEvents.length > 0) {
      const latest = todayEvents[0]
      setLastEvent(latest)
      if (latest.category_id != null) {
        const cat = await categoryRepo.findById(latest.category_id as number)
        setLastCategory(cat ?? null)
      }
    } else {
      setLastEvent(null)
      setLastCategory(null)
    }
  }, [])

  useEffect(() => {
    loadData().catch((err) => console.error("TapToLogScreen: loadData failed", err))
  }, [loadData])

  function animatePress(toValue: number, cb?: () => void) {
    Animated.timing(scaleAnim, {
      toValue,
      duration: duration.fast,
      useNativeDriver: true,
    }).start(cb)
  }

  async function handleTap() {
    animatePress(0.92, () => animatePress(1))

    const expenseRepo = container.resolve<ExpenseEventRepository>("expenseEventRepository")
    const categoryRepo = container.resolve<CategoryRepository>("categoryRepository")
    const routineRepo = container.resolve<RoutineRepository>("routineRepository")
    const sync = container.resolve<any>("syncEngine")
    if (!expenseRepo || !categoryRepo) return

    const result = await predictCategory(categoryRepo, expenseRepo, routineRepo)

    if (result.source === "routine" && result.defaultAmount > 0) {
      await createExpense(expenseRepo, result.defaultAmount, result.categoryId, sync)
      loadData()
    } else {
      const now = new Date()
      setNowMinutes(now.getHours() * 60 + now.getMinutes())
      setPickSheetOpen(true)
    }
  }

  const handleLog = useCallback(async (categoryId: number, amount: number) => {
    setPickSheetOpen(false)
    const expenseRepo = container.resolve<ExpenseEventRepository>("expenseEventRepository")
    const sync = container.resolve<any>("syncEngine")
    if (!expenseRepo) return
    await createExpense(expenseRepo, amount, categoryId, sync)
    loadData()
  }, [loadData])

  const handleSaveRoutineAndLog = useCallback(async (routine: Omit<Routine, "id">) => {
    setPickSheetOpen(false)
    const expenseRepo = container.resolve<ExpenseEventRepository>("expenseEventRepository")
    const routineRepo = container.resolve<RoutineRepository>("routineRepository")
    const sync = container.resolve<any>("syncEngine")
    if (!expenseRepo || !routineRepo) return
    await routineRepo.create(routine)
    await createExpense(expenseRepo, routine.default_amount, routine.category_id, sync)
    loadData()
  }, [loadData])

  const pillColor = resolveCategoryColor(predictedCategory?.name, predictedCategory?.color_hex)
  const pillLabel = prediction.routineName ?? predictedCategory?.name ?? "Expense"

  return (
    <View style={[$screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={$header}>
        <View>
          <Text style={$eyebrow}>Today</Text>
          <View style={$amountRow}>
            <Text style={$currencySymbol}>KSh</Text>
            <Text style={$heroAmount}>{formatAmount(total)}</Text>
          </View>
        </View>
        <Pressable onPress={() => router.push("/settings" as any)} hitSlop={12}>
          <Ionicons name="settings-outline" size={22} color={ink3} />
        </Pressable>
      </View>

      {/* Body */}
      <View style={$body}>
        <CategoryPill color={pillColor} label={pillLabel} amount={prediction.amount} source={prediction.source} />

        <Pressable
          onPress={handleTap}
          accessibilityLabel="Tap to log expense"
          accessibilityRole="button"
        >
          <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <LinearGradient
              colors={["#E8956A", coral500, coral600]}
              start={{ x: 0.32, y: 0.3 }}
              end={{ x: 0.8, y: 0.9 }}
              style={[$tapButton, elevation.tapButton]}
            >
              <MaterialCommunityIcons name="gesture-tap" size={80} color="white" />
            </LinearGradient>
          </Animated.View>
        </Pressable>

        <Text style={$hint}>tap to log · hold for note</Text>

        {lastEvent && <LastEventCard event={lastEvent} category={lastCategory} />}
      </View>

      <PickRoutineSheet
        visible={pickSheetOpen}
        routines={allRoutines}
        categories={allCategories}
        nowMinutes={nowMinutes}
        onLog={handleLog}
        onSaveRoutineAndLog={handleSaveRoutineAndLog}
        onClose={() => setPickSheetOpen(false)}
      />
    </View>
  )
}

export default TapToLogScreen

// ---- Styles ----------------------------------------------------------------

const $screen: ViewStyle = {
  flex: 1,
  backgroundColor: paper,
}

const $header: ViewStyle = {
  flexDirection: "row",
  alignItems: "flex-start",
  justifyContent: "space-between",
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

const $amountRow: ViewStyle = {
  flexDirection: "row",
  alignItems: "baseline",
  marginTop: 2,
}

const $currencySymbol: TextStyle = {
  fontSize: 20,
  color: ink3,
  fontFamily: typography.mono.normal,
  marginRight: 4,
  letterSpacing: 0.4,
}

const $heroAmount: TextStyle = {
  fontSize: 44,
  lineHeight: 48,
  letterSpacing: -1,
  color: ink,
  fontFamily: typography.mono.normal,
}

const $body: ViewStyle = {
  flex: 1,
  alignItems: "center",
  justifyContent: "center",
  gap: 22,
  paddingHorizontal: spacing.s5,
  paddingBottom: 88,
}

const $tapButton: ViewStyle = {
  width: 200,
  height: 200,
  borderRadius: 100,
  alignItems: "center",
  justifyContent: "center",
}

const $hint: TextStyle = {
  fontSize: 11,
  letterSpacing: 1.4,
  textTransform: "uppercase",
  color: ink3,
  fontFamily: typography.mono.normal,
}

const $pill: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.s2,
  paddingVertical: spacing.s1,
  paddingHorizontal: spacing.s3,
  borderRadius: radii.pill,
  backgroundColor: card,
  borderWidth: 1,
}

const $pillDot: ViewStyle = {
  width: 8,
  height: 8,
  borderRadius: 4,
}

const $pillText: TextStyle = {
  fontSize: 13,
  color: ink2,
  fontFamily: typography.primary.normal,
}

const $eventCard: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.s3,
  paddingVertical: spacing.s3,
  paddingHorizontal: spacing.s4,
  backgroundColor: card,
  borderRadius: radii.lg,
  borderWidth: 1,
  borderColor: hairline,
  ...elevation.card,
  alignSelf: "stretch",
}

const $disc: ViewStyle = {
  width: 28,
  height: 28,
  borderRadius: 14,
  alignItems: "center",
  justifyContent: "center",
}

const $eventContent: ViewStyle = {
  flex: 1,
}

const $eventLabel: TextStyle = {
  fontSize: 13,
  color: ink2,
  fontFamily: typography.primary.normal,
}

const $eventMono: TextStyle = {
  fontSize: 13,
  color: ink2,
  fontFamily: typography.mono.normal,
}

const $eventMeta: TextStyle = {
  fontSize: 12,
  color: ink3,
  fontFamily: typography.primary.normal,
  marginTop: 2,
}

const $eventMetaMono: TextStyle = {
  fontSize: 12,
  color: ink3,
  fontFamily: typography.mono.normal,
}
