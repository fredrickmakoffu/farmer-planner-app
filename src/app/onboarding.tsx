import { useCallback, useEffect, useRef, useState } from "react"
import {
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
  ViewStyle,
  TextStyle,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { router } from "expo-router"
import { Ionicons } from "@expo/vector-icons"

import { Text } from "@/components/Text"
import { container } from "@/bootstrap/container"
import { saveString } from "@/utils/storage"
import { createCategory } from "@/modules/expenses/application/create-category"
import type { Category } from "@/modules/expenses/domain/entities/category"
import type { CategoryRepository } from "@/modules/expenses/domain/repositories/category-repository"
import type { Routine } from "@/modules/expenses/domain/entities/routine"
import type { RoutineRepository } from "@/modules/expenses/domain/repositories/routine-repository"
import {
  paper, card, hairline,
  ink, ink2, ink3, ink4,
  coral500, coral600,
  catClay, catFern, catMango, catLake, catOrchid, catStone,
  spacing, radii, elevation, duration,
} from "@/theme/tapp-tokens"
import { typography } from "@/theme/typography"

// ---- Constants -------------------------------------------------------------

const SEED_CATEGORIES = [
  { name: "Food",      colorHex: catClay,   icon: "silverware-fork-knife" },
  { name: "Transport", colorHex: catFern,   icon: "bus" },
  { name: "Groceries", colorHex: catMango,  icon: "cart" },
  { name: "Utilities", colorHex: catLake,   icon: "lightning-bolt" },
  { name: "Leisure",   colorHex: catOrchid, icon: "movie-open" },
  { name: "Misc",      colorHex: catStone,  icon: "dots-horizontal" },
]

const CATEGORY_COLORS: Record<string, string> = {
  food: catClay, transport: catFern, groceries: catMango,
  utilities: catLake, leisure: catOrchid, misc: catStone,
}

function resolveCategoryColor(name?: string, hex?: string): string {
  if (name) {
    const mapped = CATEGORY_COLORS[name.toLowerCase()]
    if (mapped) return mapped
  }
  return hex ?? catStone
}

const TIME_SLOTS = [
  { label: "Early morning", start: 300,  end: 420  }, // 5am-7am
  { label: "Morning",       start: 420,  end: 600  }, // 7am-10am
  { label: "Midday",        start: 600,  end: 720  }, // 10am-12pm
  { label: "Lunch",         start: 720,  end: 840  }, // 12pm-2pm
  { label: "Afternoon",     start: 840,  end: 1020 }, // 2pm-5pm
  { label: "Evening",       start: 1020, end: 1200 }, // 5pm-8pm
  { label: "Night",         start: 1200, end: 1380 }, // 8pm-11pm
]

const DAY_OPTIONS = [
  { label: "Every day",  value: 127 }, // 0x7F — all bits
  { label: "Weekdays",   value: 62  }, // Mon–Fri = bits 1-5
  { label: "Weekends",   value: 65  }, // Sat+Sun = bits 0,6
]

function formatAmount(n: number): string {
  return n.toLocaleString("en-KE")
}

// ---- Add Routine Sheet -----------------------------------------------------

type RoutineDraft = {
  name: string
  categoryId: number | null
  amountText: string
  timeSlotIndex: number
  dayOption: number
}

function AddRoutineSheet({
  visible,
  categories,
  onClose,
  onSave,
}: {
  visible: boolean
  categories: Category[]
  onClose: () => void
  onSave: (r: Omit<Routine, "id">) => void
}) {
  const insets = useSafeAreaInsets()
  const slideAnim = useRef(new Animated.Value(500)).current

  const [draft, setDraft] = useState<RoutineDraft>({
    name: "",
    categoryId: null,
    amountText: "",
    timeSlotIndex: 1, // Morning default
    dayOption: 127,   // Every day default
  })
  const [error, setError] = useState("")

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: visible ? 0 : 500,
      duration: visible ? duration.base : duration.fast,
      useNativeDriver: true,
    }).start()
    if (!visible) {
      setDraft({ name: "", categoryId: null, amountText: "", timeSlotIndex: 1, dayOption: 127 })
      setError("")
    }
  }, [visible, slideAnim])

  function handleSave() {
    if (!draft.name.trim()) { setError("Add a short label for this routine."); return }
    if (!draft.categoryId) { setError("Pick a category."); return }
    const slot = TIME_SLOTS[draft.timeSlotIndex]
    const amount = parseFloat(draft.amountText.replace(/,/g, "")) || 0
    onSave({
      name: draft.name.trim(),
      category_id: draft.categoryId,
      time_start: slot.start,
      time_end: slot.end,
      days_of_week: draft.dayOption,
      is_high_confidence: true,
      default_amount: Math.round(amount),
    })
    onClose()
  }

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Pressable style={$scrim} onPress={onClose} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={$sheetOuter}
        pointerEvents="box-none"
      >
        <Animated.View
          style={[$sheet, { paddingBottom: insets.bottom + spacing.s6, transform: [{ translateY: slideAnim }] }]}
        >
          <View style={$handle} />
          <Text style={$sheetEyebrow}>New routine</Text>
          <Text style={$sheetTitle}>Describe the expense</Text>

          {/* Label */}
          <Text style={$fieldLabel}>Label (a few words)</Text>
          <TextInput
            style={[$textInput, error && !draft.name.trim() ? $inputError : null]}
            value={draft.name}
            onChangeText={(t) => { setDraft((d) => ({ ...d, name: t })); setError("") }}
            placeholder="going to work, lunch, groceries…"
            placeholderTextColor={ink4}
            maxLength={50}
            returnKeyType="done"
          />

          {/* Category */}
          <Text style={[$fieldLabel, { marginTop: spacing.s4 }]}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={$pillRow}>
            {categories.map((cat) => {
              const isSelected = draft.categoryId === cat.id
              const color = resolveCategoryColor(cat.name, cat.color_hex)
              return (
                <Pressable
                  key={String(cat.id)}
                  style={[$catPill, isSelected && { backgroundColor: color, borderColor: color }]}
                  onPress={() => { setDraft((d) => ({ ...d, categoryId: cat.id ?? null })); setError("") }}
                >
                  <View style={[$catDot, { backgroundColor: isSelected ? "white" : color }]} />
                  <Text style={[$catPillText, isSelected && { color: "white", fontFamily: typography.primary.medium }]}>
                    {cat.name}
                  </Text>
                </Pressable>
              )
            })}
          </ScrollView>

          {/* Amount */}
          <Text style={[$fieldLabel, { marginTop: spacing.s4 }]}>Typical amount (optional)</Text>
          <View style={$amountRow}>
            <Text style={$amountPrefix}>KSh</Text>
            <TextInput
              style={$amountInput}
              value={draft.amountText}
              onChangeText={(t) => setDraft((d) => ({ ...d, amountText: t }))}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={ink4}
              returnKeyType="done"
            />
          </View>

          {/* Time slot */}
          <Text style={[$fieldLabel, { marginTop: spacing.s4 }]}>Time of day</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={$pillRow}>
            {TIME_SLOTS.map((slot, i) => {
              const isSelected = draft.timeSlotIndex === i
              return (
                <Pressable
                  key={slot.label}
                  style={[$pill, isSelected && $pillActive]}
                  onPress={() => setDraft((d) => ({ ...d, timeSlotIndex: i }))}
                >
                  <Text style={[$pillText, isSelected && $pillTextActive]}>{slot.label}</Text>
                </Pressable>
              )
            })}
          </ScrollView>

          {/* Day pattern */}
          <Text style={[$fieldLabel, { marginTop: spacing.s4 }]}>Schedule</Text>
          <View style={$dayRow}>
            {DAY_OPTIONS.map((opt) => {
              const isSelected = draft.dayOption === opt.value
              return (
                <Pressable
                  key={opt.label}
                  style={[$pill, $pillFlex, isSelected && $pillActive]}
                  onPress={() => setDraft((d) => ({ ...d, dayOption: opt.value }))}
                >
                  <Text style={[$pillText, isSelected && $pillTextActive]}>{opt.label}</Text>
                </Pressable>
              )
            })}
          </View>

          {error ? <Text style={$errorText}>{error}</Text> : null}

          {/* Actions */}
          <View style={[$actions, { marginTop: spacing.s5 }]}>
            <Pressable style={$ghostBtn} onPress={onClose}>
              <Text style={$ghostBtnText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [$primaryBtn, pressed && $primaryBtnPressed]}
              onPress={handleSave}
            >
              <Text style={$primaryBtnText}>Add routine</Text>
            </Pressable>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

