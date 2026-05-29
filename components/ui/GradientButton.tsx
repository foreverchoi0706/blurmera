import React from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { colors, glow, gradient } from "@/constants/theme";

interface Props {
  label: string;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  /** 글래스(보조) 스타일 — 그라데이션 대신 반투명 표면 */
  variant?: "gradient" | "glass";
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
}

/** MZ 테마 공통 버튼: 기본은 브랜드 그라데이션, variant="glass"는 반투명 보조 버튼 */
export function GradientButton({
  label,
  onPress,
  icon,
  variant = "gradient",
  style,
  disabled,
}: Props) {
  if (variant === "glass") {
    return (
      <TouchableOpacity
        style={[styles.glassBtn, style]}
        onPress={onPress}
        activeOpacity={0.8}
        disabled={disabled}
      >
        {icon && <Ionicons name={icon} size={18} color={colors.text} />}
        <Text style={styles.glassLabel}>{label}</Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.shadow, style]}
      onPress={onPress}
      activeOpacity={0.85}
      disabled={disabled}
    >
      <LinearGradient
        colors={gradient.brand}
        start={gradient.start}
        end={gradient.end}
        style={styles.gradientBtn}
      >
        {icon && <Ionicons name={icon} size={18} color={colors.text} />}
        <Text style={styles.gradientLabel}>{label}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  shadow: { borderRadius: 18, ...glow },
  gradientBtn: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  gradientLabel: { color: colors.text, fontSize: 16, fontWeight: "800" },
  glassBtn: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.glassStrong,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  glassLabel: { color: colors.text, fontSize: 15, fontWeight: "700" },
});
