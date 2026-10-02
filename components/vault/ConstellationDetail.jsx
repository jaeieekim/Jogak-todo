'use client';

// 별자리 상세 화면 — Figma ConstellationDetail.tsx 이식.
// "완료한 할 일 N개"는 별자리 경계에 걸치면 정확히 셀 수 없어(M1 계획 논의 참조),
// PRD §5.3에 이미 못 박힌 "N일간 함께했어요"(시도 일수)만 보여준다.

import { useEffect, useState } from 'react';
import ConstellationGlyph from './ConstellationGlyph';
import JellyCharacter from './JellyCharacter';
import Starfield from './Starfield';
import { loadConstellationDays } from '../../lib/vaultData';
import { getOrCreateInviteCode } from '../../lib/jelly';
import { track, EVENTS } from '../../lib/mixpanel';

// 별자리별 캐릭터 젤리 이미지 — 아직 전용 이미지가 없는 별자리는 기본(검은고양이)을 재사용.
// 새 이미지가 생기면 이 매핑에 한 줄만 추가하면 된다. 항상 JellyCharacter를 통해서만 그리므로
// (아래 렌더링부 참조) 드래그·탭 인터랙션은 이미지를 바꿀 때마다 별도 요청 없이 자동으로 적용된다.
export const JELLY_SRC_DEFAULT = '/vault/jelly-blackcat.png';
export const JELLY_SRC_BY_KEY = {
  chick: '/vault/jelly-chick.png',
  sheep: '/vault/jelly-sheep.png',
  capybara: '/vault/jelly-capybara.png',
  hamster: '/vault/jelly-hamster.png',
  panda: '/vault/jelly-panda.png',
  dino: '/vault/jelly-dino.png',
  squirrel: '/vault/jelly-squirrel.png',
  cheesecat: '/vault/jelly-cheesecat.png',
  rabbit: '/vault/jelly-rabbit.png',
  dog: '/vault/jelly-dog.png',
  quokka: '/vault/jelly-quokka.png',
  raccoon: '/vault/jelly-raccoon.png',
  seal: '/vault/jelly-seal.png',
  otter: '/vault/jelly-otter.png',
};

