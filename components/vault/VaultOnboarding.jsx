'use client';

// 보관소 첫 진입 온보딩(2단계) — Figma node 96:2("온보딩"/"온보딩2") 이식.
// Figma 원본 배경은 실제로는 "우리 앱 화면(보관소/상세)의 스크린샷"이었어서, 통짜 이미지 대신
// 이미 있는 ConstellationGlyph + Starfield로 똑같이 재구성했다 — 숫자(5/9, 완성 문구 등)는
// 실데이터가 아니라 개념을 보여주기 위한 목업 값(Figma와 동일)이다.
//
// 1단계 "별 조각 받고 계속하기" → 2단계. 2단계는 검은고양이 젤리를 직접 만져볼 수 있고
// (JellyCharacter 그대로 재사용 — 인터랙션 자동 적용), 처음 만지면 "Touch!" 힌트가 사라진다.
// "로그인하고 캐릭터 젤리 받기" → /login 이동 + 이 온보딩을 다시 안 보이게 플래그 저장.

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ConstellationGlyph from './ConstellationGlyph';
import JellyCharacter from './JellyCharacter';
import Starfield from './Starfield';
import { eggShape, constellationShapes } from '../../lib/constellationShapes';
import { markVaultOnboardingSeen } from '../../lib/storage';

// whitespace-nowrap: 실제 폰트(Pretendard)가 로드되면 글자 폭이 달라져서, 문구가 더 긴 2단계 버튼이
// 두 줄로 줄바꿈될 수 있다 — 그러면 버튼 높이가 달라져서 1·2단계 버튼 위치가 어긋난다. 무조건 한 줄로 고정.
// height도 고정값으로 못 박아서(폰트가 뭐든) 버튼 크기 자체가 흔들리지 않게 한다.
const CTA_BUTTON_CLASS =
  'flex w-full items-center justify-center whitespace-nowrap rounded-16 text-center text-20 font-medium transition-transform active:scale-[0.98]';
const CTA_BUTTON_STYLE = { background: 'var(--color-brand-primary)', color: 'var(--color-text-on-brand)', height: 68 };

export default function VaultOnboarding({ onDone }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [touched, setTouched] = useState(false);

  const finish = () => {
    markVaultOnboardingSeen();
    onDone?.();
    router.push('/login');
  };

  return (
    <div
      className="absolute inset-0 z-50 flex flex-col overflow-hidden"
      style={{ background: 'radial-gradient(120% 70% at 50% 8%, var(--color-vault-sky-violet) 0%, var(--color-vault-sky-mid) 45%, var(--color-vault-sky-deep) 100%)' }}
    >
      <Starfield count={70} seed={step === 1 ? 21 : 34} />
      {step === 1 ? <Step1 onNext={() => setStep(2)} /> : <Step2 touched={touched} onTouch={() => setTouched(true)} onLogin={finish} />}
    </div>
  );
}

function Step1({ onNext }) {
  return (
    <>
      {/* 줄마다 whitespace-nowrap — 실제 Pretendard 폰트가 로드되면 글자 폭이 달라져서 한 줄이 다시
          auto-wrap될 수 있고, 그러면 헤드라인 높이가 변해서 아래 버튼 위치까지 밀린다(1·2단계 버튼
          높낮이 달랐던 진짜 원인). 강제로 2줄 고정. */}
      <h1
        className="relative z-10 px-24px pt-[64px] text-center text-32 font-semibold"
        style={{ color: 'var(--color-vault-foreground)' }}
      >
        <span className="block whitespace-nowrap">별 조각을 모아서</span>
        <span className="block whitespace-nowrap">별자리를 만들어요</span>
      </h1>

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-12px">
        <ConstellationGlyph shape={eggShape} filled={5} glyphId="onboarding-egg" />
        <p className="text-vault-13" style={{ color: 'var(--color-vault-muted-foreground)' }}>
          <span style={{ color: 'var(--color-vault-amber)' }}>✦</span> 잠든 강아지자리 알 · 5/9
        </p>
      </div>

      <div className="relative z-10 px-24px" style={{ paddingBottom: '48px' }}>
        <button type="button" onClick={onNext} className={CTA_BUTTON_CLASS} style={CTA_BUTTON_STYLE}>
          별 조각 받고 계속하기
        </button>
      </div>
    </>
  );
}

