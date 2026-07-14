# 플레이풀 투두리스트 - AI Context Document

> 이 문서는 AI(Claude)가 프로젝트 작업 시 반드시 따라야 하는 규칙과 컨텍스트입니다.

---

## 🎨 디자인 시스템 규칙 (최우선!)

> ⚠️ **모든 UI 작업은 아래 디자인 시스템을 기반으로 합니다. 예외 없음.**
> ⚠️ **디자인 토큰의 유일한 원본(Single Source of Truth)은 `playful-todolist-ko.md`입니다.**

### 토큰 파일 구조 (원본 1 + 파생 3, 동기화 필수)

| 파일 | 역할 | 수정 기준 |
|------|------|-----------|
| `playful-todolist-ko.md` | **디자인 시스템 원본** (모든 토큰 값의 출처) | 사용자의 디자인 결정 변경 시에만 |
| `theme.css` | CSS 변수 정의 (헥스값은 md에서 파생, **여기에만** 존재) | md 변경 시 동기화 |
| `theme.js` | JS에서 토큰 참조용 (CSS 변수로 연결) | theme.css와 동기화 |
| `tailwind.config.js` | Tailwind 유틸리티 ↔ CSS 변수 매핑 | 토큰 추가/삭제 시에만 |

> 토큰 변경 흐름: **md 수정 → theme.css → theme.js → tailwind.config.js → (피그마 Variables 수동 반영은 사용자 담당)**
> 피그마에서 먼저 바꾸고 코드에 반영하는 역방향 작업 금지. 반드시 md가 먼저다.

**2계층 토큰 구조 (Primitive → Semantic):**
- theme.css는 Primitive 변수(`--orange-500`, `--gray-900` 등)를 먼저 정의하고, Semantic 변수는 이를 참조한다.
- 컴포넌트 코드에서는 **Semantic 변수만 사용**한다. Primitive 변수 직접 사용 금지 (`var(--orange-500)` ❌ → `var(--color-brand-primary)` ✅).
- Primitive 램프 전체 표는 `playful-todolist-ko.md` 섹션 11 참조.

```css
/* theme.css 구조 예시 */
:root {
  /* 1계층: Primitive */
  --orange-500: #FF9E00;
  --gray-900: #191F28;

  /* 2계층: Semantic (컴포넌트가 쓰는 것) */
  --color-brand-primary: var(--orange-500);
  --color-text-primary: var(--gray-900);
}
```

---

### 색상 토큰 (Semantic — 컴포넌트에서 사용하는 계층)

> 아래 값(헥스)은 참고용. theme.css에서 실제 값은 Primitive 변수 참조로 정의된다.

| CSS 변수 | Tailwind 클래스 | 용도 | 값 |
|----------|----------------|------|-----|
| `--color-border-default` | `border-border` | 기본 헤어라인, 카드 보더 | #E5E8EB |
| `--color-border-strong` | `border-border-strong` | 호버, 강조 구분선 | #D1D6DB |
| `--color-text-primary` | `text-text-primary` | 제목, 잉크 | #191F28 |
| `--color-text-secondary` | `text-text-secondary` | 본문 | #333D4B |
| `--color-text-muted` | `text-text-muted` | 보조 텍스트 | #6B7684 |
| `--color-text-dim` | `text-text-dim` | 힌트, 캡션, 플레이스홀더 | #8B95A1 |
| `--color-text-on-brand` | `text-text-on-brand` | 오렌지 버튼 위 텍스트 | #FFFFFF |
| `--color-text-on-inverse` | `text-text-on-inverse` | 다크 서피스(토스트) 위 텍스트 | #FFFFFF |
| `--color-bg-default` | `bg-bg-default` | 캔버스 | #FFFFFF |
| `--color-bg-alt` | `bg-bg-alt` | 보조 배경 | #F9FAFB |
| `--color-bg-surface` | `bg-bg-surface` | 인풋 배경, 회색 리프트 | #F2F4F6 |
| `--color-bg-tint` | `bg-bg-tint` | 콜아웃, 세컨더리 버튼 배경 | #FEF2E0 |
| `--color-bg-inverse` | `bg-bg-inverse` | 토스트 등 강조 다크 서피스 | #191F28 |
| `--color-brand-primary` | `bg-brand-primary` | 메인 액션, 액센트 | #FF9E00 |
| `--color-brand-hover` | `bg-brand-hover` | 호버 | #E68E00 |
| `--color-brand-pressed` | `bg-brand-pressed` | 눌림, 틴트 위 텍스트 | #B87100 |
| `--color-status-success` | `text-status-success` | 성공, 완료 체크 | #00C807 |
| `--color-status-warning` | `text-status-warning` | 경고, 주의 | #F04452 |
| `--color-status-danger` | `text-status-danger` | 삭제, 실패 | #F04452 |
| `--color-status-info` | `text-status-info` | 정보, 안내 | #3182F6 |

