import { Slot, SplashScreen } from "expo-router"

import AppProviders from "@/bootstrap/AppProviders"

SplashScreen.preventAutoHideAsync()

if (__DEV__) {
  require("@/devtools/ReactotronConfig")
}

export default function Root() {
  return (
    <AppProviders>
      <Slot />
    </AppProviders>
  )
}
