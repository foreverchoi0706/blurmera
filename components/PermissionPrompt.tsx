import { Ionicons } from '@expo/vector-icons'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import React from 'react'

interface Props {
  onRequest: () => void
}

export default function PermissionPrompt({ onRequest }: Props) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.hero}>
        <View style={styles.iconCircle}>
          <Ionicons name="camera-outline" size={40} color="#34D399" />
        </View>
        <Text style={styles.title}>카메라 권한 필요</Text>
        <Text style={styles.desc}>
          얼굴 블러 처리를 위해{'\n'}카메라 접근 권한이 필요해요.
        </Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.btn} onPress={onRequest} activeOpacity={0.85}>
          <Text style={styles.btnText}>권한 허용</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0E0E0E' },
  hero: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32, gap: 8 },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(52,211,153,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: { color: '#fff', fontSize: 22, fontWeight: '700' },
  desc: { color: '#8A8A8A', fontSize: 15, textAlign: 'center', lineHeight: 22 },
  actions: { padding: 20 },
  btn: {
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  btnText: { color: '#000', fontSize: 16, fontWeight: '700' },
})