**핵심 규칙:**
- 브랜드 컬러는 메인 오렌지 하나뿐. 두 번째 고채도 브랜드 컬러 도입 금지.
- 상태 컬러는 상태 표현에만 사용. 장식용 재사용 금지.
- 세컨더리 버튼 = `bg-tint` 배경 + `brand-pressed` 텍스트 (두 단계 오렌지가 시그니처 위계).

**코드 예시 — 올바른 사용 vs 금지:**
```jsx
// ❌ 금지: 헥스 코드 직접 사용
<div style={{ color: '#191F28', background: '#F2F4F6' }}>

// ❌ 금지: Tailwind 기본 색상
<div className="text-gray-900 bg-orange-500">

// ✅ 올바른: CSS 변수 사용 (인라인)
<div style={{ color: 'var(--color-text-primary)', background: 'var(--color-bg-surface)' }}>

// ✅ 올바른: Tailwind 커스텀 토큰
<div className="text-text-primary bg-bg-surface">
```

---

### 타이포그래피

**폰트**: Pretendard Variable (`--font-family-base`) 단일 서체. 다른 서체 혼용 절대 금지.
theme.css에서 CDN으로 자동 로드됨.

**전역 규칙 (예외 없음):**
- 자간: 전체 텍스트 `letter-spacing: -0.01em` (−1%)
- 행간: 본문·UI `1.5`, 헤드라인 `1.4`
- 숫자(완료 카운트, 통계, 날짜): `font-variant-numeric: tabular-nums`

**사이즈 토큰 10종:** 12 / 14 / 15 / 17 / 20 / 24 / 32 / 40 / 50 / 66

**텍스트 스타일 — 용도별 사용 가이드:**

| 스타일 | font-weight | font-size | line-height | 용도 | Tailwind |
|--------|-------------|-----------|-------------|------|----------|
| **Bold/50** | 700 | 50px | 1.4 | 히어로 헤드라인 (모바일) | `text-50 font-bold` |
| **Bold/32** | 700 | 32px | 1.4 | 페이지 타이틀 | `text-32 font-bold` |
| **SemiBold/24** | 600 | 24px | 1.4 | 섹션 헤드라인 | `text-24 font-semibold` |
| **SemiBold/20** | 600 | 20px | 1.4 | 소제목, 강조 숫자 | `text-20 font-semibold` |
| **Medium/17** | 500 | 17px | 1.5 | 버튼 라벨 | `text-17 font-medium` |
| **Medium/15** | 500 | 15px | 1.5 | UI 레이블, 탭 | `text-15 font-medium` |
| **Regular/17** | 400 | 17px | 1.5 | 본문 (할 일 텍스트) | `text-17 font-normal` |
| **Regular/14** | 400 | 14px | 1.5 | 보조 텍스트 | `text-14 font-normal` |
| **Regular/12** | 400 | 12px | 1.5 | 캡션, 타임스탬프 | `text-12 font-normal` |

