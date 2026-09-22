'use client';

// 하단 내비게이션 — 홈 / 보관소. 화면 어디에 등장하든 같은 스펙(공통 UI 스펙 표 참조).
// 홈(app/page.jsx)과 보관소(app/vault/page.jsx) 양쪽에서 이 컴포넌트를 그대로 쓴다.

import { useRouter } from 'next/navigation';

export default function BottomNav({ active }) {
  const router = useRouter();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-bg-default">
      <div className="mx-auto flex h-[56px] w-full max-w-[480px]">
        <button
          type="button"
          onClick={() => router.push('/')}
          className={`flex flex-1 flex-col items-center justify-center gap-4px ${
            active === 'home' ? 'text-brand-primary' : 'text-text-dim'
          }`}
        >
          <HomeIcon />
          <span className="text-12 font-medium">홈</span>
        </button>
        <button
          type="button"
          aria-label="기록·리포트 보관소"
          onClick={() => router.push('/vault')}
          className={`flex flex-1 flex-col items-center justify-center gap-4px ${
            active === 'vault' ? 'text-brand-primary' : 'text-text-dim'
          }`}
        >
          <VaultIcon />
          <span className="text-12 font-medium">보관소</span>
        </button>
      </div>
    </nav>
  );
}

function HomeIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path
        d="M4 10.5L12 4L20 10.5V19C20 19.5523 19.5523 20 19 20H5C4.44772 20 4 19.5523 4 19V10.5Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

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
