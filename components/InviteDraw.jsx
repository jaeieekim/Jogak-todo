'use client';

// 공유 보상(V1.3) 뽑기 UI — 받는 사람(/invite/[code])과 공유자(/invite/claim)가 공용으로 쓴다.
// 피그마 "뽑기 1/2/3"(node-id 124:728, 124:1164, 127:1651) 그대로 이식:
//   알 탭 3번(점점 금 감) → 두 조각으로 깨짐 → 빛 4개 사방으로 흩어지며 소멸 → 캐릭터 등장
//   (Touch! 힌트 + JellyCharacter는 VaultOnboarding 2단계와 동일 컴포넌트 재사용)

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import JellyCharacter from './vault/JellyCharacter';
import Starfield from './vault/Starfield';
import Button from './Button';
import { characterName, characterCaption } from '../lib/encouragementCards';

const CRACKS_TO_BREAK = 3;
const ORB_COLORS = [
  'var(--color-vault-jelly-a)', // 보라
  'var(--color-vault-jelly-b)', // 하늘
  'var(--color-vault-jelly-c)', // 핑크
  'var(--color-vault-amber)', // 호박색
];
// 4방향으로 흩어지는 빛(피그마 '뽑기 2' 참조) — 중앙에서 대각선으로
const ORB_TARGETS = [
  { x: -90, y: -70 },
  { x: 90, y: -50 },
  { x: -70, y: 70 },
  { x: 80, y: 80 },
];

const STATUS_MESSAGE = {
  invalid_code: '링크가 올바르지 않아요.',
  self_referral: '내가 만든 링크로는 받을 수 없어요.',
  existing_user: '이미 계정이 있으시네요 — 이 선물은 새로 시작하는 분을 위한 거예요.',
  already_claimed: '이미 받으셨어요.',
  nothing_to_claim: '지금 받을 수 있는 선물이 없어요.',
};

const HEADLINE = {
  idle: ['특별한 젤리', '선물이 도착했어요!'],
  cracking: ['말랑말랑~', '어떤 캐릭터가 나올까요?'],
};

