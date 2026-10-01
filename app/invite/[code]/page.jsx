// 받는 사람용 초대 링크 — OG 메타는 서버 컴포넌트에서 고정값으로(사용자 지정 문구 그대로).
// 실제 뽑기 로직은 클라이언트 컴포넌트(InviteClient)로 분리 — generateMetadata는 'use client'와 같이 못 씀.

import InviteClient from './InviteClient';

export async function generateMetadata() {
  return {
    title: '말랑말랑, 동물 젤리 선물이 도착했어요',
    description: '알을 깨면 어떤 젤리가 나올까요?',
    openGraph: {
      title: '말랑말랑, 동물 젤리 선물이 도착했어요',
      description: '알을 깨면 어떤 젤리가 나올까요?',
      // TODO: 알 그래픽 에셋 받으면 교체 (지금은 지정된 이미지가 없어 비워둠)
    },
  };
}

export default async function InvitePage({ params }) {
  const { code } = await params;
  return <InviteClient code={code} />;
}
