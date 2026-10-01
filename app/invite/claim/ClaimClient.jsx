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

  return (
    <InviteDraw onDraw={handleDraw} onDone={() => router.push('/vault?from=invite')} />
  );
}