export default function InviteDraw({ autoStart = false, onDraw, onDone }) {
  const router = useRouter();
  // phase: idle → cracking(알 탭 1~3) → breaking(두 조각) → bursting(빛 4개) → result
  const [phase, setPhase] = useState('idle');
  const [cracks, setCracks] = useState(0);
  const [shaking, setShaking] = useState(false);
  const [orbsOut, setOrbsOut] = useState(false);
  const [touched, setTouched] = useState(false);
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const drawPromiseRef = useRef(null);

  function startDraw() {
    if (drawPromiseRef.current) return;
    drawPromiseRef.current = onDraw(); // 비동기로 미리 쏴두고, 연출 끝날 때 결과를 기다린다(체감 대기 최소화)
  }

  async function finishWithResult() {
    const r = await drawPromiseRef.current;
    if (!r || r.status === 'needs_login') return; // needs_login은 onDraw 내부에서 이미 리다이렉트 처리
    if (r.status !== 'granted') {
      setErrorMsg(STATUS_MESSAGE[r.status] ?? '잠깐 삐끗했어요. 한 번만 다시 눌러줄래요?');
      setPhase('error');
      return;
    }
    setResult(r);
    setPhase('result');
  }

  function tapEgg() {
    if (phase !== 'idle' && phase !== 'cracking') return;
    if (shaking) return; // 흔들리는 동안 연타 방지

    if (cracks === 0) {
      startDraw(); // 처음 탭할 때 바로 서버에 결과 요청 — 연출 끝날 즈음엔 대개 이미 와 있음
      setPhase('cracking');
    }

    const next = cracks + 1;
    setCracks(next);
    setShaking(true);
    setTimeout(() => setShaking(false), 420);

    if (next >= CRACKS_TO_BREAK) {
      setTimeout(() => setPhase('breaking'), 420); // 마지막 흔들림이 끝난 뒤 깨짐 시작
    }
  }

  useEffect(() => {
    if (phase !== 'breaking') return;
    const t = setTimeout(() => setPhase('bursting'), 650); // 두 조각이 갈라져 사라지는 시간
    return () => clearTimeout(t);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'bursting') return;
    const id = requestAnimationFrame(() => setOrbsOut(true)); // 다음 프레임에 타겟 위치로 트랜지션 시작
    const t = setTimeout(() => finishWithResult(), 700);
    return () => {
      cancelAnimationFrame(id);
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  useEffect(() => {
    if (autoStart) tapEgg();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart]);

  const showEgg = phase === 'idle' || phase === 'cracking' || phase === 'breaking';
  const headline = phase === 'idle' ? HEADLINE.idle : HEADLINE.cracking;

  return (
    <div className="relative flex h-full w-full touch-manipulation flex-col items-center overflow-hidden px-24px text-center">
      {/* 보관소 Galaxy.jsx와 동일한 은하수 배경 */}
      <div
        className="absolute inset-0 -z-10"
        style={{ background: 'radial-gradient(120% 90% at 50% 20%, var(--color-vault-sky-violet) 0%, var(--color-vault-sky-mid) 45%, var(--color-vault-sky-deep) 100%)' }}
      />
      <Starfield count={60} seed={7} />

      {/* 결과 화면 전용 — 위에서 아래로 밝아지는 오버레이(피그마 '뽑기 3' 그대로, 문서화된 예외) */}
      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-700"
        style={{
          background:
            'linear-gradient(180deg, rgba(25,190,255,0.2) 0%, rgba(226,86,163,0) 18.75%, rgba(255,231,255,0.6) 56.563%, rgb(208,210,247) 76.201%, rgb(255,245,230) 100%)',
          opacity: phase === 'result' ? 1 : 0,
        }}
      />

      {phase === 'error' ? (
        <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-16px">
          <p className="text-vault-13" style={{ color: 'var(--color-vault-muted-foreground)' }}>{errorMsg}</p>
        </div>
      ) : phase !== 'result' ? (
        <>
          {/* egg를 위로 당기기 위해 pt를 줄임(기존 100px) — 아래 egg/말풍선 블록이 더 커져도
              화면 안에 들어오는지는 매번 실측으로 확인(현재 여유 있음) */}
          <h1 className="relative z-10 pt-48px text-vault-26 font-bold" style={{ color: 'var(--color-vault-foreground)' }}>
            <span className="block whitespace-nowrap">{headline[0]}</span>
            <span className="block whitespace-nowrap">{headline[1]}</span>
          </h1>

          {/* justify-start로 바꿔 egg를 헤드라인 바로 아래(위쪽)에 고정 — justify-center면 카드가 커질수록 아래로 밀림 */}
          <div className="relative z-10 flex flex-1 flex-col items-center justify-start">
            {/* egg.png는 크롭하지 않은 원본 그대로 쓴다 — 알 바깥의 은은한 후광이 아주 길게
                퍼지면서 캔버스 가장자리에서야 완전히 투명해지는 그림이라, 중간에서 잘라내면
                (크롭하면) 그 경계가 네모 모양으로 보여버림(실측으로 확인). 그래서 크기는
                width/height로만 조절하고 파일 자체는 건드리지 않는다.
                margin-top: 헤딩 텍스트 "바닥"과 "실제로 보이는 알 윗부분" 사이가 정확히 48px가
                되도록 — 박스 자체는 투명 여백이 위쪽 26.9%라 그만큼 음수로 당겨서 보정(실측 기반) */}
            <div className="relative" style={{ width: 493, height: 542, marginTop: -44 }}>
              {showEgg && (
                <button
                  type="button"
                  onClick={tapEgg}
                  aria-label="알 깨우기"
                  className="absolute inset-0 flex touch-manipulation items-center justify-center select-none"
                  style={{
                    WebkitTapHighlightColor: 'transparent',
                    animation: shaking
                      ? 'vault-egg-shake 0.42s ease-in-out'
                      : phase === 'breaking'
                        ? undefined
                        : 'vault-egg-bounce 2.2s ease-in-out infinite',
                  }}
                >
                  {phase === 'breaking' ? (
                    <>
                      <EggHalf which="top" />
                      <EggHalf which="bottom" />
                    </>
                  ) : (
                    <div className="relative">
                      <Image src="/invite/egg.png" alt="" width={493} height={542} priority />
                      <EggCracks count={cracks} />
                    </div>
                  )}
                </button>
              )}

              {phase === 'bursting' && <Orbs out={orbsOut} />}
            </div>

            {/* 말풍선 — 알 "컨테이너"가 아니라 "실제로 보이는 알 모양" 기준 24px 아래.
                egg.png(크롭 안 함, 1080x1188) 안에서 불투명한 알 본체는 캔버스의 27~73%만
                차지하고 나머지는 투명 여백이라, 그 여백만큼 음수 마진으로 당겨서 보정(실측 기반,
                문서화된 예외 — 크기 바뀌면 재계산 필요). 알과 같은 리듬(vault-egg-bounce 2.2s,
                같은 keyframe)으로 같이 움직이게 — 이전엔 말풍선만 1.8s라 서로 박자가 어긋났었음 */}
            {phase === 'idle' && (
              <div className="mt-[-123px] flex flex-col items-center" style={{ gap: 66 }}>
                <div
                  className="relative rounded-12 px-12px py-4px"
                  style={{ background: '#ffd38c', animation: 'vault-egg-bounce 2.2s ease-in-out infinite' }}
                >
                  <span className="text-15 font-semibold" style={{ color: '#000' }}>여기를 눌러보세요</span>
                  <span
                    aria-hidden
                    className="absolute left-1/2 top-0 h-14px w-14px -translate-x-1/2 -translate-y-1/2 rotate-45"
                    style={{ background: '#ffd38c' }}
                  />
                </div>
                <p
                  className="text-24 font-bold"
                  style={{
                    backgroundImage: 'linear-gradient(180deg, #fecbf0 0%, #ffffff 100%)',
                    WebkitBackgroundClip: 'text',
                    backgroundClip: 'text',
                    color: 'transparent',
                  }}
                >
                  알을 눌러서 깨워봐요
                </p>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="relative z-10 flex w-full flex-1 flex-col items-center">
          <h1 className="pt-[100px] text-vault-26 font-bold" style={{ color: 'var(--color-vault-foreground)' }}>
            <span className="block whitespace-nowrap">당첨!</span>
            <span className="block whitespace-nowrap">{characterName(result.catalogKey)} 친구 등장~</span>
          </h1>

          <div className="flex min-h-0 flex-1 flex-col items-center pt-24px">
            {result.catalogKey ? (
              <>
                <div
                  className="relative z-20 flex flex-col items-center gap-4px transition-opacity duration-300"
                  style={{ marginTop: 12, opacity: touched ? 0 : 1, visibility: touched ? 'hidden' : 'visible' }}
                >
                  <span className="text-20 font-medium" style={{ color: 'var(--color-vault-foreground)' }}>Touch!</span>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/vault/touch-icon.svg"
                    alt=""
                    width={56}
                    height={56}
                    style={{ marginTop: 8, animation: 'vault-touch-blink 1.4s ease-in-out infinite' }}
                  />
                </div>
                <div className="w-full" style={{ marginTop: -138, paddingBottom: 56 }}>
                  <JellyCharacter
                    src={`/vault/jelly-${result.catalogKey}.png`}
                    alt={`${characterName(result.catalogKey)} 젤리 캐릭터`}
                    onInteract={() => setTouched(true)}
                  />
                </div>
                <div className="text-center" style={{ marginTop: 4 }}>
                  {characterCaption(result.catalogKey) && (
                    <p className="text-vault-13" style={{ color: 'rgba(217,199,226,0.8)' }}>
                      {characterCaption(result.catalogKey)}
                    </p>
                  )}
                  <p
                    className="text-vault-26 font-bold"
                    style={{
                      marginTop: 4,
                      backgroundImage: 'linear-gradient(180deg, #f3eeff 0%, #ffffff 74.359%)',
                      WebkitBackgroundClip: 'text',
                      backgroundClip: 'text',
                      color: 'transparent',
                    }}
                  >
                    {characterName(result.catalogKey)}자리
                  </p>
                </div>
              </>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center gap-8px pt-32px">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/star-piece.png" alt="" width={120} height={120} />
                <p className="text-vault-26 font-bold" style={{ color: 'var(--color-vault-foreground)' }}>
                  별 조각 {result.pieces}개
                </p>
              </div>
            )}

            <div className="flex-1" style={{ minHeight: 24 }} />
          </div>

          <div className="relative z-10 flex w-full flex-col gap-12px px-24px" style={{ paddingBottom: '32px' }}>
            <Button className="w-full" onClick={() => onDone?.(result)}>
              내가 뽑은 젤리 받기
            </Button>
            {result.catalogKey && (
              <button
                type="button"
                onClick={() => router.push(`/brag/${result.catalogKey}`)}
                className="w-full rounded-16 py-[19px] text-center text-20 font-medium text-white"
                style={{ background: '#31363e' }}
              >
                친구에게 결과 공유하기
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// 알 금 간 자국 — 탭 횟수(1~3)만큼 점점 늘어난다. 간단한 지그재그 선, 새 에셋 없이 SVG로 직접 그림.
function EggCracks({ count }) {
  if (count === 0) return null;
  // 선 하나가 탭할 때마다 1/3씩 길어져서 3번째 탭에 알을 가로질러 완전히 금이 가도록 —
  // stroke-dasharray/dashoffset로 "그려지는 길이"만 조절(선은 계속 하나, 끊어서 여러 개 안 그림).
  // 알 타원 가로 폭 안쪽에만 머물도록 x:65~154 범위로 제한(바깥으로 안 나가게).
  const progress = count / CRACKS_TO_BREAK; // 1/3, 2/3, 1
  return (
    <svg
      width={493}
      height={542}
      viewBox="0 0 220 251"
      className="pointer-events-none absolute inset-0"
    >
      <path
        d="M65 128 L85 120 L105 132 L125 118 L140 130 L154 122"
        fill="none"
        stroke="rgba(25,31,40,0.45)"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={100}
        strokeDasharray={100}
        strokeDashoffset={100 * (1 - progress)}
        style={{ transition: 'stroke-dashoffset 0.3s ease-out' }}
      />
    </svg>
  );
}

// 알이 두 조각으로 갈라져 사라지는 연출 — 같은 알 이미지를 지그재그 경계로 위/아래 반씩 잘라(clip-path)
// 서로 반대 방향으로 밀려나며 페이드아웃시킨다(별도 "깨진 알" 에셋 없이 구현).
function EggHalf({ which }) {
  const [out, setOut] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setOut(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const clip =
    which === 'top'
      ? 'polygon(0 0, 100% 0, 100% 45%, 80% 50%, 60% 46%, 40% 52%, 20% 47%, 0 50%)'
      : 'polygon(0 50%, 20% 47%, 40% 52%, 60% 46%, 80% 50%, 100% 45%, 100% 100%, 0 100%)';
  // 알 확대(원본 320→400, ×1.25) 비율에 맞춰 흩어지는 거리도 같이 키움
  // 알 확대(원본 320→380, ×1.1875) 비율에 맞춰 흩어지는 거리도 같이 키움
  const targetTransform = which === 'top' ? 'translate(-28px, -52px) rotate(-10deg)' : 'translate(25px, 46px) rotate(8deg)';

  return (
    <div
      className="absolute inset-0 transition-all duration-500 ease-in"
      style={{
        clipPath: clip,
        transform: out ? targetTransform : 'translate(0, 0) rotate(0deg)',
        opacity: out ? 0 : 1,
      }}
    >
      <Image src="/invite/egg.png" alt="" width={493} height={542} />
    </div>
  );
}

// 알이 깨지며 사방으로 흩어지는 빛 4개(피그마 '뽑기 2' 참조) — 보관소 젤리 컬러 토큰 재사용.
function Orbs({ out }) {
  return (
    <>
      {ORB_TARGETS.map((t, i) => (
        <span
          key={i}
          className="pointer-events-none absolute left-1/2 top-1/2 rounded-full transition-all duration-700 ease-out"
          style={{
            width: 14,
            height: 14,
            background: ORB_COLORS[i],
            boxShadow: `0 0 16px 4px ${ORB_COLORS[i]}`,
            transform: out
              ? `translate(calc(-50% + ${t.x}px), calc(-50% + ${t.y}px)) scale(0.3)`
              : 'translate(-50%, -50%) scale(1)',
            opacity: out ? 0 : 1,
          }}
        />
      ))}
    </>
  );
}
