import { useEffect } from "react"
import { useRouter } from "expo-router"
import { WelcomeScreen } from "@/screens/WelcomeScreen"

export default function Index() {
  const router = useRouter()

  useEffect(() => {
    // In development, auto-redirect to the Tap-to-Log entry so QA can exercise the core flow quickly.
    if (typeof __DEV__ !== "undefined" && __DEV__) {
      router.replace("/expenses/tap")
    }
  }, [router])

  return <WelcomeScreen />
}