**코드 예시:**
```jsx
// ❌ 금지: 임의 폰트 사이즈
<p style={{ fontSize: '16px' }}>  // 16px는 토큰에 없음 (15 또는 17 사용)
<p className="text-sm">           // Tailwind 기본값, 토큰 아님

// ✅ 올바른: Tailwind 커스텀 토큰
<h1 className="font-base font-bold text-32">오늘 할 일</h1>
<p className="font-base font-normal text-17 text-text-secondary">할 일 내용</p>
<span className="font-base font-medium text-15">탭 레이블</span>
```

---

### 스페이싱

**4px 베이스. 사용 가능한 값 8종 (이 외의 값 사용 금지):**

| CSS 변수 | 값 | Tailwind | 주요 용도 |
|----------|-----|----------|-----------|
| `--spacing-4` | 4px | `p-4px`, `gap-4px` | 최소 간격, 아이콘-텍스트 사이 |
| `--spacing-8` | 8px | `p-8px`, `gap-8px` | 칩·뱃지 내부 여백 |
| `--spacing-12` | 12px | `p-12px`, `gap-12px` | 컴포넌트 내부 요소 간격 |
| `--spacing-16` | 16px | `p-16px`, `gap-16px` | 인풋 패딩, 기본 여백 |
| `--spacing-20` | 20px | `p-20px`, `gap-20px` | 카드 패딩, 버튼 좌우 패딩 |
| `--spacing-24` | 24px | `p-24px`, `gap-24px` | 섹션 내 그룹 간격 |
| `--spacing-32` | 32px | `p-32px`, `gap-32px` | 콘텐츠 블록 간격 (하한) |
| `--spacing-48` | 48px | `p-48px`, `gap-48px` | 콘텐츠 블록 간격 (상한) |

**레이아웃 고정 규칙:**
- 모바일 퍼스트. 주 캔버스 360–430px, 웹은 1200px 셸 안 480px 콘텐츠 레인.
- 할 일 카드의 헤더 행(체크박스+텍스트+액션) 높이 = **64px 고정** (탭 타겟). 카드 자체 높이는 체크리스트 항목 수에 따라 가변.
- 버튼 패딩 = 세로 14 / 가로 20 (14는 컴포넌트 스펙 고정값으로 허용).

```jsx
// ❌ 금지: 임의 spacing
<div style={{ padding: '10px' }}>   // 10px는 토큰에 없음
<div className="p-3">                // Tailwind 기본값, 토큰 아님

// ✅ 올바른
<div style={{ padding: 'var(--spacing-16)', gap: 'var(--spacing-12)' }}>
<div className="p-16px gap-12px">
```

---

### Border Radius

**값 네이밍 (`radius/8` = 8px). 사용 가능한 값 7종:**

| CSS 변수 | 값 | Tailwind | 용도 |
|----------|-----|----------|------|
| `--radius-4` | 4px | `rounded-4` | 태그, 뱃지, 칩 |
| `--radius-8` | 8px | `rounded-8` | 버튼 (모든 variant 공통) |
| `--radius-12` | 12px | `rounded-12` | 카드, 인풋, 리스트 컨테이너 |
| `--radius-16` | 16px | `rounded-16` | 바텀 시트, 모달 (상단 코너만) |
| `--radius-24` | 24px | `rounded-24` | 대형 카드, 히어로 모듈 |
| `--radius-32` | 32px | `rounded-32` | 풀스크린 시트, 온보딩 컨테이너 |
| `--radius-full` | 9999px | `rounded-full` | 아바타, 토글, 필 뱃지 |

**핵심 규칙:**
- 일반 컴포넌트(버튼·카드·인풋)는 12px 상한. 16 이상은 시트·모달·히어로 모듈 전용.
- 중첩 시 안쪽은 바깥보다 한 단계 작게 (카드 12px 안의 버튼 8px).
- 바텀 시트는 상단 두 코너만 16px, 하단 0.

---

### 깊이 & 인터랙션

