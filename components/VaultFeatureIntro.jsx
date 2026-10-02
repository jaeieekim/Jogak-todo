'use client';

// 기능 추가 소개 팝업("캐릭터 젤리 보관소가 생겼어요!") — 홈 화면 최초 1회만.
// Figma node-id=111:436 그대로 이식. 하단 네비게이션 바까지 통째로 딤 처리한 뒤, 보관소 탭만
// 딤 위로(z-index 더 높게) 다시 그려서 돋보이게 하고, 손글씨 화살표로 그쪽을 가리킨다.
// 젤리 마퀴는 JellyPopup.jsx의 JellyMarquee를 그대로 재사용(새 컴포넌트 안 만듦).

import { useRouter } from 'next/navigation';
import { JellyMarquee } from './JellyPopup';

export default function VaultFeatureIntro({ onClose, onView }) {
  const router = useRouter();

  return (
    <div className="fixed inset-0 z-40">
      {/* 배경 전체(네비바 포함) 딤 — 탭하면 닫기, 다른 팝업들과 동일 패턴 */}
      <button
        type="button"
        aria-label="닫기"
        onClick={onClose}
        className="absolute inset-0 cursor-default"
        style={{ background: 'rgba(0,0,0,0.6)' }}
      />

      {/* 카드 */}
      <div className="absolute left-1/2 top-1/2 z-10 w-[330px] max-w-[calc(100vw-48px)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-24 bg-bg-default shadow-[0_8px_24px_rgba(25,31,40,0.08)]">
        <button
          type="button"
          aria-label="닫기"
          onClick={onClose}
          className="absolute right-20px top-20px z-10 flex h-24px w-24px items-center justify-center text-text-dim"
        >
          <CloseIcon size={16} />
        </button>

        <h2 className="px-24px pt-44px text-center text-17 font-bold text-text-primary">
          캐릭터 젤리 보관소가 생겼어요!
        </h2>

        <div className="pt-32px">
          <JellyMarquee size={150} />
        </div>

        <div className="flex flex-col gap-8px px-24px pb-24px pt-32px">
          <button
            type="button"
            onClick={onView}
            className="h-48px rounded-12 bg-brand-primary text-17 font-semibold text-text-on-brand transition active:scale-[0.98]"
          >
            지금 바로 둘러보기
          </button>
          <button
            type="button"
            onClick={onClose}
            className="h-48px rounded-12 bg-bg-surface text-17 font-semibold text-text-secondary transition active:scale-[0.98]"
          >
            나중에 볼게요
          </button>
        </div>
      </div>

      {/* 손글씨 화살표 — 카드에서 하단 네비 "보관소" 쪽을 가리킴 (피그마 원본 SVG·회전값 그대로, 문서화된 예외) */}
      <div className="pointer-events-none fixed z-10" style={{ right: '16%', bottom: '72px', transform: 'rotate(68.26deg)' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/vault-intro/arrow.svg" alt="" width={100} height={41} />
      </div>

      {/* 네비바 "보관소" 탭만 딤 위로 다시 그려서 돋보이게 — 실제로 눌리는 버튼(보관소로 이동) */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50">
        <div className="mx-auto flex h-[56px] w-full max-w-[480px]">
          <div className="flex-1" aria-hidden />
          <button
            type="button"
            onClick={() => {
              onView();
              router.push('/vault');
            }}
            className="pointer-events-auto flex flex-1 flex-col items-center justify-center gap-4px text-brand-primary"
          >
            <VaultIcon />
            <span className="text-12 font-medium">보관소</span>
          </button>
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

// BottomNav.jsx의 VaultIcon과 동일(돋보이는 탭 하나만 다시 그리는 거라 로컬로 둠)
function VaultIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 4L13.8 9.2L19 11L13.8 12.8L12 18L10.2 12.8L5 11L10.2 9.2L12 4Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}
