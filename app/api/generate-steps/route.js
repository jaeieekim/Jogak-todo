import Anthropic from '@anthropic-ai/sdk';
import { MINI_STEP_SYSTEM_PROMPT, buildUserMessage } from '../../../lib/prompts/miniStepPrompt';

// PRD 7번 실패 처리: API 오류·타임아웃(8초), 파싱 실패/필드 조건 위반은 1회 자동 재요청 후 폴백.
const REQUEST_TIMEOUT_MS = 8000;

// 전략 없이 스텝1 성격의 폴백 1개만 제공 (PRD 7번 승인 카피)
const FALLBACK_RESULT = {
  analysis: null,
  strategy: null,
  ministeps: [{ text: '일단 그 일과 관련된 창 하나만 열어보기', minutes: 2 }],
};

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function validateAndExtract(rawText) {
  let parsed;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    return null;
  }

  const { analysis, strategy, ministeps } = parsed;

  if (!analysis || !strategy || !Array.isArray(ministeps)) return null;
  if (
    typeof analysis.location !== 'string' || !analysis.location.trim() ||
    typeof analysis.materials !== 'string' || !analysis.materials.trim() ||
    typeof analysis.firstAction !== 'string' || !analysis.firstAction.trim()
  ) return null;
  if (typeof strategy !== 'string' || !strategy.trim()) return null;
  if (ministeps.length !== 2) return null;

  const [step1, step2] = ministeps;
  const isValidStep = (s) => s && typeof s.text === 'string' && s.text.length > 0 && s.text.length <= 40 && typeof s.minutes === 'number';
  if (!isValidStep(step1) || !isValidStep(step2)) return null;
  if (step1.minutes < 1 || step1.minutes > 2) return null;
  if (step2.minutes < 2 || step2.minutes > 3) return null;

  // analysis는 그대로 반환한다 — "클라이언트가 파싱 후 버린다"(PRD 7번)는 규칙이므로
  // 폐기 책임은 클라이언트(lib/generateSteps.js)에 있다. 서버는 검증에만 사용.
  return { analysis, strategy, ministeps: [step1, step2] };
}

async function callClaude(todoText, strategyCandidates) {
  const message = await anthropic.messages.create(
    {
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      system: MINI_STEP_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildUserMessage(todoText, strategyCandidates) }],
    },
    { timeout: REQUEST_TIMEOUT_MS },
  );

  const textBlock = message.content.find((block) => block.type === 'text');
  return textBlock ? textBlock.text : '';
}

export async function POST(request) {
  const { todoText, strategyCandidates } = await request.json();

  if (!todoText || !Array.isArray(strategyCandidates) || strategyCandidates.length === 0) {
    return Response.json({ error: 'invalid_request' }, { status: 400 });
  }

  let rawText;
  try {
    rawText = await callClaude(todoText, strategyCandidates);
  } catch {
    // API 오류·타임아웃 — 사용자 재시도 유도 (자동 재요청 아님, PRD 7번)
    return Response.json({ error: 'api_error' }, { status: 502 });
  }

  let result = validateAndExtract(rawText);

  if (!result) {
    // 파싱 실패/필드·조건 위반 — 1회 자동 재요청
    try {
      rawText = await callClaude(todoText, strategyCandidates);
      result = validateAndExtract(rawText);
    } catch {
      return Response.json({ error: 'api_error' }, { status: 502 });
    }
  }

  if (!result) {
    return Response.json(FALLBACK_RESULT);
  }

  return Response.json(result);
}
