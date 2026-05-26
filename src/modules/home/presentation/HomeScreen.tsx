import React, { useMemo } from "react"
import {
  Dimensions,
  ScrollView,
  Text,
  TextStyle,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native"
import { useRouter } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { FLOATING_NAV_CLEARANCE } from "@/app/(tabs)/_layout"
import { loadFarmerProfile } from "@/modules/onboarding"
import {
  card,
  cardBorder,
  elevation,
  forest50,
  forest500,
  hairline,
  ink,
  ink2,
  ink3,
  ink4,
  paper2,
  paperCool,
  radii,
  spacing,
  statusBad,
  statusBadBg,
  statusGood,
  statusGoodBg,
  statusWarn,
  statusWarnBg,
} from "@/theme/tapp-tokens"
import { typography } from "@/theme/typography"

import {
  MOCK_ACTIVITIES,
  MOCK_AI_INSIGHT,
  MOCK_FARM_PLANS,
  MOCK_WEATHER,
  type Difficulty,
  type Priority,
  type TodayActivity,
} from "../infrastructure/mock-data"

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PLAN_CARD_W = 148
const DAY_ABBREVS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getWeekDays() {
  const today = new Date()
  const dayOfWeek = today.getDay()
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const monday = new Date(today)
  monday.setDate(today.getDate() + diff)

  return DAY_ABBREVS.map((abbrev, i) => {
    const date = new Date(monday)
    date.setDate(monday.getDate() + i)
    const isToday = date.toDateString() === today.toDateString()
    const isPast = !isToday && date < today
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, "0")
    const d = String(date.getDate()).padStart(2, "0")
    return { abbrev, dateNum: date.getDate(), isToday, isPast, dateStr: `${y}-${m}-${d}` }
  })
}

function getDynamicSubtitle(crops: string[]): string {
  if (crops.length === 0) return "Check your farm plan for today."
  const first = crops[0]
  return `Your ${first.charAt(0).toUpperCase() + first.slice(1)} needs attention today.`
}

function priorityColor(priority: Priority): { bg: string; text: string } {
  if (priority === "High") return { bg: statusBadBg, text: statusBad }
  if (priority === "Medium") return { bg: statusWarnBg, text: statusWarn }
  return { bg: statusGoodBg, text: statusGood }
}

