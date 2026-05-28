import React, { useState } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
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
      <SafeAreaView style={styles.container}>
        <Text style={styles.title}>갤러리 후처리</Text>
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
      <Text style={styles.title}>갤러리 후처리</Text>
      <View style={styles.placeholder}>
        <Text style={styles.placeholderText}>사진을 선택해주세요</Text>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity style={styles.btn} onPress={pickImage}>
          <Text style={styles.btnText}>사진 선택</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#131313' },
  title: { color: '#fff', fontSize: 18, fontWeight: '700', textAlign: 'center', marginVertical: 16 },
  placeholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  placeholderText: { color: '#555', fontSize: 15 },
  actions: { padding: 16 },
  btn: { paddingVertical: 14, borderRadius: 12, backgroundColor: '#2a2a2a', alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
})
