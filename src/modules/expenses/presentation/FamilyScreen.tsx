import { useCallback, useEffect, useState } from "react"
import { Pressable, ScrollView, View, ViewStyle, TextStyle } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons"

import { Text } from "@/components/Text"
import { container } from "@/bootstrap/container"
import { loadString, saveString } from "@/utils/storage"
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
import { FamilyNameSheet } from "./family/FamilyNameSheet"
import { InviteSheet } from "./family/InviteSheet"

// ---- Constants -------------------------------------------------------------

const FAMILY_NAME_KEY = "family.name"

const DUMMY_MEMBERS = [
  {
    id: "amina",
    name: "Amina",
    color: catClay,
    total: 4820,
    categories: [
      { name: "Groceries", color: catMango, spent: 2100, pct: 100 },
      { name: "Transport", color: catFern, spent: 1400, pct: 67 },
      { name: "Utilities", color: catLake, spent: 820, pct: 39 },
      { name: "Coffee", color: catOrchid, spent: 500, pct: 24 },
    ],
  },
  {
    id: "daniel",
    name: "Daniel",
    color: catFern,
    total: 2940,
    categories: [
      { name: "Transport", color: catFern, spent: 1600, pct: 100 },
      { name: "Lunch", color: catClay, spent: 940, pct: 59 },
      { name: "Airtime", color: catLake, spent: 400, pct: 25 },
    ],
  },
]

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

function heatColors(pct: number): [string, string] {
  if (pct >= 90) return [heatOver, heatOverBg]
  if (pct >= 70) return [heatWarn, heatWarnBg]
  return [heatGood, heatGoodBg]
}

function familyCodeFromName(name: string): string {
  const clean = name.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 6)
  return `TAPP-${clean || "FAMILY"}`
}

// ---- Aggregation -----------------------------------------------------------

