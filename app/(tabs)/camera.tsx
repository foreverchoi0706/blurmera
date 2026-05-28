import React from 'react'
import { StyleSheet, View } from 'react-native'
import { MosaicCamera } from '@/components/MosaicCamera'

export default function CameraScreen() {
  return (
    <View style={styles.container}>
      <MosaicCamera />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
})
