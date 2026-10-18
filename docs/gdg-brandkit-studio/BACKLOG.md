# BACKLOG — GDG BrandKit & Reels Studio (WWA 형식)

> 형식: Why-What-Acceptance · 범위 기준: [PRD.md](./PRD.md) 7.2 · 기술 기준: [SPEC.md](./SPEC.md)
> **독립성 규칙:** 모든 항목은 `fixtures/sample-plan.json`, `fixtures/sample-generated.json`을 입력으로 쓰면 다른 항목 없이 따로 개발할 수 있습니다. Gemini 연동(BK-03)이 끝나지 않아도 렌더러 개발을 시작할 수 있습니다.

---

## Sprint 0 — 해커톤 90분 MVP

### BK-01 · 프로젝트 골격, 디자인 토큰, 스키마, 픽스처 (10분)

**Why:** 모든 산출물이 같은 색과 같은 데이터 구조를 써야 브랜드가 흔들리지 않고, 렌더러를 병렬로 개발할 수 있습니다. (OKR O1-KR3)

**What:** Next.js 앱을 만들고 `lib/tokens.ts`(7색 + 테마 3종), `lib/schema.ts`(`EventPlan`, `Generated` zod 스키마), 픽스처 2개, Pretendard OTF 폰트를 둡니다. SPEC 3·4·5절을 따릅니다.

**Acceptance Criteria:**
- `npm run dev`로 빈 화면이 뜹니다
- 두 픽스처가 각각 `EventPlanSchema.parse`, `GeneratedSchema.parse`를 통과합니다
- 저장소 전체에서 `#[0-9A-Fa-f]{6}` 검색 결과가 `lib/tokens.ts` 밖에 없습니다

---

### BK-02 · 기획서 웹 폼 (입력·수정·자동 저장) (15분)

**Why:** 오거나이저가 기획서를 한 곳에 한 번만 입력하면, 모든 에셋이 그 내용을 씁니다. 행사 정보가 바뀌어도 폼만 고치면 됩니다. (O1-KR1)

**What:** 화면 왼쪽에 `EventPlan` 폼을 둡니다. 기본 정보(텍스트·날짜·시간), 타임테이블(행 추가·삭제), 연사(카드 추가·삭제, 사진 URL 또는 파일), 특별 이벤트, 후원사로 구성합니다. 입력할 때마다 `localStorage`에 저장합니다. "샘플 불러오기" 버튼으로 `sample-plan.json`을 채울 수 있습니다.

**Acceptance Criteria:**
- 새로고침해도 입력한 내용이 그대로 남아 있습니다
- 타임테이블과 연사 행을 추가·삭제·수정할 수 있습니다
- 필수 필드(테마, 연도, 제목, 날짜, 시작 시간, 장소)가 비어 있으면 "생성" 버튼이 비활성화됩니다
- 사실 필드(날짜·장소·연사 등)를 고치면 생성된 썸네일·카드뉴스에 다시 생성하지 않아도 즉시 반영됩니다

---

### BK-03 · Gemini 전체 생성 `/api/generate` (10분)

**Why:** 오거나이저가 카드 문구, 릴스 대본, 캡션을 직접 쓰는 시간을 없앱니다. (O1-KR1)

**What:** "✨ 브랜드 킷 생성"을 누르면 `EventPlan`을 Gemini에 보내 `Generated`를 받습니다. 응답은 zod로 검증하고, 실패하면 오류 내용을 붙여 한 번 더 요청합니다. SPEC 7.2절을 따릅니다.

**Acceptance Criteria:**
- 샘플 기획서로 30초 안에 4개 탭이 모두 채워집니다
- 응답은 항상 `GeneratedSchema.parse`를 통과하며, 두 번 실패하면 오류 메시지를 표시합니다
- 기획서에 없는 사실(예: 경품 이름)을 지어내지 않습니다
- API 키가 브라우저 번들에 들어가지 않습니다

---

### BK-04 · 티켓팅 썸네일 2종 (8분)

**Why:** 티켓 페이지는 행사 공지 직후 가장 먼저 필요한 에셋입니다. (O1-KR2)

**What:** `POST /api/render/thumbnail`이 `next/og`의 `ImageResponse`로 이벤터스(1280x720)와 티켓타코(1200x630) PNG를 만듭니다. 템플릿 하나에 크기만 바꿔서 씁니다. SPEC 6.1절을 따릅니다.

**Acceptance Criteria:**
- 두 PNG의 픽셀 크기가 규격과 정확히 같습니다
- 한글이 네모(□)로 깨지지 않습니다
- 30자 이상 긴 제목도 영역 밖으로 넘치지 않습니다
- 각 이미지에 다운로드 버튼이 있습니다

---

