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
      <Ionicons name="camera-outline" size={64} color="#555" />
      <Text style={styles.title}>카메라 권한 필요</Text>
      <Text style={styles.desc}>
        얼굴 모자이크 처리를 위해{'\n'}카메라 접근 권한이 필요합니다.
      </Text>
      <TouchableOpacity style={styles.btn} onPress={onRequest}>
        <Text style={styles.btnText}>권한 허용</Text>
      </TouchableOpacity>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#131313',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    padding: 32,
  },
  title: { color: '#fff', fontSize: 20, fontWeight: '700', marginTop: 8 },
  desc: { color: '#888', fontSize: 15, textAlign: 'center', lineHeight: 22 },
  btn: {
    marginTop: 16,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  btnText: { color: '#000', fontSize: 16, fontWeight: '600' },
})
