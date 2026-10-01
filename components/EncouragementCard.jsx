'use client';

// 이어가기 응원카드 — Figma node-id=111:652 "응원카드" 그대로 이식.
// 그라데이션 배경·캐릭터 글로우는 이 카드 전용 1회성 스페셜 모먼트라 CLAUDE.md의 "플랫 채움만" 원칙의
// 문서화된 예외로 둔다(VaultOnboarding.jsx의 크림 오버레이·그라디언트 텍스트와 같은 방식). 재사용되는 UI가
// 아니라 토큰화하지 않고 피그마 값 그대로 하드코딩.

import Image from 'next/image';
import { JELLY_SRC_BY_KEY, JELLY_SRC_DEFAULT } from './vault/ConstellationDetail';

export default function EncouragementCard({ card, onClose }) {
  const jellySrc = JELLY_SRC_BY_KEY[card.catalogKey] ?? JELLY_SRC_DEFAULT;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-24px">
      <button
        type="button"
        aria-label="닫기"
        onClick={onClose}
        className="absolute inset-0 cursor-default"
        style={{ background: 'rgba(0,0,0,0.6)' }}
      />
      <div
        className="relative flex w-full max-w-[344px] flex-col items-center overflow-hidden rounded-24 border-[3px] border-bg-default"
        style={{
          // 피그마 "응원카드" 배경 그라데이션 그대로(135.76deg, 보라→하늘→민트 파스텔) — 문서화된 예외
          background:
            'linear-gradient(135.76deg, #F2E2FF 2.29%, #EAF1FE 50.31%, #E2FFFE 98.33%)',
        }}
      >
        <button
          type="button"
          aria-label="닫기"
          onClick={onClose}
          className="absolute right-20px top-20px flex h-24px w-24px items-center justify-center text-text-dim"
        >
          <CloseIcon size={16} />
        </button>

        <div className="flex flex-col items-center gap-20px px-24px pb-32px pt-32px">
          <div
            className="rounded-full px-12px py-8px"
            style={{ background: 'var(--color-bg-inverse)' }}
          >
            <span className="text-15 font-semibold text-brand-primary">{card.name}의 응원카드</span>
          </div>

          <Image
            src={jellySrc}
            alt={`${card.name} 젤리 캐릭터`}
            width={180}
            height={180}
            className="h-auto w-[180px]"
            style={{ filter: 'drop-shadow(0 0 32px rgba(255,255,255,0.75))' }}
          />

          <p className="text-24 font-bold leading-[1.4] text-text-primary text-center">{card.quote}</p>
        </div>
      </div>
    </div>
  );
}

function CloseIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M6 6L18 18M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