export default function ConstellationDetail({ c, onBack }) {
  const [days, setDays] = useState(null);
  const [shareState, setShareState] = useState('idle'); // 'idle' | 'sharing' | 'copied'

  async function handleShare() {
    if (shareState === 'sharing') return;
    setShareState('sharing');
    try {
      const code = await getOrCreateInviteCode();
      if (!code) {
        setShareState('idle');
        return;
      }
      const url = `${window.location.origin}/invite/${code}`;
      track(EVENTS.INVITE_CREATED, { constellation_id: c.id });
      if (navigator.share) {
        await navigator.share({
          title: '말랑말랑, 동물 젤리 선물이 도착했어요',
          text: '알을 깨면 어떤 젤리가 나올까요?',
          url,
        });
        setShareState('idle');
      } else {
        await navigator.clipboard.writeText(url);
        setShareState('copied');
        setTimeout(() => setShareState('idle'), 2000);
      }
    } catch {
      // 공유 시트를 취소한 경우(AbortError 등) 포함 — 조용히 무시
      setShareState('idle');
    }
  }

  useEffect(() => {
    let alive = true;
    loadConstellationDays(c.id).then((n) => {
      if (alive) setDays(n);
    });
    return () => {
      alive = false;
    };
  }, [c.id]);

  return (
    <div
      className="relative flex h-full w-full flex-col overflow-hidden"
      style={{
        background:
          'radial-gradient(120% 80% at 50% 30%, var(--color-vault-sky-glow) 0%, var(--color-vault-sky-mid) 45%, var(--color-vault-sky-deep) 100%)',
      }}
    >
      <Starfield count={60} seed={c.catalogKey.length + 5} />

      <div
        className="pointer-events-none absolute left-1/2 top-[26%] -translate-x-1/2 -translate-y-1/2 opacity-40"
        style={{ width: (c.shape.size ?? 210) * 1.4, height: (c.shape.size ?? 210) * 1.4 }}
      >
        <div style={{ transform: 'scale(1.4)', transformOrigin: 'center' }}>
          <ConstellationGlyph shape={c.shape} filled={c.shape.stars?.length} glyphId={c.id ?? c.catalogKey} />
        </div>
      </div>

      <button
        type="button"
        onClick={onBack}
        className="absolute left-4 z-30 flex h-10 w-10 items-center justify-center rounded-full backdrop-blur-md transition-transform active:scale-90"
        style={{
          top: 'calc(32px + env(safe-area-inset-top))',
          background: 'color-mix(in srgb, var(--color-vault-sky-mid) 60%, transparent)',
          border: '1px solid color-mix(in srgb, var(--color-vault-white) 10%, transparent)',
        }}
        aria-label="뒤로가기"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M15 5l-7 7 7 7" stroke="var(--color-vault-foreground)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <JellyCharacter
        src={JELLY_SRC_BY_KEY[c.catalogKey] ?? JELLY_SRC_DEFAULT}
        alt={`${c.name}의 젤리 캐릭터`}
      />

      <div className="relative z-20 px-6 text-center" style={{ paddingBottom: 'calc(128px + env(safe-area-inset-bottom))' }}>
        {c.caption && (
          <p className="text-vault-13" style={{ color: 'var(--color-vault-muted-foreground)' }}>
            {c.caption}
          </p>
        )}
        <h1 className="mt-1 text-vault-26 font-bold tracking-tight" style={{ color: 'var(--color-vault-foreground)' }}>
          {c.name}
        </h1>
        <p className="mt-2 text-vault-13" style={{ color: 'var(--color-vault-muted-foreground)' }}>
          <span style={{ color: c.shape.hue }}>✦</span>{' '}
          {c.completedAt ? new Date(c.completedAt).toLocaleDateString('ko-KR') : ''} 완성
          {days != null && <> · {days}일간 함께했어요</>}
        </p>
      </div>

      {/* 공유 버튼 — 초대 링크 생성(유저당 고정 1개) 후 공유시트, 없으면 클립보드 복사 */}
      <button
        type="button"
        onClick={handleShare}
        disabled={shareState === 'sharing'}
        className="absolute right-4 z-30 flex h-10 w-10 items-center justify-center rounded-full backdrop-blur-md transition-transform active:scale-90"
        style={{
          top: 'calc(32px + env(safe-area-inset-top))',
          background: 'color-mix(in srgb, var(--color-vault-jelly-a) 18%, transparent)',
          border: '1px solid color-mix(in srgb, var(--color-vault-jelly-a) 40%, transparent)',
        }}
        aria-label={shareState === 'copied' ? '링크가 복사됐어요' : '공유하기'}
      >
        {shareState === 'copied' ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M5 12.5L10 17.5L19 7" stroke="var(--color-vault-foreground)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <circle cx="18" cy="5" r="3" stroke="var(--color-vault-foreground)" strokeWidth="1.6" />
            <circle cx="6" cy="12" r="3" stroke="var(--color-vault-foreground)" strokeWidth="1.6" />
            <circle cx="18" cy="19" r="3" stroke="var(--color-vault-foreground)" strokeWidth="1.6" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" stroke="var(--color-vault-foreground)" strokeWidth="1.6" strokeLinecap="round" />
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" stroke="var(--color-vault-foreground)" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        )}
      </button>

      {/* 공유 버튼 바로 아래 흰색 말풍선 안내 — 누르는 버튼 아님(안내만), 실제 공유는 위 버튼으로 */}
      {shareState !== 'copied' && (
        <div
          className="pointer-events-none absolute right-4 z-30 flex items-center justify-center rounded-12 px-12px py-8px"
          style={{ top: 'calc(32px + 48px + env(safe-area-inset-top))', background: '#ffffff' }}
        >
          <span aria-hidden className="absolute right-14px top-0 h-10px w-10px -translate-y-1/2 rotate-45" style={{ background: '#ffffff' }} />
          <span className="whitespace-nowrap text-vault-12 font-semibold" style={{ color: 'var(--color-vault-black)' }}>
            공유하면 젤리 하나 더!
          </span>
        </div>
      )}
    </div>
  );
}
