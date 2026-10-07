'use client';

// 별자리 상세의 캐릭터 젤리 — 드래그로 당기면 말랑하게 따라오고, 탭하면 눌린 자국이 남는다(Figma ConstellationDetail.tsx 이식).
//
// ⚠️ 교체 방법: 이 컴포넌트는 이미지 경로(src)를 prop으로만 받는다. 인터랙션 로직은 이미지가 무엇이든 동일하게
//    동작하므로, public/vault/에 새 이미지를 넣고 src만 바꾸면 된다 — 이 파일은 손댈 필요 없다.

import { useRef, useState } from 'react';
import Image from 'next/image';

// widthVw/maxWidthPx: 화면별로 크기를 다르게 쓰고 싶을 때만 넘긴다(기본값 = 기존 스펙 그대로,
// VaultOnboarding·InviteDraw는 그대로 유지되고 ConstellationDetail만 더 크게 지정해서 쓴다).
export default function JellyCharacter({ src, alt, tint, onInteract, widthVw = 62, maxWidthPx = 300 }) {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [held, setHeld] = useState(false);
  const [punch, setPunch] = useState(0);
  const [tap, setTap] = useState({ x: 50, y: 50 });
  const drag = useRef(null);

  const down = (e) => {
    // iOS 사파리는 "누르고 있는 시간"만으로 이미지 저장 메뉴를 띄우려 하는데, CSS(touch-callout)만으론
    // 못 막을 때가 있어서 터치 시작 시점에 기본 동작 자체를 막는다(이 요소는 touch-none이라 스크롤 등
    // 다른 기본 동작과 충돌 없음).
    e.preventDefault();
    e.target.setPointerCapture?.(e.pointerId);
    drag.current = { sx: e.clientX, sy: e.clientY, ox: pos.x, oy: pos.y, moved: 0 };
    setHeld(true);
    onInteract?.(); // 처음 만졌을 때 1번만 필요한 신호(예: 온보딩 "Touch!" 힌트 없애기) — 호출부에서 알아서 1회만 반응
  };
  const move = (e) => {
    if (!drag.current) return;
    const rawX = e.clientX - drag.current.sx;
    const rawY = e.clientY - drag.current.sy;
    drag.current.moved = Math.max(drag.current.moved, Math.hypot(rawX, rawY));
    const cap = 120; // 고무줄처럼 당겨지는 정도를 제한
    setPos({
      x: Math.max(-cap, Math.min(cap, drag.current.ox + rawX * 0.7)),
      y: Math.max(-cap, Math.min(cap, drag.current.oy + rawY * 0.7)),
    });
  };
  const up = (e) => {
    const tapped = !!drag.current && drag.current.moved < 8;
    drag.current = null;
    setHeld(false);
    setPos({ x: 0, y: 0 }); // 놓으면 원래 자리로 튕겨 돌아옴
    if (tapped) {
      const r = e.currentTarget.getBoundingClientRect();
      setTap({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
      setPunch((n) => n + 1); // 탭 = 콕 찌르기 → 그 위치가 눌림
    }
  };

  // 당긴 방향으로 늘어나게 — 예전엔 방향 상관없이 항상 가로로만 넓어지고(scaleX↑) 세로는 눌렸는데(scaleY↓),
  // 위로 당겨도 가로로 퍼지는 것처럼 보이는 문제가 있었음. 이제 x/y 성분을 따로 봐서, 세로로 당기면
  // 세로로(스트레치) 늘어나고 가로는 살짝 눌리고, 가로로 당기면 그 반대로 동작한다.
  const stretchX = held ? Math.min(Math.abs(pos.x) / 300, 0.22) : 0;
  const stretchY = held ? Math.min(Math.abs(pos.y) / 300, 0.22) : 0;
  const scaleX = 1 + stretchX - stretchY * 0.5;
  const scaleY = 1 + stretchY - stretchX * 0.5;
  const angle = held ? pos.x / 22 : 0;

  return (
    <div className="relative flex flex-1 items-center justify-center">
      {/* 바닥에 고이는 은은한 그림자/빛 */}
      <div
        className="pointer-events-none absolute"
        style={{
          width: 200,
          height: 40,
          bottom: '30%',
          borderRadius: '50%',
          background: 'radial-gradient(closest-side, color-mix(in srgb, var(--color-vault-amber) 28%, transparent), transparent)',
          filter: 'blur(6px)',
          transform: `translateX(${pos.x * 0.4}px) scale(${1 - stretchY})`,
          transition: held ? 'none' : 'transform 0.55s cubic-bezier(0.34,1.56,0.64,1)',
        }}
      />
      <div
        className="relative"
        style={{
          width: `${widthVw}vw`,
          maxWidth: maxWidthPx,
          transform: `translate(${pos.x}px, ${pos.y + 56}px)`,
          transition: held ? 'none' : 'transform 0.55s cubic-bezier(0.34,1.56,0.64,1)',
        }}
      >
        <Image
          key={`jelly-${punch}`} // 탭마다 리마운트해서 애니메이션을 처음부터 다시 재생
          src={src}
          alt={alt}
          width={maxWidthPx}
          height={maxWidthPx}
          draggable={false}
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
          className="no-ios-callout block w-full touch-none select-none cursor-grab active:cursor-grabbing"
          style={{
            transformOrigin: `${tap.x}% ${tap.y}%`,
            transform: held ? `rotate(${angle}deg) scale(${scaleX}, ${scaleY})` : 'rotate(0deg) scale(1, 1)',
            // 놓는 순간 position(위 div의 translate)이랑 같은 바운스 커브로 scale도 같이 튕기며 돌아오게 —
            // 전엔 scale에 transition이 없어서 position만 탱글하게 돌아오고 모양은 순간적으로 스냅됐었음
            transition: held ? 'none' : 'transform 0.55s cubic-bezier(0.34,1.56,0.64,1)',
            // 원래처럼 전체가 자연스럽게 반응(약하게) — 탭한 자리 주변은 아래 레이어가 덧씌워져 더 세게 반응.
            // idle 애니메이션은 release 직후 0.55s는 일부러 비워둔다 — animation과 transition이 같은
            // transform 속성을 동시에 건드리면 animation이 이겨서 위 release 바운스 transition이 아예
            // 안 보이던 버그가 있었음(순간 스냅처럼 느껴진 원인). 0.55s 지연시켜 바운스가 끝난 뒤 인계.
            animation: held
              ? 'none'
              : punch > 0
                ? 'vault-jelly-punch 0.55s cubic-bezier(0.34,1.56,0.64,1), vault-squish-idle 3.4s ease-in-out 0.55s infinite'
                : 'vault-squish-idle 3.4s ease-in-out 0.55s infinite',
            filter: `${tint ? tint + ' ' : ''}drop-shadow(0 18px 40px color-mix(in srgb, var(--color-vault-black) 55%, transparent)) drop-shadow(0 0 26px color-mix(in srgb, var(--color-vault-amber) 25%, transparent))`,
            WebkitUserSelect: 'none',
            // iOS 사파리는 user-select만으론 안 막히고 이 속성을 따로 꺼야 길게 눌렀을 때
            // "이미지 저장/공유/복사" 메뉴가 안 뜬다
            WebkitTouchCallout: 'none',
          }}
        />
        {punch > 0 && (
          // 이미지를 하나 더 겹쳐서 탭 지점만 따로 반응시켰더니, 움직이는 동안 두 장이 살짝 어긋나며
          // 겹쳐 보이는(난시처럼 겹쳐 보이는) 문제가 있었음 — 이미지 복제 자체를 그만두고, 캐릭터는
          // 원본 한 장이 transform-origin(탭 지점)을 축으로 자연스럽게 전체 반응하는 것에만 맡기고,
          // "여기를 눌렀다"는 국소 신호는 이미지가 아닌 장식용 도장(ping) 효과로만 표현한다.
          <>
            <span
              key={`dent-${punch}`}
              className="pointer-events-none absolute"
              style={{
                left: `${tap.x}%`,
                top: `${tap.y}%`,
                width: '34%',
                height: '34%',
                borderRadius: '50%',
                background:
                  'radial-gradient(closest-side, color-mix(in srgb, var(--color-vault-black) 58%, transparent), color-mix(in srgb, var(--color-vault-black) 26%, transparent) 55%, transparent 72%)',
                mixBlendMode: 'multiply',
                animation: 'vault-dent-fade 0.5s ease-out forwards',
              }}
            />
            {/* 탭 지점에서 퍼지는 얇은 링 — 이미지가 아니라 장식 도형이라 겹침/어긋남 걱정 없음 */}
            <span
              key={`ring-${punch}`}
              className="pointer-events-none absolute rounded-full"
              style={{
                left: `${tap.x}%`,
                top: `${tap.y}%`,
                width: '14%',
                height: '14%',
                border: '2px solid color-mix(in srgb, var(--color-vault-white) 70%, transparent)',
                animation: 'vault-tap-ring 0.5s ease-out forwards',
              }}
            />
          </>
        )}
      </div>
    </div>
  );
}
