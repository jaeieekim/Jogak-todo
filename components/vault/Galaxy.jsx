'use client';

// 은하수 화면 — Figma Galaxy.tsx 이식. 드래그로 팬 이동, 핀치/휠로 확대·축소, 완성 별자리를 탭하면 상세로 확대 진입.
// 실제 데이터(lib/vaultData.js)를 받아 그리기만 하고, 별자리 자체의 모양·색은 shape 안에 들어있다.

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import ConstellationGlyph from './ConstellationGlyph';
import Starfield from './Starfield';
import { panBounds, clamp, rubberband } from '../../lib/galaxyLayout';
import { getOrCreateInviteCode } from '../../lib/jelly';
import { track, EVENTS } from '../../lib/mixpanel';

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 2.5;

function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export default function Galaxy({ data, onOpen }) {
  const router = useRouter();
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [interacting, setInteracting] = useState(false); // 드래그 팬 또는 핀치 중(둘 다 전환 애니메이션을 꺼야 해서 하나로 관리)
  const [viewport, setViewport] = useState({ w: 0, h: 0 });
  const [shareState, setShareState] = useState('idle'); // 'idle' | 'sharing' | 'copied' — ConstellationDetail.jsx와 동일 패턴

  async function handleShare() {
    if (shareState === 'sharing') return;
    setShareState('sharing');
    try {
      const code = await getOrCreateInviteCode();
      if (!code) {
        setShareState('idle');
        return;
      }
      const url = `${window.location.origin}/invite/${code}`;
      track(EVENTS.INVITE_CREATED, { source: 'vault_banner' });
      if (navigator.share) {
        await navigator.share({
          title: '말랑말랑, 동물 젤리 선물이 도착했어요',
          text: '알을 깨면 어떤 젤리가 나올까요?',
          url,
        });
        setShareState('idle');
      } else {
        await navigator.clipboard.writeText(url);
        setShareState('copied');
        setTimeout(() => setShareState('idle'), 2000);
      }
    } catch {
      setShareState('idle');
    }
  }

  const rootRef = useRef(null);
  const drag = useRef(null); // 한 손가락 팬 드래그 상태
  const pointers = useRef(new Map()); // 현재 눌려있는 포인터들 (핀치 판단용)
  const pinch = useRef(null); // 두 손가락 핀치 시작 시점의 거리/줌
  // 드래그가 완성 별자리 버튼 위에서 시작되면(Pointer Capture 때문에) pointerup 뒤에 그 버튼의
  // click 이벤트가 뒤따라온다. drag.current는 pointerup에서 바로 비워지므로 그 click 시점엔 이미 null이라
  // "방금 드래그였다"를 못 읽는다 — 그래서 클릭까지 살아있는 별도 ref로 "방금 드래그였는지"만 따로 기억한다.
  const wasDrag = useRef(false);
  // "최근 모은 별자리 보기" → 중앙으로 이동하는 애니메이션이 끝나면 그 별자리를 자동으로 열기 위한 대기열
  const pendingOpenRef = useRef(null);

  // 뷰포트(보관소 화면) 실제 픽셀 크기 — 팬 범위 계산에 필요(콘텐츠 × 줌배율 - 뷰포트)
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const update = () => setViewport({ w: el.clientWidth, h: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const positions = data.constellations.map((c) => ({ x: c.wx, y: c.wy }));
  const PAN = panBounds(positions, { zoom, viewportW: viewport.w, viewportH: viewport.h });

  const pointerDown = (e) => {
    e.target.setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      drag.current = null;
      const [p1, p2] = [...pointers.current.values()];
      pinch.current = { startDist: dist(p1, p2), startZoom: zoom };
    } else if (pointers.current.size === 1) {
      drag.current = { startX: e.clientX, startY: e.clientY, ox: offset.x, oy: offset.y, moved: 0 };
      wasDrag.current = false;
    }
    setInteracting(true);
  };

  const pointerMove = (e) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pinch.current && pointers.current.size === 2) {
      const [p1, p2] = [...pointers.current.values()];
      const ratio = dist(p1, p2) / pinch.current.startDist;
      const rawZoom = pinch.current.startZoom * ratio;
      const z = rubberband(rawZoom, ZOOM_MIN, ZOOM_MAX);
      setZoom(z);
      // 줌이 바뀌면 팬 허용 범위도 즉시 좁아지거나 넓어진다 — 현 오프셋을 새 범위에 맞춰 고무줄로 당겨둔다
      const bounds = panBounds(positions, { zoom: z, viewportW: viewport.w, viewportH: viewport.h });
      setOffset((o) => ({ x: rubberband(o.x, bounds.minX, bounds.maxX), y: rubberband(o.y, bounds.minY, bounds.maxY) }));
      return;
    }

    if (!drag.current) return;
    const dx = e.clientX - drag.current.startX;
    const dy = e.clientY - drag.current.startY;
    drag.current.moved = Math.max(drag.current.moved, Math.hypot(dx, dy));
    if (drag.current.moved > 6) wasDrag.current = true;
    setOffset({
      x: rubberband(drag.current.ox + dx, PAN.minX, PAN.maxX),
      y: rubberband(drag.current.oy + dy, PAN.minY, PAN.maxY),
    });
  };

  const pointerUp = (e) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;

    if (pointers.current.size === 1) {
      // 핀치 중 손가락 하나를 떼서 한 손가락만 남은 경우 — 남은 손가락으로 팬 드래그를 새로 시작
      const [[, pt]] = pointers.current;
      drag.current = { startX: pt.x, startY: pt.y, ox: offset.x, oy: offset.y, moved: 0 };
      return;
    }
    if (pointers.current.size > 0) return;

    drag.current = null;
    setInteracting(false);
    // 손을 다 뗐을 때 고무줄로 한계를 넘어가 있었다면 범위 안으로 스냅(여기서 transition이 다시 붙어 튕겨 돌아온다)
    const z = clamp(zoom, ZOOM_MIN, ZOOM_MAX);
    const bounds = panBounds(positions, { zoom: z, viewportW: viewport.w, viewportH: viewport.h });
    setZoom(z);
    setOffset((o) => ({ x: clamp(o.x, bounds.minX, bounds.maxX), y: clamp(o.y, bounds.minY, bounds.maxY) }));
  };

  const handleWheel = (e) => {
    if (!e.ctrlKey) return; // 일반 스크롤은 무시 — 트랙패드 두 손가락 핀치(ctrl+wheel로 들어옴)만 줌으로 처리
    e.preventDefault();
    const factor = Math.exp(-e.deltaY * 0.01);
    const z = clamp(zoom * factor, ZOOM_MIN, ZOOM_MAX);
    const bounds = panBounds(positions, { zoom: z, viewportW: viewport.w, viewportH: viewport.h });
    setZoom(z);
    setOffset((o) => ({ x: clamp(o.x, bounds.minX, bounds.maxX), y: clamp(o.y, bounds.minY, bounds.maxY) }));
  };

  const handleTap = (e, c) => {
    if (wasDrag.current) return; // 팬 동작이었다면 무시(눌렀던 버튼의 클릭으로 오인 방지)
    if (c.status !== 'done') return; // 진행 중·잠긴 별자리는 상세가 없음
    const rect = e.currentTarget.getBoundingClientRect();
    onOpen(c, { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
  };

  // 완성된 별자리 중 가장 최근에 완성한 것
  const latest = data.constellations
    .filter((c) => c.status === 'done' && c.completedAt)
    .reduce((best, c) => (!best || new Date(c.completedAt) > new Date(best.completedAt) ? c : best), null);
  const isCentered = offset.x === 0 && offset.y === 0;

  const recenter = () => {
    setOffset({ x: 0, y: 0 });
    setZoom(1);
  };

  const goToLatest = () => {
    if (!latest) {
      recenter();
      return;
    }
    const alreadyThere = zoom === 1 && offset.x === -latest.wx && offset.y === -latest.wy;
    if (alreadyThere) {
      const rect = rootRef.current?.getBoundingClientRect();
      if (rect) onOpen(latest, { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
      return;
    }
    pendingOpenRef.current = latest;
    setZoom(1);
    setOffset({ x: -latest.wx, y: -latest.wy });
  };

  // "최근 모은 별자리 보기"로 중앙 이동 애니메이션이 끝나면 그 별자리를 바로 확대해서 연다
  const handlePanTransitionEnd = (e) => {
    if (e.propertyName !== 'transform') return;
    const target = pendingOpenRef.current;
    if (!target) return;
    pendingOpenRef.current = null;
    const rect = rootRef.current?.getBoundingClientRect();
    if (!rect) return;
    onOpen(target, { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
  };

  return (
    <div
      ref={rootRef}
      className="relative h-full w-full touch-none overflow-hidden select-none"
      style={{
        background:
          'radial-gradient(120% 90% at 50% 12%, var(--color-vault-sky-violet) 0%, var(--color-vault-sky-mid) 42%, var(--color-vault-sky-deep) 100%)',
        cursor: interacting ? 'grabbing' : 'grab',
      }}
      onPointerDown={pointerDown}
      onPointerMove={pointerMove}
      onPointerUp={pointerUp}
      onPointerCancel={pointerUp}
      onWheel={handleWheel}
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
          transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px)) scale(${zoom})`,
          transition: interacting ? 'none' : 'transform 0.4s cubic-bezier(0.22,1,0.36,1)',
        }}
        onTransitionEnd={handlePanTransitionEnd}
      >
        {data.constellations.map((c) => {
          const isDone = c.status === 'done';
          const isProgress = c.status === 'progress';
          const isLocked = c.status === 'locked';
          const size = c.shape.size ?? 210;
          // 완성 별자리만 실제로 탭할 수 있어서 버튼, 나머지는 div(진행 중 별자리 아래 "모으러 가기" 안내는 별도의 실제 버튼이라
          // <button> 안에 <button>이 중첩되는 걸(잘못된 HTML) 피하려고 이렇게 나눔).
          const Wrapper = isDone ? 'button' : 'div';
          // shape.image(완성된 SVG 통째로 쓰는 별자리)는 별 좌표가 없어 박스 전체 높이 기준으로 라벨을 둔다
          const labelTop = c.shape.stars
            ? (0.5 + (Math.max(...c.shape.stars.map((s) => s.y)) - Math.min(...c.shape.stars.map((s) => s.y))) / 2) * size + 32
            : size + 32;
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
                    filled={isProgress ? c.pieceCount : isLocked ? 0 : (c.shape.stars?.length ?? 0)}
                    locked={isLocked}
                    glyphId={c.id ?? c.catalogKey}
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

      {/* 상단: 중앙일 땐 최근 별자리로 바로가기, 벗어나면 중앙으로 돌아가기 */}
      <div className="pointer-events-none absolute inset-x-0 z-30 flex flex-col items-center gap-3" style={{ top: 'calc(52px + env(safe-area-inset-top))' }}>
        <button
          type="button"
          onClick={isCentered ? goToLatest : recenter}
          className="pointer-events-auto rounded-full px-4 py-1.5 text-vault-12 backdrop-blur-md transition-transform active:scale-95"
          style={{
            background: 'color-mix(in srgb, var(--color-vault-sky-mid) 60%, transparent)',
            border: '1px solid color-mix(in srgb, var(--color-vault-jelly-a) 35%, transparent)',
            color: 'var(--color-vault-foreground)',
          }}
        >
          <span style={{ color: 'var(--color-vault-jelly-a)' }}>◎</span> {isCentered ? '최근 모은 별자리 보기' : '중앙으로 돌아가기'}
        </button>

        {/* 공유 유도(초대 링크, 보상 있음) — 완성한 별자리가 하나도 없으면(공유 버튼 자체가 상세 화면에만
            있어서 아직 맥락이 없으니) 숨김. ConstellationDetail.jsx의 공유 버튼과 같은 동작. */}
        {latest && (
          <button
            type="button"
            onClick={handleShare}
            disabled={shareState === 'sharing'}
            className="pointer-events-auto rounded-full px-4 py-1.5 text-vault-12 font-medium transition-transform active:scale-95"
            style={{ background: 'var(--color-vault-amber)', color: 'var(--color-vault-black)' }}
          >
            {shareState === 'copied' ? '링크가 복사됐어요' : '🎁 공유하고 젤리 선물 받기'}
          </button>
        )}
      </div>

      {/* 하단: 시작한 날 / 모은 별자리 — 하단 내비게이션 바(56px)와 겹치지 않게 그 위에 둠 */}
      <div className="pointer-events-none absolute inset-x-0 z-20 flex items-center justify-between px-5" style={{ bottom: 'calc(56px + 16px + env(safe-area-inset-bottom))' }}>
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
          모은 별자리 <b style={{ color: 'var(--color-vault-foreground)' }}>{data.completedCount}</b>
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
