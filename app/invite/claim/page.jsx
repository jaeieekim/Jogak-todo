// 공유자 본인용 보상 수령 페이지 — JellyPopup의 '선물 도착' 팝업에서 넘어온다.
// 이미 로그인된 상태가 전제라 카카오 리다이렉트 분기가 없음(InviteClient와의 차이).
// 공유용 링크가 아니라서 OG 메타는 기본값(색인 제외)으로 둔다.

export const metadata = {
  title: '선물 받기 — 조각투두',
  robots: { index: false, follow: false },
};

import ClaimClient from './ClaimClient';

export default function ClaimPage() {
  return <ClaimClient />;
}