- 그림자는 두 종류만: 카드 `0 1px 3px rgba(25,31,40,0.04)`, 모달·바텀시트 `0 8px 24px rgba(25,31,40,0.08)`.
- 그라디언트·뉴모피즘·섀도 중첩 금지. 플랫 채움만.
- 눌림 피드백: `scale(0.98)`, 96ms ease-out.
- 호버는 컬러 변화만 (리프트·스케일업 금지).
- 모바일 모달 = 바텀 시트. 640px 이하에서 풀스크린 시트.

---

### UI 제작 방식 — 화면 단위 (컴포넌트 사전 설계 없음)

> 이 프로젝트는 컴포넌트 라이브러리를 미리 구축하지 않는다.
> **화면(페이지) 단위로 UI를 제작**하되, 아래 UI 스펙을 모든 화면에서 동일하게 적용해 일관성을 유지한다.

**공통 UI 스펙 (화면 어디에 등장하든 이 스펙 고정):**

| UI 요소 | 핵심 스펙 |
|----------|-----------|
| 주요 버튼 | brand-primary 채움 + on-brand 텍스트, rounded-8, Medium/17, 패딩 14/20 |
| 보조 버튼 | bg-tint 채움 + brand-pressed 텍스트, rounded-8 |
| 할 일 카드 | 카드 하나당 외곽 테두리(`border-border`) 1개, `rounded-12`. 내부(헤더 행·스텝 행 사이)에 구분선 없음 — 여백(padding/margin)만으로 구분. 헤더 행은 높이 64px(체크박스+텍스트+액션), 체크리스트는 항상 펼쳐진 상태(접기/펼치기 없음) |
| 완료 체크 | 체크 시 status-success |
| 입력창 | bg-surface, 보더 없음, 포커스 시 2px 브랜드 링, rounded-12 |
| 필터 탭 | Medium/15, 활성 = 브랜드 컬러 |
| 바텀 시트 | rounded-16 상단만, 슬라이드업 |
| 뱃지/카운트 | rounded-4 또는 rounded-full |

**컴포넌트 추출 규칙:**
- 같은 UI가 **3번 이상 반복**되면 그때 컴포넌트로 추출을 **제안**한다 (사용자 승인 후 진행).
- 추출 전까지는 화면 코드 안에 두되, 위 공통 스펙을 반드시 지킨다.

---

### ⛔ 디자인 시스템 금지사항 (코드 리뷰 체크리스트)

| # | 금지 | 올바른 방법 | 예시 |
|---|------|-------------|------|
| 1 | 헥스 코드 직접 사용 | CSS 변수 사용 | `#FF9E00` → `var(--color-brand-primary)` |
| 2 | Tailwind 기본 색상 | 커스텀 토큰 | `bg-orange-500` → `bg-brand-primary` |
| 3 | Tailwind 기본 사이즈 | 커스텀 토큰 | `text-sm` → `text-14` |
| 4 | 토큰에 없는 spacing | 토큰 값만 사용 | `10px` → `8px` 또는 `12px` |
| 5 | 토큰에 없는 font-size | 토큰 값만 사용 | `16px` → `15px` 또는 `17px` |
| 6 | 토큰에 없는 radius | 토큰 값만 사용 | `6px` → `4px` 또는 `8px` |
| 7 | Pretendard 외 서체 사용 | Pretendard 단일 | `font-mono` → 제거 (숫자는 tabular-nums) |
| 8 | 자간 임의 변경 | 전역 −1% 유지 | `tracking-wide` → 사용 안 함 |
| 9 | 같은 UI를 화면마다 다르게 구현 | 공통 UI 스펙 표 준수 | 화면 A와 B의 버튼 스펙 불일치 금지 |
| 10 | 토큰 1파일만 수정 | md 포함 4파일 동기화 | theme.css만 → md + theme.css + theme.js + tailwind.config.js |
| 11 | Primitive 변수 직접 사용 | Semantic 변수만 사용 | `var(--orange-500)` → `var(--color-brand-primary)` |

---

### 새 토큰 추가 절차 (구체적 예시)

