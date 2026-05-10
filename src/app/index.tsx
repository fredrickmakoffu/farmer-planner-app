import { Redirect } from "expo-router"
import { loadString } from "@/utils/storage"

export default function Index() {
  const onboarded = loadString("onboarding.complete")
  if (!onboarded) return <Redirect href={"/onboarding" as any} />
  return <Redirect href={"/(tabs)/" as any} />
}
