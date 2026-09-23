'use client';

// 은하수 화면 — Figma Galaxy.tsx 이식. 드래그로 팬 이동, 완성 별자리를 탭하면 상세로 확대 진입.
// 실제 데이터(lib/vaultData.js)를 받아 그리기만 하고, 별자리 자체의 모양·색은 shape 안에 들어있다.

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import ConstellationGlyph from './ConstellationGlyph';
import Starfield from './Starfield';
import { panBounds } from '../../lib/galaxyLayout';

export default function Galaxy({ data, onOpen }) {
  const router = useRouter();
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const drag = useRef(null);
  const [dragging, setDragging] = useState(false);

  const PAN = panBounds(data.constellations.map((c) => ({ x: c.wx, y: c.wy })));

  const pointerDown = (e) => {
    e.target.setPointerCapture?.(e.pointerId);
    drag.current = { startX: e.clientX, startY: e.clientY, ox: offset.x, oy: offset.y, moved: 0 };
    setDragging(true);
  };
  const pointerMove = (e) => {
    if (!drag.current) return;
    const dx = e.clientX - drag.current.startX;
    const dy = e.clientY - drag.current.startY;
    drag.current.moved = Math.max(drag.current.moved, Math.hypot(dx, dy));
    setOffset({
      x: Math.max(PAN.minX, Math.min(PAN.maxX, drag.current.ox + dx)),
      y: Math.max(PAN.minY, Math.min(PAN.maxY, drag.current.oy + dy)),
    });
  };
  const pointerUp = () => {
    drag.current = null;
    setDragging(false);
  };

  const handleTap = (e, c) => {
    if (drag.current && drag.current.moved > 6) return; // 팬 동작이었다면 무시
    if (c.status !== 'done') return; // 진행 중·잠긴 별자리는 상세가 없음
    const rect = e.currentTarget.getBoundingClientRect();
    onOpen(c, { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
  };

  return (
    <div
      className="relative h-full w-full touch-none overflow-hidden select-none"
      style={{
        background:
          'radial-gradient(120% 90% at 50% 12%, var(--color-vault-sky-violet) 0%, var(--color-vault-sky-mid) 42%, var(--color-vault-sky-deep) 100%)',
        cursor: dragging ? 'grabbing' : 'grab',
      }}
      onPointerDown={pointerDown}
      onPointerMove={pointerMove}
      onPointerUp={pointerUp}
      onPointerCancel={pointerUp}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(50% 40% at 22% 78%, color-mix(in srgb, var(--color-vault-jelly-b) 10%, transparent), transparent 70%), radial-gradient(46% 38% at 82% 24%, color-mix(in srgb, var(--color-vault-jelly-c) 10%, transparent), transparent 70%)',
        }}
      />
      <Starfield count={70} seed={3} />
      <div className="pointer-events-none absolute inset-0" style={{ transform: `translate(${offset.x * 0.35}px, ${offset.y * 0.35}px)` }}>
        <Starfield count={40} seed={11} />
      </div>

      <div
        className="absolute left-1/2 top-1/2"
        style={{
          transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
          transition: dragging ? 'none' : 'transform 0.4s cubic-bezier(0.22,1,0.36,1)',
        }}
      >
        {/* 별자리를 잇는 흐린 선 */}
        <svg className="pointer-events-none absolute left-0 top-0" style={{ overflow: 'visible' }} width={0} height={0}>
          {data.constellations.slice(0, -1).map((c, i) => {
            const next = data.constellations[i + 1];
            const dim = c.status === 'locked' || next.status === 'locked';
            return (
              <line
                key={c.id ?? c.catalogKey}
                x1={c.wx}
                y1={c.wy}
                x2={next.wx}
                y2={next.wy}
                stroke="var(--color-vault-link-line)"
                strokeOpacity={dim ? 0.07 : 0.14}
                strokeWidth={1}
              />
            );
          })}
        </svg>

        {data.constellations.map((c) => {
          const isDone = c.status === 'done';
          const isProgress = c.status === 'progress';
          const isLocked = c.status === 'locked';
          const size = c.shape.size ?? 210;
          // 완성 별자리만 실제로 탭할 수 있어서 버튼, 나머지는 div(진행 중 별자리 아래 "모으러 가기" 안내는 별도의 실제 버튼이라
          // <button> 안에 <button>이 중첩되는 걸(잘못된 HTML) 피하려고 이렇게 나눔).
          const Wrapper = isDone ? 'button' : 'div';
          const labelTop =
            (0.5 + (Math.max(...c.shape.stars.map((s) => s.y)) - Math.min(...c.shape.stars.map((s) => s.y))) / 2) * size + 32;
          return (
            <Wrapper
              key={c.id ?? c.catalogKey}
              type={isDone ? 'button' : undefined}
              onClick={isDone ? (e) => handleTap(e, c) : undefined}
              className="absolute -translate-x-1/2 -translate-y-1/2 outline-none"
              style={{ left: c.wx, top: c.wy, cursor: isDone ? 'pointer' : 'default', opacity: isLocked ? 0.5 : 1 }}
              aria-label={isDone ? c.name : undefined}
            >
              <div
                className="relative transition-transform duration-300"
                style={{ animation: isDone || isProgress ? `vault-drift ${9 + (i9(c) % 4)}s ease-in-out infinite` : undefined }}
              >
                <div
                  className={isDone ? 'transition-transform duration-300 active:scale-95 hover:scale-[1.04]' : ''}
                  style={{ width: size, height: size }}
                >
                  <ConstellationGlyph
                    shape={c.shape}
                    size={size}
                    filled={isProgress ? c.pieceCount : isLocked ? 0 : c.shape.stars.length}
                    locked={isLocked}
                    sparkIndex={isProgress ? c.sparkIndex : null}
                  />
                </div>
                {!isLocked && (
                  <div
                    className="absolute left-1/2 flex -translate-x-1/2 flex-col items-center gap-8px"
                    style={{ top: labelTop }}
                  >
                    <span
                      className="pointer-events-none whitespace-nowrap text-vault-12 tracking-wide"
                      style={{
                        color: isProgress ? 'var(--color-vault-muted-foreground)' : 'var(--color-vault-foreground)',
                        opacity: isProgress ? 0.9 : 0.85,
                        textShadow: '0 0 12px color-mix(in srgb, var(--color-vault-black) 60%, transparent)',
                      }}
                    >
                      {displayName(c)}
                      {isProgress && (
                        <span style={{ color: 'var(--color-vault-jelly-a)' }}>
                          {' '}
                          · {c.pieceCount}/{c.pieceTotal}
                        </span>
                      )}
                    </span>
                    {/* "잠든 ○○자리 알" 문구 바로 아래 — 탭하면 홈으로 이동해 더 모으러 가게 유도 */}
                    {isProgress && (
                      <button
                        type="button"
                        onClick={() => router.push('/')}
                        className="whitespace-nowrap rounded-16 px-3.5 py-2 text-center text-vault-13 leading-snug backdrop-blur-md transition-transform active:scale-95"
                        style={{
                          background: 'color-mix(in srgb, var(--color-vault-mascot-bg) 72%, transparent)',
                          border: '1px solid color-mix(in srgb, var(--color-vault-jelly-a) 35%, transparent)',
                          color: 'var(--color-vault-foreground)',
                          boxShadow: '0 8px 30px color-mix(in srgb, var(--color-vault-black) 45%, transparent)',
                        }}
                      >
                        <span style={{ color: 'var(--color-vault-amber)' }}>✦</span>{' '}
                        {c.pieceCount === 0 ? '아직 별 조각이 없어요! 모으러 가볼까요?' : '새로운 별 조각을 모으러 가볼까요?'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </Wrapper>
          );
        })}
      </div>

      {/* 상단: 중앙으로 돌아가기 */}
      <div className="pointer-events-none absolute inset-x-0 z-30 flex flex-col items-center gap-3" style={{ top: 'calc(76px + env(safe-area-inset-top))' }}>
        <button
          type="button"
          onClick={() => setOffset({ x: 0, y: 0 })}
          className="pointer-events-auto rounded-full px-4 py-1.5 text-vault-12 backdrop-blur-md transition-transform active:scale-95"
          style={{
            background: 'color-mix(in srgb, var(--color-vault-sky-mid) 60%, transparent)',
            border: '1px solid color-mix(in srgb, var(--color-vault-jelly-a) 35%, transparent)',
            color: 'var(--color-vault-foreground)',
          }}
        >
          <span style={{ color: 'var(--color-vault-jelly-a)' }}>◎</span> 중앙으로 돌아가기
        </button>
      </div>

      {/* 하단: 시작한 날 / 모은 조각 — 하단 내비게이션 바(56px)와 겹치지 않게 그 위에 둠 */}
      <div className="pointer-events-none absolute inset-x-0 z-20 flex items-center justify-between px-5" style={{ bottom: 'calc(56px + 12px + env(safe-area-inset-bottom))' }}>
        <div
          className="rounded-full px-3.5 py-1.5 text-vault-13 font-medium backdrop-blur-md"
          style={{ background: 'color-mix(in srgb, var(--color-vault-sky-mid) 60%, transparent)', border: '1px solid color-mix(in srgb, var(--color-vault-white) 8%, transparent)', color: 'var(--color-vault-foreground)' }}
        >
          <span style={{ color: 'var(--color-vault-amber)' }}>✦</span> 시작한 날 <b>{data.startedDays}</b>
        </div>
        <div
          className="rounded-full px-3.5 py-1.5 text-vault-13 backdrop-blur-md"
          style={{ background: 'color-mix(in srgb, var(--color-vault-sky-mid) 60%, transparent)', border: '1px solid color-mix(in srgb, var(--color-vault-white) 8%, transparent)', color: 'var(--color-vault-muted-foreground)' }}
        >
          모은 조각 <b style={{ color: 'var(--color-vault-foreground)' }}>{data.totalPieces}</b>
        </div>
      </div>
    </div>
  );
}

// 진행 중일 때 "잠든 ○○자리 알"로 보여준다(9조각 미만) — DB에는 기본 이름만 저장하고 표기는 화면이 조립
function displayName(c) {
  if (c.status === 'progress') return `잠든 ${c.name} 알`;
  return c.name;
}

// drift 애니메이션 주기를 별자리마다 살짝 다르게 흩어주는 용도(카탈로그 키 길이 기반, Figma와 동일 방식)
function i9(c) {
  return (c.catalogKey ?? '').length;
}
