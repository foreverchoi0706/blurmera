import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Sharing from "expo-sharing";
import { File, Paths } from "expo-file-system";
import {
  detectFacesAsync,
  FaceDetectorMode,
  FaceDetectorLandmarks,
  FaceDetectorClassifications,
} from "expo-face-detector";
import {
  Canvas,
  Image as SkiaImage,
  Blur,
  Mask,
  Circle,
  RadialGradient,
  vec,
  useImage,
  useCanvasRef,
  ImageFormat,
} from "@shopify/react-native-skia";
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
  const canvasRef = useCanvasRef();
  const skImage = useImage(imageUri);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [faces, setFaces] = useState<FaceRect[]>([]);
  const [exclusions, setExclusions] = useState<ExclusionRect[]>([]);
  const [detecting, setDetecting] = useState(true);

  // 원본 비율을 유지하며 가용 영역 안에 맞춘 캔버스 크기 (contain fit)
  const previewSize = useMemo(() => {
    if (!containerSize.width || !containerSize.height || !imageWidth || !imageHeight)
      return { width: 0, height: 0 };
    const scale = Math.min(
      containerSize.width / imageWidth,
      containerSize.height / imageHeight,
    );
    return { width: imageWidth * scale, height: imageHeight * scale };
  }, [containerSize, imageWidth, imageHeight]);

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
    try {
      // Skia 캔버스를 직접 스냅샷 (Android에서 view-shot보다 안정적)
      const snapshot = canvasRef.current?.makeImageSnapshot();
      if (!snapshot) {
        Alert.alert("저장 오류", "이미지를 생성하지 못했습니다.");
        return;
      }
      const bytes = snapshot.encodeToBytes(ImageFormat.JPEG, 95);
      const file = new File(Paths.cache, `blurema-${Date.now()}.jpg`);
      file.create({ intermediates: true, overwrite: true });
      file.write(bytes);

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(file.uri, { mimeType: "image/jpeg" });
      } else {
        Alert.alert("공유 불가", "이 기기에서 공유를 사용할 수 없습니다.");
      }
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
          setContainerSize({ width, height });
        }}
      >
        {/* 원본 비율을 유지한 캔버스 (가용 영역 중앙 정렬) */}
        <View
          style={[
            styles.canvas,
            { width: previewSize.width, height: previewSize.height },
          ]}
        >
          {/* 캡처 대상: 원본 + 페더링 블러를 하나의 Skia 캔버스로 렌더 */}
          {skImage && previewSize.width > 0 && (
            <Canvas ref={canvasRef} style={StyleSheet.absoluteFill}>
              <SkiaImage
                image={skImage}
                x={0}
                y={0}
                width={previewSize.width}
                height={previewSize.height}
                fit="fill"
              />
              {/* 페더링 블러: 가장자리가 부드럽게 사라지는 radial 마스크 */}
              {blurredFaces.map((f) => {
                const vx = (f.x - f.width * PAD) * scaleX;
                const vy = (f.y - f.height * PAD) * scaleY;
                const vw = f.width * (1 + PAD * 2) * scaleX;
                const vh = f.height * (1 + PAD * 2) * scaleY;
                const cx = vx + vw / 2;
                const cy = vy + vh / 2;
                const r = Math.max(vw, vh) / 2;
                return (
                  <Mask
                    key={f.id}
                    mask={
                      <Circle cx={cx} cy={cy} r={r}>
                        <RadialGradient
                          c={vec(cx, cy)}
                          r={r}
                          colors={[
                            "rgba(0,0,0,1)",
                            "rgba(0,0,0,1)",
                            "rgba(0,0,0,0)",
                          ]}
                          positions={[0, 0.6, 1]}
                        />
                      </Circle>
                    }
                  >
                    <SkiaImage
                      image={skImage}
                      x={0}
                      y={0}
                      width={previewSize.width}
                      height={previewSize.height}
                      fit="fill"
                    >
                      <Blur blur={14} />
                    </SkiaImage>
                  </Mask>
                );
              })}
            </Canvas>
          )}

          {/* 제외 영역 레이어 — 캔버스 밖이라 스냅샷에 포함되지 않음 */}
          {!detecting && (
            <ExclusionLayer
              regions={exclusions}
              onAdd={(rect) => setExclusions((prev) => [...prev, rect])}
              onRemove={(id) =>
                setExclusions((prev) => prev.filter((r) => r.id !== id))
              }
            />
          )}
        </View>

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
        {!detecting && exclusions.length > 0 && (
          <TouchableOpacity style={styles.btn} onPress={() => setExclusions([])}>
            <Text style={styles.btnText}>제외 초기화</Text>
          </TouchableOpacity>
        )}
        {!detecting && (
          <TouchableOpacity
            style={[styles.btn, styles.btnPrimary]}
            onPress={saveImage}
            activeOpacity={0.85}
          >
            <Ionicons name="share-outline" size={18} color="#000" />
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
  container: { flex: 1, backgroundColor: "#0E0E0E" },
  preview: {
    flex: 1,
    margin: 16,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#1e1e1e",
    justifyContent: "center",
    alignItems: "center",
  },
  canvas: {
    overflow: "hidden",
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
  actions: { flexDirection: "row", gap: 10, padding: 16, paddingTop: 8 },
  btn: {
    flex: 1,
    flexDirection: "row",
    gap: 6,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: "#1E1E1E",
    alignItems: "center",
    justifyContent: "center",
  },
  btnPrimary: { backgroundColor: "#ffffff" },
  btnText: { color: "#fff", fontSize: 15, fontWeight: "600" },
  btnPrimaryText: { color: "#000", fontWeight: "700" },
});
