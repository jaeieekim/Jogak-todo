// M2 — 실제 Claude API 호출 (app/api/generate-steps/route.js 경유).
// M1 더미(lib/mockSteps.js)를 대체한다. PRD 7번 AI 동작 정의 참조.

// API 오류·타임아웃 시 사용자에게 보여줄 에러 (PRD 7번 승인 카피)
export class GenerateStepsError extends Error {
  constructor() {
    super('잠깐 삐끗했어요. 한 번만 다시 눌러줄래요?');
  }
}

// 반환: { strategy: string|null, ministeps: [{text, minutes}, {text, minutes}] }
// analysis 필드는 서버 응답에 포함되어 오지만, 여기서 파싱 후 버린다 (PRD 7번 — UI 미표시·비로깅).
export async function generateSteps(todoText, strategyCandidates) {
  const res = await fetch('/api/generate-steps', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ todoText, strategyCandidates }),
  });

  if (!res.ok) {
    throw new GenerateStepsError();
  }

  const { strategy, ministeps } = await res.json();
  // analysis는 의도적으로 구조분해에서 제외 — 여기서 폐기됨
  return { strategy, ministeps };
}
