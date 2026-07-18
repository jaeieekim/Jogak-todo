'use client';

// 첫 실행 온보딩 화면 (단일 화면).
// 노출 조건: 첫 방문 1회만 — 홈(app/page.jsx)에서 localStorage 플래그(minitodo.onboardingSeen.v1)를
// 확인해 없으면 이 화면으로 리다이렉트한다. [시작하기]를 누르면 플래그를 저장하고 홈으로 이동한다.
// /onboarding 경로로는 플래그와 무관하게 언제든 직접 접근해 미리보기 가능.

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Button from '../../components/Button';
import { markOnboardingSeen } from '../../lib/storage';

const POINT_ICON_SIZE = 80; // 기본 아이콘 크기(px)

const POINTS = [
  { title: '시작이 막막할 때', desc: '3분이면 쉽게 시작', icon: '/icon-lightning.png', rotate: 8, translateX: 4, iconSize: 72 }, // 오른쪽으로 아주 살짝 회전 + 4px 이동, 크기 아주 살짝 축소
  { title: '완벽하지 않아도', desc: '다 못 해도, 시작이 반', icon: '/icon-puzzle.png', iconSize: 60 }, // 다른 아이콘보다 살짝 작게
  { title: '부담 없이', desc: '작은 할 일부터 조금씩', icon: '/icon-feather.png' },
];

// ── 쪼개기 시연 애니메이션 (design-system md 7-2) ──────────────────────────
// 타이밍·파티클·레이아웃은 아래 상수만 바꿔 튜닝한다.

const DEMO_TIMING = {
  cardIn: 400, // ① 카드 scale-y 등장
  pressDelay: 600, // 등장 완료 후 버튼 눌림까지 대기
  press: 96, // ② 버튼 눌림 전환
  pressHold: 250, // 눌림 유지 후 버튼 소멸 시작까지
  buttonFade: 250, // ③ 버튼 페이드아웃
  splitDelay: 350, // ④ 분열 시작까지 대기
  splitSlide: 350, // 분열 카드 1장 슬라이드 업
  particle: 600, // 파티클 퍼짐+페이드아웃
  checkDelay: 500, // ⑤ 분열 완료 후 첫 체크까지 대기
  checkInterval12: 300, // 1번째(스텝1) → 2번째(스텝2) 체크 간격
  checkInterval23: 400, // 2번째 → 3번째(원본) 체크 간격 — 100ms만 늦춰 마지막 강조 리듬
  checkPop: 180, // 체크마크 scale-in
  loopHold: 1500, // ⑥ 최종 상태 유지(결과 읽을 시간)
  loopFade: 400, // 전체 페이드아웃
  loopGap: 500, // 빈 상태 대기 후 처음부터 재생
};

// 데모 체크 컨트롤 — 실제 TodoCard 체크(시각 24px/아이콘 14px)의 미니어처
const DEMO_CHECK = { size: 18, icon: 10 };

// 파티클 기준점: 버튼 우상단 모서리 (top/right 오프셋)
const DEMO_PARTICLE_ORIGIN = { top: -4, right: -4 };
// 진한 조각 brand/primary(삼각형), 옅은 조각 brand/soft(비정형 사각형) — orange/100은 semantic 없음 (md 7-2 근거 참조)
// 총 2개. x/y = 스폰 시작 위치 오프셋(서로 겹치지 않게 분리), dx/dy = 퍼지는 이동량.
// 옅은 조각은 brand/soft가 흰 카드 배경과 거의 대비가 없어 얇은 brand/primary 외곽선(strokeWidth)으로 형태를 살린다.
const DEMO_PARTICLES = [
  { x: 0, y: 0, dx: 20, dy: -24, size: 12, color: 'var(--color-brand-primary)', shape: 'triangle' },
  {
    x: 16,
    y: 12,
    dx: 34,
    dy: -10,
    size: 9,
    color: 'var(--color-brand-soft)',
    shape: 'quad',
    stroke: 'var(--color-brand-primary)',
    strokeWidth: 0.6,
  },
];

const DEMO_PARTICLE_POINTS = {
  triangle: '5,0 10,7 2,9',
  quad: '2,0 10,3 8,10 0,6', // 비정형 사각형(네 변 길이가 서로 다름)
};

// 카드 높이·카드 간 간격(px). gap은 spacing/8 값과 정렬.
// enterOffset: 새 카드가 "위에서 등장"할 때 시작하는 오프셋(최종 슬롯 기준, 음수 = 위쪽)
const DEMO_LAYOUT = { origH: 78, stepH: 48, gap: 8, enterOffset: -20 };