// ---- Routine row (in list) -------------------------------------------------

function RoutineRow({ routine, categories }: { routine: Omit<Routine, "id">; categories: Category[] }) {
  const cat = categories.find((c) => c.id === routine.category_id)
  const color = resolveCategoryColor(cat?.name, cat?.color_hex)
  const slot = TIME_SLOTS.find((s) => s.start === routine.time_start)
  return (
    <View style={$routineRow}>
      <View style={[$routineDisc, { backgroundColor: color }]} />
      <View style={{ flex: 1 }}>
        <Text style={$routineName}>{routine.name}</Text>
        <Text style={$routineMeta}>
          {cat?.name ?? "—"} · {slot?.label ?? "—"}
          {routine.default_amount > 0 ? ` · KSh ${formatAmount(routine.default_amount)}` : ""}
        </Text>
      </View>
    </View>
  )
}

// ---- Main Onboarding Screen ------------------------------------------------

const TOTAL_STEPS = 4

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets()
  const [step, setStep] = useState(0)
  const [userName, setUserName] = useState("")
  const [nameError, setNameError] = useState("")
  const [categories, setCategories] = useState<Category[]>([])
  const [routines, setRoutines] = useState<Omit<Routine, "id">[]>([])
  const [sheetOpen, setSheetOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const loadCategories = useCallback(async () => {
    const categoryRepo = container.resolve<CategoryRepository>("categoryRepository")
    if (!categoryRepo) return
    let all = await categoryRepo.findAll()
    if (all.length === 0) {
      for (const seed of SEED_CATEGORIES) {
        await createCategory(categoryRepo, seed.name, seed.colorHex, seed.icon, true)
      }
      all = await categoryRepo.findAll()
    }
    setCategories(all)
  }, [])

  useEffect(() => {
    if (step === 2) loadCategories()
  }, [step, loadCategories])

  function goNext() {
    if (step === 0 && !userName.trim()) {
      setNameError("Tell us your name to continue.")
      return
    }
    setNameError("")
    setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1))
  }

  function goBack() {
    setStep((s) => Math.max(s - 1, 0))
  }

  async function handleAddRoutine(routine: Omit<Routine, "id">) {
    setRoutines((prev) => [...prev, routine])
    const routineRepo = container.resolve<RoutineRepository>("routineRepository")
    if (routineRepo) {
      try { await routineRepo.create(routine) } catch { /* ignore */ }
    }
  }

  async function handleFinish() {
    setSaving(true)
    saveString("user.name", userName.trim())
    saveString("onboarding.complete", "1")
    router.replace("/(tabs)/" as any)
  }

  return (
    <View style={[$screen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* Progress dots */}
      <View style={$dots}>
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <View key={i} style={[$dot, i === step && $dotActive]} />
        ))}
      </View>

      {/* Step 0 — Name */}
      {step === 0 && (
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={$stepWrap}
        >
          <View style={$stepContent}>
            <Text style={$wordmark}>tapp</Text>
            <Text style={$tagline}>one tap at the point of spend.</Text>
          </View>

          <View style={$stepForm}>
            <Text style={$stepTitle}>What do we call you?</Text>
            <TextInput
              style={[$textInput, nameError ? $inputError : null]}
              value={userName}
              onChangeText={(t) => { setUserName(t); setNameError("") }}
              placeholder="first name"
              placeholderTextColor={ink4}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={goNext}
              maxLength={30}
            />
            {nameError ? <Text style={$errorText}>{nameError}</Text> : null}
          </View>

          <View style={$stepActions}>
            <Pressable
              style={({ pressed }) => [$primaryBtn, $btnFull, pressed && $primaryBtnPressed]}
              onPress={goNext}
            >
              <Text style={$primaryBtnText}>Continue</Text>
              <Ionicons name="arrow-forward" size={16} color="white" />
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      )}

      {/* Step 1 — Manifesto */}
      {step === 1 && (
        <View style={$stepWrap}>
          <View style={$stepContent}>
            <Text style={$stepTitle}>before you start.</Text>
            <Text style={$manifestoName}>hello {userName.trim()},</Text>
            <Text style={$manifestoBody}>
              {"Tapp is built for manual tracking.\n\nNo bank integrations. No background data collection. You tap when you spend and review at the end of the day.\n\nNext you'll set up your regular routines — going to work, lunch, groceries. Tapp will use them to predict what you're spending when you tap."}
            </Text>
          </View>

          <View style={$stepActions}>
            <Pressable style={$ghostBtn} onPress={goBack}>
              <Ionicons name="arrow-back" size={16} color={ink2} />
              <Text style={$ghostBtnText}>Back</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [$primaryBtn, pressed && $primaryBtnPressed]}
              onPress={goNext}
            >
              <Text style={$primaryBtnText}>Got it</Text>
              <Ionicons name="arrow-forward" size={16} color="white" />
            </Pressable>
          </View>
        </View>
      )}

      {/* Step 2 — Routines */}
      {step === 2 && (
        <View style={[$stepWrap, { flex: 1 }]}>
          <View style={{ flex: 1 }}>
            <Text style={$stepTitle}>set up your patterns.</Text>
            <Text style={$stepSubtitle}>
              Add your regular expenses — going to work, lunch, weekly groceries.
              Tapp predicts these when you tap.
            </Text>

            {routines.length === 0 ? (
              <View style={$emptyRoutines}>
                <Ionicons name="time-outline" size={36} color={ink4} />
                <Text style={$emptyRoutinesText}>No routines yet.</Text>
                <Text style={$emptyRoutinesSub}>Add at least one to improve predictions.</Text>
              </View>
            ) : (
              <View style={$routineList}>
                {routines.map((r, i) => (
                  <RoutineRow key={i} routine={r} categories={categories} />
                ))}
              </View>
            )}

            <Pressable style={$addRoutineBtn} onPress={() => setSheetOpen(true)}>
              <Ionicons name="add-circle-outline" size={20} color={coral500} />
              <Text style={$addRoutineBtnText}>Add routine</Text>
            </Pressable>
          </View>

          <View style={$stepActions}>
            <Pressable style={$ghostBtn} onPress={goBack}>
              <Ionicons name="arrow-back" size={16} color={ink2} />
              <Text style={$ghostBtnText}>Back</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [$primaryBtn, pressed && $primaryBtnPressed]}
              onPress={goNext}
            >
              <Text style={$primaryBtnText}>{routines.length === 0 ? "Skip" : "Done"}</Text>
              <Ionicons name="arrow-forward" size={16} color="white" />
            </Pressable>
          </View>
        </View>
      )}

      {/* Step 3 — Done */}
      {step === 3 && (
        <View style={$stepWrap}>
          <View style={[$stepContent, { alignItems: "center" }]}>
            <View style={$doneDisc}>
              <Ionicons name="checkmark" size={40} color="white" />
            </View>
            <Text style={[$stepTitle, { textAlign: "center", marginTop: spacing.s5 }]}>
              {"you're all set,\n" + userName.trim() + "."}
            </Text>
            <Text style={[$stepSubtitle, { textAlign: "center" }]}>
              Tap the big button whenever you spend. Review and correct at the end of the day.
            </Text>
          </View>

          <View style={$stepActions}>
            <Pressable
              style={({ pressed }) => [$primaryBtn, $btnFull, pressed && $primaryBtnPressed, saving && { opacity: 0.6 }]}
              onPress={handleFinish}
              disabled={saving}
            >
              <Text style={$primaryBtnText}>Start tapping</Text>
              <Ionicons name="arrow-forward" size={16} color="white" />
            </Pressable>
          </View>
        </View>
      )}

      <AddRoutineSheet
        visible={sheetOpen}
        categories={categories}
        onClose={() => setSheetOpen(false)}
        onSave={handleAddRoutine}
      />
    </View>
  )
}

