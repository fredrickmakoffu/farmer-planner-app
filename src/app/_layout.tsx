import { Slot, SplashScreen, useRouter } from "expo-router"

import AppProviders from "@/bootstrap/AppProviders"
import { View, TouchableOpacity, Text, StyleSheet } from "react-native"

SplashScreen.preventAutoHideAsync()

if (__DEV__) {
  // Load Reactotron configuration in development. We don't want to
  // include this in our production bundle, so we are using `if (__DEV__)`
  // to only execute this in development.
  require("@/devtools/ReactotronConfig")
}

function DevNav() {
  const router = useRouter()

  return (
    <View style={styles.container} pointerEvents="box-none">
      <TouchableOpacity style={styles.button} onPress={() => router.replace("/expenses/tap")}>
        <Text style={styles.text}>Tap</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={() => router.push("/expenses/categories")}>
        <Text style={styles.text}>Cats</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={() => router.push("/expenses/review")}>
        <Text style={styles.text}>Review</Text>
      </TouchableOpacity>
    </View>
  )
}

export default function Root() {
  return (
    <AppProviders>
      <Slot />
      {__DEV__ && <DevNav />}
    </AppProviders>
  )
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 44,
    right: 12,
    zIndex: 9999,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 8,
    padding: 6,
    alignItems: "center",
  },
  button: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  text: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },
})
