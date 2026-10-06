'use client';

import { useRouter } from 'next/navigation';
import InviteDraw from '../../../components/InviteDraw';
import { ensureJellyAccount, claimReferralReward } from '../../../lib/jelly';
import { track, EVENTS } from '../../../lib/mixpanel';

export default function ClaimClient() {
  const router = useRouter();

  async function handleDraw() {
    await ensureJellyAccount(); // 보통 이미 로그인 상태(선물 도착 팝업은 ensure_user 응답 기반이라)
    const r = await claimReferralReward();
    if (r?.status === 'granted') {
      track(EVENTS.REFERRAL_REWARD_CLAIMED, { catalog_key: r.catalogKey ?? null });
    }
    return r ?? { status: 'error' };
  }

  // 보관소(app/vault/page.jsx)와 동일한 틀 — 웹에서 풀스크린으로 늘어나지 않게 440px 프레임으로 감싼다.
  return (
    <div className="flex min-h-[100dvh] w-full items-stretch justify-center" style={{ background: 'var(--color-vault-black)' }}>
      <div className="relative isolate h-[100dvh] w-full max-w-[440px] overflow-hidden">
        <InviteDraw onDraw={handleDraw} onDone={() => router.push('/vault?from=invite')} />
      </div>
    </div>
  );
}