type CategoryTotal = {
  category: Category
  spent: number
  pct: number
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

// ---- Inline category breakdown (expanded member) ---------------------------

type MemberCategory = { name: string; color: string; spent: number; pct: number }

function MemberCategoryBreakdown({ categories }: { categories: MemberCategory[] }) {
  return (
    <View style={$breakdown}>
      {categories.map((cat, i) => {
        const [barFill] = heatColors(cat.pct)
        return (
          <View key={cat.name} style={[i > 0 && $breakdownRowBorder]}>
            <View style={$breakdownRow}>
              <View style={[$catDot, { backgroundColor: cat.color }]} />
              <Text style={$breakdownName}>{cat.name}</Text>
              <HeatBar pct={cat.pct} color={barFill} />
              <Text style={$breakdownAmount}>{"KSh " + formatAmount(cat.spent)}</Text>
            </View>
          </View>
        )
      })}
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
  const [familyName, setFamilyName] = useState(
    () => loadString(FAMILY_NAME_KEY) ?? "Your household",
  )
  const [expandedMember, setExpandedMember] = useState<string | null>(null)
  const [nameSheetOpen, setNameSheetOpen] = useState(false)
  const [inviteSheetOpen, setInviteSheetOpen] = useState(false)

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

  function handleSaveName(name: string) {
    saveString(FAMILY_NAME_KEY, name)
    setFamilyName(name)
  }

  function toggleMember(id: string) {
    setExpandedMember((prev) => (prev === id ? null : id))
  }

  const youTotal = events.reduce((s, e) => s + (e.amount ?? 0), 0)
  const youCategories = aggregateByCategory(events, categoryMap)
  const youMaxSpent = youCategories[0]?.spent ?? 1
  const youCategoryBreakdown: MemberCategory[] = youCategories.map((c) => ({
    name: c.category.name ?? "–",
    color: resolveCategoryColor(c.category.name, c.category.color_hex),
    spent: c.spent,
    pct: Math.round((c.spent / youMaxSpent) * 100),
  }))

  const allMembers = [
    {
      id: "you",
      name: "You",
      color: catClay,
      total: youTotal,
      categories: youCategoryBreakdown,
    },
    ...DUMMY_MEMBERS,
  ]

  const grandTotal = allMembers.reduce((s, m) => s + m.total, 0)
  const maxMemberSpend = Math.max(...allMembers.map((m) => m.total), 1)

  const familyCode = familyCodeFromName(familyName)

  return (
    <View style={[$screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={$header}>
        <View>
          <Text style={$eyebrow}>Family</Text>
          <Text style={$familyName}>{familyName}</Text>
          <View style={$totalRow}>
            <Text style={$currencyLabel}>KSh</Text>
            <Text style={$totalAmount}>{formatAmount(grandTotal)}</Text>
          </View>
          <Text style={$subHeader}>
            {"This week · " + allMembers.length + " members · local + demo"}
          </Text>
        </View>
        <Pressable
          style={$settingsBtn}
          onPress={() => setNameSheetOpen(true)}
          accessibilityLabel="Family settings"
          hitSlop={8}
        >
          <Ionicons name="settings-outline" size={20} color={ink3} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[$scrollContent, { paddingBottom: insets.bottom + 88 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* By member */}
        <View>
          <SectionLabel label="By member" />
          <View style={$card}>
            {allMembers.map((member, i) => {
              const isExpanded = expandedMember === member.id
              const pct = Math.round((member.total / maxMemberSpend) * 100)
              const [barFill] = heatColors(pct)
              return (
                <View key={member.id} style={[i > 0 && $rowBorder]}>
                  <Pressable
                    style={$row}
                    onPress={() => toggleMember(member.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`${member.name} spending details`}
                  >
                    <MemberDisc initial={member.name[0]} color={member.color} />
                    <View style={$rowMid}>
                      <Text style={$rowName}>{member.name}</Text>
                      <HeatBar pct={pct} color={barFill} />
                    </View>
                    <Text style={$rowAmount}>{"KSh " + formatAmount(member.total)}</Text>
                    <Ionicons
                      name={isExpanded ? "chevron-up" : "chevron-down"}
                      size={14}
                      color={ink4}
                    />
                  </Pressable>
                  {isExpanded && member.categories.length > 0 && (
                    <MemberCategoryBreakdown categories={member.categories} />
                  )}
                  {isExpanded && member.categories.length === 0 && (
                    <View style={$breakdownEmpty}>
                      <Text style={$breakdownEmptyText}>No spending this week.</Text>
                    </View>
                  )}
                </View>
              )
            })}
          </View>
        </View>

        {/* Invite CTA */}
        <Pressable style={$inviteRow} onPress={() => setInviteSheetOpen(true)}>
          <View style={$inviteIcon}>
            <Ionicons name="person-add-outline" size={18} color={coral500} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={$inviteTitle}>Invite a family member</Text>
            <Text style={$inviteSub}>Share your family code: {familyCode}</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={ink4} />
        </Pressable>

        {/* By category (aggregated across all members) */}
        <View>
          <SectionLabel label="By category (all members)" />
          {youCategories.length === 0 ? (
            <View style={$emptyWrap}>
              <MaterialCommunityIcons name="chart-bar" size={36} color={ink4} />
              <Text style={$emptyText}>No spending data yet.</Text>
              <Text style={$emptySubText}>Tap on the Tap tab to log your first expense.</Text>
            </View>
          ) : (
            <View style={$card}>
              {youCategories.map((item, i) => {
                const color = resolveCategoryColor(item.category.name, item.category.color_hex)
                const [barFill] = heatColors(item.pct)
                return (
                  <View key={String(item.category.id ?? i)} style={[i > 0 && $rowBorder]}>
                    <View style={[$row, { paddingVertical: spacing.s4 }]}>
                      <View style={$catBlock}>
                        <View style={$catNameRow}>
                          <View style={$catDotWrap}>
                            <View style={[$catDot, { backgroundColor: color }]} />
                            <Text style={$catName}>{item.category.name}</Text>
                          </View>
                          <Text style={[$catPct, { color: barFill }]}>
                            {item.pct}%
                          </Text>
                        </View>
                        <HeatBar pct={item.pct} color={barFill} />
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

      <FamilyNameSheet
        visible={nameSheetOpen}
        currentName={familyName}
        onClose={() => setNameSheetOpen(false)}
        onSave={handleSaveName}
      />

      <InviteSheet
        visible={inviteSheetOpen}
        familyCode={familyCode}
        onClose={() => setInviteSheetOpen(false)}
      />
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
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "flex-start",
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

const $settingsBtn: ViewStyle = {
  width: 36, height: 36, borderRadius: 18,
  backgroundColor: paper2,
  alignItems: "center", justifyContent: "center",
  marginTop: spacing.s2,
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

// ---- Member category breakdown ---------------------------------------------

const $breakdown: ViewStyle = {
  paddingHorizontal: spacing.s4,
  paddingBottom: spacing.s3,
  backgroundColor: paper,
}

const $breakdownRow: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.s3,
  paddingVertical: spacing.s2,
}

const $breakdownRowBorder: ViewStyle = {
  borderTopWidth: 1,
  borderTopColor: hairline,
}

const $breakdownName: TextStyle = {
  fontSize: 13, color: ink2,
  fontFamily: typography.primary.normal,
  width: 80,
}

const $breakdownAmount: TextStyle = {
  fontSize: 12, color: ink3,
  fontFamily: typography.mono.normal,
  marginLeft: spacing.s2,
}

const $breakdownEmpty: ViewStyle = {
  paddingHorizontal: spacing.s4,
  paddingBottom: spacing.s3,
}

const $breakdownEmptyText: TextStyle = {
  fontSize: 13, color: ink4,
  fontFamily: typography.primary.normal,
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
