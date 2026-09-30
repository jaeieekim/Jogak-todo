'use client';

// 별자리 상세의 캐릭터 젤리 — 드래그로 당기면 말랑하게 따라오고, 탭하면 눌린 자국이 남는다(Figma ConstellationDetail.tsx 이식).
//
// ⚠️ 교체 방법: 이 컴포넌트는 이미지 경로(src)를 prop으로만 받는다. 인터랙션 로직은 이미지가 무엇이든 동일하게
//    동작하므로, public/vault/에 새 이미지를 넣고 src만 바꾸면 된다 — 이 파일은 손댈 필요 없다.

import { useRef, useState } from 'react';
import Image from 'next/image';

export default function JellyCharacter({ src, alt, tint, onInteract }) {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [held, setHeld] = useState(false);
  const [punch, setPunch] = useState(0);
  const [tap, setTap] = useState({ x: 50, y: 50 });
  const drag = useRef(null);

  const down = (e) => {
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

  const pull = Math.hypot(pos.x, pos.y);
  const stretch = held ? Math.min(pull / 400, 0.12) : 0;
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
          transform: `translateX(${pos.x * 0.4}px) scale(${1 - stretch})`,
        }}
      />
      <div
        className="relative w-[62vw] max-w-[300px]"
        style={{
          transform: `translate(${pos.x}px, ${pos.y + 56}px)`,
          transition: held ? 'none' : 'transform 0.55s cubic-bezier(0.34,1.56,0.64,1)',
        }}
      >
        <Image
          key={`jelly-${punch}`} // 탭마다 리마운트해서 눌림 애니메이션을 처음부터 다시 재생
          src={src}
          alt={alt}
          width={300}
          height={300}
          draggable={false}
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
          className="block w-full touch-none select-none cursor-grab active:cursor-grabbing"
          style={{
            transformOrigin: `${tap.x}% ${tap.y}%`,
            transform: held ? `rotate(${angle}deg) scale(${1 + stretch}, ${1 - stretch})` : undefined,
            animation: held
              ? 'none'
              : punch > 0
                ? 'vault-jelly-punch 0.55s cubic-bezier(0.34,1.56,0.64,1), vault-squish-idle 3.4s ease-in-out 0.55s infinite'
                : 'vault-squish-idle 3.4s ease-in-out infinite',
            filter: `${tint ? tint + ' ' : ''}drop-shadow(0 18px 40px color-mix(in srgb, var(--color-vault-black) 55%, transparent)) drop-shadow(0 0 26px color-mix(in srgb, var(--color-vault-amber) 25%, transparent))`,
            WebkitUserSelect: 'none',
            // iOS 사파리는 user-select만으론 안 막히고 이 속성을 따로 꺼야 길게 눌렀을 때
            // "이미지 저장/공유/복사" 메뉴가 안 뜬다
            WebkitTouchCallout: 'none',
          }}
        />
        {punch > 0 && (
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
        )}
      </div>
    </div>
  );
}
