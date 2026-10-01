'use client';

// 홈 화면 조각 획득/보너스/별자리 완성/로그인 보너스 팝업 — PRD §4.3·§6 기반, 이후 사용자 디자인 지시로 조정.
// 라이트 테마(기존 디자인 시스템 토큰). 전부 중앙 팝업(바텀시트 아님) — 사용자 지시(2026-09-29)로 통일.

import Image from 'next/image';
import Button from './Button';

const BONUS_COPY = {
  first: '로그인 선물로 별조각을 3개 받았어요!', // 카카오 등 실계정 첫 로그인 시(계정당 1회) — 사용자 지시(2026-09-29)
  comeback: '다시 왔네요. 조각 세 개 드릴게요',
};

// 캐러셀에 지나가는 캐릭터 젤리 전체 목록 — 전용 이미지가 아직 없는 별자리(작은곰자리)는 뺐다
const JELLY_GALLERY = [
  'blackcat', 'cheesecat', 'hamster', 'capybara', 'quokka', 'panda', 'otter', 'seal',
  'raccoon', 'rabbit', 'squirrel', 'chick', 'dino', 'sheep', 'dog',
].map((key) => `/vault/jelly-${key}.png`);

export default function JellyPopup({ kind, count, isFirstEver, bonusType, constellationName, onClose, onView }) {
  if (kind === 'earn' || kind === 'bonus') {
    const isBonus = kind === 'bonus';
    const headline = isBonus ? BONUS_COPY[bonusType] : `별 조각을 ${count}개 받았어요!`;
    const pieceCount = isBonus ? 3 : count;
    return (
      <PopupShell onClose={onClose}>
        {/* 별 조각이 뿅 하고 튀어나오는 인터랙션 — 얻은 개수만큼, 살짝 시간차를 두고 등장 */}
        <div className="flex justify-center gap-8px pb-16px">
          {Array.from({ length: pieceCount }).map((_, i) => (
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
        <h2 className="text-center text-17 font-semibold text-text-primary">{headline}</h2>
        {!isBonus && isFirstEver && (
          <p className="pt-8px text-center text-15 font-normal text-text-secondary">
            별조각을 모아 별자리를 만들고
            <br />
            캐릭터 젤리를 얻을 수 있어요.
          </p>
        )}
        <div className="pt-24px">
          <Button className="w-full" onClick={onView}>
            내가 모은 젤리 보러가기
          </Button>
        </div>
      </PopupShell>
    );
  }

  if (kind === 'gift_arrived') {
    return (
      <PopupShell onClose={onClose}>
        <h2 className="text-center text-17 font-semibold text-text-primary">캐릭터 젤리 선물이 도착했어요</h2>
        <p className="pt-8px text-center text-15 font-normal text-text-secondary">
          내가 보낸 초대로 친구가 들어왔어요.
          <br />
          젤리를 받으러 가볼까요?
        </p>
        <div className="pt-24px">
          <Button className="w-full" onClick={onView}>
            선물 받으러 가기
          </Button>
        </div>
      </PopupShell>
    );
  }

  if (kind === 'completed' || kind === 'login_bonus') {
    const headline = kind === 'login_bonus' ? '검은고양이 젤리를 받았어요!' : '별자리가 완성되었어요!';
    return (
      <PopupShell onClose={onClose}>
        <h2 className="text-center text-17 font-semibold text-text-primary">{headline}</h2>
        {kind === 'completed' && constellationName && (
          // 카탈로그 이름은 전부 "~자리"로 끝나(모음 받침) 조사는 항상 "가"
          <p className="pt-8px text-center text-15 font-normal text-text-secondary">{constellationName}가 완성됐어요</p>
        )}
        <div className="pt-16px">
          <JellyMarquee />
        </div>
        <div className="pt-24px">
          <Button className="w-full" onClick={onView}>
            캐릭터 젤리 획득하러 가기
          </Button>
        </div>
      </PopupShell>
    );
  }

  return null;
}

function PopupShell({ onClose, children }) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center px-24px">
      <button
        type="button"
        aria-label="닫기"
        onClick={onClose}
        className="absolute inset-0 cursor-default"
        style={{ background: 'rgba(25, 31, 40, 0.4)' }}
      />
      <div className="relative w-full max-w-[360px] overflow-hidden rounded-24 bg-bg-default p-24px pt-32px shadow-[0_8px_24px_rgba(25,31,40,0.08)]">
        <button
          type="button"
          aria-label="닫기"
          onClick={onClose}
          className="absolute right-16px top-16px z-10 flex h-32px w-32px items-center justify-center rounded-8 text-text-dim transition duration-[96ms] ease-out active:scale-[0.98]"
        >
          <CloseIcon />
        </button>
        {children}
      </div>
    </div>
  );
}

// 캐릭터 젤리들이 옆으로 계속 지나가는 캐러셀 — 목록을 이어붙여 끊김 없이 반복시킨다
function JellyMarquee() {
  const loop = [...JELLY_GALLERY, ...JELLY_GALLERY];
  return (
    <div className="-mx-24px overflow-hidden">
      <div className="flex w-max animate-jelly-marquee gap-12px px-24px">
        {loop.map((src, i) => (
          <Image key={i} src={src} alt="" width={72} height={72} className="shrink-0" />
        ))}
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
