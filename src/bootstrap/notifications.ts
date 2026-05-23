import * as Notifications from "expo-notifications"
import { router } from "expo-router"

import { container } from "./container"
import { confirmDay } from "@/modules/expenses/application/confirm-day"
import type { ExpenseEventRepository } from "@/modules/expenses/domain/repositories/expense-event-repository"

const NOTIFICATION_DATA_TYPE = "daily_review"
const CATEGORY_ID = "DAILY_REVIEW"

// Actions the user can tap directly in the system notification tray
const ACTION_REVIEW = "REVIEW_EXPENSES"
const ACTION_CONFIRM = "CONFIRM_DAY"

export async function setupNotifications(): Promise<void> {
  // Must run after native module is available
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  })

  const { status } = await Notifications.requestPermissionsAsync()
  if (status !== "granted") {
    console.debug("NOTIFICATIONS: permission not granted")
    return
  }

  await Notifications.setNotificationCategoryAsync(CATEGORY_ID, [
    {
      identifier: ACTION_REVIEW,
      buttonTitle: "Review",
      options: { opensAppToForeground: true },
    },
    {
      identifier: ACTION_CONFIRM,
      buttonTitle: "Confirm",
      options: { opensAppToForeground: false },
    },
  ])

  await scheduleDailyReviewIfNeeded()
}

async function scheduleDailyReviewIfNeeded(): Promise<void> {
  const pending = await Notifications.getAllScheduledNotificationsAsync()
  const alreadyScheduled = pending.some(
    (n) => (n.content.data as Record<string, unknown>)?.type === NOTIFICATION_DATA_TYPE,
  )
  if (alreadyScheduled) return

  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Time to review your day",
      body: "Confirm today's expenses before the day ends.",
      categoryIdentifier: CATEGORY_ID,
      data: { type: NOTIFICATION_DATA_TYPE },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 20,
      minute: 0,
    },
  })
  console.debug("NOTIFICATIONS: daily 8pm notification scheduled")
}

async function confirmTodayFromNotification(): Promise<void> {
  try {
    const expenseRepo = container.resolve<ExpenseEventRepository>("expenseEventRepository")
    const sync = container.resolve<any>("syncEngine")
    if (!expenseRepo) return

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const start = today.getTime()
    const end = new Date(today.getTime()).setHours(23, 59, 59, 999)

    await confirmDay(expenseRepo, start, end, sync)
    console.debug("NOTIFICATIONS: today confirmed via notification action")
  } catch (err) {
    console.error("NOTIFICATIONS: confirm from notification failed", err)
  }
}

export function addNotificationResponseListener(): Notifications.Subscription {
  return Notifications.addNotificationResponseReceivedListener((response) => {
    const actionId = response.actionIdentifier

    if (
      actionId === ACTION_REVIEW ||
      actionId === Notifications.DEFAULT_ACTION_IDENTIFIER
    ) {
      // Navigate to the Review tab — router is available after app mounts
      router.push("/(tabs)/review")
    } else if (actionId === ACTION_CONFIRM) {
      confirmTodayFromNotification()
    }
  })
}