### BK-05 · 인스타 카드뉴스 세트 — GDG Campus Korea 포맷 (12분)

**Why:** 인스타 피드 홍보의 중심이며, 오거나이저가 가장 오래 붙잡는 작업입니다. 기존 GDG Campus Korea 게시물과 같은 형식이어야 계정의 통일감이 유지됩니다. (O1-KR2, O2-KR1)

**What:** `POST /api/render/card`가 슬라이드 하나를 1080x1350 PNG로 만듭니다. 공통 프레임(`paper` 배경 + 4색 블롭 + 흰 패널 + 로고 락업 + 상단 타이틀 블록)과 노란 알약 라벨, 단어 하이라이트를 씁니다. MVP 타입은 COVER, INTRO, TIMETABLE, SPEAKERS, CTA입니다. SPEC 6.2절을 따릅니다.

**Acceptance Criteria:**
- `cards` 배열의 슬라이드 수만큼 PNG가 생성되고, 탭에서 좌우로 넘겨 볼 수 있습니다
- TIMETABLE은 `highlight` 행을 Blue로 표시하며, 10행까지 겹침 없이 들어갑니다
- SPEAKERS는 한 장에 최대 3명이며, 연사가 더 많으면 슬라이드가 나뉩니다
- 사진이 없거나 불러오기에 실패한 연사는 이니셜 원형으로 표시됩니다

---

### BK-06 · 릴스 프리뷰 (Remotion Player) (15분)

**Why:** 움직이는 영상이 데모에서 가장 강한 인상을 줍니다. 서버 렌더링 없이 브라우저 재생만으로 가치를 보여 줄 수 있습니다. (O1-KR2)

**What:** `@remotion/player`로 1080x1920, 60fps 컴포지션을 재생합니다. `reel.scenes`를 `<Series>`로 이어 붙이고, `KineticStompText`와 `BentoGridShowcase` 두 컴포넌트만 구현합니다. SPEC 6.3절을 따릅니다.

**Acceptance Criteria:**
- 총 길이가 `scenes[].durationSec` 합계와 같습니다(프레임 = 초 × 60, 반올림)
- `highlightWords`의 단어가 Blue → Red → Yellow → Green 순서로 강조됩니다
- 텍스트는 `spring()`으로 튕기며 등장합니다
- 기획서나 대본을 고치면 Player가 새로고침 없이 바로 반영합니다

---

### BK-07 · 에셋별 추가 프롬프트 수정 `/api/refine` (8분)

**Why:** 생성 결과가 70점이어도 오거나이저가 한 줄 지시로 고칠 수 있으면 그대로 쓸 수 있습니다. 전체를 다시 생성하면 마음에 들던 다른 에셋까지 바뀌는 문제도 막습니다. (O2-KR1)

**What:** 모든 에셋 패널(썸네일, 카드 슬라이드 각각, 릴스, SNS 문구) 아래에 프롬프트 입력창과 "적용", "되돌리기" 버튼을 둡니다. `/api/refine`은 해당 에셋 조각과 하위 스키마만 Gemini에 보내므로 다른 에셋은 바뀌지 않습니다. SPEC 7.3절을 따릅니다.

**Acceptance Criteria:**
- 카드 3번에 "제목을 더 짧게"를 입력하면 카드 3번만 바뀌고 나머지는 그대로입니다
- "빨간색 위주로" 같은 색 지시는 `style.accent`만 바꾸며, 토큰 밖의 색은 나오지 않습니다
- "날짜를 바꿔줘"처럼 사실을 바꾸는 지시에는 "기획서 폼에서 수정해 주세요"라고 안내합니다
- 에셋마다 최근 5개 버전까지 되돌릴 수 있습니다

---

### BK-08 · SNS 문구 탭 (2분)

**Why:** 이미지를 만들어도 캡션을 따로 쓰면 홍보가 끝나지 않습니다. 자동 게시 전 단계로 "복사해서 붙여넣기"만 남기는 것이 목표입니다.

**What:** 인스타 캡션(SPEC 6.2의 캡션 구조), 스레드 본문, 스레드 대댓글(신청 링크)을 카드 3개로 보여 주고 각각 복사 버튼을 둡니다. 프롬프트 수정은 BK-07의 공용 패널을 씁니다.

**Acceptance Criteria:**
- 복사 버튼을 누르면 원문이 줄바꿈까지 그대로 클립보드에 들어갑니다
- 인스타 캡션 2,200자, 스레드 본문 500자를 넘으면 경고를 표시합니다
- 신청 링크는 스레드 대댓글에만 들어갑니다

---

### BK-09 · Cloud Run 배포 (10분)

**Why:** 공개 URL에서 동작해야 시연과 공유가 가능합니다. (O1-KR4)

