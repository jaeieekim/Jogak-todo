# 플레이풀 투두리스트

한국형 플레이풀 투두리스트 스타일은 DESIGN.md 참조: 밝은 화이트 위의 메인 오렌지, Pretendard 단일 서체, 넉넉한 라운드, 친근한 무드, 모바일 퍼스트 밀도.

## 1. 비주얼 테마 & 분위기

플레이풀 투두리스트. 화면이 마치 친구가 오늘 할 일을 챙겨주는 것처럼 읽힌다 — 밝은 화이트 서피스, 확신 있는 오렌지 하나, 넉넉한 라운드, 플랫 벡터로 그려진 체크마크·캘린더 일러스트. 브랜드는 따뜻하지만 유치하지 않다. 타이포는 기하학적으로, 카피는 쉽고 담백하게, 모든 CTA는 탭을 유도한다. 한국어 우선이지만 라틴 문자에서도 시스템이 유지된다.

무드: 친근하고, 다가가기 쉽고, 확신 있으며, 절대 차갑지 않게.

## 2. 컬러 팔레트 & 역할

```
--bg:              #ffffff   /* 캔버스 */
--bg-alt:          #f9fafb
--surface:         #f2f4f6   /* 쿨 그레이 서피스 리프트 */
--surface-2:       #FEF2E0   /* 콜아웃용 오렌지 틴트 워시 */
--text:            #191f28   /* 잉크에 가까운 색 */
--text-secondary:  #333d4b   /* 본문 */
--text-muted:      #6b7684
--text-dim:        #8b95a1
--border:          #e5e8eb
--border-strong:   #d1d6db

--accent:          #FF9E00   /* 메인 오렌지 — 주요 액션 + 브랜드 */
--accent-hover:    #E68E00
--accent-deep:     #B87100   /* 눌림 / 다크 변형 */
--accent-soft:     #FEF2E0   /* 틴트 콜아웃, 세컨더리 버튼 배경 */

--success:         #00C807   /* 그린, 성공 / 완료 */
--warning:         #f04452   /* 경고 / 주의 */
--danger:          #f04452   /* 삭제 / 실패 */
--info:            #3182f6   /* 블루, 정보 */
```

규칙: 브랜드 컬러는 메인 오렌지 하나뿐이다. 상태 컬러는 상태(성공·완료, 주의, 삭제·실패)에만 예약한다. 상태 컬러를 장식용으로 재사용하지 않는다. 오렌지 틴트 워시 `--surface-2`는 콜아웃과 세컨더리 버튼을 담당한다 — 브랜드를 부드럽게 만드는 장치다.

## 3. 타이포그래피 규칙

- **모든 텍스트는 `Pretendard` 단일 서체 사용.** 폴백: `-apple-system`, `BlinkMacSystemFont`, `Apple SD Gothic Neo`, 시스템 폰트. 다른 서체는 어떤 경우에도 혼용하지 않는다.
- **자간: 전체 텍스트에 −1% (`letter-spacing: -0.01em`) 통일 적용.** 헤드라인·본문·레이블·숫자 구분 없이 동일하다.
- **헤드라인 + 디스플레이:** Pretendard 웨이트 600–700.
- **본문 + UI:** Pretendard 웨이트 400/500. 행간 1.5. 헤드라인 행간은 1.4.
- **UI 레이블:** Pretendard 웨이트 500, 14–15px.
- **숫자:** 완료 카운트, 통계, 차트 전반에 고정폭 숫자(tabular figures) 적용. Pretendard의 `font-variant-numeric: tabular-nums` 활용.

스케일: 12 / 14 / 15 / 17 / 20 / 24 / 32 / 40 / 50 / 66.

히어로 헤드라인은 데스크톱 66px, 모바일 50px. 한글과 라틴 글리프는 Pretendard 안에서 동일한 메트릭을 공유한다.

## 4. 라운디드(코너 라디우스) 규칙

```
--radius-4:     4px    /* 태그, 뱃지, 칩 */
--radius-8:     8px    /* 버튼 (프라이머리·세컨더리·터셔리 공통) */
--radius-12:    12px   /* 카드, 인풋, 리스트 컨테이너 */
--radius-16:    16px   /* 바텀 시트, 모달 (상단 코너만) */
--radius-24:    24px   /* 대형 카드, 히어로 모듈 */
--radius-32:    32px   /* 풀스크린 시트, 온보딩 대형 컨테이너 */
--radius-full:  9999px /* 아바타, 프로필 이미지, 토글, 필 뱃지 */
```

