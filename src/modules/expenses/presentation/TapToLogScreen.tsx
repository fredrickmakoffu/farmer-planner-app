import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Animated, Pressable, View, ViewStyle, TextStyle } from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import { useFocusEffect, useRouter } from "expo-router"
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { container } from "@/bootstrap/container"
import { Text } from "@/components/Text"
import { createCategory } from "@/modules/expenses/application/create-category"
import { createExpense } from "@/modules/expenses/application/create-expense"
import { predictCategory } from "@/modules/expenses/application/predict-category"
import type { Category } from "@/modules/expenses/domain/entities/category"
import type { ExpenseEvent } from "@/modules/expenses/domain/entities/expense-event"
import type { Routine } from "@/modules/expenses/domain/entities/routine"
import type { CategoryRepository } from "@/modules/expenses/domain/repositories/category-repository"
import type { ExpenseEventRepository } from "@/modules/expenses/domain/repositories/expense-event-repository"
import type { RoutineRepository } from "@/modules/expenses/domain/repositories/routine-repository"
import { expensesKeys } from "@/shared/query-keys"
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
} from "@/theme/tapp-tokens"
import { typography } from "@/theme/typography"

import { AddExpenseSheet } from "./tap/AddExpenseSheet"
import { PickRoutineSheet } from "./tap/PickRoutineSheet"

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
  color,
  label,
  amount,
  source,
}: {
  color: string
  label: string
  amount: number
  source: "routine" | "history" | "fallback"
}) {
  const suffix =
    amount > 0 ? ` · KSh ${formatAmount(amount)}` : source === "history" ? " · past" : ""
  return (
    <View style={[$pill, { borderColor: hairline }]}>
      <View style={[$pillDot, { backgroundColor: color }]} />
      <Text style={$pillText}>
        {label}
        {suffix}
      </Text>
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
function LastEventCard({ event, category }: { event: ExpenseEvent; category: Category | null }) {
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
          {formatTimestamp(event.created_at)}
          {" · "}
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

  // Hold animation values
  const holdRingScale = useRef(new Animated.Value(1)).current
  const holdRingOpacity = useRef(new Animated.Value(0)).current
  const pingScale = useRef(new Animated.Value(1)).current
  const pingOpacity = useRef(new Animated.Value(0)).current
  const holdAnim = useRef<Animated.CompositeAnimation | null>(null)
  const longPressFired = useRef(false)

  const queryClient = useQueryClient()

  useFocusEffect(
    useCallback(() => {
      queryClient.invalidateQueries({ queryKey: expensesKeys.events() })
      queryClient.invalidateQueries({ queryKey: expensesKeys.prediction() })
    }, [queryClient]),
  )

  const [pickSheetOpen, setPickSheetOpen] = useState(false)
  const [addSheetOpen, setAddSheetOpen] = useState(false)
  const [nowMinutes, setNowMinutes] = useState(() => {
    const now = new Date()
    return now.getHours() * 60 + now.getMinutes()
  })

  const { data: allEvents = [] } = useQuery({
    queryKey: expensesKeys.events(),
    queryFn: () => container.resolve<ExpenseEventRepository>("expenseEventRepository")!.findAll(),
  })

  const { data: allCategories = [] } = useQuery({
    queryKey: expensesKeys.categories(),
    queryFn: () => container.resolve<CategoryRepository>("categoryRepository")!.findAll(),
  })

  const { data: allRoutines = [] } = useQuery({
    queryKey: expensesKeys.routines(),
    queryFn: () => {
      const repo = container.resolve<RoutineRepository>("routineRepository")
      return repo ? repo.findAll() : Promise.resolve([])
    },
  })

  const { data: predictionResult } = useQuery({
    queryKey: expensesKeys.prediction(),
    queryFn: () => {
      const categoryRepo = container.resolve<CategoryRepository>("categoryRepository")!
      const expenseRepo = container.resolve<ExpenseEventRepository>("expenseEventRepository")!
      const routineRepo = container.resolve<RoutineRepository>("routineRepository")
      return predictCategory(categoryRepo, expenseRepo, routineRepo)
    },
  })

  const categoryMap = useMemo(() => {
    const map = new Map<number, Category>()
    for (const cat of allCategories) {
      if (cat.id != null) map.set(cat.id, cat)
    }
    return map
  }, [allCategories])

  const todayEvents = useMemo(() => {
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
    const todayEnd = todayStart + 86_400_000
    return allEvents.filter(
      (e) => (e.created_at ?? 0) >= todayStart && (e.created_at ?? 0) < todayEnd,
    )
  }, [allEvents])

  const total = useMemo(() => todayEvents.reduce((s, e) => s + (e.amount ?? 0), 0), [todayEvents])
  const lastEvent: ExpenseEvent | null = todayEvents[0] ?? null
  const lastCategory: Category | null =
    lastEvent?.category_id != null
      ? (categoryMap.get(lastEvent.category_id as number) ?? null)
      : null
  const predictedCategory: Category | null =
    predictionResult?.categoryId != null
      ? (categoryMap.get(predictionResult.categoryId) ?? null)
      : null
  const prediction = {
    amount: predictionResult?.defaultAmount ?? 0,
    source: (predictionResult?.source ?? "fallback") as "routine" | "history" | "fallback",
    routineName: predictionResult?.routineName,
  }

  const invalidateAfterTap = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: expensesKeys.events() }),
      queryClient.invalidateQueries({ queryKey: expensesKeys.prediction() }),
    ])

  const createExpenseMutation = useMutation({
    mutationFn: ({
      amount,
      categoryId,
      notes,
    }: {
      amount: number
      categoryId?: number | null
      notes?: string | null
    }) => {
      const expenseRepo = container.resolve<ExpenseEventRepository>("expenseEventRepository")!
      const sync = container.resolve<any>("syncEngine")
      return createExpense(expenseRepo, amount, categoryId, sync, notes)
    },
    onSuccess: invalidateAfterTap,
  })

  const createRoutineMutation = useMutation({
    mutationFn: async (routine: Omit<Routine, "id">) => {
      const expenseRepo = container.resolve<ExpenseEventRepository>("expenseEventRepository")!
      const routineRepo = container.resolve<RoutineRepository>("routineRepository")!
      const sync = container.resolve<any>("syncEngine")
      await routineRepo.create(routine)
      await createExpense(expenseRepo, routine.default_amount, routine.category_id, sync)
    },
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: expensesKeys.events() }),
        queryClient.invalidateQueries({ queryKey: expensesKeys.routines() }),
        queryClient.invalidateQueries({ queryKey: expensesKeys.prediction() }),
      ]),
  })

  const createCategoryMutation = useMutation({
    mutationFn: ({ name, colorHex, icon }: { name: string; colorHex: string; icon: string }) => {
      const repo = container.resolve<CategoryRepository>("categoryRepository")!
      return createCategory(repo, name, colorHex, icon)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: expensesKeys.categories() }),
  })

  // When the add sheet opens, release the held-down button
  useEffect(() => {
    if (!addSheetOpen) return
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 8,
      tension: 80,
      useNativeDriver: true,
    }).start()
    Animated.parallel([
      Animated.timing(holdRingScale, { toValue: 1.5, duration: 280, useNativeDriver: true }),
      Animated.timing(holdRingOpacity, { toValue: 0, duration: 280, useNativeDriver: true }),
    ]).start()
  }, [addSheetOpen, scaleAnim, holdRingScale, holdRingOpacity])

  function resetHoldAnims() {
    holdAnim.current?.stop()
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, friction: 8, tension: 90, useNativeDriver: true }),
      Animated.timing(holdRingOpacity, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(holdRingScale, { toValue: 1, duration: 180, useNativeDriver: true }),
    ]).start()
  }

  function handlePressIn() {
    longPressFired.current = false
    holdAnim.current?.stop()

    // Instant ping ripple
    pingScale.setValue(1)
    pingOpacity.setValue(0.35)
    Animated.parallel([
      Animated.timing(pingScale, { toValue: 1.45, duration: 300, useNativeDriver: true }),
      Animated.timing(pingOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start()

    // Quick initial depress so taps feel responsive, then slow compression for hold
    holdRingScale.setValue(1)
    holdRingOpacity.setValue(0)
    holdAnim.current = Animated.parallel([
      Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 0.93, duration: 80, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 0.86, duration: 340, useNativeDriver: true }),
      ]),
      Animated.timing(holdRingOpacity, { toValue: 0.4, duration: 160, useNativeDriver: true }),
      Animated.timing(holdRingScale, { toValue: 1.22, duration: 420, useNativeDriver: true }),
    ])
    holdAnim.current.start()
  }

  function handlePressOut() {
    if (!longPressFired.current) resetHoldAnims()
  }

  function handleLongPress() {
    longPressFired.current = true
    holdAnim.current?.stop()
    setAddSheetOpen(true)
  }

  function handleAdd(amount: number, categoryId: number | null, notes: string | null) {
    createExpenseMutation.mutate({ amount, categoryId, notes })
  }

  function handleTap() {
    if (predictionResult?.source === "routine" && (predictionResult.defaultAmount ?? 0) > 0) {
      createExpenseMutation.mutate({
        amount: predictionResult.defaultAmount,
        categoryId: predictionResult.categoryId,
      })
    } else {
      setNowMinutes(new Date().getHours() * 60 + new Date().getMinutes())
      setPickSheetOpen(true)
    }
  }

  function handleLog(categoryId: number, amount: number) {
    setPickSheetOpen(false)
    createExpenseMutation.mutate({ amount, categoryId })
  }

  function handleSaveRoutineAndLog(routine: Omit<Routine, "id">) {
    setPickSheetOpen(false)
    createRoutineMutation.mutate(routine)
  }

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
        <CategoryPill
          color={pillColor}
          label={pillLabel}
          amount={prediction.amount}
          source={prediction.source}
        />

        <View style={$tapButtonWrapper}>
          {/* Ping ripple — fires instantly on press */}
          <Animated.View
            style={[$holdRing, { opacity: pingOpacity, transform: [{ scale: pingScale }] }]}
          />
          {/* Hold ring — expands during the hold, explodes on trigger */}
          <Animated.View
            style={[$holdRing, { opacity: holdRingOpacity, transform: [{ scale: holdRingScale }] }]}
          />

          <Pressable
            onPress={handleTap}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            onLongPress={handleLongPress}
            delayLongPress={400}
            accessibilityLabel="Tap to log expense, hold to add manually"
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
        </View>

        <Text style={$hint}>tap to log · hold to add manually</Text>

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

      <AddExpenseSheet
        visible={addSheetOpen}
        categories={allCategories}
        onClose={() => setAddSheetOpen(false)}
        onAdd={handleAdd}
        onCreateCategory={(name, colorHex, icon) =>
          createCategoryMutation.mutateAsync({ name, colorHex, icon })
        }
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

const $tapButtonWrapper: ViewStyle = {
  width: 200,
  height: 200,
  alignItems: "center",
  justifyContent: "center",
}

const $tapButton: ViewStyle = {
  width: 200,
  height: 200,
  borderRadius: 100,
  alignItems: "center",
  justifyContent: "center",
}

const $holdRing: ViewStyle = {
  position: "absolute",
  width: 200,
  height: 200,
  borderRadius: 100,
  borderWidth: 1.5,
  borderColor: coral500,
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
