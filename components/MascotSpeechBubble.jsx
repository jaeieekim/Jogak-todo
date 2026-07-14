// 마스코트 옆 말풍선. 좌우 spacing/12, 상하 spacing/8 패딩 (사용자 지정).
// 카피는 lib/mascotState.js에서 주입받은 플레이스홀더를 그대로 표시한다.

export default function MascotSpeechBubble({ message }) {
  return (
    <div className="relative rounded-12 bg-bg-surface px-12px py-8px">
      <span className="text-14 font-normal text-text-secondary">{message}</span>
      {/* 말풍선 꼬리 — 아래(마스코트 머리) 쪽을 향함 */}
      <span
        aria-hidden
        className="absolute bottom-0 left-1/2 h-8px w-8px -translate-x-1/2 translate-y-1/2 rotate-45 bg-bg-surface"
      />
    </div>
  );
}