규칙:
- 라디우스는 위 7개 토큰만 사용한다. 임의 값 금지. 네이밍은 값 그대로 (`radius/8` = 8px).
- 일반 컴포넌트(버튼·카드·인풋)는 `--radius-12`가 상한이다. 16 이상(16/24/32)은 시트·모달·히어로 모듈 같은 대형 컨테이너 전용.
- 같은 위계의 컴포넌트는 같은 라디우스를 쓴다 (모든 버튼 = 8px, 모든 카드 = 12px).
- 바텀 시트는 상단 두 코너에만 `--radius-16` 적용, 하단은 0.
- 중첩 시 안쪽 요소는 바깥보다 한 단계 작은 라디우스를 쓴다 (카드 12px 안의 버튼 8px, 히어로 모듈 24px 안의 카드 12–16px).

## 5. 컴포넌트 스타일링

**버튼**
- 프라이머리: 메인 오렌지 채움 `--accent`, 화이트 텍스트 `#ffffff`, 라운드 8px, 패딩 14/20, 웨이트 500. 호버: `--accent-hover`. 눌림: `--accent-deep`. 리프트 없음, 스케일 없음.
- 세컨더리: 오렌지 틴트 채움 `--surface-2`, 딥 오렌지 텍스트 `--accent-deep`, 라운드 8px. 이 두 단계 오렌지가 시그니처 위계다.
- 터셔리 / 링크: `--text-secondary`, 호버 시 오렌지 밑줄.
- 파괴적 액션: `--danger` 채움, 화이트 텍스트, 확인 모달에서만 사용.

**카드 / 리스트 아이템**
- 화이트 채움, 1px `--border`, 라운드 12px, 패딩 20. 그림자는 `0 1px 3px rgba(25, 31, 40, 0.04)` 하나만.
- 할 일 행: 1px 헤어라인 구분선, 카드 크롬 없음, 탭 타겟을 위해 행 높이 64px.
- 호버: 1px `--border-strong`. 리프트 없음.

**인풋**
- `--surface` 채움, 기본 상태에서 보더 없음, 라운드 12px, 패딩 16/20 (큰 탭 타겟).
- 포커스: 2px `--accent` 링, 오프셋 없음. 포커스 시 레이블이 위로 플로팅.
- 숫자 인풋(목표 개수, 날짜 등)은 오른쪽 정렬 + 고정폭 숫자 사용.

**내비게이션**
- 모바일은 하단 탭 내비가 기본, 높이 56px, 아이콘 최대 5개, 활성 상태는 오렌지.
- 웹 상단 내비: 화이트 채움, 하단 1px `--border`, 활성 탭에 오렌지 밑줄.

**일러스트레이션**
- 플랫 벡터. 체크마크, 캘린더, 메모, 캐릭터. 일러스트당 2–3가지 색상, 오렌지 + 소프트 뉴트럴에서 추출.
- 포토리얼리즘 금지, 일러스트에 드롭 섀도 금지.

## 6. 레이아웃 원칙

- 모바일 퍼스트. 360–430px가 주 캔버스. 웹은 1200px 셸 안에서 최대 480px 콘텐츠 폭으로 모바일 컬럼을 미러링.
- 4px 베이스. 스페이싱 토큰 8종: 4 / 8 / 12 / 16 / 20 / 24 / 32 / 48. 네이밍은 값 그대로 (`spacing/16` = 16px). 토큰 외 임의 값 금지.
- 콘텐츠 블록 사이 세로 리듬은 넉넉하게 (32–48px).
- 밀도 높은 리스트 뷰는 탭 타겟 준수를 위해 행 높이 64px.

## 7. 깊이 & 엘리베이션

소프트 섀도는 절제해서 허용 — 카드에는 `0 1px 3px rgba(25, 31, 40, 0.04)` 하나, 모달과 바텀 시트에는 `0 8px 24px rgba(25, 31, 40, 0.08)`. 뉴모피즘 금지. 섀도 중첩 금지. 탭 타겟은 짧은 scale(0.98) 눌림 피드백 (96ms ease-out).

## 8. Do & Don't

