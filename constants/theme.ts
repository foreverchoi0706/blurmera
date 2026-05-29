// MZ 비비드 그라데이션 + 글래스 테마
// 다크 베이스(살짝 보라빛) 위에 보라→핑크→오렌지 그라데이션을 액센트로 사용한다.

export const colors = {
  // 배경
  bg: "#0C0717", // 보라빛이 도는 딥 다크
  bgElev: "#17112271", // 카드/모달 표면
  bgSolid: "#171122", // 불투명 표면

  // 글래스
  glass: "rgba(255,255,255,0.07)",
  glassStrong: "rgba(255,255,255,0.12)",
  glassBorder: "rgba(255,255,255,0.14)",

  // 텍스트
  text: "#FFFFFF",
  textDim: "#9B92AD", // 보라빛 회색

  // 액센트 (그라데이션 단색 대체용)
  accent: "#EC4899", // 핑크
  accentSoft: "rgba(236,72,153,0.18)",
  accentBorder: "rgba(236,72,153,0.6)",

  // 상태색
  flash: "#FFD60A", // 플래시 노랑(기능 구분용 유지)
  rec: "#FF2D78", // 녹화/정지 — 핑크레드로 톤 맞춤
} as const;

// 브랜드 그라데이션
export const gradient = {
  brand: ["#7C3AED", "#EC4899", "#FB923C"] as const, // 보라→핑크→오렌지
  start: { x: 0, y: 0 },
  end: { x: 1, y: 1 },
} as const;

// 핑크 글로우 그림자 (MZ 포인트)
export const glow = {
  shadowColor: "#EC4899",
  shadowOpacity: 0.5,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 6 },
  elevation: 10,
} as const;
