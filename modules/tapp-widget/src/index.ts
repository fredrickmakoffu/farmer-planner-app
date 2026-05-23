import { requireNativeModule } from "expo-modules-core"

export type WidgetData = {
  categoryId: number | null
  categoryName: string
  colorHex: string
  /** MaterialCommunityIcons icon name, e.g. "silverware-fork-knife". */
  icon: string
  defaultAmount: number
  predictedAt: number
}

interface TappWidgetNativeModule {
  /** Write widget state JSON to shared native storage and redraw all widget instances. */
  setWidgetData(json: string): void
  /** Read the last written widget state JSON, or null. */
  getWidgetData(): string | null
}

// On web or in tests the native module won't be present — return a no-op stub.
function makeStub(): TappWidgetNativeModule {
  return {
    setWidgetData: () => {},
    getWidgetData: () => null,
  }
}

let _native: TappWidgetNativeModule
try {
  _native = requireNativeModule<TappWidgetNativeModule>("TappWidget")
} catch {
  _native = makeStub()
}

export const TappWidget = _native
