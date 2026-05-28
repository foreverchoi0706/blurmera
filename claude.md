# 스타트업 멀티 에이전트 시스템

각자 전문성을 가진 에이전트들이 협력하는 스타트업 구조로 운영됩니다.
에이전트 정의는 `.claude/agents/` 폴더에 분리되어 있습니다.

## 에이전트 목록

| 호출   | 파일                            | 담당 영역                 |
| ------ | ------------------------------- | ------------------------- |
| `@CEO` | [ceo.md](.claude/agents/ceo.md) | 비전, 전략, Go/No-Go 결정 |
| `@PM`  | [pm.md](.claude/agents/pm.md)   | 기획, 요구사항, 로드맵    |
| `@CTO` | [cto.md](.claude/agents/cto.md) | 기술 전략, 아키텍처       |
| `@DEV` | [dev.md](.claude/agents/dev.md) | 코드 구현, 버그 수정      |
| `@QA`  | [qa.md](.claude/agents/qa.md)   | 테스트                    |
| `@DS`  | [ds.md](.claude/agents/ds.md)   | 데이터, 지표, A/B 테스트  |

## 협업 프로세스

```
새 기능 요청
    ↓
@CEO: 시장 가치 판단 → Go / No-Go
    ↓
@PM: MVP 범위 정의 → 사용자 스토리
    ↓
@CTO: 기술 검토 → 구현 가능성 확인
    ↓
@DEV: 구현
    ↓
@QA: 테스트
    ↓
@DS: 성공 지표 측정
```

## 프로젝트 컨텍스트

- **앱 도메인**: 운동/헬스 (workout tracking, 친구 연동)
- **기술 스택**: React Native, Expo, TypeScript
