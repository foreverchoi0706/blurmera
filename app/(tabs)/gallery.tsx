import React, { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import * as ImagePicker from 'expo-image-picker'
import { FaceBlurEditor } from '@/components/FaceBlurEditor'
import { GradientButton } from '@/components/ui/GradientButton'
import { colors, glow, gradient } from '@/constants/theme'

interface SelectedImage {
  uri: string
  width: number
  height: number
}

export default function GalleryScreen() {
  const [selected, setSelected] = useState<SelectedImage | null>(null)

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1,
    })
    if (result.canceled || !result.assets[0]) return
    const { uri, width, height } = result.assets[0]
    setSelected({ uri, width, height })
  }

  if (selected) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <FaceBlurEditor
          imageUri={selected.uri}
          imageWidth={selected.width}
          imageHeight={selected.height}
          onClose={() => setSelected(null)}
          closeLabel="다른 사진 선택"
        />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.hero}>
        <LinearGradient
          colors={gradient.brand}
          start={gradient.start}
          end={gradient.end}
          style={styles.iconCircle}
        >
          <Ionicons name="images-outline" size={40} color="#fff" />
        </LinearGradient>
        <Text style={styles.title}>갤러리에서 블러</Text>
        <Text style={styles.subtitle}>
          사진을 선택하면 얼굴을 자동으로 찾아{'\n'}흐리게 처리해 드려요.
        </Text>
      </View>

      <View style={styles.actions}>
        <GradientButton label="사진 선택" icon="image" onPress={pickImage} />
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
  subtitle: { color: colors.textDim, fontSize: 15, textAlign: 'center', lineHeight: 22 },
  actions: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 90 },
})