**What:** `gcloud run deploy --source .`로 서울 리전에 배포합니다. Gemini API 키는 Secret Manager에서 주입합니다. SPEC 8절을 따릅니다.

**Acceptance Criteria:**
- 공개 URL에서 폼 입력 → 생성 → 프롬프트 수정 → PNG 다운로드 흐름이 연속 3회 성공합니다
- 컨테이너 이미지와 로그 어디에도 API 키 원문이 없습니다
- `max-instances`가 2 이하입니다

---

## Sprint 1 이후 — 해커톤 이후 범위

> 아래 항목은 90분 안에 시작하지 않습니다(`AGENTS.md` 규칙). 세부 결정은 SPEC 부록 A를 따릅니다.

### BK-10 · 릴스 MP4 서버 렌더링

**Why:** 인스타·스레드에 올리려면 실제 MP4 파일이 필요합니다. (O3-KR1)

**What:** Cloud Run Job(8 vCPU / 16GiB, timeout 30분)에서 `@remotion/renderer`로 렌더링하고 GCS에 저장합니다. 상태는 Firestore `jobs/{id}`에 저장합니다.

**Acceptance Criteria:**
- 30초 영상이 10분 안에 렌더링됩니다
- 같은 입력(`jsonHash` 동일)이면 다시 렌더링하지 않습니다
- 진행률이 표시되고, 실패하면 원인과 재시도 버튼이 보입니다

### BK-11 · TTS 보이스오버, 단어 팝업 자막, 효과음, BGM 더킹

**Why:** 양산형 쇼츠와 차별화되는 품질 요소입니다. (O2)

**What:** Cloud TTS v1beta1의 SSML `<mark>` + `enableTimePointing`으로 어절 타임스탬프를 받아 `DynamicWordPopCaption`에 연결합니다. 효과음은 장면 시작 프레임에 배치하고, BGM은 `volume` 콜백으로 음성 구간에서 -12dB 낮춥니다. 나머지 컴포넌트 3종(`TerminalErrorAnimation`, `SpeakerCard3DFlip`, `DynamicWordPopCaption`)도 이때 구현합니다.

**Acceptance Criteria:**
- 자막 강조 단어가 음성과 ±3프레임 안에서 맞습니다
- 음성 구간에서 BGM이 -12dB 낮아지고, 경계에서 클릭음이 들리지 않습니다
- SSML을 지원하는 ko-KR 음성만 선택 목록에 나옵니다

### BK-12 · X배너·현수막 인쇄용 벡터 PDF

**Why:** 현장 인쇄물까지 같은 기획서로 만들면 오탈자가 사라집니다.

**What:** Satori SVG를 벡터 PDF로 변환합니다. 300dpi 래스터는 만들지 않습니다. 재단 여백 3mm를 넣습니다.

**Acceptance Criteria:**
- PDF 페이지 크기가 600x1800mm, 5000x900mm(+여백)와 같습니다
- 확대해도 글자 가장자리가 깨지지 않습니다
- CMYK 변환 시 색이 달라질 수 있다는 안내를 표시합니다

### BK-13 · 인스타그램 자동 게시 (릴스 + 캐러셀)

**Why:** 홍보 마지막 단계까지 자동화합니다. (O3-KR2)

**What:** 컨테이너 생성 → `status_code=FINISHED` 폴링 → 게시 순서로 진행합니다. 미디어는 GCS V4 서명 URL로 넘기고, 이미지는 JPEG로 변환합니다.

**Acceptance Criteria:**
- 사람이 승인 버튼을 누르기 전에는 게시되지 않습니다
- 재시도해도 같은 게시물이 두 번 올라가지 않습니다
- 실패하면 실패한 단계만 다시 시도합니다

### BK-14 · 스레드 자동 게시 (본문 + 대댓글 링크)

**Why:** 신청 링크를 대댓글로 분리하면 본문은 영상과 후킹 문구에 집중할 수 있습니다.

**What:** 본문을 게시하고 처리 상태를 확인한 뒤 `reply_to_id`로 신청 링크 대댓글을 게시합니다. 고정 대기 시간은 쓰지 않습니다.

**Acceptance Criteria:**
- 본문 게시가 성공해야만 대댓글을 시도합니다
- 대댓글만 실패하면 대댓글만 다시 시도할 수 있습니다

### BK-15 · Imagen 배경 레이어

**Why:** CSS 도형보다 풍부한 키비주얼로 표지 완성도를 높입니다.

**What:** 테마별 프롬프트로 글자 없는 추상 배경을 생성하고 캐시합니다. 인쇄물과 연사 얼굴에는 쓰지 않습니다.

**Acceptance Criteria:**
- 생성된 배경에 글자가 들어가 있지 않습니다
- 같은 테마·행사는 캐시를 재사용합니다
