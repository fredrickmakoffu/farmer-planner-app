import { useCallback, useEffect, useState } from "react"
import { Pressable, ScrollView, View, ViewStyle, TextStyle } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons"

import { Text } from "@/components/Text"
import { container } from "@/bootstrap/container"
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
  card,
  hairline,
  heatGood, heatGoodBg,
  heatWarn, heatWarnBg,
  heatOver, heatOverBg,
  catClay, catFern, catLake, catMango, catOrchid, catStone,
  spacing,
  radii,
  elevation,
} from "@/theme/tapp-tokens"
import { typography } from "@/theme/typography"

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

/** Returns heat color tuple [fill, background] based on % of budget consumed. */
function heatColors(pct: number): [string, string] {
  if (pct >= 90) return [heatOver, heatOverBg]
  if (pct >= 70) return [heatWarn, heatWarnBg]
  return [heatGood, heatGoodBg]
}

// ---- Aggregation -----------------------------------------------------------

type CategoryTotal = {
  category: Category
  spent: number
  pct: number // % of a soft reference (largest category = 100 in this view)
}

function aggregateByCategory(
  events: ExpenseEvent[],
  categoryMap: Map<number, Category>,
): CategoryTotal[] {
  const totals = new Map<number, number>()
  for (const ev of events) {
    if (ev.category_id == null) continue
    const id = ev.category_id as number
    totals.set(id, (totals.get(id) ?? 0) + (ev.amount ?? 0))
  }

  const entries: CategoryTotal[] = []
  for (const [id, spent] of totals.entries()) {
    const cat = categoryMap.get(id)
    if (!cat) continue
    entries.push({ category: cat, spent, pct: 0 })
  }
  entries.sort((a, b) => b.spent - a.spent)

  const max = entries[0]?.spent ?? 1
  for (const e of entries) {
    e.pct = Math.round((e.spent / max) * 100)
  }

  return entries
}

// ---- HeatBar ---------------------------------------------------------------

function HeatBar({ pct, color }: { pct: number; color: string }) {
  const clampedPct = Math.min(pct, 100)
  return (
    <View style={$bar}>
      <View style={[$barFill, { width: `${clampedPct}%` as any, backgroundColor: color }]} />
    </View>
  )
}

// ---- Member avatar disc (initial) ------------------------------------------

function MemberDisc({ initial, color }: { initial: string; color: string }) {
  return (
    <View style={[$memberDisc, { backgroundColor: color }]}>
      <Text style={$memberDiscText}>{initial.toUpperCase()}</Text>
    </View>
  )
}

// ---- Section header --------------------------------------------------------

function SectionLabel({ label }: { label: string }) {
  return <Text style={$sectionLabel}>{label}</Text>
}

// ---- Main Screen -----------------------------------------------------------

