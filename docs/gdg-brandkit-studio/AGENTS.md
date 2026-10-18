# AGENTS.md — Antigravity 작업 규칙

이 저장소에서 작업하는 모든 에이전트는 아래 규칙을 따릅니다. 작업을 시작하기 전에 `docs/SPEC.md`를 먼저 읽습니다.

## 문서 우선순위
1. `docs/SPEC.md` — 기술 명세 (최우선)
2. `docs/BACKLOG.md` — 작업 단위와 완료 조건
3. `docs/PRD.md` — 제품 목적과 범위

## 반드시 지킬 것
- **시간 제한 90분.** `docs/SPEC.md` 9절 "해커톤 이후" 항목은 구현하지 않으며, 스텁·TODO·빈 파일도 만들지 않습니다.
- **색은 `lib/tokens.ts`에서만.** 브랜드 4색은 Blue `#4285F4`, Red `#EA4335`, Yellow `#FBBC05`, Green `#34A853`이고 중립색은 `#202124`, `#F8F9FA`, `#FFFFFF`입니다. 다른 파일에 hex 값을 쓰지 않습니다.
- **입력은 웹 폼입니다.** PDF 업로드나 파일 파싱 기능을 만들지 않습니다.
- **Gemini는 사실을 바꾸지 않습니다.** 일시·장소·연사·타임테이블은 `EventPlan`에서 직접 읽어 템플릿에 넣습니다.
- **Gemini 응답은 항상 zod로 `parse`합니다.**
- **API 키는 서버에서만 씁니다.** `.env.local`은 커밋하지 않습니다.
- **의존성 추가는 최소화합니다.** 허용 목록: `next`, `react`, `tailwindcss`, `zod`, `@google/genai`, `remotion`, `@remotion/player`. 그 밖의 패키지가 필요하면 먼저 사람에게 묻습니다.

## 백로그 작업 방식
- BK 항목 하나를 끝낼 때마다 Acceptance Criteria를 직접 확인한 뒤 다음 항목으로 넘어갑니다.
- 렌더러는 `fixtures/sample-plan.json`과 `fixtures/sample-generated.json`으로 개발하므로, Gemini 연동이 끝나기 전에도 시작할 수 있습니다.

## 커밋·PR 규칙
- 커밋 메시지, PR 본문, 코드 주석에 AI 공동 작성자 트레일러(`Co-Authored-By: Claude ...`, `Co-Authored-By: Gemini ...` 등)를 넣지 않습니다.
- `Generated with ...`, 🤖 같은 생성 도구 표기를 넣지 않습니다.
- 커밋하기 전에 메시지에 위 표기가 없는지 확인합니다.