function difficultyColor(difficulty: Difficulty): { bg: string; text: string } {
  if (difficulty === "Easy") return { bg: statusGoodBg, text: statusGood }
  if (difficulty === "Medium") return { bg: statusWarnBg, text: statusWarn }
  return { bg: statusBadBg, text: statusBad }
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function HomeScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const profile = loadFarmerProfile()

  const firstName = profile?.name?.split(" ")[0] ?? "Farmer"
  const firstInitial = firstName.charAt(0).toUpperCase()
  const subtitle = getDynamicSubtitle(profile?.crops ?? [])

  const weekDays = useMemo(() => getWeekDays(), [])
  const remaining = MOCK_ACTIVITIES.filter((a) => !a.done).length

  return (
    <ScrollView
      style={$root}
      contentContainerStyle={{ paddingBottom: FLOATING_NAV_CLEARANCE + spacing.s4 }}
      showsVerticalScrollIndicator={false}
    >
      {/* ── White hero card: header + week strip + weather + insight ── */}
      <View style={[$heroCard, { paddingTop: insets.top + spacing.s4 }]}>
        {/* Header */}
        <View style={$header}>
          <View style={{ flex: 1 }}>
            <Text style={$greeting}>Good morning, {firstName} 👋</Text>
            <Text style={$greetingSubtitle}>{subtitle}</Text>
          </View>
          <View style={$avatar}>
            <Text style={$avatarText}>{firstInitial}</Text>
          </View>
        </View>

        {/* Week strip */}
        <View style={$weekStrip}>
          {weekDays.map((day) => (
            <TouchableOpacity
              key={day.abbrev}
              style={$dayItem}
              onPress={() =>
                router.push({ pathname: "/(tabs)/plan", params: { date: day.dateStr } })
              }
              activeOpacity={0.7}
            >
              <Text style={$dayLabel}>{day.abbrev}</Text>
              <View
                style={[$dayCircle, day.isToday && $dayCircleToday, day.isPast && $dayCirclePast]}
              >
                {day.isPast ? (
                  <Ionicons name="checkmark" size={14} color={forest500} />
                ) : (
                  <Text style={day.isToday ? $dayNumToday : $dayNum}>{day.dateNum}</Text>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Weather card */}
        <View style={$weatherCard}>
          <View style={$weatherIconCircle}>
            <Text style={$weatherIconEmoji}>{MOCK_WEATHER.icon}</Text>
          </View>
          <View style={$weatherInfo}>
            <Text style={$weatherTitle}>
              {MOCK_WEATHER.city} · {MOCK_WEATHER.condition}
            </Text>
            <Text style={$weatherDesc}>{MOCK_WEATHER.description}</Text>
          </View>
          <View style={$weatherTempBlock}>
            <Text style={$weatherTemp}>{MOCK_WEATHER.temperature}°</Text>
            <Text style={$weatherTempLabel}>Today</Text>
          </View>
        </View>
      </View>

      {/* ── Lower section: plans + activities on paper bg ── */}
      <View style={$lowerSection}>
        {/* AI Insight card */}
        <View style={$insightCard}>
          <View style={$insightIconWrap}>
            <Text style={$insightIconEmoji}>🤖</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={$insightLabel}>AI INSIGHT</Text>
            <Text style={$insightText}>{MOCK_AI_INSIGHT.text}</Text>
          </View>
        </View>

        {/* Farm Plan Templates */}
        <View style={$sectionHeaderRow}>
          <Text style={$sectionTitle}>Farm Plan Templates</Text>
          <TouchableOpacity hitSlop={8}>
            <Text style={$seeAll}>See all</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Horizontal scroll — full-bleed with content padding */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={$plansScroll}
      >
        {MOCK_FARM_PLANS.map((plan) => {
          const diff = difficultyColor(plan.difficulty)
          return (
            <TouchableOpacity
              key={plan.id}
              style={[$planCard, { backgroundColor: plan.bgColor }]}
              activeOpacity={0.8}
            >
              <Text style={$planEmoji}>{plan.emoji}</Text>
              <Text style={$planName}>{plan.name}</Text>
              <View style={$planTags}>
                <View style={$planDaysTag}>
                  <Text style={$planDaysText}>⏱ {plan.days} Days</Text>
                </View>
                <View style={[$planDiffTag, { backgroundColor: diff.bg }]}>
                  <Text style={[$planDiffText, { color: diff.text }]}>{plan.difficulty}</Text>
                </View>
              </View>
            </TouchableOpacity>
          )
        })}
      </ScrollView>

      {/* Today's Activities */}
      <View style={[$lowerSection, { marginTop: spacing.s5 }]}>
        <View style={$sectionHeaderRow}>
          <Text style={$sectionTitle}>Today's Activities</Text>
          <View style={$remainingBadge}>
            <Text style={$remainingText}>{remaining} remaining</Text>
          </View>
        </View>

        {MOCK_ACTIVITIES.map((activity) => (
          <ActivityCard key={activity.id} activity={activity} />
        ))}
      </View>
    </ScrollView>
  )
}

// ---------------------------------------------------------------------------
// ActivityCard
// ---------------------------------------------------------------------------

function ActivityCard({ activity }: { activity: TodayActivity }) {
  const p = priorityColor(activity.priority)

  return (
    <TouchableOpacity style={$activityCard} activeOpacity={0.7}>
      <View style={$activityIconCircle}>
        <Text style={$activityIcon}>{activity.icon}</Text>
      </View>
      <View style={$activityBody}>
        <View style={$activityTitleRow}>
          <Text style={$activityName}>{activity.name}</Text>
          <View style={[$priorityBadge, { backgroundColor: p.bg }]}>
            <Text style={[$priorityText, { color: p.text }]}>{activity.priority}</Text>
          </View>
        </View>
        <Text style={$activityDuration}>⏱ {activity.durationMinutes} min</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={ink4} />
    </TouchableOpacity>
  )
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const $root: ViewStyle = {
  flex: 1,
  backgroundColor: paperCool,
}

// Hero card — white, rounded bottom corners
const $heroCard: ViewStyle = {
  backgroundColor: card,
  borderBottomLeftRadius: radii.xl,
  borderBottomRightRadius: radii.xl,
  paddingHorizontal: spacing.s5,
  paddingBottom: spacing.s5,
  marginBottom: spacing.s5,
  ...elevation.card,
}

// Header
const $header: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  marginBottom: spacing.s4,
}

const $greeting: TextStyle = {
  fontFamily: typography.primary.bold,
  fontSize: 22,
  color: ink,
  lineHeight: 28,
}

const $greetingSubtitle: TextStyle = {
  fontFamily: typography.primary.normal,
  fontSize: 13,
  color: ink3,
  marginTop: 2,
}

const $avatar: ViewStyle = {
  width: 40,
  height: 40,
  borderRadius: 20,
  backgroundColor: forest500,
  alignItems: "center",
  justifyContent: "center",
  marginLeft: spacing.s4,
}

const $avatarText: TextStyle = {
  fontFamily: typography.primary.bold,
  fontSize: 16,
  color: "#FFFFFF",
}

// Week strip
const $weekStrip: ViewStyle = {
  flexDirection: "row",
  marginBottom: spacing.s4,
  gap: 4,
}

const $dayItem: ViewStyle = {
  flex: 1,
  alignItems: "center",
  gap: spacing.s2,
}

const $dayLabel: TextStyle = {
  fontFamily: typography.primary.normal,
  fontSize: 11,
  color: ink3,
}

const $dayCircle: ViewStyle = {
  width: 32,
  height: 32,
  borderRadius: 16,
  borderWidth: 1.5,
  borderColor: hairline,
  alignItems: "center",
  justifyContent: "center",
}

const $dayCircleToday: ViewStyle = {
  backgroundColor: forest500,
  borderColor: forest500,
}

const $dayCirclePast: ViewStyle = {
  borderColor: forest500,
  backgroundColor: forest50,
}

const $dayNum: TextStyle = {
  fontFamily: typography.primary.medium,
  fontSize: 12,
  color: ink3,
}

const $dayNumToday: TextStyle = {
  fontFamily: typography.primary.bold,
  fontSize: 12,
  color: "#FFFFFF",
}

// Weather card (inside hero card)
const $weatherCard: ViewStyle = {
  backgroundColor: "#FDF3E7",
  borderRadius: radii.lg,
  flexDirection: "row",
  alignItems: "center",
  padding: spacing.s4,
  marginBottom: spacing.s3,
}

const $weatherIconCircle: ViewStyle = {
  width: 52,
  height: 52,
  borderRadius: 26,
  backgroundColor: "#F5E0C3",
  alignItems: "center",
  justifyContent: "center",
  marginRight: spacing.s3,
}

const $weatherIconEmoji: TextStyle = {
  fontSize: 26,
}

const $weatherInfo: ViewStyle = {
  flex: 1,
}

const $weatherTitle: TextStyle = {
  fontFamily: typography.primary.bold,
  fontSize: 14,
  color: ink,
  marginBottom: 2,
}

const $weatherDesc: TextStyle = {
  fontFamily: typography.primary.normal,
  fontSize: 12,
  color: ink2,
  lineHeight: 17,
}

const $weatherTempBlock: ViewStyle = {
  alignItems: "flex-end",
  marginLeft: spacing.s3,
}

const $weatherTemp: TextStyle = {
  fontFamily: typography.mono.normal,
  fontSize: 26,
  color: ink,
  lineHeight: 30,
}

const $weatherTempLabel: TextStyle = {
  fontFamily: typography.primary.normal,
  fontSize: 11,
  color: ink3,
}

// AI Insight card (inside hero card, on slightly off-white bg)
const $insightCard: ViewStyle = {
  backgroundColor: paper2,
  borderRadius: radii.lg,
  borderWidth: 1,
  borderColor: cardBorder,
  flexDirection: "row",
  alignItems: "flex-start",
  padding: spacing.s4,
  marginBottom: spacing.s4,
}

const $insightIconWrap: ViewStyle = {
  width: 34,
  height: 34,
  borderRadius: 8,
  backgroundColor: card,
  alignItems: "center",
  justifyContent: "center",
  marginRight: spacing.s3,
  marginTop: 2,
}

const $insightIconEmoji: TextStyle = {
  fontSize: 17,
}

const $insightLabel: TextStyle = {
  fontFamily: typography.primary.semiBold,
  fontSize: 10,
  color: forest500,
  letterSpacing: 0.8,
  textTransform: "uppercase",
  marginBottom: spacing.s1,
}

const $insightText: TextStyle = {
  fontFamily: typography.primary.normal,
  fontSize: 13,
  color: ink2,
  lineHeight: 19,
}

// Lower section (paper bg, horizontal padding)
const $lowerSection: ViewStyle = {
  paddingHorizontal: spacing.s5,
}

const $sectionHeaderRow: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: spacing.s3,
}

const $sectionTitle: TextStyle = {
  fontFamily: typography.primary.bold,
  fontSize: 16,
  color: ink,
}

const $seeAll: TextStyle = {
  fontFamily: typography.primary.medium,
  fontSize: 13,
  color: forest500,
}

// Plans horizontal scroll
const $plansScroll: ViewStyle = {
  paddingHorizontal: spacing.s5,
  gap: spacing.s3,
  paddingBottom: 4,
}

const $planCard: ViewStyle = {
  width: PLAN_CARD_W,
  borderRadius: radii.xl,
  borderWidth: 1,
  borderColor: hairline,
  padding: spacing.s4,
  ...elevation.card,
}

const $planEmoji: TextStyle = {
  fontSize: 36,
  marginBottom: spacing.s3,
}

const $planName: TextStyle = {
  fontFamily: typography.primary.bold,
  fontSize: 13,
  color: ink,
  lineHeight: 18,
  marginBottom: spacing.s3,
}

const $planTags: ViewStyle = {
  flexDirection: "row",
  flexWrap: "wrap",
  gap: spacing.s1,
}

const $planDaysTag: ViewStyle = {
  backgroundColor: hairline,
  borderRadius: radii.pill,
  paddingHorizontal: spacing.s2,
  paddingVertical: 3,
}

const $planDaysText: TextStyle = {
  fontFamily: typography.primary.normal,
  fontSize: 11,
  color: ink3,
}

const $planDiffTag: ViewStyle = {
  borderRadius: radii.pill,
  paddingHorizontal: spacing.s2,
  paddingVertical: 3,
}

const $planDiffText: TextStyle = {
  fontFamily: typography.primary.medium,
  fontSize: 11,
}

// Remaining badge
const $remainingBadge: ViewStyle = {
  backgroundColor: forest50,
  borderRadius: radii.pill,
  paddingHorizontal: spacing.s3,
  paddingVertical: 3,
}

const $remainingText: TextStyle = {
  fontFamily: typography.primary.medium,
  fontSize: 12,
  color: forest500,
}

// Individual activity card
const $activityCard: ViewStyle = {
  backgroundColor: card,
  borderRadius: radii.xl,
  borderWidth: 1,
  borderColor: cardBorder,
  flexDirection: "row",
  alignItems: "center",
  paddingHorizontal: spacing.s4,
  paddingVertical: spacing.s4,
  marginBottom: spacing.s3,
  ...elevation.card,
}

const $activityIconCircle: ViewStyle = {
  width: 38,
  height: 38,
  borderRadius: 19,
  backgroundColor: "#E8F4FC",
  alignItems: "center",
  justifyContent: "center",
  marginRight: spacing.s3,
}

const $activityIcon: TextStyle = {
  fontSize: 18,
}

const $activityBody: ViewStyle = {
  flex: 1,
}

const $activityTitleRow: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.s2,
}

const $activityName: TextStyle = {
  fontFamily: typography.primary.medium,
  fontSize: 14,
  color: ink,
}

const $priorityBadge: ViewStyle = {
  borderRadius: radii.pill,
  paddingHorizontal: spacing.s2,
  paddingVertical: 2,
}

const $priorityText: TextStyle = {
  fontFamily: typography.primary.medium,
  fontSize: 11,
}

const $activityDuration: TextStyle = {
  fontFamily: typography.primary.normal,
  fontSize: 12,
  color: ink3,
  marginTop: 2,
}
