import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  Camera,
  useCameraDevice,
  useCameraFormat,
  useCameraPermission,
  useMicrophonePermission,
} from "react-native-vision-camera";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import * as Sharing from "expo-sharing";
import { File, Paths } from "expo-file-system";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useSharedValue } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { FaceBlurEditor } from "./FaceBlurEditor";
import { ExclusionLayer, type ExclusionRect } from "./ExclusionLayer";
import PermissionPrompt from "./PermissionPrompt";
import OnboardingOverlay from "./OnboardingOverlay";
import { useFaceDetection } from "@/hooks/useFaceDetection";
import { colors, gradient } from "@/constants/theme";

// 온보딩 1회 노출 플래그 (AsyncStorage 미설치 → expo-file-system 사용)
const onboardingFlag = () => new File(Paths.document, "onboarding_v1.flag");

type CameraMode = "photo" | "video";

// 실시간 Skia 페더 블러는 카메라 프레임을 GPU 텍스처(HardwareBuffer)로 넘겨
// 프리뷰에 그리는데, Android 에뮬레이터의 가상 GPU는 이 버퍼 공유를 지원하지
// 못해 프리뷰가 검게 죽는다(updateAndRelease/HardwareBuffer.close 실패).
// 실기기에서는 정상 동작하므로, 기기 테스트 시 true 로 켠다.
const ENABLE_LIVE_BLUR = false;

interface CapturedPhoto {
  uri: string;
  width: number;
  height: number;
}

function formatDuration(sec: number) {
  const m = String(Math.floor(sec / 60)).padStart(2, "0");
  const s = String(sec % 60).padStart(2, "0");
  return `${m}:${s}`;
}

type FlashMode = "off" | "on" | "auto";

