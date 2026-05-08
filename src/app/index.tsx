import { Redirect } from "expo-router"

// Route to the Tap tab (main screen of the app)
export default function Index() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <Redirect href={"/(tabs)/" as any} />
}