const DEMO_TEXT = {
  original: '영어 공부하기',
  step1: '책상에 앉아서 영어 교재 펼치기', // 최종 맨 위 (스텝1 · 진입)
  step2: '영어 단어 5개만 읽기', // 최종 가운데 (스텝2 · 착수)
};

// phase 진행 순서: idle → card → press → nobutton → split1 → split2 → check1 → check2 → check3(최종)
// ⑤ 순차 체크: 스텝1 → 스텝2 → 원본, 3장 전부 체크된 상태로 정지 (마지막 간격만 살짝 벌림)
const DEMO_PHASES = ['idle', 'card', 'press', 'nobutton', 'split1', 'split2', 'check1', 'check2', 'check3'];
const phaseAt = (phase, target) => DEMO_PHASES.indexOf(phase) >= DEMO_PHASES.indexOf(target);

// 실제 TodoCard 체크 컨트롤 스타일의 미니어처 — 미체크 border/strong 링, 체크 brand/primary 채움 + 체크마크
function DemoCheck({ checked }) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full border-[1.5px] transition duration-[96ms] ease-out ${
        checked ? 'border-brand-primary bg-brand-primary' : 'border-border-strong bg-transparent'
      }`}
      style={{ width: DEMO_CHECK.size, height: DEMO_CHECK.size }}
    >
      {checked && (
        <svg
          width={DEMO_CHECK.icon}
          height={DEMO_CHECK.icon}
          viewBox="0 0 24 24"
          fill="none"
          className="animate-demo-check-pop text-text-on-brand"
          style={{ animationDuration: `${DEMO_TIMING.checkPop}ms` }}
        >
          <path
            d="M5 12.5L10 17.5L19 7"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </span>
  );
}

function DemoStepCard({ text, visible, y, checked }) {
  return (
    <div
      className={`absolute inset-x-0 top-0 z-0 flex items-center justify-between gap-12px rounded-16 border border-border bg-bg-default px-20px shadow-[0_1px_3px_rgba(25,31,40,0.04)] transition-all ease-out ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
      style={{
        height: DEMO_LAYOUT.stepH,
        // 위에서 등장: 숨김 상태엔 최종 슬롯보다 enterOffset만큼 위 → 보이면서 슬롯으로 내려앉음.
        // 이동은 translateY만 사용 (레이아웃 리플로우 없음)
        transform: `translateY(${visible ? y : y + DEMO_LAYOUT.enterOffset}px)`,
        transitionDuration: `${DEMO_TIMING.splitSlide}ms`,
      }}
    >
      <span className="min-w-0 text-15 font-normal text-text-secondary">{text}</span>
      <DemoCheck checked={checked} />
    </div>
  );
}