export function MosaicCamera() {
  const [position, setPosition] = useState<"back" | "front">("back");
  const [flash, setFlash] = useState<FlashMode>("off");
  const device = useCameraDevice(position);
  const { hasPermission: hasCamPerm, requestPermission: requestCam } =
    useCameraPermission();
  const { hasPermission: hasMicPerm, requestPermission: requestMic } =
    useMicrophonePermission();
  const cameraRef = useRef<Camera>(null);

  const [mode, setMode] = useState<CameraMode>("photo");
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [exclusions, setExclusions] = useState<ExclusionRect[]>([]);
  const [capturedPhoto, setCapturedPhoto] = useState<CapturedPhoto | null>(
    null,
  );
  const [viewSize, setViewSize] = useState({ width: 0, height: 0 });
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [gridOn, setGridOn] = useState(false);
  const [timer, setTimer] = useState<0 | 3 | 10>(0);
  const [countdown, setCountdown] = useState(0);
  const [focusPoint, setFocusPoint] = useState<{ x: number; y: number } | null>(
    null,
  );
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const focusClearRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 핀치 줌용 공유값
  const zoomSV = useSharedValue(1);
  const zoomStart = useSharedValue(1);

  const format = useCameraFormat(device, [{ fps: 30 }]);

  // 실시간 얼굴 페더 블러 (Skia 프레임 프로세서) — 실기기 전용
  const { frameProcessor } = useFaceDetection(
    exclusions,
    viewSize.width,
    viewSize.height,
  );

  useEffect(
    () => () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
      if (focusClearRef.current) clearTimeout(focusClearRef.current);
    },
    [],
  );

  // 카메라 전환 시 줌 초기화
  useEffect(() => {
    const n = device?.neutralZoom ?? 1;
    setZoom(n);
    zoomSV.value = n;
  }, [position, device?.neutralZoom]);

  // 첫 진입 시에만 사용법 안내 노출
  useEffect(() => {
    try {
      if (!onboardingFlag().exists) setShowOnboarding(true);
    } catch {
      setShowOnboarding(true);
    }
  }, []);

  const dismissOnboarding = () => {
    setShowOnboarding(false);
    try {
      onboardingFlag().create({ overwrite: true });
    } catch {
      // 플래그 기록 실패는 무시 (다음 실행에 다시 보일 수 있음)
    }
  };

  if (!hasCamPerm) {
    return (
      <PermissionPrompt
        onRequest={async () => {
          await requestCam();
          await requestMic();
        }}
      />
    );
  }

  if (!device) {
    return (
      <View style={styles.center}>
        <Text style={styles.hint}>카메라를 불러오는 중...</Text>
      </View>
    );
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
    );
  }

  const cycleFlash = () =>
    setFlash((f) => (f === "off" ? "auto" : f === "auto" ? "on" : "off"));

  const flipCamera = () => {
    if (isRecording) return;
    setPosition((p) => (p === "back" ? "front" : "back"));
  };

  const flashIcon =
    flash === "off"
      ? "flash-off"
      : flash === "auto"
        ? "flash-outline"
        : "flash";
  const flashLabel = flash === "off" ? "끔" : flash === "auto" ? "자동" : "켬";

  const handlePhoto = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const photo = await cameraRef.current?.takePhoto({
      flash: device.hasFlash ? flash : "off",
    });
    if (!photo) return;
    const uri = photo.path.startsWith("file://")
      ? photo.path
      : `file://${photo.path}`;
    setCapturedPhoto({ uri, width: photo.width, height: photo.height });
  };

  const handleStartRecording = async () => {
    if (!hasMicPerm) await requestMic();
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setIsRecording(true);
    setDuration(0);
    timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    cameraRef.current?.startRecording({
      onRecordingFinished: async (video) => {
        setIsRecording(false);
        setDuration(0);
        if (timerRef.current) clearInterval(timerRef.current);
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success,
        );
        const canShare = await Sharing.isAvailableAsync();
        if (canShare)
          await Sharing.shareAsync(video.path, { mimeType: "video/mp4" });
      },
      onRecordingError: () => {
        setIsRecording(false);
        setDuration(0);
        if (timerRef.current) clearInterval(timerRef.current);
      },
    });
  };

  const handleStopRecording = async () => {
    await cameraRef.current?.stopRecording();
  };

  const performCapture = () => {
    if (mode === "photo") handlePhoto();
    else handleStartRecording();
  };

  const handleShutter = () => {
    // 녹화 중이면 즉시 정지
    if (mode === "video" && isRecording) {
      handleStopRecording();
      return;
    }
    // 타이머가 켜져 있으면 카운트다운 후 촬영
    if (timer > 0) {
      setCountdown(timer);
      countdownRef.current = setInterval(() => {
        setCountdown((c) => {
          if (c <= 1) {
            if (countdownRef.current) clearInterval(countdownRef.current);
            performCapture();
            return 0;
          }
          return c - 1;
        });
      }, 1000);
      return;
    }
    performCapture();
  };

  const cycleTimer = () => setTimer((t) => (t === 0 ? 3 : t === 3 ? 10 : 0));

  // 탭하면 해당 지점에 초점
  const handleFocus = (x: number, y: number) => {
    if (!device.supportsFocus) return;
    cameraRef.current?.focus({ x, y }).catch(() => {});
    setFocusPoint({ x, y });
    if (focusClearRef.current) clearTimeout(focusClearRef.current);
    focusClearRef.current = setTimeout(() => setFocusPoint(null), 900);
  };

  // 핀치 줌 + 탭 초점 (드래그 제외 영역 지정과 동시 동작)
  const minZoom = device.minZoom;
  const maxZoom = Math.min(device.maxZoom, 10);
  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      "worklet";
      zoomStart.value = zoomSV.value;
    })
    .onUpdate((e) => {
      "worklet";
      const z = Math.min(Math.max(zoomStart.value * e.scale, minZoom), maxZoom);
      zoomSV.value = z;
      scheduleOnRN(setZoom, z);
    });
  const tapGesture = Gesture.Tap()
    .maxDuration(250)
    .onEnd((e) => {
      "worklet";
      scheduleOnRN(handleFocus, e.x, e.y);
    });
  const cameraGesture = Gesture.Simultaneous(pinchGesture, tapGesture);

  return (
    <View
      style={styles.container}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        setViewSize({ width, height });
      }}
    >
      <GestureDetector gesture={cameraGesture}>
        <View style={StyleSheet.absoluteFill}>
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
            zoom={zoom}
            torch={
              mode === "video" && flash === "on" && device.hasTorch
                ? "on"
                : "off"
            }
            frameProcessor={ENABLE_LIVE_BLUR ? frameProcessor : undefined}
          />

          {/* 3분할 그리드 */}
          {gridOn && (
            <View style={StyleSheet.absoluteFill} pointerEvents="none">
              <View style={[styles.gridV, { left: "33.33%" }]} />
              <View style={[styles.gridV, { left: "66.66%" }]} />
              <View style={[styles.gridH, { top: "33.33%" }]} />
              <View style={[styles.gridH, { top: "66.66%" }]} />
            </View>
          )}

          <ExclusionLayer
            regions={exclusions}
            onAdd={(rect) => setExclusions((prev) => [...prev, rect])}
            onRemove={(id) =>
              setExclusions((prev) => prev.filter((r) => r.id !== id))
            }
          />

          {/* 초점 표시 */}
          {focusPoint && (
            <View
              pointerEvents="none"
              style={[
                styles.focusBox,
                { left: focusPoint.x - 35, top: focusPoint.y - 35 },
              ]}
            />
          )}

          {/* 줌 배율 */}
          {zoom > (device.neutralZoom ?? 1) + 0.05 && (
            <View style={styles.zoomBadge} pointerEvents="none">
              <Text style={styles.zoomText}>{zoom.toFixed(1)}x</Text>
            </View>
          )}

          {/* 타이머 카운트다운 */}
          {countdown > 0 && (
            <View style={styles.countdownWrap} pointerEvents="none">
              <Text style={styles.countdownText}>{countdown}</Text>
            </View>
          )}
        </View>
      </GestureDetector>

      {/* 상단 바: 좌측(플래시·전환) / 우측(타이머·그리드) */}
      <SafeAreaView
        style={styles.topBar}
        edges={["top"]}
        pointerEvents="box-none"
      >
        <View style={styles.topGroup}>
          <TouchableOpacity
            style={styles.pill}
            onPress={cycleFlash}
            activeOpacity={0.8}
            hitSlop={8}
          >
            <Ionicons
              name={flashIcon}
              size={16}
              color={flash === "off" ? "#fff" : "#FFD60A"}
            />
            <Text
              style={[
                styles.pillLabel,
                flash !== "off" && styles.pillLabelFlash,
              ]}
            >
              {flashLabel}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={flipCamera}
            activeOpacity={0.8}
            hitSlop={8}
          >
            <Ionicons name="camera-reverse-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={[styles.topGroup, styles.topGroupRight]}>
          <TouchableOpacity
            style={[styles.pill, timer > 0 && styles.btnActive]}
            onPress={cycleTimer}
            activeOpacity={0.8}
            hitSlop={8}
          >
            <Ionicons
              name="timer-outline"
              size={16}
              color={timer > 0 ? colors.accent : "#fff"}
            />
            <Text
              style={[styles.pillLabel, timer > 0 && styles.pillLabelAccent]}
            >
              {timer === 0 ? "끔" : `${timer}초`}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.iconBtn, gridOn && styles.btnActive]}
            onPress={() => setGridOn((g) => !g)}
            activeOpacity={0.8}
            hitSlop={8}
          >
            <Ionicons
              name="grid-outline"
              size={18}
              color={gridOn ? colors.accent : "#fff"}
            />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {isRecording && (
        <SafeAreaView style={styles.recBadgeWrap} edges={["top"]}>
          <View style={styles.recBadge}>
            <View style={styles.recDot} />
            <Text style={styles.recTime}>{formatDuration(duration)}</Text>
          </View>
        </SafeAreaView>
      )}

      <SafeAreaView style={styles.controls} edges={["bottom"]}>
        <LinearGradient
          colors={["transparent", "rgba(8,4,16,0.55)", "rgba(8,4,16,0.85)"]}
          style={styles.controlsBackdrop}
          pointerEvents="none"
        />
        {exclusions.length > 0 && (
          <TouchableOpacity
            style={styles.clearBtn}
            onPress={() => setExclusions([])}
            activeOpacity={0.8}
          >
            <Ionicons
              name="refresh"
              size={14}
              color={colors.accent}
              style={{ marginRight: 5 }}
            />
            <Text style={styles.clearBtnText}>제외 영역 초기화</Text>
          </TouchableOpacity>
        )}

        <View style={styles.segment}>
          {(["photo", "video"] as CameraMode[]).map((m) => {
            const active = mode === m;
            const label = (
              <Text
                style={[styles.segmentText, active && styles.segmentTextActive]}
              >
                {m === "photo" ? "사진" : "동영상"}
              </Text>
            );
            return (
              <TouchableOpacity
                key={m}
                onPress={() => {
                  if (!isRecording) setMode(m);
                }}
                disabled={isRecording}
                activeOpacity={0.8}
              >
                {active ? (
                  <LinearGradient
                    colors={gradient.brand}
                    start={gradient.start}
                    end={gradient.end}
                    style={styles.segmentItem}
                  >
                    {label}
                  </LinearGradient>
                ) : (
                  <View style={styles.segmentItem}>{label}</View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.shutterRow}>
          <TouchableOpacity
            onPress={handleShutter}
            activeOpacity={0.85}
            style={mode === "photo" && styles.shutterShadow}
          >
            {mode === "photo" ? (
              <LinearGradient
                colors={gradient.brand}
                start={gradient.start}
                end={gradient.end}
                style={styles.shutterRing}
              >
                <View style={styles.shutterCore} />
              </LinearGradient>
            ) : (
              <View style={styles.shutterRingVideo}>
                {isRecording ? (
                  <View style={styles.stopSquare} />
                ) : (
                  <View style={styles.shutterCoreVideo} />
                )}
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.helpBtnBottom}
            onPress={() => setShowOnboarding(true)}
            activeOpacity={0.8}
            hitSlop={8}
          >
            <Ionicons name="help" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <OnboardingOverlay
        visible={showOnboarding}
        onDismiss={dismissOnboarding}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: "#131313" },
  container: { flex: 1, backgroundColor: "#000" },
  center: {
    flex: 1,
    backgroundColor: "#131313",
    justifyContent: "center",
    alignItems: "center",
  },
  hint: { color: "#888", fontSize: 15 },

  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  topGroup: { alignItems: "flex-start", gap: 10 },
  topGroupRight: { alignItems: "flex-end" },
  btnActive: { borderColor: colors.accentBorder, backgroundColor: colors.accentSoft },

  gridV: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: "rgba(255,255,255,0.3)",
  },
  gridH: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.3)",
  },
  focusBox: {
    position: "absolute",
    width: 70,
    height: 70,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: colors.accent,
  },
  zoomBadge: {
    position: "absolute",
    alignSelf: "center",
    bottom: 16,
    backgroundColor: colors.glassStrong,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
  },
  zoomText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  countdownWrap: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  countdownText: {
    color: "#fff",
    fontSize: 96,
    fontWeight: "800",
    textShadowColor: "rgba(236,72,153,0.7)",
    textShadowRadius: 20,
  },

  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    height: 36,
    paddingHorizontal: 12,
    borderRadius: 18,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  pillLabel: { color: "#fff", fontSize: 13, fontWeight: "700" },
  pillLabelFlash: { color: colors.flash },
  pillLabelAccent: { color: colors.accent },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    justifyContent: "center",
    alignItems: "center",
  },

  recBadgeWrap: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    paddingTop: 8,
  },
  recBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.glassStrong,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  recDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.rec },
  recTime: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },

  controls: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 20,
  },
  controlsBackdrop: { ...StyleSheet.absoluteFillObject },

  clearBtn: {
    flexDirection: "row",
    alignSelf: "center",
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.accentBorder,
  },
  clearBtnText: { color: colors.accent, fontSize: 13, fontWeight: "700" },

  segment: {
    flexDirection: "row",
    alignSelf: "center",
    marginBottom: 20,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: 22,
    padding: 4,
  },
  segmentItem: {
    paddingHorizontal: 22,
    paddingVertical: 7,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 14,
    fontWeight: "700",
  },
  segmentTextActive: { color: "#fff" },

  shutterRow: { alignItems: "center", paddingBottom: 96 },
  helpBtnBottom: {
    position: "absolute",
    right: 28,
    bottom: 116,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    justifyContent: "center",
    alignItems: "center",
  },
  shutterShadow: {
    borderRadius: 40,
    shadowColor: colors.accent,
    shadowOpacity: 0.6,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
    elevation: 12,
  },
  shutterRing: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  shutterCore: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#fff",
  },
  shutterRingVideo: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: colors.rec,
    justifyContent: "center",
    alignItems: "center",
  },
  shutterCoreVideo: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.rec,
  },
  stopSquare: {
    width: 26,
    height: 26,
    borderRadius: 4,
    backgroundColor: colors.rec,
  },
});