// ---- Styles ----------------------------------------------------------------

const $screen: ViewStyle = {
  flex: 1,
  backgroundColor: paper,
}

const $dots: ViewStyle = {
  flexDirection: "row",
  justifyContent: "center",
  gap: spacing.s2,
  paddingTop: spacing.s3,
  paddingBottom: spacing.s2,
}

const $dot: ViewStyle = {
  width: 6, height: 6, borderRadius: 3,
  backgroundColor: hairline,
}

const $dotActive: ViewStyle = {
  backgroundColor: coral500,
  width: 18,
}

const $stepWrap: ViewStyle = {
  flex: 1,
  paddingHorizontal: spacing.s5,
  paddingTop: spacing.s8,
  justifyContent: "space-between",
}

const $stepContent: ViewStyle = {
  flex: 1,
}

const $stepForm: ViewStyle = {
  marginBottom: spacing.s6,
}

// ---- Step 0 typography ----

const $wordmark: TextStyle = {
  fontSize: 52, letterSpacing: -2,
  color: ink, fontFamily: typography.primary.bold,
  marginBottom: spacing.s2,
}

const $tagline: TextStyle = {
  fontSize: 17, color: ink3,
  fontFamily: typography.primary.normal,
  marginBottom: spacing.s12,
}

// ---- Step titles ----