**Do**
- 메인 오렌지를 유일하고 확신 있는 액센트로 사용한다.
- 프라이머리 오렌지와 오렌지 틴트 세컨더리를 짝지어 사용한다 — 이 두 단계가 시그니처다.
- 모바일에서는 페이지 전환 다이얼로그가 아닌 바텀 시트 모달을 쓴다.
- 완료 카운트·통계 등 모든 숫자는 고정폭 숫자로 렌더링한다.
- 카피는 담백한 한국어 / 영어로 쓴다 — 짧은 문장, 친근한 동사.

**Don't**
- 두 번째 고채도 브랜드 컬러를 도입하지 않는다.
- 일반 컴포넌트에 12px를 초과하는 라디우스를 쓰지 않는다 (버튼 8px, 카드 12px가 최대 — 16px 이상은 시트·히어로 모듈 전용).
- 다크 모드를 기본 캔버스로 쓰지 않는다.
- 배경을 그라디언트로 채우지 않는다 (플랫 채움만).
- 한 화면에 타입 웨이트를 두 가지 이상 섞지 않는다.
- Pretendard 외 다른 서체를 혼용하지 않는다.

## 9. 반응형 동작

- 모바일이 기준이다. 데스크톱은 중앙 정렬된 480px 콘텐츠 레인 안에서 모바일 컬럼을 미러링.
- 히어로 헤드라인은 모바일에서 66 → 50으로 스케일.
- 모바일의 하단 탭 내비는 웹에서 동일한 5개 목적지를 가진 상단 내비가 된다.
- 640px 이하에서 모달은 풀스크린 시트가 된다.
- 360px 뷰포트에서 리스트는 풀블리드가 된다.

## 10. 에이전트 프롬프트 가이드

지향: 밝은 화이트 `#ffffff` 캔버스, 단일 메인 오렌지 `#FF9E00` 액센트와 오렌지 틴트 `#FEF2E0` 세컨더리 조합, Pretendard 단일 서체 + 전체 자간 −1%, 라디우스 토큰 7종(4/8/12/16/24/32/9999)만 사용 — 버튼 8px·카드 12px, 모바일 퍼스트 480px 콘텐츠 레인, 64px 탭 타겟 행 높이, 모든 카운트·통계에 고정폭 숫자, 체크마크·캘린더 플랫 벡터 일러스트, 모바일 바텀 시트 모달.

지양: 다크 모드 기본 마케팅, 멀티 액센트 팔레트, 그라디언트 채움, 드롭 섀도 과다 카드, 포토리얼 이미지, 토큰 외 임의 라디우스 값, 12px 초과 라디우스의 버튼·카드, 밀도 높은 데스크톱 우선 대시보드, 크롬 영역의 장식용 이모지, Pretendard 외 타 서체 혼용.

## 11. Variables 구조 (피그마 토큰, 2계층)

피그마 Variables 세팅 기준. **Primitive(원시값) → Semantic(의미값) 2계층 구조**로 등록한다.
Primitive는 색 자체의 이름과 헥스값만 가지며, Semantic은 용도 이름을 갖고 값은 Primitive를 참조(Alias)한다.
브랜드 컬러 교체 시 Primitive 값만 수정하면 Semantic 전체가 자동 반영된다.

### 1계층 — Primitive Color (원시값)

| 램프 | 변수명 | 값 | 비고 |
|---|---|---|---|
| orange | `orange/50` | #FEF2E0 | 틴트 |
| orange | `orange/100` | #FFE4BD | 예비 (호버 틴트 등) |
| orange | `orange/500` | #FF9E00 | 브랜드 기준색 |
| orange | `orange/600` | #E68E00 | 호버 |
| orange | `orange/700` | #B87100 | 눌림 |
| gray | `gray/0` | #FFFFFF | 화이트 |
| gray | `gray/50` | #F9FAFB | |
| gray | `gray/100` | #F2F4F6 | |
| gray | `gray/200` | #E5E8EB | |
| gray | `gray/300` | #D1D6DB | |
| gray | `gray/500` | #8B95A1 | |
| gray | `gray/600` | #6B7684 | |
| gray | `gray/800` | #333D4B | |
| gray | `gray/900` | #191F28 | 잉크 |
| green | `green/50` | #E6FAE7 | 예비 (완료 배경 등) |
| green | `green/500` | #00C807 | 성공 기준색 |
| red | `red/50` | #FEECEE | 예비 (경고 배경 등) |
| red | `red/500` | #F04452 | 경고·삭제 기준색 |
| blue | `blue/50` | #EAF3FE | 예비 (안내 배경 등) |
| blue | `blue/500` | #3182F6 | 정보 기준색 |