function Step2({ touched, onTouch, onLogin }) {
  return (
    <>
      {/* 화면 아래로 갈수록 밝은 크림색으로 바뀌는 오버레이(Figma node 57:3965) — 값이 이 화면 전용
          장식용 그라데이션이라 의미 있는 토큰으로 못 쪼개서 Figma 값 그대로 둔다(문서화된 예외). */}
      <div
        className="pointer-events-none absolute inset-0 z-[1]"
        style={{
          background:
            'linear-gradient(180deg, rgba(144,86,226,0) 0%, rgba(247,231,255,0.6) 56.5%, rgb(247,222,208) 76.2%, rgb(255,239,230) 100%)',
        }}
      />

      <h1
        className="relative z-10 px-24px pt-[64px] text-center text-32 font-semibold"
        style={{ color: 'var(--color-vault-foreground)' }}
      >
        <span className="block whitespace-nowrap">별자리를 만들면</span>
        <span className="block whitespace-nowrap">캐릭터 젤리가 나와요!</span>
      </h1>

      {/* 배경 장식 — 검은고양이자리 완성 모양을 흐리게 깔아 헤드라인과 젤리 사이를 채운다 */}
      <div
        className="pointer-events-none absolute left-1/2 top-[60px] z-0 -translate-x-1/2 opacity-25"
        style={{ width: 260, height: 260 }}
      >
        <ConstellationGlyph shape={constellationShapes.blackcat} size={260} filled={9} glyphId="onboarding-cat-deco" />
      </div>

      {/* Step1과 같은 구조(flex-1 콘텐츠 영역 + 고정 pb-48 버튼)라서 버튼은 항상 화면 맨 아래에 고정된다
          — 이건 절대 안 바뀜. 화면이 길어질 때(사파리에서 확인된 기기별 차이) 생기는 여유 공간은
          맨 위 spacer(flex-1)가 전부 흡수해서 헤드라인~젤리 사이로 가고, 젤리~버튼 사이 간격은
          아래 고정 spacer(89px)로 항상 똑같이 유지된다. */}
      {/* min-h-0 필수 — 없으면 flex-1이어도 이 안의 내용(젤리 뭉치)이 배정된 몫보다 커지려 할 때
          그 몫을 무시하고 커져버려서, 실제 화면이 조금만 짧아져도(기기별 차이) 버튼이 밀려 내려간다
          (사용자가 실제 아이폰에서 확인한 버그, 852/950 테스트 뷰포트에선 안 걸렸던 케이스). */}
      <div className="relative z-10 flex min-h-0 flex-1 flex-col items-center pt-24px">
        <div className="flex-1" />
        <div
          className="relative z-20 flex flex-col items-center gap-4px transition-opacity duration-300"
          style={{ marginTop: 12, opacity: touched ? 0 : 1, visibility: touched ? 'hidden' : 'visible' }}
        >
          <span className="text-20 font-medium" style={{ color: 'var(--color-vault-foreground)' }}>
            Touch!
          </span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/vault/touch-icon.svg"
            alt=""
            width={56}
            height={56}
            style={{ marginTop: 8, animation: 'vault-touch-blink 1.4s ease-in-out infinite' }}
          />
        </div>

        {/* marginTop 음수로 Touch 아이콘과 젤리 머리가 겹치게(Figma 그대로). JellyCharacter는 내부에서
            이미지를 56px 아래로 눌러 그리는데 이 transform은 레이아웃 높이에 안 잡혀서 다음 요소(캡션)와
            겹친다 — paddingBottom 56으로 정확히 상쇄. */}
        <div className="w-full" style={{ marginTop: -138, paddingBottom: 56 }}>
          <JellyCharacter src="/vault/jelly-blackcat.png" alt="검은고양이자리의 젤리 캐릭터" onInteract={onTouch} />
        </div>

        <div className="relative z-10 text-center" style={{ marginTop: 8 }}>
          {/* 아래 두 텍스트 색은 Figma 원본 값 그대로(문서화된 예외) — 하단 크림 오버레이 위에서
              읽히도록 설계된 이 화면 전용 색이라 보관소 다크 토큰(무채/앰버)과는 다르다 */}
          <p className="text-vault-13" style={{ color: 'rgba(217,199,226,0.8)' }}>
            밤을 지키는 아이
          </p>
          <p
            className="text-vault-26 font-bold"
            style={{
              marginTop: 4,
              backgroundImage: 'linear-gradient(180deg, #f3eeff 0%, #edd7d6 74%)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent',
            }}
          >
            검은고양이자리
          </p>
        </div>

        <p
          className="px-24px text-center text-24 font-bold leading-[1.4]"
          style={{
            marginTop: 8,
            backgroundImage: 'linear-gradient(180deg, #a25c1b 0%, #7b4717 25%, #55320f 50%, #1c130c 87.5%, #09080a 100%)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent',
          }}
        >
          <span className="block whitespace-nowrap">검은고양이 젤리 받고</span>
          <span className="block whitespace-nowrap">말랑이 처럼 만지고 놀아볼까요?</span>
        </p>

        {/* 젤리~버튼 사이 간격 고정값(fixed, flex-grow 아님) — 화면이 아무리 길어져도 이 값은 안 바뀜.
            버튼 자체는 항상 화면 맨 아래(pb-48)에 고정 — 이 spacer 크기와 무관하게 절대 안 움직임. */}
        <div style={{ height: 64 }} />
      </div>

      {/* Step1의 버튼 wrapper와 클래스/스타일 동일 — 버튼 위치를 두 화면에서 정확히 맞추기 위함 */}
      <div className="relative z-10 px-24px" style={{ paddingBottom: '48px' }}>
        <button type="button" onClick={onLogin} className={CTA_BUTTON_CLASS} style={CTA_BUTTON_STYLE}>
          로그인하고 캐릭터 젤리 받기
        </button>
      </div>
    </>
  );
}
