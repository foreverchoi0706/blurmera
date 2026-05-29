import { Ionicons } from '@expo/vector-icons'
import { StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import React from 'react'
import { colors, glow, gradient } from '@/constants/theme'
import { GradientButton } from './ui/GradientButton'

interface Props {
  onRequest: () => void
}

export default function PermissionPrompt({ onRequest }: Props) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.hero}>
        <LinearGradient
          colors={gradient.brand}
          start={gradient.start}
          end={gradient.end}
          style={styles.iconCircle}
        >
          <Ionicons name="camera-outline" size={40} color="#fff" />
        </LinearGradient>
        <Text style={styles.title}>카메라 권한 필요</Text>
        <Text style={styles.desc}>
          얼굴 블러 처리를 위해{'\n'}카메라 접근 권한이 필요해요.
        </Text>
      </View>

      <View style={styles.actions}>
        <GradientButton label="권한 허용" icon="sparkles" onPress={onRequest} />
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  hero: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32, gap: 8 },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    ...glow,
  },
  title: { color: colors.text, fontSize: 24, fontWeight: '800' },
  desc: { color: colors.textDim, fontSize: 15, textAlign: 'center', lineHeight: 22 },
  actions: { padding: 20 },
})
