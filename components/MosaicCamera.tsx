import React, { useEffect, useRef, useState } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { Camera, useCameraDevice, useCameraFormat, useCameraPermission, useMicrophonePermission } from 'react-native-vision-camera'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as Haptics from 'expo-haptics'
import * as Sharing from 'expo-sharing'
import { FaceBlurEditor } from './FaceBlurEditor'
import { ExclusionLayer, type ExclusionRect } from './ExclusionLayer'
import PermissionPrompt from './PermissionPrompt'

type CameraMode = 'photo' | 'video'

interface CapturedPhoto {
  uri: string
  width: number
  height: number
}

function formatDuration(sec: number) {
  const m = String(Math.floor(sec / 60)).padStart(2, '0')
  const s = String(sec % 60).padStart(2, '0')
  return `${m}:${s}`
}

export function MosaicCamera() {
  const device = useCameraDevice('back')
  const { hasPermission: hasCamPerm, requestPermission: requestCam } = useCameraPermission()
  const { hasPermission: hasMicPerm, requestPermission: requestMic } = useMicrophonePermission()
  const cameraRef = useRef<Camera>(null)

  const [mode, setMode] = useState<CameraMode>('photo')
  const [isRecording, setIsRecording] = useState(false)
  const [duration, setDuration] = useState(0)
  const [exclusions, setExclusions] = useState<ExclusionRect[]>([])
  const [capturedPhoto, setCapturedPhoto] = useState<CapturedPhoto | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const format = useCameraFormat(device, [{ fps: 30 }])

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current) }, [])

  if (!hasCamPerm) {
    return (
      <PermissionPrompt
        onRequest={async () => {
          await requestCam()
          await requestMic()
        }}
      />
    )
  }

  if (!device) {
    return (
      <View style={styles.center}>
        <Text style={styles.hint}>카메라를 불러오는 중...</Text>
      </View>
    )
  }

  // 사진 촬영 후 FaceBlurEditor로 전환
  if (capturedPhoto) {
    return (
      <SafeAreaView style={styles.fill}>
        <FaceBlurEditor
          imageUri={capturedPhoto.uri}
          imageWidth={capturedPhoto.width}
          imageHeight={capturedPhoto.height}
          onClose={() => setCapturedPhoto(null)}
          closeLabel="다시 찍기"
        />
      </SafeAreaView>
    )
  }

  const handlePhoto = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    const photo = await cameraRef.current?.takePhoto()
    if (!photo) return
    const uri = photo.path.startsWith('file://') ? photo.path : `file://${photo.path}`
    setCapturedPhoto({ uri, width: photo.width, height: photo.height })
  }

  const handleStartRecording = async () => {
    if (!hasMicPerm) await requestMic()
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
    setIsRecording(true)
    setDuration(0)
    timerRef.current = setInterval(() => setDuration(d => d + 1), 1000)
    cameraRef.current?.startRecording({
      onRecordingFinished: async video => {
        setIsRecording(false)
        setDuration(0)
        if (timerRef.current) clearInterval(timerRef.current)
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        const canShare = await Sharing.isAvailableAsync()
        if (canShare) await Sharing.shareAsync(video.path, { mimeType: 'video/mp4' })
      },
      onRecordingError: () => {
        setIsRecording(false)
        setDuration(0)
        if (timerRef.current) clearInterval(timerRef.current)
      },
    })
  }

  const handleStopRecording = async () => {
    await cameraRef.current?.stopRecording()
  }

  const handleShutter = () => {
    if (mode === 'photo') handlePhoto()
    else isRecording ? handleStopRecording() : handleStartRecording()
  }

  return (
    <View style={styles.container}>
      <Camera
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        device={device}
        format={format}
        isActive
        photo
        video
        audio={hasMicPerm}
        fps={30}
      />

      <ExclusionLayer
        regions={exclusions}
        onAdd={rect => setExclusions(prev => [...prev, rect])}
        onRemove={id => setExclusions(prev => prev.filter(r => r.id !== id))}
      />

      {isRecording && (
        <SafeAreaView style={styles.recBadgeWrap} edges={['top']}>
          <View style={styles.recBadge}>
            <View style={styles.recDot} />
            <Text style={styles.recTime}>{formatDuration(duration)}</Text>
          </View>
        </SafeAreaView>
      )}

      <SafeAreaView style={styles.controls} edges={['bottom']}>
        {exclusions.length > 0 && (
          <TouchableOpacity style={styles.clearBtn} onPress={() => setExclusions([])}>
            <Text style={styles.clearBtnText}>제외 영역 초기화</Text>
          </TouchableOpacity>
        )}

        <View style={styles.modeTabs}>
          {(['photo', 'video'] as CameraMode[]).map(m => (
            <TouchableOpacity key={m} onPress={() => { if (!isRecording) setMode(m) }}>
              <Text style={[styles.modeTab, mode === m && styles.modeTabActive]}>
                {m === 'photo' ? '사진' : '동영상'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.shutterRow}>
          <TouchableOpacity
            style={[styles.shutter, mode === 'video' && styles.shutterVideo, isRecording && styles.shutterRecording]}
            onPress={handleShutter}
            activeOpacity={0.8}
          >
            {mode === 'video' && isRecording ? (
              <View style={styles.stopSquare} />
            ) : (
              <View style={[styles.shutterInner, mode === 'video' && styles.shutterInnerVideo]} />
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: '#131313' },
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, backgroundColor: '#131313', justifyContent: 'center', alignItems: 'center' },
  hint: { color: '#888', fontSize: 15 },

  recBadgeWrap: { position: 'absolute', top: 0, left: 0, right: 0, alignItems: 'center', paddingTop: 8 },
  recBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
  },
  recDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#ff3b30' },
  recTime: { color: '#fff', fontSize: 14, fontWeight: '600', fontVariant: ['tabular-nums'] },

  controls: { position: 'absolute', bottom: 0, left: 0, right: 0 },

  clearBtn: {
    alignSelf: 'center', marginBottom: 12,
    paddingHorizontal: 16, paddingVertical: 6, borderRadius: 14,
    backgroundColor: 'rgba(52,211,153,0.2)', borderWidth: 1, borderColor: 'rgba(52,211,153,0.7)',
  },
  clearBtnText: { color: 'rgba(52,211,153,1)', fontSize: 13, fontWeight: '600' },

  modeTabs: { flexDirection: 'row', justifyContent: 'center', gap: 28, marginBottom: 20 },
  modeTab: { color: 'rgba(255,255,255,0.45)', fontSize: 15, fontWeight: '600' },
  modeTabActive: { color: '#fff' },

  shutterRow: { alignItems: 'center', paddingBottom: 36 },
  shutter: { width: 76, height: 76, borderRadius: 38, borderWidth: 4, borderColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  shutterVideo: { borderColor: '#ff3b30' },
  shutterRecording: { borderColor: '#ff3b30' },
  shutterInner: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#fff' },
  shutterInnerVideo: { backgroundColor: '#ff3b30' },
  stopSquare: { width: 26, height: 26, borderRadius: 4, backgroundColor: '#ff3b30' },
})
