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
  // 놓는 순간 되돌아갈 "회전 목표값" — 항상 0으로 고정하면 왼쪽(180도 근처)으로 당겼다 놓을 때
  // 180도→0도로 회전을 거의 반 바퀴 쓸고 지나가며 빙글 도는 것처럼 보임(오른쪽은 0도→0도라 거의 안
  // 움직여서 매끄러움 — 이게 "왼쪽만 난리법석"의 진짜 원인이었음, 실측으로 확인). scale이 (1,1)이 되면
  // rotate 값이 뭐든 최종 모양은 똑같아지므로(회전 후 등방 배율은 항등), 0 대신 "당겼던 각도와 가장
  // 가까운 쪽"(0 또는 ±180)으로 되돌아가게 해서 회전은 거의 안 움직이고 크기만 줄어들게 한다.
  const [releaseAngle, setReleaseAngle] = useState(0);
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
    // 놓기 직전의 당긴 각도를 기준으로, 되돌아갈 목표를 0 또는 ±180 중 더 가까운 쪽으로 — 왼쪽으로
    // 당긴 상태(180도 근처)라면 180(부호 유지)으로 되돌아가게 해서 회전 이동 거리를 최소화한다.
    const releaseDist = Math.hypot(pos.x, pos.y);
    const heldAngle = releaseDist > 0 ? Math.atan2(pos.y, pos.x) * (180 / Math.PI) : 0;
    setReleaseAngle(Math.abs(heldAngle) > 90 ? (heldAngle >= 0 ? 180 : -180) : 0);
    setHeld(false);
    setPos({ x: 0, y: 0 }); // 놓으면 원래 자리로 튕겨 돌아옴
    if (tapped) {
      const r = e.currentTarget.getBoundingClientRect();
      setTap({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
      setPunch((n) => n + 1); // 탭 = 콕 찌르기 → 그 위치가 눌림
    }
  };

  // 당긴 방향으로(대각선 포함 어느 각도로든) 늘어나게 — x/y를 따로 계산해 축(가로·세로)으로만
  // 늘리면 45도 같은 대각선으로 당겼을 때 늘어나는 축이 여전히 가로/세로라 당긴 방향과 어긋나 보였다.
  // 대신 "당긴 각도만큼 돌리기 → 그 축으로 늘리기 → 다시 되돌리기"로 늘어나는 축 자체를 당긴 방향에
  // 맞춘다 — 어느 각도로 당기든 정확히 그 방향으로 길쭉해지고 수직 방향은 살짝 눌린다.
  const pullDist = Math.hypot(pos.x, pos.y);
  const pullAngleDeg = held && pullDist > 0 ? Math.atan2(pos.y, pos.x) * (180 / Math.PI) : 0;
  const stretch = held ? Math.min(pullDist / 300, 0.26) : 0;

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
          transform: `translateX(${pos.x * 0.4}px) scale(${1 - stretch * 0.6})`,
          transition: held ? 'none' : 'transform 0.5s cubic-bezier(0.34,2.4,0.64,1)',
        }}
      />
      <div
        className="relative"
        style={{
          width: `${widthVw}vw`,
          maxWidth: maxWidthPx,
          transform: `translate(${pos.x}px, ${pos.y + 56}px)`,
          transition: held ? 'none' : 'transform 0.5s cubic-bezier(0.34,2.4,0.64,1)',
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
            // 드래그 중엔 항상 정중앙을 축으로 늘어나야 좌우가 대칭으로 보인다 — 예전엔 "마지막 탭 위치"
            // (tap.x/y, 탭할 때마다 중심이 아닐 수 있음)를 그대로 썼더니, 중심이 아닌 쪽으로 치우친
            // 축을 기준으로 돌려서-늘려서-되돌리다 보니 한쪽(예: 축에서 먼 왼쪽)만 유난히 크게
            // 흔들리는 것처럼 보였음(탄력이 좌우 비대칭). 드래그 중엔 50%/50%로 고정.
            transformOrigin: held ? '50% 50%' : `${tap.x}% ${tap.y}%`,
            // 놓였을 때 되돌아가는 회전 목표를 0으로 고정하지 않고 releaseAngle(0 또는 ±180 중 당겼던
            // 쪽과 가까운 값)로 잡는다 — scale이 (1,1)이 되면 회전값과 무관하게 최종 모양은 항등이라
            // 결과는 똑같지만, 전환 중 회전이 "거의 안 움직이는 경로"로만 가서 왼쪽에서도 오른쪽처럼
            // 매끄럽게 줄어든다(자세한 원인은 releaseAngle 선언부 주석 참조).
            transform: held
              ? `rotate(${pullAngleDeg}deg) scale(${1 + stretch}, ${1 - stretch * 0.55}) rotate(${-pullAngleDeg}deg)`
              : `rotate(${releaseAngle}deg) scale(1, 1) rotate(${-releaseAngle}deg)`,
            // 놓는 순간 모양이 탱글하게 되돌아오도록 — 기존 커브(1.56)는 실측해보니 오버슈트가 1%도 안
            // 될 만큼 미미해서 거의 안 느껴졌음. 되돌아오는 탄성을 눈에 띄게 키움(3.4→5.2까지 키웠다가,
            // 되돌아올 때 너무 많이 찌그러진다는 피드백으로 살짝 낮춤(5.2→4.3) — 탱글한 느낌은 유지하되
            // 오버슈트 폭만 줄임.
            transition: held ? 'none' : 'transform 0.5s cubic-bezier(0.34,4.3,0.64,1)',
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