function SplitDemo() {
  const [phase, setPhase] = useState('idle');
  const [visible, setVisible] = useState(true); // 루프 페이드아웃용 — false면 영역 전체 opacity 0

  useEffect(() => {
    // 접근성 — 모션 최소화 설정이면 루프 없이 최종 상태(3장 전부 체크)만 정적 표시 (md 7-2)
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setPhase('check3');
      return;
    }
    const T = DEMO_TIMING;
    const timers = [];
    const schedule = (fn, ms) => timers.push(setTimeout(fn, ms));

    // 무한 루프: 시퀀스 재생 → 최종 유지 → 페이드아웃 → 빈 상태 대기 → 처음부터.
    // 하드 리셋 금지 — phase 초기화는 페이드아웃으로 안 보이는 동안에만 수행.
    const runCycle = () => {
      timers.splice(0); // 지난 사이클의 만료된 타이머 정리
      setPhase('idle');
      setVisible(true);

      let t = 30; // 트랜지션이 걸리도록 최소 지연
      schedule(() => setPhase('card'), t);
      t += T.cardIn + T.pressDelay;
      schedule(() => setPhase('press'), t);
      t += T.press + T.pressHold;
      schedule(() => setPhase('nobutton'), t);
      t += T.buttonFade + T.splitDelay;
      schedule(() => setPhase('split1'), t);
      t += T.splitSlide;
      schedule(() => setPhase('split2'), t);
      t += T.splitSlide + T.checkDelay; // 분열 완료 후 잠시 대기
      schedule(() => setPhase('check1'), t); // 맨 위(스텝1)부터
      t += T.checkInterval12;
      schedule(() => setPhase('check2'), t); // 스텝2
      t += T.checkInterval23; // 마지막은 살짝 벌려 강조
      schedule(() => setPhase('check3'), t); // 원본 — 3장 전부 체크로 정지
      t += T.checkPop + T.loopHold; // ⑥ 최종 상태 유지
      schedule(() => setVisible(false), t); // 전체 페이드아웃
      t += T.loopFade;
      // 리셋은 반드시 안 보이는 동안 — 카드들의 역방향 트랜지션(사라짐)이 빈 상태 대기 중에 소화되어
      // 재시작 시 실루엣이 비치지 않는다
      schedule(() => setPhase('idle'), t);
      t += T.loopGap; // 빈 상태 대기
      schedule(runCycle, t); // 처음부터 재생
    };
    runCycle();

    return () => timers.forEach(clearTimeout);
  }, []);

  const p = (target) => phaseAt(phase, target);
  const { origH, stepH, gap } = DEMO_LAYOUT;
  const containerH = origH + 2 * (stepH + gap); // 3장 기준 고정 높이 (영역 밖 콘텐츠는 안 움직임)

  // 밀려 내려가기 배치 (top 기준 translateY, px):
  // 1차 분열 = 스텝2(영어단어)가 원본 바로 위에서 먼저 등장, 원본이 아래로.
  // 2차 분열 = 스텝1(책상에)이 맨 위로 등장, 아래 두 장(스텝2+원본)이 함께 한 칸 더 내려감.
  const origStartY = (containerH - origH) / 2; // 첫 등장: 영역 세로 중앙
  const origShift = (stepH + gap) / 2; // 분열 1회당 카드가 내려가는 거리
  const origY = p('split2')
    ? origStartY + 2 * origShift
    : p('split1')
      ? origStartY + origShift
      : origStartY;
  const slotStep1Y = 0; // 스텝1 — 2차 분열에 맨 위로
  const step2EnterY = origStartY + origShift - (stepH + gap); // 스텝2 — 1차 분열에 원본 바로 위
  const step2Y = p('split2') ? stepH + gap : step2EnterY; // 2차 분열에 한 칸 아래로 밀림

  return (
    <div
      className={`relative w-full transition-opacity ease-out ${visible ? 'opacity-100' : 'opacity-0'}`}
      // 페이드아웃만 애니메이션, 복귀는 즉시(0ms) — 페이드인 중 카드 등장이 흐려지는 것 방지
      style={{ height: containerH, transitionDuration: visible ? '0ms' : `${DEMO_TIMING.loopFade}ms` }}
      aria-hidden
    >
      {/* 스텝2 — 1차 분열에 원본 바로 위로 먼저 등장, 2차 분열에 한 칸 아래로 밀림, check2에 체크 */}
      <DemoStepCard text={DEMO_TEXT.step2} visible={p('split1')} y={step2Y} checked={p('check2')} />
      {/* 스텝1 — 2차 분열에 맨 위로 등장(아래 두 장을 밀어내림), check1에 체크 */}
      <DemoStepCard text={DEMO_TEXT.step1} visible={p('split2')} y={slotStep1Y} checked={p('check1')} />

      {/* 원본 카드 — 영역 세로 중앙에서 scale-y 확장 등장, 분열마다 translateY로 아래로 밀림 */}
      <div
        className={`absolute inset-x-0 top-0 z-10 flex items-center justify-between gap-12px rounded-16 border border-border bg-bg-default px-20px shadow-[0_1px_3px_rgba(25,31,40,0.04)] transition-transform ease-out`}
        style={{
          height: origH,
          transform: `translateY(${origY}px) scaleY(${p('card') ? 1 : 0})`,
          transformOrigin: 'center',
          // 등장(scale-y)은 cardIn, 이후 밀려 내려가는 이동은 splitSlide 타이밍
          transitionDuration: `${p('split1') ? DEMO_TIMING.splitSlide : DEMO_TIMING.cardIn}ms`,
        }}
      >
        <span className="text-15 font-medium text-text-secondary">{DEMO_TEXT.original}</span>

        {/* 원본 카드 체크 컨트롤 — 분열 시점부터 노출, check3에 마지막으로 체크 */}
        <span
          className={`absolute right-20px top-1/2 -translate-y-1/2 transition-opacity ease-out ${
            p('split1') ? 'opacity-100' : 'opacity-0'
          }`}
          style={{ transitionDuration: `${DEMO_TIMING.splitSlide}ms` }}
        >
          <DemoCheck checked={p('check3')} />
        </span>

        {/* 데모 버튼 — 주요 버튼 공통 스펙 재현(정적 요소). 눌림은 96ms, 소멸은 opacity 페이드 */}
        <div
          className={`relative shrink-0 transition-opacity ease-out ${p('nobutton') ? 'opacity-0' : 'opacity-100'}`}
          style={{ transitionDuration: `${DEMO_TIMING.buttonFade}ms` }}
        >
          <span
            className={`inline-block rounded-8 px-20px py-[14px] text-17 font-medium text-text-on-brand transition duration-[96ms] ease-out ${
              p('press') ? 'scale-[0.98] bg-brand-pressed' : 'bg-brand-primary'
            }`}
          >
            할일 등록
          </span>

          {/* 조각 파티클 — 버튼 우상단에서 퍼지며 페이드아웃 */}
          {p('press') && !p('split1') && (
            <span
              className="pointer-events-none absolute"
              style={{ top: DEMO_PARTICLE_ORIGIN.top, right: DEMO_PARTICLE_ORIGIN.right }}
            >
              {DEMO_PARTICLES.map((pt, i) => (
                <svg
                  key={i}
                  className="absolute animate-demo-particle overflow-visible"
                  width={pt.size}
                  height={pt.size}
                  viewBox="0 0 10 10"
                  style={{
                    left: pt.x, // 스폰 위치 분리 — 두 조각이 겹치지 않게
                    top: pt.y,
                    '--demo-dx': `${pt.dx}px`,
                    '--demo-dy': `${pt.dy}px`,
                    animationDuration: `${DEMO_TIMING.particle}ms`,
                    color: pt.color,
                  }}
                >
                  <polygon
                    points={DEMO_PARTICLE_POINTS[pt.shape]}
                    fill="currentColor"
                    stroke={pt.stroke}
                    strokeWidth={pt.strokeWidth}
                  />
                </svg>
              ))}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const goHome = () => {
    markOnboardingSeen();
    router.push('/');
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[480px] flex-col bg-bg-alt px-20px pt-64px pb-64px">
      {/* 상단 + 중단 */}
      <div className="flex-1">
        {/* 상단: 서비스명 + 설명 (중앙정렬, 사이 spacing/12) */}
        <div className="flex flex-col items-center gap-12px text-center">
          <h1 className="text-32 font-semibold text-text-primary">조각투두</h1>
          <p className="text-17 font-normal text-text-secondary">
            할 일을 적으면 시작하기 쉽게 쪼개주는 투두리스트
          </p>
        </div>

        {/* 쪼개기 시연 애니메이션 — 1회 재생 후 최종 3장 상태로 정지 (md 7-2) */}
        <div className="pt-64px">
          <SplitDemo />
        </div>

        {/* 중단: 핵심 포인트 3개 (포인트 간 spacing/24) */}
        <ul className="flex flex-col gap-8px pt-64px">
          {POINTS.map((p) => (
            <li key={p.title} className="flex items-center gap-16px">
              {/* 아이콘 배경 박스 — 페이지 배경(bg/alt)과 동일 색으로 눈에 안 띄게, 스트로크 없음 */}
              <div
                className="flex shrink-0 items-center justify-center rounded-12 bg-bg-alt"
                style={{ width: POINT_ICON_SIZE, height: POINT_ICON_SIZE }}
              >
                {p.icon ? (
                  <Image
                    src={p.icon}
                    alt=""
                    width={p.iconSize ?? POINT_ICON_SIZE}
                    height={p.iconSize ?? POINT_ICON_SIZE}
                    unoptimized // 최적화 파이프라인이 팔레트 PNG로 재인코딩하며 반투명 가장자리(안티에일리어싱)를 뭉갬 — 원본 그대로 서빙
                    className="rounded-12"
                    style={{
                      width: p.iconSize ?? POINT_ICON_SIZE,
                      height: p.iconSize ?? POINT_ICON_SIZE,
                      transform: [
                        p.translateX ? `translateX(${p.translateX}px)` : null,
                        p.rotate ? `rotate(${p.rotate}deg)` : null,
                      ]
                        .filter(Boolean)
                        .join(' ') || undefined,
                    }}
                  />
                ) : null}
              </div>
              <div className="flex flex-col gap-4px">
                <span className="text-17 font-medium text-text-primary">{p.title}</span>
                <span className="text-15 font-normal text-text-secondary">{p.desc}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* 하단: 시작하기(primary) */}
      <div className="pt-32px">
        <Button className="w-full" onClick={goHome}>
          시작하기
        </Button>
      </div>
    </div>
  );
}
