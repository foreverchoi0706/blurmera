import React from 'react'
import { Modal, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { colors, glow, gradient } from '@/constants/theme'
import { GradientButton } from './ui/GradientButton'

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
          <LinearGradient
            colors={gradient.brand}
            start={gradient.start}
            end={gradient.end}
            style={styles.iconCircle}
          >
            <Ionicons name="sparkles" size={28} color="#fff" />
          </LinearGradient>
          <Text style={styles.heading}>이렇게 사용해요</Text>

          <View style={styles.tips}>
            {TIPS.map(tip => (
              <View key={tip.title} style={styles.tipRow}>
                <View style={styles.tipIcon}>
                  <Ionicons name={tip.icon} size={20} color={colors.accent} />
                </View>
                <View style={styles.tipText}>
                  <Text style={styles.tipTitle}>{tip.title}</Text>
                  <Text style={styles.tipDesc}>{tip.desc}</Text>
                </View>
              </View>
            ))}
          </View>

          <GradientButton label="시작하기" icon="arrow-forward" onPress={onDismiss} style={styles.cta} />
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(8,4,16,0.82)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.bgSolid,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    padding: 24,
    gap: 8,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    ...glow,
  },
  heading: {
    color: colors.text,
    fontSize: 21,
    fontWeight: '800',
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
    backgroundColor: colors.accentSoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tipText: { flex: 1, gap: 2 },
  tipTitle: { color: colors.text, fontSize: 15, fontWeight: '700' },
  tipDesc: { color: colors.textDim, fontSize: 13, lineHeight: 19 },
  cta: { marginTop: 16 },
})
