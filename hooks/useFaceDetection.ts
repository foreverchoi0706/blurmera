import { useEffect } from 'react'
import { useSharedValue } from 'react-native-worklets-core'
import { useSkiaFrameProcessor } from 'react-native-vision-camera'
import { useFaceDetector } from 'react-native-vision-camera-face-detector'
import { Skia, TileMode, BlendMode } from '@shopify/react-native-skia'
import type { ExclusionRect } from '@/components/ExclusionLayer'

interface NormRect {
  x: number
  y: number
  width: number
  height: number
}

// 얼굴 박스를 둘러싼 여유(블러 영역을 얼굴보다 약간 크게)
const PAD = 0.15
// 프레임 픽셀 기준 블러 강도(sigma)
const BLUR_SIGMA = 18
// 페더 시작 지점(0~1). 낮을수록 더 부드럽게 퍼짐
const FEATHER_START = 0.6

export function useFaceDetection(
  exclusions: ExclusionRect[],
  viewWidth: number,
  viewHeight: number,
) {
  // 백 카메라 기준. 프레임에 직접 그릴 것이므로 autoMode 는 끔(기본값).
  const { detectFaces } = useFaceDetector({
    performanceMode: 'fast',
    landmarkMode: 'none',
    contourMode: 'none',
    classificationMode: 'none',
    minFaceSize: 0.1,
    trackingEnabled: true,
    cameraFacing: 'back',
  })

  // 제외 영역을 0~1 정규화해 워클릿으로 공유
  const exclusionsShared = useSharedValue<NormRect[]>([])
  useEffect(() => {
    if (viewWidth === 0 || viewHeight === 0) {
      exclusionsShared.value = []
      return
    }
    exclusionsShared.value = exclusions.map(r => ({
      x: r.x / viewWidth,
      y: r.y / viewHeight,
      width: r.width / viewWidth,
      height: r.height / viewHeight,
    }))
  }, [exclusions, viewWidth, viewHeight])

  const frameProcessor = useSkiaFrameProcessor(
    frame => {
      'worklet'
      // 1) 원본 프레임 렌더
      frame.render()

      const faces = detectFaces(frame)
      if (faces.length === 0) return

      const fw = frame.width
      const fh = frame.height
      const transparent = Skia.Color('rgba(0,0,0,0)')
      const opaque = Skia.Color('rgba(0,0,0,1)')

      const blurPaint = Skia.Paint()
      blurPaint.setImageFilter(
        Skia.ImageFilter.MakeBlur(BLUR_SIGMA, BLUR_SIGMA, TileMode.Clamp, null),
      )

      for (const face of faces) {
        const b = face.bounds
        const ex = b.x - b.width * PAD
        const ey = b.y - b.height * PAD
        const ew = b.width * (1 + PAD * 2)
        const eh = b.height * (1 + PAD * 2)

        // 제외 영역과 겹치면 건너뜀(정규화 좌표 비교)
        const nx = ex / fw
        const ny = ey / fh
        const nw = ew / fw
        const nh = eh / fh
        let excluded = false
        const list = exclusionsShared.value
        for (let i = 0; i < list.length; i++) {
          const r = list[i]
          if (
            !(
              nx + nw < r.x ||
              r.x + r.width < nx ||
              ny + nh < r.y ||
              r.y + r.height < ny
            )
          ) {
            excluded = true
            break
          }
        }
        if (excluded) continue

        const cx = ex + ew / 2
        const cy = ey + eh / 2
        const radius = Math.max(ew, eh) / 2

        // 2) 레이어 안에 흐린 프레임을 그린 뒤, radial 그라데이션으로 가장자리를 부드럽게 깎아냄
        frame.saveLayer()
        frame.render(blurPaint)

        const maskPaint = Skia.Paint()
        maskPaint.setBlendMode(BlendMode.DstIn)
        maskPaint.setShader(
          Skia.Shader.MakeRadialGradient(
            { x: cx, y: cy },
            radius,
            [opaque, opaque, transparent],
            [0, FEATHER_START, 1],
            TileMode.Clamp,
          ),
        )
        maskPaint.setImageFilter(null)
        frame.drawRect(Skia.XYWHRect(0, 0, fw, fh), maskPaint)
        frame.restore()
      }
    },
    [detectFaces, exclusionsShared],
  )

  return { frameProcessor }
}
