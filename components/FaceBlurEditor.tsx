import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import * as Sharing from "expo-sharing";
import { captureRef } from "react-native-view-shot";
import {
  detectFacesAsync,
  FaceDetectorMode,
  FaceDetectorLandmarks,
  FaceDetectorClassifications,
} from "expo-face-detector";
import { ExclusionLayer, type ExclusionRect } from "./ExclusionLayer";

const PAD = 0.15;

interface FaceRect {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

function overlaps(
  ax: number,
  ay: number,
  aw: number,
  ah: number,
  bx: number,
  by: number,
  bw: number,
  bh: number,
) {
  return !(ax + aw < bx || bx + bw < ax || ay + ah < by || by + bh < ay);
}

interface Props {
  imageUri: string;
  imageWidth: number;
  imageHeight: number;
  onClose: () => void;
  closeLabel?: string;
}

export function FaceBlurEditor({
  imageUri,
  imageWidth,
  imageHeight,
  onClose,
  closeLabel = "다시 찍기",
}: Props) {
  const previewRef = useRef<View>(null);
  const [previewSize, setPreviewSize] = useState({ width: 0, height: 0 });
  const [faces, setFaces] = useState<FaceRect[]>([]);
  const [exclusions, setExclusions] = useState<ExclusionRect[]>([]);
  const [detecting, setDetecting] = useState(true);

  const scaleX = previewSize.width > 0 ? previewSize.width / imageWidth : 0;
  const scaleY = previewSize.height > 0 ? previewSize.height / imageHeight : 0;

  useEffect(() => {
    detectFacesAsync(imageUri, {
      mode: FaceDetectorMode.accurate,
      detectLandmarks: FaceDetectorLandmarks.none,
      runClassifications: FaceDetectorClassifications.none,
      minDetectionInterval: 0,
      tracking: false,
    })
      .then(({ faces }) => {
        setFaces(
          faces.map((f, i) => ({
            id: String(i),
            x: f.bounds.origin.x,
            y: f.bounds.origin.y,
            width: f.bounds.size.width,
            height: f.bounds.size.height,
          })),
        );
      })
      .catch((e: Error) => {
        console.error(e);
        Alert.alert("얼굴 감지 오류", e?.message ?? String(e));
      })
      .finally(() => setDetecting(false));
  }, [imageUri]);

  // 제외 영역과 겹치지 않는 얼굴만 블러
  const blurredFaces = useMemo(() => {
    if (scaleX === 0 || scaleY === 0) return [];
    return faces.filter((f) => {
      const vx = (f.x - f.width * PAD) * scaleX;
      const vy = (f.y - f.height * PAD) * scaleY;
      const vw = f.width * (1 + PAD * 2) * scaleX;
      const vh = f.height * (1 + PAD * 2) * scaleY;
      return !exclusions.some((ex) =>
        overlaps(vx, vy, vw, vh, ex.x, ex.y, ex.width, ex.height),
      );
    });
  }, [faces, exclusions, scaleX, scaleY]);

  const saveImage = async () => {
    if (!previewRef.current) return;
    try {
      const uri = await captureRef(previewRef, {
        format: "jpg",
        quality: 0.95,
      });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) await Sharing.shareAsync(uri);
    } catch (e) {
      Alert.alert("저장 오류", e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <View style={styles.container}>
      <View
        style={styles.preview}
        onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout;
          setPreviewSize({ width, height });
        }}
      >
        {/* 캡처 대상: 원본 이미지 + 얼굴 블러 오버레이 */}
        <View
          ref={previewRef}
          style={StyleSheet.absoluteFill}
          collapsable={false}
        >
          <Image
            source={{ uri: imageUri }}
            style={StyleSheet.absoluteFill}
            resizeMode="stretch"
          />
          {blurredFaces.map((f) => {
            const vx = (f.x - f.width * PAD) * scaleX;
            const vy = (f.y - f.height * PAD) * scaleY;
            const vw = f.width * (1 + PAD * 2) * scaleX;
            const vh = f.height * (1 + PAD * 2) * scaleY;
            return (
              <View
                key={f.id}
                style={{
                  position: "absolute",
                  left: vx,
                  top: vy,
                  width: vw,
                  height: vh,
                  overflow: "hidden",
                }}
              >
                <Image
                  source={{ uri: imageUri }}
                  style={{
                    position: "absolute",
                    width: previewSize.width,
                    height: previewSize.height,
                    left: -vx,
                    top: -vy,
                  }}
                  resizeMode="stretch"
                  blurRadius={25}
                />
              </View>
            );
          })}
        </View>

        {/* 제외 영역 레이어 — previewRef 밖이라 캡처에 포함되지 않음 */}
        {!detecting && (
          <ExclusionLayer
            regions={exclusions}
            onAdd={(rect) => setExclusions((prev) => [...prev, rect])}
            onRemove={(id) =>
              setExclusions((prev) => prev.filter((r) => r.id !== id))
            }
          />
        )}

        {detecting && (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.loadingText}>얼굴 감지 중...</Text>
          </View>
        )}
      </View>

      {!detecting && (
        <Text style={styles.hint}>
          {faces.length === 0
            ? "감지된 얼굴 없음"
            : exclusions.length > 0
              ? `얼굴 ${faces.length}개 · 제외 ${exclusions.length}개 · 탭하면 제거`
              : `얼굴 ${faces.length}개 감지 · 드래그로 블러 제외 영역 지정`}
        </Text>
      )}

      <View style={styles.actions}>
        <TouchableOpacity style={styles.btn} onPress={onClose}>
          <Text style={styles.btnText}>{closeLabel}</Text>
        </TouchableOpacity>
        {!detecting && (
          <TouchableOpacity
            style={[styles.btn, styles.btnPrimary]}
            onPress={saveImage}
          >
            <Text style={[styles.btnText, styles.btnPrimaryText]}>
              공유 / 저장
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#131313" },
  preview: {
    flex: 1,
    margin: 16,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#1e1e1e",
  },
  loading: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: { color: "#fff", fontSize: 14 },
  hint: {
    color: "rgba(52,211,153,0.8)",
    fontSize: 12,
    textAlign: "center",
    marginTop: -8,
    marginBottom: 8,
  },
  actions: { flexDirection: "row", gap: 12, padding: 16, paddingTop: 8 },
  btn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#2a2a2a",
    alignItems: "center",
  },
  btnPrimary: { backgroundColor: "#ffffff" },
  btnText: { color: "#fff", fontSize: 15, fontWeight: "600" },
  btnPrimaryText: { color: "#000" },
});
