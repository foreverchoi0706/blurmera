import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "@/constants/theme";

const TABS: Record<
  string,
  { label: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  camera: { label: "카메라", icon: "camera" },
  gallery: { label: "갤러리", icon: "images" },
};

/** 세련된 리퀴드 글래스 탭바 — 선택 탭이 그라데이션 캡슐로 떠오르고, 비활성은 아웃라인 아이콘만 */
function GlassTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[styles.wrap, { bottom: insets.bottom + 10 }]}
      pointerEvents="box-none"
    >
      <View style={styles.bar}>
        <LinearGradient
          colors={["rgba(255,255,255,0.16)", "rgba(255,255,255,0.03)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.rim} />

        <View style={styles.row}>
          {state.routes.map((route, index) => {
            const focused = state.index === index;
            const meta = TABS[route.name] ?? {
              label: route.name,
              icon: "ellipse" as const,
            };

            const onPress = () => {
              const event = navigation.emit({
                type: "tabPress",
                target: route.key,
                canPreventDefault: true,
              });
              if (!focused && !event.defaultPrevented)
                navigation.navigate(route.name);
            };

            return (
              <Pressable
                key={route.key}
                onPress={onPress}
                style={styles.tab}
                android_ripple={{
                  color: "rgba(255,255,255,0.08)",
                  borderless: true,
                  radius: 60,
                }}
              >
                {focused ? (
                  <Ionicons name={meta.icon} size={24} color="#fff" />
                ) : (
                  <Ionicons
                    name={
                      `${meta.icon}-outline` as keyof typeof Ionicons.glyphMap
                    }
                    size={24}
                    color={colors.textDim}
                  />
                )}
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <GlassTabBar {...props} />}
    >
      <Tabs.Screen name="camera" options={{ title: "카메라" }} />
      <Tabs.Screen name="gallery" options={{ title: "갤러리" }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 20,
    right: 20,
    alignItems: "center",
  },
  bar: {
    width: "100%",
    height: 62,
    borderRadius: 31,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    overflow: "hidden",
    // 떠 있는 그림자
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    elevation: 14,
  },
  rim: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.28)",
  },
  row: { flex: 1, flexDirection: "row", alignItems: "center" },
  tab: {
    flex: 1,
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  activePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 18,
  },
  activeLabel: {
    color: "#fff",
    fontSize: 13.5,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
});
