'use client';

// 홈 화면 조각 획득/보너스/별자리 완성 팝업 — PRD §4.3·§6 기반, 이후 사용자 디자인 지시로 조정.
// 라이트 테마(기존 디자인 시스템 토큰). 보너스·완성은 기존 "생애 첫 완수 별점 팝업"과 같은 바텀시트 패턴을 재사용.
// 조각 획득(kind='earn')은 중앙 팝업 + 별 조각 이미지가 뿅 튀어나오는 인터랙션(사용자 지시, 바텀시트가 아님).

import Image from 'next/image';
import Button from './Button';

const COPY = {
  bonus: {
    first: '시작 기념 조각 세 개 놓고 갈게요',
    comeback: '다시 왔네요. 조각 세 개 드릴게요',
  },
  completed: '별자리 하나 완성했어요',
};

export default function JellyPopup({ kind, count, isFirstEver, bonusType, constellationName, onClose, onView }) {
  if (kind === 'earn') {
    return (
      <div className="fixed inset-0 z-40 flex items-center justify-center px-24px">
        <button
          type="button"
          aria-label="닫기"
          onClick={onClose}
          className="absolute inset-0 cursor-default"
          style={{ background: 'rgba(25, 31, 40, 0.4)' }}
        />
        <div className="relative w-full max-w-[360px] rounded-24 bg-bg-default p-24px pt-32px shadow-[0_8px_24px_rgba(25,31,40,0.08)]">
          <button
            type="button"
            aria-label="닫기"
            onClick={onClose}
            className="absolute right-16px top-16px flex h-32px w-32px items-center justify-center rounded-8 text-text-dim transition duration-[96ms] ease-out active:scale-[0.98]"
          >
            <CloseIcon />
          </button>
          {/* 별 조각이 뿅 하고 튀어나오는 인터랙션 — 얻은 개수만큼, 살짝 시간차를 두고 등장 */}
          <div className="flex justify-center gap-8px pb-16px">
            {Array.from({ length: count }).map((_, i) => (
              <Image
                key={i}
                src="/star-piece.png"
                alt=""
                width={64}
                height={64}
                className="animate-jelly-pop"
                style={{ animationDelay: `${i * 120}ms` }}
              />
            ))}
          </div>
          <h2 className="text-center text-17 font-semibold text-text-primary">별 조각을 {count}개 받았어요!</h2>
          {isFirstEver && (
            <p className="pt-8px text-center text-15 font-normal text-text-secondary">
              별조각을 모아 별자리를 만들고 캐릭터 젤리를 얻을 수 있어요.
            </p>
          )}
          <div className="pt-24px">
            <Button className="w-full" onClick={onView}>
              내가 모은 젤리 보러가기
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // bonus / completed — 기존 바텀시트 패턴
  const headline = kind === 'bonus' ? COPY.bonus[bonusType] : COPY.completed;
  return (
    <div className="fixed inset-0 z-40">
      <button
        type="button"
        aria-label="닫기"
        onClick={onClose}
        className="absolute inset-0 cursor-default"
        style={{ background: 'rgba(25, 31, 40, 0.4)' }}
      />
      <div className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-[480px] rounded-t-16 bg-bg-default p-20px pb-32px shadow-[0_8px_24px_rgba(25,31,40,0.08)]">
        <div className="flex items-start justify-between pb-4px">
          <h2 className="text-17 font-semibold text-text-primary">{headline}</h2>
          <button
            type="button"
            aria-label="닫기"
            onClick={onClose}
            className="flex h-32px w-32px shrink-0 items-center justify-center rounded-8 text-text-dim transition duration-[96ms] ease-out active:scale-[0.98]"
          >
            <CloseIcon />
          </button>
        </div>
        {kind === 'completed' && constellationName ? (
          // 카탈로그 이름은 전부 "~자리"로 끝나(모음 받침) 조사는 항상 "가"
          <p className="pb-24px text-15 font-normal text-text-secondary">{constellationName}가 완성됐어요</p>
        ) : (
          <div className="pb-24px" />
        )}
        <Button className="w-full" onClick={onView}>
          보러 가기
        </Button>
      </div>
    </div>
  );
}

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M6 6L18 18M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