> 예: `--color-status-pending: #FFC800` 추가가 필요한 경우

**1단계: 사용자에게 승인 요청** (md 원본 변경이므로 반드시 확인)

**2단계: 승인 후 4파일 동시 수정**

```markdown
<!-- playful-todolist-ko.md — 원본에 먼저 추가 (섹션 11 Primitive 표 + Semantic 표) -->
| yellow | `yellow/500` | #FFC800 | 대기 기준색 |
| status | `status/pending` | `yellow/500` | 대기, 보류 |
```

```css
/* theme.css — Primitive 먼저, Semantic이 참조 */
:root {
  --yellow-500: #FFC800;                            /* ← 1계층 추가 */
  --color-status-pending: var(--yellow-500);        /* ← 2계층 추가 */
}
```

```javascript
// theme.js — CSS 변수 참조 추가
status: {
  pending: 'var(--color-status-pending)',  // ← 추가
},
```

```javascript
// tailwind.config.js — Tailwind 매핑 추가
status: {
  pending: 'var(--color-status-pending)',  // ← 추가
},
```

**3단계: 사용자에게 피그마 Variables 수동 반영 안내**

---

# 작업원칙

- **확장성/유연성 검토**: 현재 요구사항을 해결하되, 향후 확장이 막히지 않는 구조 확인
- **기존 코드 재사용**: 새로 만들기 전에 `components/`, `theme.js` 등 기존 리소스를 먼저 탐색
- **커뮤니케이션**: 항상 **개요(왜, 무엇을)** → **상세 구현 계획** 순서로 설명

### 작업 프로세스 (필수!)

> ⚠️ **추측을 사실처럼 말하지 말 것!** 모든 가설은 반드시 검증 후 결론.
> ⛔ **코드 작성 전 반드시 4단계까지 완료하고 사용자 승인을 받을 것.**

#### 1단계: 문제/요청 이해
- 문제 현상을 명확히 기술
- 불분명한 부분이 있으면 사용자에게 질문
- "~일 것 같습니다"가 아니라 실제 코드를 확인

#### 2단계: 원인 분석 (문제 해결의 경우)
- 가설 수립 → 가설 검증 → 원인 확정
- ❌ "이게 원인입니다" (검증 없이)
- ✅ "가설: ~일 수 있습니다. 검증해보겠습니다." → "확인 결과, ~가 원인입니다"

#### 3단계: 해결책 탐색
- 해결 방안 2-3개 제시, 각 방안의 영향 범위 분석
- 사전 검증 가능하면 검증

#### 4단계: 작업 계획 보고 (코드 작성 전 필수!)

> ⛔ 사용자가 "그냥 빨리 해줘"라고 해도, 이 보고를 먼저 하세요.

```
📋 작업 계획 보고

🔍 문제 상황 (What's wrong?)
어떤 상황에서 어떤 증상이 발생하는지, 왜 이 작업이 필요한지.

🎯 목표 (What we want to achieve)
이 작업이 완료되면 어떤 상태가 되어야 하는지.

🔬 원인 분석 (Why it happens) - 문제 해결의 경우
검증된 원인만 기술. 추측은 "가설"이라고 명시.

📁 변경 예정 파일
| 파일 경로 | 변경 내용 | 비고 |
|-----------|----------|------|

⚡ Before → After
[Before] 현재 상태
[After] 작업 후 기대 상태

🎨 디자인 토큰 사용 계획
- 사용할 CSS 변수: --color-*, --spacing-* 등
- 적용할 공통 UI 스펙: 주요 버튼, 할 일 행 등
- 새로 필요한 토큰: 있으면 명시 (없으면 "없음")

이대로 진행해도 될까요?
```

#### 5단계: 작업 실행
- 승인받은 계획대로 진행
- 예상치 못한 상황 → 중단 후 보고

#### 6단계: 결과 검증

