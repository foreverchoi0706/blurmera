import React, { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import { runOnJS, useSharedValue } from 'react-native-reanimated'

export interface ExclusionRect {
  id: string
  x: number
  y: number
  width: number
  height: number
}

interface Props {
  regions: ExclusionRect[]
  onAdd: (rect: ExclusionRect) => void
  onRemove: (id: string) => void
}

const MIN_SIZE = 24
const COLOR = 'rgba(52, 211, 153, 0.9)'
const COLOR_BG = 'rgba(52, 211, 153, 0.08)'

export function ExclusionLayer({ regions, onAdd, onRemove }: Props) {
  const startX = useSharedValue(0)
  const startY = useSharedValue(0)
  const [draft, setDraft] = useState<{ x: number; y: number; w: number; h: number } | null>(null)

  const clearDraft = () => setDraft(null)
  const updateDraft = (x: number, y: number, w: number, h: number) => setDraft({ x, y, w, h })

  const commitDraft = (sx: number, sy: number, ex: number, ey: number) => {
    setDraft(null)
    const x = Math.min(sx, ex)
    const y = Math.min(sy, ey)
    const w = Math.abs(ex - sx)
    const h = Math.abs(ey - sy)
    if (w < MIN_SIZE || h < MIN_SIZE) return
    onAdd({ id: String(Date.now()), x, y, width: w, height: h })
  }

  const pan = Gesture.Pan()
    .minDistance(MIN_SIZE / 2)
    .onStart(e => {
      startX.value = e.x
      startY.value = e.y
      runOnJS(updateDraft)(e.x, e.y, 0, 0)
    })
    .onUpdate(e => {
      runOnJS(updateDraft)(startX.value, startY.value, e.x - startX.value, e.y - startY.value)
    })
    .onEnd(e => {
      runOnJS(commitDraft)(startX.value, startY.value, e.x, e.y)
    })
    .onFinalize(() => {
      runOnJS(clearDraft)()
    })

  const draftRect = draft
    ? {
        x: draft.w >= 0 ? draft.x : draft.x + draft.w,
        y: draft.h >= 0 ? draft.y : draft.y + draft.h,
        width: Math.abs(draft.w),
        height: Math.abs(draft.h),
      }
    : null

  return (
    <GestureDetector gesture={pan}>
      <View style={StyleSheet.absoluteFill}>
        {regions.map(r => (
          <RegionBox key={r.id} rect={r} onRemove={onRemove} />
        ))}
        {draftRect && draftRect.width > 2 && draftRect.height > 2 && (
          <View
            pointerEvents="none"
            style={[
              styles.box,
              styles.draft,
              { left: draftRect.x, top: draftRect.y, width: draftRect.width, height: draftRect.height },
            ]}
          />
        )}
      </View>
    </GestureDetector>
  )
}

function RegionBox({ rect, onRemove }: { rect: ExclusionRect; onRemove: (id: string) => void }) {
  const tap = Gesture.Tap().onEnd(() => runOnJS(onRemove)(rect.id))
  return (
    <GestureDetector gesture={tap}>
      <View style={[styles.box, styles.confirmed, { left: rect.x, top: rect.y, width: rect.width, height: rect.height }]}>
        <View style={styles.removeBtn}>
          <Text style={styles.removeText}>✕</Text>
        </View>
      </View>
    </GestureDetector>
  )
}

const styles = StyleSheet.create({
  box: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: COLOR,
    backgroundColor: COLOR_BG,
  },
  draft: {
    borderStyle: 'dashed',
  },
  confirmed: {
    borderStyle: 'solid',
  },
  removeBtn: {
    position: 'absolute',
    top: -10,
    right: -10,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLOR,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeText: {
    color: '#000',
    fontSize: 9,
    fontWeight: '800',
  },
})
