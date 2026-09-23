'use client';

// 별자리 상세 화면 — Figma ConstellationDetail.tsx 이식.
// "완료한 할 일 N개"는 별자리 경계에 걸치면 정확히 셀 수 없어(M1 계획 논의 참조),
// PRD §5.3에 이미 못 박힌 "N일간 함께했어요"(시도 일수)만 보여준다.

import { useEffect, useState } from 'react';
import ConstellationGlyph from './ConstellationGlyph';
import JellyCharacter from './JellyCharacter';
import Starfield from './Starfield';
import { loadConstellationDays } from '../../lib/vaultData';

const JELLY_SRC = '/vault/jelly-blackcat.png';

export default function ConstellationDetail({ c, onBack }) {
  const [days, setDays] = useState(null);

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
          <ConstellationGlyph shape={c.shape} filled={c.shape.stars?.length} />
        </div>
      </div>

      <button
        type="button"
        onClick={onBack}
        className="absolute left-4 z-30 flex h-10 w-10 items-center justify-center rounded-full backdrop-blur-md transition-transform active:scale-90"
        style={{
          top: 'calc(16px + env(safe-area-inset-top))',
          background: 'color-mix(in srgb, var(--color-vault-sky-mid) 60%, transparent)',
          border: '1px solid color-mix(in srgb, var(--color-vault-white) 10%, transparent)',
        }}
        aria-label="뒤로가기"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M15 5l-7 7 7 7" stroke="var(--color-vault-foreground)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <JellyCharacter src={JELLY_SRC} alt={`${c.name}의 젤리 캐릭터`} />

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

      {/* 공유 버튼 — 자리만 확보 (PRD §5.3, V1.0 미구현) */}
      <button
        type="button"
        disabled
        className="absolute right-4 z-30 flex h-10 w-10 items-center justify-center rounded-full backdrop-blur-md opacity-60"
        style={{
          top: 'calc(16px + env(safe-area-inset-top))',
          background: 'color-mix(in srgb, var(--color-vault-jelly-a) 18%, transparent)',
          border: '1px solid color-mix(in srgb, var(--color-vault-jelly-a) 40%, transparent)',
        }}
        aria-label="공유하기 (준비 중)"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path
            d="M18 8a3 3 0 10-2.83-4M18 8a3 3 0 01-2.83-2M18 8l-9 4m0 0a3 3 0 100 4m0-4a3 3 0 010 4m0 0l9 4m0 0a3 3 0 102.83 2M15 20a3 3 0 012.83-2"
            stroke="var(--color-vault-foreground)"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  );
}
