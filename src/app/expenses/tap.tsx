import { useEffect, useRef } from "react"
import { useLocalSearchParams } from "expo-router"
import TapToLogScreen from "@/modules/expenses/presentation/TapToLogScreen"
import { container } from "@/bootstrap/container"
import type { CategoryRepository } from "@/modules/expenses/domain/repositories/category-repository"
import type { ExpenseEventRepository } from "@/modules/expenses/domain/repositories/expense-event-repository"
import type { RoutineRepository } from "@/modules/expenses/domain/repositories/routine-repository"
import { predictCategory } from "@/modules/expenses/application/predict-category"
import { createExpense } from "@/modules/expenses/application/create-expense"
import { syncWidgetData } from "@/modules/expenses/application/sync-widget-data"

export default function TapRoute() {
  const { auto } = useLocalSearchParams<{ auto?: string }>()
  // Guard against React strict-mode double-invocation and widget double-fire
  const fired = useRef(false)

  useEffect(() => {
    if (auto !== "true" || fired.current) return
    fired.current = true

    async function autoTap() {
      try {
        const expenseRepo = container.resolve<ExpenseEventRepository>("expenseEventRepository")
        const categoryRepo = container.resolve<CategoryRepository>("categoryRepository")
        const routineRepo = container.resolve<RoutineRepository>("routineRepository")
        const sync = container.resolve<any>("syncEngine")
        if (!expenseRepo || !categoryRepo) return

        const predicted = await predictCategory(categoryRepo, expenseRepo, routineRepo)
        await createExpense(expenseRepo, 100, predicted.categoryId ?? null, sync)

        // Push updated prediction state back to the widget after the tap
        if (categoryRepo && expenseRepo && routineRepo) {
          await syncWidgetData(categoryRepo, expenseRepo, routineRepo)
        }

        console.debug("Auto-tap: logged expense with predicted category", predicted)
      } catch (e) {
        console.error("Auto-tap failed", e)
      }
    }

    autoTap()
  }, [auto])

  return <TapToLogScreen />
}
