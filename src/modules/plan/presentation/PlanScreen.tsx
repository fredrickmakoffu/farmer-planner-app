import React, { useEffect, useState } from "react"
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TextStyle,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native"
import { useLocalSearchParams } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import {
  FLOATING_NAV_BOTTOM_GAP,
  FLOATING_NAV_HEIGHT,
} from "@/app/(tabs)/_layout"
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
  paper,
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

import type { PlanActivity, Priority } from "../domain/entities/activity"
import { getActivitiesForDay } from "../infrastructure/activities-service"
import { MOCK_BOT_GREETING, MOCK_CHAT_SUGGESTIONS } from "../infrastructure/mock-data"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTodayStr(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function parseDateStr(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number)
  return new Date(y, m - 1, d)
}

function getDateLabel(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  })
}

function priorityColor(priority: Priority): { bg: string; text: string } {
  if (priority === "High") return { bg: statusBadBg, text: statusBad }
  if (priority === "Medium") return { bg: statusWarnBg, text: statusWarn }
  return { bg: statusGoodBg, text: statusGood }
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function PlanScreen() {
  const insets = useSafeAreaInsets()
  const { date: dateParam } = useLocalSearchParams<{ date?: string }>()

  const dateStr = typeof dateParam === "string" ? dateParam : formatTodayStr()
  const dateLabel = getDateLabel(parseDateStr(dateStr))

  const [loadStatus, setLoadStatus] = useState<"loading" | "ready">("loading")
  const [activities, setActivities] = useState<PlanActivity[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [chatOpen, setChatOpen] = useState(false)
  const [chatInput, setChatInput] = useState("")

  useEffect(() => {
    let cancelled = false
    setLoadStatus("loading")
    setExpandedId(null)
    setChatOpen(false)

    getActivitiesForDay(dateStr).then((acts) => {
      if (!cancelled) {
        setActivities(acts)
        setLoadStatus("ready")
      }
    })

    return () => {
      cancelled = true
    }
  }, [dateStr])

  const doneCount = activities.filter((a) => a.done).length
  const totalCount = activities.length
  const percentage = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0

  const aiPanelBottom = insets.bottom + FLOATING_NAV_BOTTOM_GAP + FLOATING_NAV_HEIGHT
  const collapsedPanelHeight = 56
  const expandedPanelHeight = 260
  const scrollPaddingBottom =
    aiPanelBottom + (chatOpen ? expandedPanelHeight : collapsedPanelHeight) + spacing.s4

  function toggleDone(id: string) {
    setActivities((prev) => prev.map((a) => (a.id === id ? { ...a, done: !a.done } : a)))
  }

  function toggleExpanded(id: string) {
    setExpandedId((prev) => (prev === id ? null : id))
  }

  return (
    <KeyboardAvoidingView
      style={$root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={{ flex: 1, backgroundColor: paper }}
        contentContainerStyle={[
          $scrollContent,
          { paddingTop: insets.top + spacing.s5, paddingBottom: scrollPaddingBottom },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <Text style={$planLabel}>PLAN ON A PAGE</Text>
        <Text style={$dateHeading}>{dateLabel}</Text>

        {/* ── Daily Progress card ── */}
        <View style={$progressCard}>
          <View style={$progressCardHeader}>
            <Text style={$progressCardTitle}>Daily Progress</Text>
            {loadStatus === "ready" ? (
              <Text style={$progressDoneText}>
                {doneCount}/{totalCount} done
              </Text>
            ) : (
              <ActivityIndicator size="small" color={forest500} />
            )}
          </View>
          <View style={$progressBarBg}>
            <View style={[$progressBarFill, { width: `${percentage}%` as any }]} />
          </View>
          <Text style={$progressPercent}>{percentage}% complete</Text>
        </View>

        {/* ── Activities ── */}
        <Text style={$sectionTitle}>Today's Activities</Text>

        {loadStatus === "loading" ? (
          <View style={$loadingContainer}>
            <ActivityIndicator size="large" color={forest500} />
            <Text style={$loadingText}>Loading activities…</Text>
          </View>
        ) : (
          activities.map((activity) => (
            <ActivityRow
              key={activity.id}
              activity={activity}
              isExpanded={expandedId === activity.id}
              onToggleDone={() => toggleDone(activity.id)}
              onToggleExpand={() => toggleExpanded(activity.id)}
            />
          ))
        )}
      </ScrollView>

      {/* ── AI Farm Assistant panel (fixed above tab bar) ── */}
      <View style={[$aiPanel, { bottom: aiPanelBottom }, chatOpen && $aiPanelExpanded]}>
        <TouchableOpacity
          style={$aiPanelHeader}
          onPress={() => setChatOpen((v) => !v)}
          activeOpacity={0.8}
        >
          <View style={$aiAvatarCircle}>
            <Text style={$aiAvatarEmoji}>🤖</Text>
          </View>
          <Text style={$aiPanelTitle}>Al Farm Assistant</Text>
          <View style={$aiDot} />
          <Ionicons
            name={chatOpen ? "chevron-down" : "chevron-up"}
            size={18}
            color={ink3}
            style={{ marginLeft: spacing.s2 }}
          />
        </TouchableOpacity>

        {chatOpen && (
          <>
            <View style={$chatMessageBubble}>
              <Text style={$chatMessageText}>{MOCK_BOT_GREETING}</Text>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={$chipsScroll}
            >
              {MOCK_CHAT_SUGGESTIONS.map((chip) => (
                <TouchableOpacity
                  key={chip}
                  style={$chip}
                  activeOpacity={0.7}
                  onPress={() => setChatInput(chip)}
                >
                  <Text style={$chipText}>{chip}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={$chatInputRow}>
              <TextInput
                style={$chatInput}
                value={chatInput}
                onChangeText={setChatInput}
                placeholder="Ask about your farm..."
                placeholderTextColor={ink4}
                returnKeyType="send"
              />
              <TouchableOpacity style={$micBtn} hitSlop={8}>
                <Ionicons name="mic-outline" size={20} color={ink3} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[$sendBtn, !chatInput.trim() && $sendBtnDisabled]}
                activeOpacity={0.85}
              >
                <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  )
}

// ---------------------------------------------------------------------------
// ActivityRow
// ---------------------------------------------------------------------------

function ActivityRow({
  activity,
  isExpanded,
  onToggleDone,
  onToggleExpand,
}: {
  activity: PlanActivity
  isExpanded: boolean
  onToggleDone: () => void
  onToggleExpand: () => void
}) {
  const p = priorityColor(activity.priority)

  return (
    <View style={[$activityCard, isExpanded && $activityCardExpanded]}>
      <View style={$activityMainRow}>
        <TouchableOpacity
          style={[$checkbox, activity.done && $checkboxDone]}
          onPress={onToggleDone}
          hitSlop={6}
        >
          {activity.done && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
        </TouchableOpacity>

        <View style={$activityIconCircle}>
          <Text style={$activityIcon}>{activity.icon}</Text>
        </View>

        <View style={$activityBody}>
          <Text style={activity.done ? $activityNameDone : $activityName}>{activity.name}</Text>
          <Text style={$activityDuration}>⏱ {activity.durationMinutes} min</Text>
        </View>

        <Text style={[$priorityText, { color: p.text }]}>{activity.priority}</Text>
        <TouchableOpacity onPress={onToggleExpand} hitSlop={8} style={$chevronBtn}>
          <Ionicons
            name={isExpanded ? "chevron-up" : "chevron-forward"}
            size={16}
            color={ink4}
          />
        </TouchableOpacity>
      </View>

      {isExpanded && activity.aiTip && (
        <View style={$expandedSection}>
          <View style={$aiTipRow}>
            <Text style={$aiTipEmoji}>🤖</Text>
            <Text style={$aiTipText}>
              <Text style={$aiTipBold}>AI tip: </Text>
              {activity.aiTip}
            </Text>
          </View>
          {activity.tools && activity.tools.length > 0 && (
            <Text style={$toolsText}>📦 Tools: {activity.tools.join(" · ")}</Text>
          )}
        </View>
      )}
    </View>
  )
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const $root: ViewStyle = {
  flex: 1,
  backgroundColor: paper,
}

const $scrollContent: ViewStyle = {
  paddingHorizontal: spacing.s5,
}

const $planLabel: TextStyle = {
  fontFamily: typography.primary.bold,
  fontSize: 11,
  color: forest500,
  letterSpacing: 1,
  textTransform: "uppercase",
  marginBottom: spacing.s1,
}

const $dateHeading: TextStyle = {
  fontFamily: typography.primary.bold,
  fontSize: 26,
  color: ink,
  lineHeight: 32,
  marginBottom: spacing.s5,
}

const $progressCard: ViewStyle = {
  backgroundColor: card,
  borderRadius: radii.xl,
  borderWidth: 1,
  borderColor: cardBorder,
  padding: spacing.s4,
  marginBottom: spacing.s6,
  ...elevation.card,
}

const $progressCardHeader: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: spacing.s3,
}

const $progressCardTitle: TextStyle = {
  fontFamily: typography.primary.bold,
  fontSize: 15,
  color: ink,
}

const $progressDoneText: TextStyle = {
  fontFamily: typography.primary.bold,
  fontSize: 14,
  color: forest500,
}

const $progressBarBg: ViewStyle = {
  height: 8,
  backgroundColor: hairline,
  borderRadius: radii.pill,
  overflow: "hidden",
  marginBottom: spacing.s2,
}

const $progressBarFill: ViewStyle = {
  height: 8,
  backgroundColor: forest500,
  borderRadius: radii.pill,
}

const $progressPercent: TextStyle = {
  fontFamily: typography.primary.normal,
  fontSize: 12,
  color: ink3,
  textAlign: "right",
}

const $sectionTitle: TextStyle = {
  fontFamily: typography.primary.bold,
  fontSize: 16,
  color: ink,
  marginBottom: spacing.s3,
}

const $loadingContainer: ViewStyle = {
  alignItems: "center",
  paddingVertical: spacing.s10,
  gap: spacing.s3,
}

const $loadingText: TextStyle = {
  fontFamily: typography.primary.normal,
  fontSize: 14,
  color: ink3,
}

const $activityCard: ViewStyle = {
  backgroundColor: card,
  borderRadius: radii.xl,
  borderWidth: 1,
  borderColor: cardBorder,
  marginBottom: spacing.s3,
  overflow: "hidden",
  ...elevation.card,
}

const $activityCardExpanded: ViewStyle = {
  borderColor: forest500,
}

const $activityMainRow: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  paddingHorizontal: spacing.s4,
  paddingVertical: spacing.s4,
  gap: spacing.s3,
}

const $checkbox: ViewStyle = {
  width: 26,
  height: 26,
  borderRadius: 13,
  borderWidth: 2,
  borderColor: hairline,
  alignItems: "center",
  justifyContent: "center",
}

const $checkboxDone: ViewStyle = {
  backgroundColor: forest500,
  borderColor: forest500,
}

const $activityIconCircle: ViewStyle = {
  width: 36,
  height: 36,
  borderRadius: 18,
  backgroundColor: forest50,
  alignItems: "center",
  justifyContent: "center",
}

const $activityIcon: TextStyle = {
  fontSize: 18,
}

const $activityBody: ViewStyle = {
  flex: 1,
}

const $activityName: TextStyle = {
  fontFamily: typography.primary.medium,
  fontSize: 14,
  color: ink,
  lineHeight: 19,
}

const $activityNameDone: TextStyle = {
  fontFamily: typography.primary.medium,
  fontSize: 14,
  color: ink3,
  lineHeight: 19,
  textDecorationLine: "line-through",
}

const $activityDuration: TextStyle = {
  fontFamily: typography.primary.normal,
  fontSize: 12,
  color: ink3,
  marginTop: 1,
}

const $priorityText: TextStyle = {
  fontFamily: typography.primary.medium,
  fontSize: 13,
}

const $chevronBtn: ViewStyle = {
  padding: 2,
}

const $expandedSection: ViewStyle = {
  borderTopWidth: 1,
  borderTopColor: hairline,
  paddingHorizontal: spacing.s4,
  paddingVertical: spacing.s3,
  backgroundColor: forest50,
}

const $aiTipRow: ViewStyle = {
  flexDirection: "row",
  alignItems: "flex-start",
  marginBottom: spacing.s2,
}

const $aiTipEmoji: TextStyle = {
  fontSize: 15,
  marginRight: spacing.s2,
  marginTop: 1,
}

const $aiTipText: TextStyle = {
  flex: 1,
  fontFamily: typography.primary.normal,
  fontSize: 13,
  color: ink2,
  lineHeight: 19,
}

const $aiTipBold: TextStyle = {
  fontFamily: typography.primary.bold,
  color: ink,
}

const $toolsText: TextStyle = {
  fontFamily: typography.primary.normal,
  fontSize: 12,
  color: ink3,
}

const $aiPanel: ViewStyle = {
  position: "absolute",
  left: spacing.s4,
  right: spacing.s4,
  backgroundColor: card,
  borderRadius: radii.xl,
  borderWidth: 1,
  borderColor: hairline,
  overflow: "hidden",
  ...elevation.sheet,
}

const $aiPanelExpanded: ViewStyle = {
  borderColor: forest500,
}

const $aiPanelHeader: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  paddingHorizontal: spacing.s4,
  height: 56,
  gap: spacing.s2,
}

const $aiAvatarCircle: ViewStyle = {
  width: 32,
  height: 32,
  borderRadius: 16,
  backgroundColor: forest50,
  alignItems: "center",
  justifyContent: "center",
}

const $aiAvatarEmoji: TextStyle = {
  fontSize: 16,
}

const $aiPanelTitle: TextStyle = {
  flex: 1,
  fontFamily: typography.primary.bold,
  fontSize: 14,
  color: ink,
}

const $aiDot: ViewStyle = {
  width: 8,
  height: 8,
  borderRadius: 4,
  backgroundColor: statusGood,
}

const $chatMessageBubble: ViewStyle = {
  marginHorizontal: spacing.s4,
  marginBottom: spacing.s3,
  backgroundColor: paper,
  borderRadius: radii.lg,
  padding: spacing.s3,
}

const $chatMessageText: TextStyle = {
  fontFamily: typography.primary.normal,
  fontSize: 13,
  color: ink2,
  lineHeight: 19,
}

const $chipsScroll: ViewStyle = {
  paddingHorizontal: spacing.s4,
  gap: spacing.s2,
  marginBottom: spacing.s3,
}

const $chip: ViewStyle = {
  backgroundColor: forest50,
  borderRadius: radii.pill,
  borderWidth: 1,
  borderColor: forest500,
  paddingHorizontal: spacing.s3,
  paddingVertical: 6,
}

const $chipText: TextStyle = {
  fontFamily: typography.primary.medium,
  fontSize: 12,
  color: forest500,
}

const $chatInputRow: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  paddingHorizontal: spacing.s4,
  paddingBottom: spacing.s3,
  gap: spacing.s2,
}

const $chatInput: TextStyle = {
  flex: 1,
  height: 42,
  backgroundColor: paper,
  borderRadius: radii.pill,
  paddingHorizontal: spacing.s4,
  fontFamily: typography.primary.normal,
  fontSize: 14,
  color: ink,
  borderWidth: 1,
  borderColor: hairline,
}

const $micBtn: ViewStyle = {
  width: 42,
  height: 42,
  borderRadius: 21,
  backgroundColor: paper,
  borderWidth: 1,
  borderColor: hairline,
  alignItems: "center",
  justifyContent: "center",
}

const $sendBtn: ViewStyle = {
  width: 42,
  height: 42,
  borderRadius: 21,
  backgroundColor: forest500,
  alignItems: "center",
  justifyContent: "center",
}

const $sendBtnDisabled: ViewStyle = {
  backgroundColor: hairline,
}