export function FamilyScreen() {
  const insets = useSafeAreaInsets()

  const [events, setEvents] = useState<ExpenseEvent[]>([])
  const [categoryMap, setCategoryMap] = useState<Map<number, Category>>(new Map())
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    const expenseRepo = container.resolve<ExpenseEventRepository>("expenseEventRepository")
    const categoryRepo = container.resolve<CategoryRepository>("categoryRepository")
    if (!expenseRepo || !categoryRepo) { setLoading(false); return }

    const [allEvents, allCats] = await Promise.all([
      expenseRepo.findAll(),
      categoryRepo.findAll(),
    ])

    const map = new Map<number, Category>()
    for (const cat of allCats) {
      if (cat.id != null) map.set(cat.id, cat)
    }

    setEvents(allEvents)
    setCategoryMap(map)
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const weekTotal = events.reduce((s, e) => s + (e.amount ?? 0), 0)
  const categoryTotals = aggregateByCategory(events, categoryMap)

  return (
    <View style={[$screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={$header}>
        <Text style={$eyebrow}>Family</Text>
        <Text style={$familyName}>Your household</Text>
        <View style={$totalRow}>
          <Text style={$currencyLabel}>KSh</Text>
          <Text style={$totalAmount}>{formatAmount(weekTotal)}</Text>
        </View>
        <Text style={$subHeader}>This week · 1 member · local only</Text>
      </View>

      <ScrollView
        contentContainerStyle={[$scrollContent, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* By member */}
        <View>
          <SectionLabel label="By member" />
          <View style={$card}>
            {/* Single "you" row — multi-member comes with backend sync (Phase 2) */}
            <View style={$row}>
              <MemberDisc initial="Y" color={catClay} />
              <View style={$rowMid}>
                <Text style={$rowName}>You</Text>
                <HeatBar pct={100} color={catClay} />
              </View>
              <Text style={$rowAmount}>{"KSh " + formatAmount(weekTotal)}</Text>
            </View>
          </View>
        </View>

        {/* Invite CTA */}
        <Pressable style={$inviteRow} onPress={() => {}}>
          <View style={$inviteIcon}>
            <Ionicons name="person-add-outline" size={18} color={coral500} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={$inviteTitle}>Invite a family member</Text>
            <Text style={$inviteSub}>Multi-device family sync — coming soon</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={ink4} />
        </Pressable>

        {/* By category */}
        <View>
          <SectionLabel label="By category" />

          {categoryTotals.length === 0 ? (
            <View style={$emptyWrap}>
              <MaterialCommunityIcons name="chart-bar" size={36} color={ink4} />
              <Text style={$emptyText}>No spending data yet.</Text>
              <Text style={$emptySubText}>Tap on the Tap tab to log your first expense.</Text>
            </View>
          ) : (
            <View style={$card}>
              {categoryTotals.map((item, i) => {
                const color = resolveCategoryColor(item.category.name, item.category.color_hex)
                const [barFill] = heatColors(item.pct)
                return (
                  <View key={String(item.category.id ?? i)} style={[i > 0 && $rowBorder]}>
                    <View style={[$row, { paddingVertical: spacing.s4 }]}>
                      <View style={$catBlock}>
                        {/* Name + % */}
                        <View style={$catNameRow}>
                          <View style={$catDotWrap}>
                            <View style={[$catDot, { backgroundColor: color }]} />
                            <Text style={$catName}>{item.category.name}</Text>
                          </View>
                          <Text style={[$catPct, { color: barFill }]}>
                            {item.pct}%
                          </Text>
                        </View>

                        {/* Heat bar */}
                        <HeatBar pct={item.pct} color={barFill} />

                        {/* Amount label */}
                        <Text style={$catAmountLabel}>
                          <Text style={$catAmountMono}>{"KSh " + formatAmount(item.spent)}</Text>
                          <Text style={$catAmountOf}>{" this week"}</Text>
                        </Text>
                      </View>
                    </View>
                  </View>
                )
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  )
}

export default FamilyScreen

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

const $familyName: TextStyle = {
  fontSize: 34, lineHeight: 38, letterSpacing: -0.5,
  color: ink, fontFamily: typography.primary.bold,
  marginTop: 4, marginBottom: 6,
}

const $totalRow: ViewStyle = {
  flexDirection: "row",
  alignItems: "baseline",
  gap: 5,
  marginTop: 4,
}

const $currencyLabel: TextStyle = {
  fontSize: 15, color: ink3,
  fontFamily: typography.mono.normal,
}

const $totalAmount: TextStyle = {
  fontSize: 28, letterSpacing: -0.5,
  color: ink, fontFamily: typography.mono.normal,
}

const $subHeader: TextStyle = {
  fontSize: 13, color: ink3,
  fontFamily: typography.primary.normal,
  marginTop: 3,
}

const $scrollContent = {
  paddingHorizontal: spacing.s5,
  paddingTop: spacing.s2,
  gap: spacing.s4,
}

const $sectionLabel: TextStyle = {
  fontSize: 11, letterSpacing: 1.4, textTransform: "uppercase",
  color: ink3, fontFamily: typography.primary.normal,
  marginBottom: spacing.s2,
}

// ---- Card ------------------------------------------------------------------

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
}

const $rowBorder: ViewStyle = {
  borderTopWidth: 1,
  borderTopColor: hairline,
}

const $rowMid: ViewStyle = { flex: 1, gap: 6 }

const $rowName: TextStyle = {
  fontSize: 15, color: ink,
  fontFamily: typography.primary.normal,
}

const $rowAmount: TextStyle = {
  fontSize: 14, color: ink,
  fontFamily: typography.mono.normal,
}

// ---- Member disc -----------------------------------------------------------

const $memberDisc: ViewStyle = {
  width: 32, height: 32, borderRadius: 16,
  alignItems: "center", justifyContent: "center",
  flexShrink: 0,
}

const $memberDiscText: TextStyle = {
  fontSize: 14, color: "white",
  fontFamily: typography.primary.semiBold,
}

// ---- Heat bar --------------------------------------------------------------

const $bar: ViewStyle = {
  height: 6, borderRadius: radii.pill,
  backgroundColor: paper2,
  overflow: "hidden",
}

const $barFill: ViewStyle = {
  height: "100%" as any,
  borderRadius: radii.pill,
}

// ---- Category rows ---------------------------------------------------------

const $catBlock: ViewStyle = { flex: 1, gap: 6 }

const $catNameRow: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "baseline",
}

const $catDotWrap: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  gap: 7,
}

const $catDot: ViewStyle = {
  width: 8, height: 8, borderRadius: 4,
}

const $catName: TextStyle = {
  fontSize: 15, color: ink,
  fontFamily: typography.primary.normal,
}

const $catPct: TextStyle = {
  fontSize: 14, fontFamily: typography.mono.normal,
}

const $catAmountLabel: TextStyle = {
  fontSize: 12, color: ink3,
  fontFamily: typography.primary.normal,
  marginTop: 2,
}

const $catAmountMono: TextStyle = {
  fontFamily: typography.mono.normal,
  fontSize: 12, color: ink3,
}

const $catAmountOf: TextStyle = {
  fontFamily: typography.primary.normal,
  fontSize: 12, color: ink3,
}

// ---- Invite row ------------------------------------------------------------

const $inviteRow: ViewStyle = {
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
}

const $inviteIcon: ViewStyle = {
  width: 36, height: 36, borderRadius: 18,
  backgroundColor: coral500 + "18",
  alignItems: "center", justifyContent: "center",
}

const $inviteTitle: TextStyle = {
  fontSize: 15, color: ink,
  fontFamily: typography.primary.normal,
}

const $inviteSub: TextStyle = {
  fontSize: 12, color: ink4,
  fontFamily: typography.primary.normal,
  marginTop: 1,
}

// ---- Empty state -----------------------------------------------------------

const $emptyWrap: ViewStyle = {
  backgroundColor: card,
  borderRadius: radii.lg,
  borderWidth: 1,
  borderColor: hairline,
  alignItems: "center",
  paddingVertical: spacing.s12,
  gap: spacing.s2,
}

const $emptyText: TextStyle = {
  fontSize: 15, color: ink3,
  fontFamily: typography.primary.semiBold,
  marginTop: spacing.s2,
}

const $emptySubText: TextStyle = {
  fontSize: 13, color: ink4,
  fontFamily: typography.primary.normal,
  textAlign: "center",
  paddingHorizontal: spacing.s8,
}