"예비" 스탑은 아직 semantic에서 참조하지 않는 확장용 값. 사용 시점에 semantic 변수를 추가해 연결한다.

### 2계층 — Semantic Color (의미값)

| 그룹 | 변수명 | 참조 (Primitive) | 용도 |
|---|---|---|---|
| border | `border/default` | `gray/200` | 기본 헤어라인, 카드 보더 |
| border | `border/strong` | `gray/300` | 호버, 강조 구분선 |
| text | `text/primary` | `gray/900` | 제목, 잉크 |
| text | `text/secondary` | `gray/800` | 본문 |
| text | `text/muted` | `gray/600` | 보조 텍스트 |
| text | `text/dim` | `gray/500` | 힌트, 캡션 |
| text | `text/on-brand` | `gray/0` | 오렌지 버튼 위 텍스트 |
| text | `text/on-inverse` | `gray/0` | 다크 서피스(토스트) 위 텍스트 |
| background | `background/default` | `gray/0` | 캔버스 |
| background | `background/alt` | `gray/50` | 보조 배경 |
| background | `background/surface` | `gray/100` | 인풋, 회색 리프트 |
| background | `background/tint` | `orange/50` | 콜아웃, 세컨더리 버튼 |
| background | `background/inverse` | `gray/900` | 토스트 등 강조 다크 서피스 |
| brand | `brand/primary` | `orange/500` | 메인 액션, 액센트 |
| brand | `brand/hover` | `orange/600` | 호버 |
| brand | `brand/pressed` | `orange/700` | 눌림, 틴트 위 텍스트 |
| brand | `brand/soft` | `orange/50` | 틴트 (background/tint와 동일 참조) |
| status | `status/success` | `green/500` | 성공, 완료 |
| status | `status/warning` | `red/500` | 경고, 주의 |
| status | `status/danger` | `red/500` | 삭제, 실패 |
| status | `status/info` | `blue/500` | 정보, 안내 |

Spacing·Radius·Typography는 값 자체가 이름인 원시값 네이밍이라 단일 계층으로 유지한다.

### Variables — Spacing

| 그룹 | 변수명 | 값 |
|---|---|---|
| spacing | `spacing/4` | 4 |
| spacing | `spacing/8` | 8 |
| spacing | `spacing/12` | 12 |
| spacing | `spacing/16` | 16 |
| spacing | `spacing/20` | 20 |
| spacing | `spacing/24` | 24 |
| spacing | `spacing/32` | 32 |
| spacing | `spacing/48` | 48 |
| radius | `radius/4` | 4 |
| radius | `radius/8` | 8 |
| radius | `radius/12` | 12 |
| radius | `radius/16` | 16 |
| radius | `radius/24` | 24 |
| radius | `radius/32` | 32 |
| radius | `radius/full` | 9999 |

### Variables — Typography

| 그룹 | 변수명 | 값 | 용도 |
|---|---|---|---|
| size | `type/size/12` | 12 | 캡션 |
| size | `type/size/14` | 14 | 보조 텍스트 |
| size | `type/size/15` | 15 | UI 레이블 |
| size | `type/size/17` | 17 | 본문 |
| size | `type/size/20` | 20 | 소제목 |
| size | `type/size/24` | 24 | 섹션 제목 |
| size | `type/size/32` | 32 | 페이지 제목 |
| size | `type/size/40` | 40 | 디스플레이 |
| size | `type/size/50` | 50 | 히어로 (모바일) |
| size | `type/size/66` | 66 | 히어로 (데스크톱) |
| line-height | `type/line-height/body` | 1.5 | 본문·UI |
| line-height | `type/line-height/heading` | 1.4 | 헤드라인 |
| letter-spacing | `type/letter-spacing/default` | −1% | 전체 텍스트 통일 |

### Text Styles

| 스타일 | 웨이트 | 사용처 |
|---|---|---|
| Bold | 700 | 히어로 헤드라인, 대형 디스플레이 |
| SemiBold | 600 | 섹션 헤드라인, 강조 숫자 |
| Medium | 500 | 버튼, UI 레이블, 탭 |
| Regular | 400 | 본문, 보조 텍스트 |

모든 Text Style의 서체는 Pretendard, 자간 −1% 고정. 사이즈 × 웨이트 조합으로 스타일을 등록한다 (예: `Heading/24-SemiBold`, `Body/17-Regular`, `Label/15-Medium`).