const $stepTitle: TextStyle = {
  fontSize: 32, lineHeight: 36, letterSpacing: -0.5,
  color: ink, fontFamily: typography.primary.bold,
  marginBottom: spacing.s4,
}

const $stepSubtitle: TextStyle = {
  fontSize: 15, lineHeight: 22, color: ink3,
  fontFamily: typography.primary.normal,
  marginBottom: spacing.s5,
}

// ---- Step 1 manifesto ----

const $manifestoName: TextStyle = {
  fontSize: 15, color: ink2,
  fontFamily: typography.primary.normal,
  marginBottom: spacing.s4,
}

const $manifestoBody: TextStyle = {
  fontSize: 15, lineHeight: 24, color: ink2,
  fontFamily: typography.primary.normal,
}

// ---- Actions ----

const $stepActions: ViewStyle = {
  flexDirection: "row",
  gap: spacing.s3,
  paddingBottom: spacing.s5,
  paddingTop: spacing.s4,
}

const $primaryBtn: ViewStyle = {
  flex: 2,
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  gap: spacing.s2,
  paddingVertical: spacing.s3 + 1,
  borderRadius: radii.pill,
  backgroundColor: coral500,
  ...elevation.tapButton,
}

const $btnFull: ViewStyle = { flex: 1 }