| # | 확인 항목 | 필수 | 구체적 검증 방법 |
|---|-----------|------|-----------------|
| 1 | 빌드 에러 없음 | ✅ | `npm run build` 통과 |
| 2 | 헥스 코드 미사용 | ✅ | 새로 작성한 코드에 `#` + 6자리 패턴 없는지 확인 |
| 3 | Tailwind 기본값 미사용 | ✅ | `bg-orange-`, `text-gray-`, `text-sm` 등 기본 클래스 없는지 확인 |
| 4 | 토큰 외 spacing/radius 미사용 | ✅ | `10px`, `6px` 등 토큰에 없는 값 없는지 확인 |
| 5 | Pretendard 외 서체 미사용 | ✅ | font-family 선언이 `--font-family-base` 뿐인지 확인 |
| 6 | 공통 UI 스펙 준수 | ✅ | 버튼·할 일 행·입력창 등이 공통 UI 스펙 표와 일치하는지 확인 |
| 7 | 토큰 추가 시 4파일 동기화 | ✅ | md, theme.css, theme.js, tailwind.config.js 모두 수정했는지 확인 |
| 8 | 기존 기능 정상 동작 | ✅ | 기존 컴포넌트/페이지 깨지지 않았는지 확인 |

#### 7단계: 작업 완료
- 6단계 검증 **전부 통과** 후에만 "완료" 선언
- 변경 사항 요약 보고

### 금지 사항

| 금지 | 이유 | 올바른 대안 |
|------|------|-------------|
| 허락 없이 새 파일/컴포넌트 생성 | 프로젝트 구조 임의 변경 방지 | 사용자에게 먼저 제안 후 승인 |
| 기존 아키텍처 임의 변경 | 설계 의도 훼손 방지 | 변경 필요 시 이유와 함께 제안 |
| 요청 범위 밖 리팩토링 | 스코프 크립 방지 | "이 부분도 개선하면 좋겠는데, 할까요?" |
| 문제 발견 시 바로 수정 | 사용자가 다른 해결책을 원할 수 있음 | 문제 보고 → 해결책 2-3개 제시 → 승인 후 수정 |
| 디자인 토큰 없이 스타일링 | 디자인 시스템 일관성 파괴 | 항상 `var(--*)` 또는 Tailwind 커스텀 토큰 사용 |
| 피그마 기준으로 토큰 수정 | md 원본 체계 파괴 | md 먼저 수정 → 코드 동기화 → 피그마는 사용자가 반영 |

### 이전 세션 작업 이어받을 때
1. "완료됐다"는 요약을 그대로 믿지 말 것
2. 실제 코드 상태를 직접 확인 (`Read`, `Grep`으로 검증)
3. 동작 테스트로 검증 후 진행

---

## 📁 프로젝트 구조

```
playful-todolist/
├── CLAUDE.md               ← 이 파일 (AI 작업 규칙)
├── playful-todolist-ko.md  ← 디자인 시스템 원본 (Single Source of Truth)
├── theme.css               ← CSS 변수 정의 (md에서 파생, @import 폰트)
├── theme.js                ← JS 토큰 참조 (CSS 변수 연결)
├── tailwind.config.js      ← Tailwind ↔ CSS 변수 매핑
├── PRD.md                  ← 기능 정의 원본
└── pages/ (또는 app/)      ← 화면 단위 파일
```

> 컴포넌트 폴더는 사전에 만들지 않는다. UI 반복이 3회 이상 발생해 추출이 승인된 경우에만 `components/`를 생성한다.

---

## 🛠️ 기술 스택

- **언어**: JavaScript (JSX)
- **스타일링**: CSS Variables (`theme.css`) + Tailwind CSS (`tailwind.config.js`)
- **폰트**: Pretendard Variable (CDN, theme.css에서 @import, 자간 −1% 전역)
- **디자인 소스**: `playful-todolist-ko.md` (원본) → Figma Variables (TalkToFigmaDesktop MCP 연동)
- **컴포넌트**: Inline Style 기반 React 컴포넌트 (CSS 변수 참조)

---

**Last Updated**: 2026-07-14
