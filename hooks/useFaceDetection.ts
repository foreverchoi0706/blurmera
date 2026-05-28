import { useEffect, useMemo } from 'react'
import { useSharedValue } from 'react-native-reanimated'
import { useFrameProcessor, VisionCameraProxy } from 'react-native-vision-camera'
import type { ExclusionRect } from '@/components/ExclusionLayer'

interface NormRect {
  x: number
  y: number
  width: number
  height: number
}

const PLUGIN_OPTIONS = {
  performanceMode: 'fast',
  landmarkMode: 'none',
  classificationMode: 'none',
  minFaceSize: 0.1,
  trackingEnabled: true,
}

export function useFaceDetection(
  exclusions: ExclusionRect[],
  viewWidth: number,
  viewHeight: number,
) {
  const exclusionsShared = useSharedValue<NormRect[]>([])

  // initFrameProcessorPlugin 이 null 을 반환하면 (네이티브 빌드 미포함 or 미등록)
  // 앱이 크래시하지 않도록 graceful degrade
  const detectFaces = useMemo(() => {
    try {
      const plugin = VisionCameraProxy.initFrameProcessorPlugin('detectFaces', PLUGIN_OPTIONS)
      if (!plugin) {
        console.warn('[FaceDetection] "detectFaces" plugin not found — face detection disabled. Rebuild the native app.')
        return undefined
      }
      return (frame: Parameters<typeof plugin.call>[0]): unknown[] => {
        'worklet'
        return (plugin.call(frame) as unknown[]) ?? []
      }
    } catch (e) {
      console.warn('[FaceDetection] Failed to init plugin:', e)
      return undefined
    }
  }, [])

  useEffect(() => {
    if (viewWidth === 0 || viewHeight === 0) return
    exclusionsShared.value = exclusions.map(r => ({
      x: r.x / viewWidth,
      y: r.y / viewHeight,
      width: r.width / viewWidth,
      height: r.height / viewHeight,
    }))
  }, [exclusions, viewWidth, viewHeight])

  const frameProcessor = useFrameProcessor(
    frame => {
      'worklet'
      if (!detectFaces) return

      const PAD = 0.12
      const detected = detectFaces(frame) as Array<{ bounds: { x: number; y: number; width: number; height: number } }>

      for (const face of detected) {
        const normFace: NormRect = {
          x: face.bounds.x / frame.width,
          y: face.bounds.y / frame.height,
          width: face.bounds.width / frame.width,
          height: face.bounds.height / frame.height,
        }
        const excluded = exclusionsShared.value.some(
          ex =>
            !(
              normFace.x + normFace.width < ex.x ||
              ex.x + ex.width < normFace.x ||
              normFace.y + normFace.height < ex.y ||
              ex.y + ex.height < normFace.y
            ),
        )
        if (excluded) continue
        // TODO: normFace + PAD 좌표를 runOnJS 로 전달해 Skia Canvas overlay 블러 렌더링
        void PAD
      }
    },
    [detectFaces, exclusionsShared],
  )

  return { frameProcessor }
}
