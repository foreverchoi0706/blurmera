import React from 'react'
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

interface Tip {
  icon: keyof typeof Ionicons.glyphMap
  title: string
  desc: string
}

const TIPS: Tip[] = [
  {
    icon: 'happy-outline',
    title: '얼굴 자동 블러',
    desc: '사진·동영상 속 얼굴을 자동으로 찾아 흐리게 처리해요.',
  },
  {
    icon: 'hand-left-outline',
    title: '드래그로 제외',
    desc: '흐리게 하지 않을 영역은 손가락으로 드래그해 제외할 수 있어요.',
  },
  {
    icon: 'images-outline',
    title: '갤러리 후처리',
    desc: '이미 찍은 사진도 갤러리 탭에서 블러 처리할 수 있어요.',
  },
]

interface Props {
  visible: boolean
  onDismiss: () => void
}

export default function OnboardingOverlay({ visible, onDismiss }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.iconCircle}>
            <Ionicons name="sparkles" size={28} color="#34D399" />
          </View>
          <Text style={styles.heading}>이렇게 사용해요</Text>

          <View style={styles.tips}>
            {TIPS.map(tip => (
              <View key={tip.title} style={styles.tipRow}>
                <View style={styles.tipIcon}>
                  <Ionicons name={tip.icon} size={20} color="#34D399" />
                </View>
                <View style={styles.tipText}>
                  <Text style={styles.tipTitle}>{tip.title}</Text>
                  <Text style={styles.tipDesc}>{tip.desc}</Text>
                </View>
              </View>
            ))}
          </View>

          <TouchableOpacity style={styles.btn} onPress={onDismiss} activeOpacity={0.85}>
            <Text style={styles.btnText}>시작하기</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#1A1A1A',
    borderRadius: 24,
    padding: 24,
    gap: 8,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(52,211,153,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
  },
  heading: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 12,
  },
  tips: { gap: 18, marginBottom: 8 },
  tipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  tipIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(52,211,153,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tipText: { flex: 1, gap: 2 },
  tipTitle: { color: '#fff', fontSize: 15, fontWeight: '600' },
  tipDesc: { color: '#9A9A9A', fontSize: 13, lineHeight: 19 },
  btn: {
    marginTop: 16,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  btnText: { color: '#000', fontSize: 16, fontWeight: '700' },
})
