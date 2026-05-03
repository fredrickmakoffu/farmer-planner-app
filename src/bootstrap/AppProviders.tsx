import { ReactNode, useEffect, useState } from "react"
import * as SplashScreen from "expo-splash-screen"
import { useFonts } from "@expo-google-fonts/space-grotesk"
import { QueryClientProvider } from "@tanstack/react-query"
import { KeyboardProvider } from "react-native-keyboard-controller"
import { initialWindowMetrics, SafeAreaProvider } from "react-native-safe-area-context"

import appBootstrap from "@/bootstrap/app-bootstrap"
import { container } from "@/bootstrap/container"
import { initI18n } from "@/i18n"
import { ThemeProvider } from "@/theme/context"
import { customFontsToLoad } from "@/theme/typography"
import { loadDateFnsLocale } from "@/utils/formatDate"

export function AppProviders({ children }: { children: ReactNode }) {
  const [fontsLoaded, fontError] = useFonts(customFontsToLoad)
  const [isI18nInitialized, setIsI18nInitialized] = useState(false)
  const [isBootstrapInitialized, setIsBootstrapInitialized] = useState(false)

  useEffect(() => {
    console.debug("APP: initI18n() start")
    initI18n()
      .then(() => {
        console.debug("APP: i18n initialized")
        setIsI18nInitialized(true)
      })
      .then(() => {
        console.debug("APP: loading date-fns locale")
        loadDateFnsLocale()
        console.debug("APP: date-fns locale loaded")
      })
      .catch((err) => {
        console.error("APP: initI18n failed", err)
      })
  }, [])

  useEffect(() => {
    let mounted = true
    console.debug("APP: appBootstrap.init() start")
    appBootstrap
      .init()
      .then(() => {
        console.debug("APP: appBootstrap.init() success")
        if (!mounted) return
        setIsBootstrapInitialized(true)
      })
      .catch((err) => {
        console.error("APP: appBootstrap.init() failed", err)
        // allow the app to continue in development even if bootstrap fails (DB or native bindings missing)
        // this prevents the splash screen from blocking indefinitely when native modules are unavailable.
        if (!mounted) return
        setIsBootstrapInitialized(true)
      })

    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    if (!isBootstrapInitialized) return
    console.debug("APP: isBootstrapInitialized true — attempting outbox flush")
    // attempt a best-effort flush of the on-device outbox after bootstrap
    try {
      const sync = container.resolve<any>("syncEngine")
      if (sync && typeof sync.flush === "function") sync.flush().catch(() => {})
    } catch {
      // ignore
    }
  }, [isBootstrapInitialized])

  useEffect(() => {
    console.debug("APP: fontsLoaded/ fontError", fontsLoaded, fontError)
    if (fontError) throw fontError
  }, [fontError, fontsLoaded])

  console.debug(
    "APP: render - fontsLoaded:",
    fontsLoaded,
    "isI18nInitialized:",
    isI18nInitialized,
    "isBootstrapInitialized:",
    isBootstrapInitialized,
  )

  const loaded = fontsLoaded && isI18nInitialized && isBootstrapInitialized

  useEffect(() => {
    console.debug("APP: loaded state ->", loaded)
    if (loaded) {
      SplashScreen.hideAsync()
        .then(() => console.debug("APP: SplashScreen.hideAsync() called"))
        .catch((err) => console.error("APP: SplashScreen.hideAsync failed", err))
    }
  }, [loaded])

  if (!loaded) return null

  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <QueryClientProvider client={appBootstrap.queryClient}>
        <ThemeProvider>
          <KeyboardProvider>{children}</KeyboardProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  )
}

export default AppProviders