const $primaryBtnPressed: ViewStyle = { backgroundColor: coral600, transform: [{ scale: 0.97 }] }

const $primaryBtnText: TextStyle = {
  fontSize: 15, color: "white",
  fontFamily: typography.primary.medium,
}

const $ghostBtn: ViewStyle = {
  flex: 1,
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  gap: spacing.s2,
  paddingVertical: spacing.s3,
  borderRadius: radii.pill,
  borderWidth: 1, borderColor: hairline,
}

const $ghostBtnText: TextStyle = {
  fontSize: 15, color: ink2,
  fontFamily: typography.primary.medium,
}

// ---- Routine empty state ----

const $emptyRoutines: ViewStyle = {
  alignItems: "center",
  paddingVertical: spacing.s8,
  gap: spacing.s2,
}

const $emptyRoutinesText: TextStyle = {
  fontSize: 15, color: ink3,
  fontFamily: typography.primary.semiBold,
  marginTop: spacing.s2,
}

const $emptyRoutinesSub: TextStyle = {
  fontSize: 13, color: ink4,
  fontFamily: typography.primary.normal,
  textAlign: "center",
}

// ---- Routine list ----

const $routineList: ViewStyle = {
  backgroundColor: card,
  borderRadius: radii.lg,
  borderWidth: 1, borderColor: hairline,
  ...elevation.card,
  overflow: "hidden",
  marginBottom: spacing.s4,
}

const $routineRow: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.s3,
  paddingVertical: spacing.s3,
  paddingHorizontal: spacing.s4,
  borderTopWidth: 1, borderTopColor: hairline,
}

const $routineDisc: ViewStyle = {
  width: 28, height: 28, borderRadius: 14,
  flexShrink: 0,
}

const $routineName: TextStyle = {
  fontSize: 14, color: ink,
  fontFamily: typography.primary.normal,
}

const $routineMeta: TextStyle = {
  fontSize: 12, color: ink3,
  fontFamily: typography.primary.normal,
  marginTop: 2,
}

