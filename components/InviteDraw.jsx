'use client';

// 공유 보상(V1.3) 뽑기 UI — 받는 사람(/invite/[code])과 공유자(/invite/claim)가 공용으로 쓴다.
// ⚠️ 연출은 임시 플레이스홀더다 — 사용자가 피그마로 뽑기 연출(알 진동→깨짐→캐릭터 등장→조각 소멸)을
//    따로 그린 뒤 교체 예정. 지금은 서버 로직(지급·어뷰징)이 맞게 동작하는지가 우선이라, 상태 전환만
//    정확하게 잡아두고 비주얼은 최소한으로 둔다.
//
// 흐름: 알 + "뽑기" 버튼(idle) → 누르면 드러남(drawing, 실제 서버 호출 동시 진행) → 결과(result) +
//       [캐릭터 젤리 받기(확인하고 보관소로)] / [내 젤리 자랑하기(결과가 캐릭터일 때만)]
// 로그인 안 된 받는 사람이 누르면: 바로 카카오 로그인으로 보내고(결과는 로그인 복귀 후에 이어서 드러남),
// 이미 로그인된 경우(공유자, 또는 로그인 복귀 직후)는 누르자마자 바로 drawing으로 들어간다.

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ConstellationGlyph from './vault/ConstellationGlyph';
import Starfield from './vault/Starfield';
import Button from './Button';
import { eggShape } from '../lib/constellationShapes';
import { characterName } from '../lib/encouragementCards';

const STATUS_MESSAGE = {
  invalid_code: '링크가 올바르지 않아요.',
  self_referral: '내가 만든 링크로는 받을 수 없어요.',
  existing_user: '이미 계정이 있으시네요 — 이 선물은 새로 시작하는 분을 위한 거예요.',
  already_claimed: '이미 받으셨어요.',
  nothing_to_claim: '지금 받을 수 있는 선물이 없어요.',
};

export default function InviteDraw({ autoStart = false, onDraw, onDone }) {
  const router = useRouter();
  const [phase, setPhase] = useState('idle'); // idle | drawing | result | error
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  async function runDraw() {
    setPhase('drawing');
    const r = await onDraw();
    if (!r || r.status === 'needs_login') return; // needs_login은 onDraw 내부에서 이미 리다이렉트 처리
    if (r.status !== 'granted') {
      setErrorMsg(STATUS_MESSAGE[r.status] ?? '잠깐 삐끗했어요. 한 번만 다시 눌러줄래요?');
      setPhase('error');
      return;
    }
    setResult(r);
    // 연출용 최소 대기 — 서버가 너무 빨리 응답해도 "뽑는 중" 느낌이 최소한은 보이게
    await new Promise((resolve) => setTimeout(resolve, 900));
    setPhase('result');
  }

  useEffect(() => {
    if (autoStart) runDraw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart]);

  return (
    <div
      className="relative flex min-h-[100dvh] w-full flex-col items-center justify-center gap-24px overflow-hidden px-24px text-center"
      style={{ background: 'radial-gradient(120% 90% at 50% 20%, var(--color-vault-sky-violet) 0%, var(--color-vault-sky-mid) 45%, var(--color-vault-sky-deep) 100%)' }}
    >
      <Starfield count={60} seed={7} />

      {phase !== 'result' && (
        <div className="relative z-10 flex flex-col items-center gap-24px">
          <h1 className="text-vault-26 font-bold" style={{ color: 'var(--color-vault-foreground)' }}>
            {phase === 'error' ? (
              '앗'
            ) : (
              <>
                <span className="block whitespace-nowrap">어떤 말랑말랑</span>
                <span className="block whitespace-nowrap">캐릭터가 나올까요?</span>
              </>
            )}
          </h1>
          <div className={phase === 'drawing' ? 'animate-pulse' : ''}>
            <ConstellationGlyph shape={eggShape} size={180} filled={5} glyphId="invite-draw-egg" />
          </div>
          {phase === 'error' ? (
            <p className="text-vault-13" style={{ color: 'var(--color-vault-muted-foreground)' }}>{errorMsg}</p>
          ) : (
            <Button className="w-full max-w-[280px]" disabled={phase === 'drawing'} onClick={runDraw}>
              {phase === 'drawing' ? '뽑는 중…' : '뽑기'}
            </Button>
          )}
        </div>
      )}

      {phase === 'result' && (
        <div className="relative z-10 flex w-full max-w-[280px] flex-col items-center gap-16px">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={result.catalogKey ? `/vault/jelly-${result.catalogKey}.png` : '/star-piece.png'}
            alt=""
            width={160}
            height={160}
            style={{ filter: 'drop-shadow(0 0 32px rgba(255,255,255,0.5))' }}
          />
          <h2 className="text-vault-26 font-bold" style={{ color: 'var(--color-vault-foreground)' }}>
            {result.catalogKey ? `${characterName(result.catalogKey)} 젤리를 받았어요!` : `별 조각 ${result.pieces}개를 받았어요!`}
          </h2>
          <div className="flex w-full flex-col gap-8px pt-8px">
            <Button className="w-full" onClick={() => onDone?.(result)}>
              캐릭터 젤리 받기
            </Button>
            {result.catalogKey && (
              <Button variant="secondary" className="w-full" onClick={() => router.push(`/brag/${result.catalogKey}`)}>
                내 젤리 자랑하기
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
