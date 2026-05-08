import { Tabs } from "expo-router"
import { Platform, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"

import { card, coral500, hairline, ink3, paper, spacing } from "@/theme/tapp-tokens"
import { typography } from "@/theme/typography"

type TabIconProps = {
  focused: boolean
  name: React.ComponentProps<typeof Ionicons>["name"]
  focusedName: React.ComponentProps<typeof Ionicons>["name"]
}

function TabIcon({ focused, name, focusedName }: TabIconProps) {
  return (
    <Ionicons
      name={focused ? focusedName : name}
      size={22}
      color={focused ? coral500 : ink3}
    />
  )
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: coral500,
        tabBarInactiveTintColor: ink3,
        tabBarStyle: $tabBar,
        tabBarLabelStyle: $tabLabel,
        tabBarBackground: () => <View style={$tabBarBackground} />,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Tap",
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} name="hand-left-outline" focusedName="hand-left" />
          ),
        }}
      />
      <Tabs.Screen
        name="review"
        options={{
          title: "Review",
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} name="list-outline" focusedName="list" />
          ),
        }}
      />
      <Tabs.Screen
        name="family"
        options={{
          title: "Family",
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} name="people-outline" focusedName="people" />
          ),
        }}
      />
    </Tabs>
  )
}

const $tabBar = {
  backgroundColor: card,
  borderTopColor: hairline,
  borderTopWidth: 1,
  paddingBottom: Platform.OS === "ios" ? spacing.s3 : spacing.s2,
  paddingTop: spacing.s2,
  height: Platform.OS === "ios" ? 84 : 64,
}

const $tabLabel = {
  fontFamily: typography.primary.normal,
  fontSize: 11,
  marginTop: 0,
}

const $tabBarBackground = {
  flex: 1,
  backgroundColor: card,
}
