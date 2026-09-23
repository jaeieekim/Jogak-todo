'use client';

// 보관소 — 은하수 화면 라우트. V1.0 PRD §5.2·§5.3, §3 IA.
// Galaxy를 계속 마운트해 둔 채 별자리 상세를 오버레이로 확대/축소해, 뒤로가기 시 팬 위치가 그대로 유지된다
// (Figma App.tsx의 열기/닫기 방식을 그대로 이식).

import { useEffect, useRef, useState } from 'react';
import Galaxy from '../../components/vault/Galaxy';
import ConstellationDetail from '../../components/vault/ConstellationDetail';
import BottomNav from '../../components/BottomNav';
import { loadGalaxy } from '../../lib/vaultData';
import { track, EVENTS, trackAppOpenOnce } from '../../lib/mixpanel';

export default function VaultPage() {
  const [data, setData] = useState(null);
  const [failed, setFailed] = useState(false);
  const [view, setView] = useState(null); // { c, origin, phase: 'opening' | 'open' | 'closing' }
  const frameRef = useRef(null);

  useEffect(() => {
    trackAppOpenOnce(); // 홈을 거치지 않고 /vault로 바로 들어온 경우 대비(세션당 1회는 mixpanel.js가 보장)
    let alive = true;
    loadGalaxy().then((result) => {
      if (!alive) return;
      if (result) setData(result);
      else setFailed(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!data) return;
    const from = new URLSearchParams(window.location.search).get('from');
    track(EVENTS.VAULT_OPEN, { entry_point: from === 'popup_cta' ? 'popup_cta' : 'navbar' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!data]);

  const open = (c, origin) => {
    track(EVENTS.CONSTELLATION_DETAIL_OPEN, { constellation_id: c.id });
    const rect = frameRef.current?.getBoundingClientRect();
    const local = rect ? { x: origin.x - rect.left, y: origin.y - rect.top } : origin;
    setView({ c, origin: local, phase: 'opening' });
  };
  const back = () => {
    setView((v) => (v ? { ...v, phase: 'closing' } : v));
  };

  useEffect(() => {
    if (view?.phase === 'opening') {
      const id = requestAnimationFrame(() => setView((v) => (v && v.phase === 'opening' ? { ...v, phase: 'open' } : v)));
      return () => cancelAnimationFrame(id);
    }
  }, [view?.phase]);

  const zoomed = view && view.phase !== 'opening';

  return (
    <div className="flex min-h-[100dvh] w-full items-stretch justify-center" style={{ background: 'var(--color-vault-black)' }}>
      <div ref={frameRef} className="relative h-[100dvh] w-full max-w-[440px] overflow-hidden">
        {!data && !failed && (
          <div
            className="flex h-full w-full items-center justify-center text-vault-13"
            style={{ background: 'var(--color-vault-sky-deep)', color: 'var(--color-vault-muted-foreground)' }}
          >
            불러오는 중이에요…
          </div>
        )}
        {failed && (
          <div
            className="flex h-full w-full flex-col items-center justify-center gap-16px px-24px text-center text-vault-13"
            style={{ background: 'var(--color-vault-sky-deep)', color: 'var(--color-vault-muted-foreground)' }}
          >
            <p>잠깐 삐끗했어요. 한 번만 다시 눌러줄래요?</p>
          </div>
        )}
        {data && <Galaxy data={data} onOpen={open} />}

        {view && (
          <div
            className="absolute inset-0 z-40"
            style={{
              transformOrigin: `${view.origin.x}px ${view.origin.y}px`,
              transform: zoomed ? 'scale(1)' : 'scale(0.12)',
              opacity: view.phase === 'closing' ? 0 : zoomed ? 1 : 0,
              transition: 'transform 0.5s cubic-bezier(0.22,1,0.36,1), opacity 0.45s ease',
            }}
            onTransitionEnd={() => {
              if (view.phase === 'closing') setView(null);
            }}
          >
            <ConstellationDetail c={view.c} onBack={back} />
          </div>
        )}
      </div>
      {/* 별자리 상세(몰입 화면)에서는 숨기고, 은하수·로딩·에러 상태에서는 항상 보여줌 */}
      {!view && <BottomNav active="vault" />}
    </div>
  );
}
