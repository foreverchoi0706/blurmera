import React, { useState } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import { FaceBlurEditor } from '@/components/FaceBlurEditor'

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
        <View style={styles.iconCircle}>
          <Ionicons name="images-outline" size={40} color="#34D399" />
        </View>
        <Text style={styles.title}>갤러리에서 블러</Text>
        <Text style={styles.subtitle}>
          사진을 선택하면 얼굴을 자동으로 찾아{'\n'}흐리게 처리해 드려요.
        </Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.btn} onPress={pickImage} activeOpacity={0.85}>
          <Ionicons name="image" size={20} color="#000" />
          <Text style={styles.btnText}>사진 선택</Text>
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
  subtitle: { color: '#8A8A8A', fontSize: 15, textAlign: 'center', lineHeight: 22 },
  actions: { padding: 20 },
  btn: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: { color: '#000', fontSize: 16, fontWeight: '700' },
})