const $addRoutineBtn: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.s2,
  paddingVertical: spacing.s3,
}

const $addRoutineBtnText: TextStyle = {
  fontSize: 15, color: coral500,
  fontFamily: typography.primary.normal,
}

// ---- Done disc ----

const $doneDisc: ViewStyle = {
  width: 80, height: 80, borderRadius: 40,
  backgroundColor: coral500,
  alignItems: "center", justifyContent: "center",
  ...elevation.tapButton,
}

// ---- Sheet ----

const $scrim: ViewStyle = {
  position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
  backgroundColor: "rgba(31, 28, 24, 0.45)",
}

const $sheetOuter: ViewStyle = {
  position: "absolute", bottom: 0, left: 0, right: 0,
}

const $sheet: ViewStyle = {
  backgroundColor: card,
  borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl,
  paddingHorizontal: spacing.s5,
  paddingTop: spacing.s3,
  ...elevation.sheet,
}

const $handle: ViewStyle = {
  width: 36, height: 4, borderRadius: 2,
  backgroundColor: hairline,
  alignSelf: "center", marginBottom: spacing.s4,
}

const $sheetEyebrow: TextStyle = {
  fontSize: 11, letterSpacing: 1.4, textTransform: "uppercase",
  color: ink3, fontFamily: typography.primary.normal,
}

const $sheetTitle: TextStyle = {
  fontSize: 22, letterSpacing: -0.3,
  color: ink, fontFamily: typography.primary.semiBold,
  marginTop: spacing.s1, marginBottom: spacing.s4,
}

const $fieldLabel: TextStyle = {
  fontSize: 12, letterSpacing: 0.5, textTransform: "uppercase",
  color: ink3, fontFamily: typography.primary.normal,
  marginBottom: spacing.s2,
}

const $textInput: TextStyle = {
  paddingVertical: spacing.s3,
  paddingHorizontal: spacing.s4,
  borderWidth: 1, borderColor: hairline,
  borderRadius: radii.md,
  fontSize: 16, color: ink,
  fontFamily: typography.primary.normal,
  backgroundColor: paper,
}

const $inputError: ViewStyle = { borderColor: coral500 }

const $amountRow: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.s2,
  borderWidth: 1, borderColor: hairline,
  borderRadius: radii.md,
  paddingHorizontal: spacing.s4,
  backgroundColor: paper,
}

const $amountPrefix: TextStyle = {
  fontSize: 15, color: ink3,
  fontFamily: typography.mono.normal,
}

const $amountInput: TextStyle = {
  flex: 1,
  paddingVertical: spacing.s3,
  fontSize: 20, letterSpacing: -0.3,
  color: ink, fontFamily: typography.mono.normal,
}

const $pillRow = {
  gap: spacing.s2,
  paddingBottom: spacing.s1,
}

const $catPill: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  gap: 6,
  paddingVertical: spacing.s2,
  paddingHorizontal: spacing.s3,
  borderRadius: radii.pill,
  borderWidth: 1, borderColor: hairline,
  backgroundColor: card,
}

const $catDot: ViewStyle = {
  width: 7, height: 7, borderRadius: 4,
}

const $catPillText: TextStyle = {
  fontSize: 13, color: ink2,
  fontFamily: typography.primary.normal,
}

const $pill: ViewStyle = {
  paddingVertical: spacing.s2,
  paddingHorizontal: spacing.s3,
  borderRadius: radii.pill,
  borderWidth: 1, borderColor: hairline,
  backgroundColor: card,
}

const $pillFlex: ViewStyle = { flex: 1, alignItems: "center" }

const $pillActive: ViewStyle = {
  backgroundColor: ink,
  borderColor: ink,
}

const $pillText: TextStyle = {
  fontSize: 13, color: ink2,
  fontFamily: typography.primary.normal,
}

const $pillTextActive: TextStyle = {
  color: "white",
  fontFamily: typography.primary.medium,
}

const $dayRow: ViewStyle = {
  flexDirection: "row",
  gap: spacing.s2,
}

const $actions: ViewStyle = {
  flexDirection: "row",
  gap: spacing.s3,
}

const $errorText: TextStyle = {
  fontSize: 13, color: coral600,
  fontFamily: typography.primary.normal,
  marginTop: spacing.s2,
}
