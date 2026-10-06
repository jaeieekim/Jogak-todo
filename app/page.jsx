'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import TodoCard, { ProgressDots } from '../components/TodoCard';
import Button from '../components/Button';
import WeekStrip from '../components/WeekStrip';
import MascotSpeechBubble from '../components/MascotSpeechBubble';
import BottomNav from '../components/BottomNav';
import JellyPopup from '../components/JellyPopup';
import EncouragementCard from '../components/EncouragementCard';
import VaultFeatureIntro from '../components/VaultFeatureIntro';
import { ENCOURAGEMENT_CARDS } from '../lib/encouragementCards';
import {
  getMascotState,
  MASCOT_STATE,
  MASCOT_STATE_MESSAGES,
  MASCOT_MOMENT_DURATION_MS,
  MOMENT_EVENT,
  pickMomentMessage,
  pickInProgressMessage,
} from '../lib/mascotState';
import { generateSteps, GenerateStepsError } from '../lib/generateSteps';
import { sampleStrategies } from '../lib/prompts/miniStepPrompt';
import { track, EVENTS, trackAppOpenOnce } from '../lib/mixpanel';
import { ensureJellyAccount, earnJelly, consumeAppOpenResult, isLoggedIn, signOutUser } from '../lib/jelly';
import { loadConstellationDays } from '../lib/vaultData';
import {
  loadTodosByDate,
  saveTodosByDate,
  wasFirstDonePopupShown,
  markFirstDonePopupShown,
  saveFirstFeedback,
  wasOnboardingSeen,
  wasFirstJellyShown,
  wasVaultFeatureIntroShown,
  markVaultFeatureIntroShown,
  markFirstJellyShown,
  wasCarryoverSeenToday,
  markCarryoverSeenToday,
  wasEncouragementCardShown,
  markEncouragementCardShown,
} from '../lib/storage';

// ---------- 날짜 유틸 ----------
function toDateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function startOfWeek(d) {
  const copy = new Date(d);
  copy.setDate(copy.getDate() - copy.getDay());
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function addDays(d, n) {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}

// ---------- 완수 판정 ----------
function isTodoComplete(todo) {
  return todo.steps.every((s) => s.checked) && todo.originalChecked;
}

// 남은 미니스텝 개수 — 메인 할 일 체크는 제외하고 스텝 기준으로만 센다 (이어가기 정렬·진행 도트용)
function remainingSteps(todo) {
  return todo.steps.length - todo.steps.filter((s) => s.checked).length;
}

// 개발용 미리보기: /?carryoverDemo=1 — 실제 로컬스토리지 상태와 무관하게 이어가기 박스를 항상 고정된 예시로 보여준다.
// 디자인 확인·캡처용(보관소의 ?preview=full과 동일한 목적). 실제 유저 데이터는 전혀 건드리지 않는다.
// steps는 실제 앱과 동일하게 항상 2개(미니스텝 생성 스펙) — 도트는 여기에 본체 체크 1개를 더해 3개(●●○)로 표시된다.
const DEMO_CARRYOVER_CANDIDATES = [
  { dateKey: 'demo', todo: { id: 'demo-1', text: '단어외우기', steps: [{ checked: true }, { checked: true }], originalChecked: false } },
  { dateKey: 'demo', todo: { id: 'demo-2', text: '방 청소하기', steps: [{ checked: true }, { checked: false }], originalChecked: false } },
  { dateKey: 'demo', todo: { id: 'demo-3', text: '책상에 앉아서 영어 교재 펼치기', steps: [{ checked: false }, { checked: false }], originalChecked: false } },
];

// 로딩 연출 최소 노출 시간 — 생성이 순식간에 끝나도 연출이 인지되도록 보장 (md 섹션 7-1).
// 생성 결과 내용에는 영향을 주지 않고 성공 노출 시점만 지연한다.
const MIN_LOADING_MS = 700;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// 생애 첫 완수 별점 피드백 라벨 (PRD 6-3, 라이팅 톤 — 실패·부정 어휘 없음)
const RATING_LABELS = {
  1: '잘 모르겠어요',
  2: '조금 아쉬워요',
  3: '나쁘지 않아요',
  4: '약간 도움됐어요',
  5: '많이 도움됐어요!',
};

export default function HomePage() {
  const router = useRouter();
  const today = useRef(new Date()).current;

  const [todosByDate, setTodosByDate] = useState({});
  const [loaded, setLoaded] = useState(false);
  const [selectedDate, setSelectedDate] = useState(toDateKey(today));
  const [weekStart, setWeekStart] = useState(startOfWeek(today));
  const [inputText, setInputText] = useState('');
  const [generating, setGenerating] = useState(false);
  const [menuOpenId, setMenuOpenId] = useState(null);
  const [editModeId, setEditModeId] = useState(null);
  const [toast, setToast] = useState(null);
  const [showFirstDonePopup, setShowFirstDonePopup] = useState(false);
  const [dragId, setDragId] = useState(null);
  // 전체 완료된 카드 중 사용자가 탭해서 다시 펼친 카드 id 집합. 없으면 완료 카드는 기본 축소.
  const [expandedCompletedIds, setExpandedCompletedIds] = useState(new Set());
  const toastTimer = useRef(null);
  const [mascotMoment, setMascotMoment] = useState(null); // 순간 반응 메시지 문자열 | null
  const mascotMomentTimer = useRef(null);
  const lastMascotMomentMessage = useRef(null);
  const [feedbackRating, setFeedbackRating] = useState(0);
  // 진행 중 상시 상태 문구 — ② 미니스텝 체크 시 순간 반응과 동일 시점에 함께 로테이션
  const [inProgressMessage, setInProgressMessage] = useState(() => pickInProgressMessage(null));
  const lastInProgressMessage = useRef(inProgressMessage);
  const [showInputInfoTooltip, setShowInputInfoTooltip] = useState(false);
  // 편집 시작 시점의 원본 할일 텍스트 스냅샷 — 편집 끝내기 시 실제 변경 여부 비교용
  const editOriginalTextSnapshot = useRef(null);
  const [resplitAlertTodoId, setResplitAlertTodoId] = useState(null);
  const [resplittingId, setResplittingId] = useState(null); // 재생성 중인 카드 id — 인라인 로더 표시용
  // 젤리 팝업(V1.0 M3): { kind: 'daily'|'bonus'|'completed', source?, bonusType?, constellationName? } | null
  const [jellyPopup, setJellyPopup] = useState(null);
  // 보관소 기능 추가 소개 — 최초 1회만. 다른 팝업이 떠 있으면 그게 닫힐 때까지 기다렸다가 보여준다(아래 렌더 조건)
  const [showVaultIntro, setShowVaultIntro] = useState(false);
  // 헤더의 로그인/로그아웃 버튼 — 카카오 등 실계정이 연결된 상태인지(익명 계정만 있으면 false)
  const [loggedIn, setLoggedIn] = useState(false);
  // 첫 로그인 시 "로그인 선물"(별조각 3개)과 "검은고양이 젤리"(즉시 완성)가 같은 순간에 같이 지급될 수 있어서,
  // 겹치지 않게 하나 보여주고 닫히면 이어서 다음 걸 보여주는 큐
  const nextJellyPopup = useRef([]); // 뒤에 이어서 보여줄 팝업들(여러 개 겹칠 수 있음) — 앞에서부터 순서대로

  // ---------- 첫 방문 온보딩 게이트 + 앱 진입 처리 ----------
  useEffect(() => {
    trackAppOpenOnce(); // 세션당 1회 (새로고침에는 다시 안 찍힘)
    const carryoverDemo = new URLSearchParams(window.location.search).get('carryoverDemo') === '1';
    const goingToOnboarding = !carryoverDemo && !wasOnboardingSeen();

    (async () => {
      await ensureJellyAccount(); // 앱 진입 시 익명 계정 자동 생성 + 보너스 판정
      setLoggedIn(await isLoggedIn());
      if (goingToOnboarding) return; // 온보딩 마치고 돌아왔을 때(재마운트 시) 처리 — 지금 보여주면 곧바로 화면이 바뀌어 버림
      const appOpen = consumeAppOpenResult();
      if (!appOpen) return;
      // 우선순위: 별자리 완성 > 선물 도착(공유 보상) > 첫/복귀 보너스(로그인 선물) > 로그인 보너스(검은고양이자리 즉시 완성)
      // 여러 개가 같은 순간에 겹칠 수 있어서(예: 첫 카카오 로그인과 동시에 선물도 와있는 경우) 전부 큐에 쌓고
      // 맨 앞 것만 바로 보여준 뒤, 닫을 때마다 다음 것을 이어서 보여준다.
      const queue = [];
      if (appOpen.completed?.length > 0) {
        const c = appOpen.completed[0];
        queue.push({ kind: 'completed', constellationName: c.name });
        trackConstellationComplete(c);
      }
      if (appOpen.referral_pending) {
        queue.push({ kind: 'gift_arrived' });
      }
      if (appOpen.bonus_granted) {
        queue.push({ kind: 'bonus', bonusType: appOpen.bonus_granted });
        if (appOpen.bonus_granted === 'comeback') {
          track(EVENTS.COMEBACK_BONUS_GRANTED, { days_away: appOpen.days_away });
        }
      }
      if (appOpen.login_jelly_granted) {
        queue.push({ kind: 'login_bonus' });
      }
      if (queue.length > 0) {
        setJellyPopup(queue[0]);
        nextJellyPopup.current = queue.slice(1);
      }
    })();

    if (goingToOnboarding) {
      router.replace('/onboarding');
    }
  }, [router]);

  // 생애 첫 완수 별점 팝업과 젤리 팝업이 같은 체크에서 동시에 뜨는 경우, 겹치지 않게 순서대로 보여준다
  // (첫 완수가 유저가 젤리를 처음 알게 되는 자리라 생략하지 않고 별점 팝업이 닫힌 뒤 이어서 노출).
  const pendingJellyRun = useRef(null);

  async function trackConstellationComplete(c) {
    const days = await loadConstellationDays(c.id).catch(() => null);
    track(EVENTS.CONSTELLATION_COMPLETE, { constellation_id: c.id, days_taken: days });
  }

  // 체크 한 번으로 나온 적립 결과들(최대 2개: ministep/todo)을 모아 팝업/토스트 우선순위를 정한다.
  // 우선순위: 별자리 완성 > 오늘 첫 획득(팝업) > 그 외 획득(토스트). hadExistingToast면 기존 토스트가 끝난 뒤 이어서 보여준다.
  async function handleJellyResults(calls, hadExistingToast, { deferUntilFirstDonePopupCloses = false } = {}) {
    const results = [];
    for (const c of calls) {
      const result = await c.promise;
      results.push({ source: c.source, result });
      if (result?.earned > 0) {
        track(EVENTS.JELLY_EARNED, { source: c.source, count: result.earned, total_pieces: result.total_pieces });
      }
    }

    const completed = [];
    const seen = new Set();
    for (const { result } of results) {
      for (const c of result?.completed ?? []) {
        if (!seen.has(c.id)) {
          seen.add(c.id);
          completed.push(c);
          trackConstellationComplete(c);
        }
      }
    }

    const totalEarned = results.reduce((n, r) => n + (r.result?.earned ?? 0), 0);
    if (completed.length === 0 && totalEarned === 0) return; // 이미 하루 상한 — 새 소식 없음

    const run = () => {
      if (completed.length > 0) {
        setJellyPopup({ kind: 'completed', constellationName: completed[0].name });
      } else {
        // 생애 최초 조각 획득 때만 설명 서브 문구를 붙인다 — 이후엔 헤드라인(+버튼)만
        const isFirstEver = !wasFirstJellyShown();
        if (isFirstEver) markFirstJellyShown();
        setJellyPopup({ kind: 'earn', count: totalEarned, isFirstEver });
      }
    };

    if (deferUntilFirstDonePopupCloses) {
      pendingJellyRun.current = run; // 별점 팝업이 닫힐 때(closeFirstFeedbackPopup) 이어서 실행됨
      return;
    }
    if (hadExistingToast) setTimeout(run, 2500);
    else run();
  }

  // ---------- 저장/로드 ----------
  useEffect(() => {
    setTodosByDate(loadTodosByDate());
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) saveTodosByDate(todosByDate);
  }, [todosByDate, loaded]);

  // 보관소 기능 추가 소개 — 최초 1회만 판단. 실제로 보여줄지는 렌더 시점에 다른 팝업과 안 겹치게 조율
  useEffect(() => {
    if (loaded && !wasVaultFeatureIntroShown()) {
      setShowVaultIntro(true);
    }
  }, [loaded]);

  function closeVaultIntro() {
    markVaultFeatureIntroShown();
    setShowVaultIntro(false);
  }

  const todos = todosByDate[selectedDate] || [];

  // 최근 완료 할 일 추천 칩 — 최근 10일 내에 "완료"(originalChecked이고 스텝 전부 체크)한 할 일 중,
  // 오늘 이미 등록된 문구는 빼고 문구 기준으로 중복 없이 최신순 최대 6개. 탭하면 입력창에 채워준다.
  const recentDoneSuggestions = useMemo(() => {
    const cutoffKey = toDateKey(addDays(today, -4)); // 오늘 포함 5일
    const todayTexts = new Set(todos.map((t) => t.text));
    const seen = new Set();
    const result = [];
    const dateKeys = Object.keys(todosByDate).sort((a, b) => (a < b ? 1 : -1)); // 최신 날짜부터
    for (const dateKey of dateKeys) {
      if (dateKey < cutoffKey) continue;
      for (const t of todosByDate[dateKey]) {
        if (!isTodoComplete(t) || seen.has(t.text) || todayTexts.has(t.text)) continue;
        seen.add(t.text);
        result.push(t.text);
        if (result.length >= 6) return result;
      }
    }
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todosByDate, selectedDate]);

  function setTodosForSelected(next) {
    setTodosByDate((prev) => ({ ...prev, [selectedDate]: next }));
  }

  // ---------- 이어가기(V1.3, 가벼운 버전) ----------
  // 대상: 오늘 제외 최근 3일(어제~3일 전)의 미완료 할 일, 최신순(어제 것부터) 최대 4개.
  // 오늘 화면을 보고 있을 때만 의미가 있어서 selectedDate가 오늘일 때만 계산한다.
  const todayKeyForCarryover = toDateKey(today);
  const carryoverCandidates = useMemo(() => {
    if (selectedDate !== todayKeyForCarryover) return [];
    const result = [];
    for (let n = 1; n <= 3; n++) {
      const dateKey = toDateKey(addDays(today, -n));
      for (const t of todosByDate[dateKey] || []) {
        // carriedOver: 예전에 이어가기 칩으로 이미 오늘(또는 다른 날) 목록에 복사해둔 원본 — 다시 후보로 띄우지 않는다
        if (!isTodoComplete(t) && !t.carriedOver) result.push({ dateKey, todo: t });
      }
    }
    // 미니스텝이 가장 적게 남은 것부터 — 조금만 더 하면 끝나는 걸 먼저 보여준다
    result.sort((a, b) => remainingSteps(a.todo) - remainingSteps(b.todo));
    return result.slice(0, 4);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todosByDate, selectedDate]);

  // 화면에 아직 남아있는(선택 안 한) 칩들 — 박스가 열릴 때 후보로 채우고, 선택할 때마다 하나씩 줄어든다.
  const [carryoverVisible, setCarryoverVisible] = useState(null); // null=아직 판단 전, []=없음/다 끝남, [...]=노출 중
  const [carryoverLoadingKey, setCarryoverLoadingKey] = useState(null); // `${dateKey}:${todoId}` 생성 중인 칩
  const [carryoverFlip, setCarryoverFlip] = useState(false); // 칩 선택 성공 시 박스가 한 바퀴 도는 피드백(매번)
  const [encouragementCard, setEncouragementCard] = useState(null); // 이어가기 응원카드 — 최초 1회만

  useEffect(() => {
    if (!loaded || carryoverVisible !== null) return; // 최초 1회만 판단
    if (new URLSearchParams(window.location.search).get('carryoverDemo') === '1') {
      setCarryoverVisible(DEMO_CARRYOVER_CANDIDATES);
      return;
    }
    if (carryoverCandidates.length === 0 || wasCarryoverSeenToday(todayKeyForCarryover)) {
      setCarryoverVisible([]);
      return;
    }
    setCarryoverVisible(carryoverCandidates);
    track(EVENTS.CARRYOVER_SHOWN, { chip_count: carryoverCandidates.length });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, carryoverCandidates]);

  async function consumeCarryoverItem(dateKey, todo) {
    const key = `${dateKey}:${todo.id}`;
    setCarryoverLoadingKey(key);
    track(EVENTS.CARRYOVER_CHIP_CLICK, { source_date: dateKey });

    let result;
    try {
      const candidates = sampleStrategies(3, todo.lastStrategy);
      const [generated] = await Promise.all([generateSteps(todo.text, candidates), sleep(MIN_LOADING_MS)]);
      result = generated;
    } catch (err) {
      setCarryoverLoadingKey(null);
      showToast(err instanceof GenerateStepsError ? err.message : '잠깐 삐끗했어요. 한 번만 다시 눌러줄래요?');
      return;
    }

    const newTodo = {
      id: crypto.randomUUID(),
      text: todo.text,
      date: todayKeyForCarryover,
      steps: result.ministeps.map((s) => ({
        id: crypto.randomUUID(),
        text: s.text,
        minutes: s.minutes,
        checked: false,
        checkedAt: null,
      })),
      originalChecked: false,
      lastStrategy: result.strategy,
    };
    // 오늘 날짜에 새 할 일로 복사해서 추가하고, 원본(예전 날짜)에는 carriedOver 표시를 남겨 다시 후보로 안 뜨게 한다
    // (두 날짜를 한 번에 갱신해야 새로고침 후에도 "이미 골랐음"이 유지된다 — todosByDate가 Single Source of Truth)
    setTodosByDate((prev) => ({
      ...prev,
      [todayKeyForCarryover]: [newTodo, ...(prev[todayKeyForCarryover] || [])],
      [dateKey]: (prev[dateKey] || []).map((t) => (t.id === todo.id ? { ...t, carriedOver: true } : t)),
    }));
    track(EVENTS.MINISTEP_GENERATED, { strategy: result.strategy });

    setCarryoverLoadingKey(null);
    setCarryoverVisible((prev) => {
      const next = prev.filter((c) => !(c.dateKey === dateKey && c.todo.id === todo.id));
      if (next.length === 0) markCarryoverSeenToday(todayKeyForCarryover); // 마지막 칩까지 고르면 오늘은 끝
      return next;
    });

    // 칩을 성공적으로 골랐을 때 박스가 한 바퀴 도는 피드백 — 매번
    setCarryoverFlip(true);
    setTimeout(() => setCarryoverFlip(false), 600);

    // 이어가기 응원카드 — 생애 최초 1회만, 플립이 어느 정도 돌아간 뒤 등장
    if (!wasEncouragementCardShown()) {
      markEncouragementCardShown();
      setTimeout(() => setEncouragementCard(ENCOURAGEMENT_CARDS[0]), 350);
    }
  }

  function dismissCarryover() {
    markCarryoverSeenToday(todayKeyForCarryover);
    setCarryoverVisible([]);
    track(EVENTS.CARRYOVER_DISMISS, {});
  }

  // ---------- 토스트 ----------
  function showToast(message) {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current = setTimeout(() => setToast(null), 2500);
  }

  // 행동 이벤트(①②③) 직후 마스코트 말풍선에 순간 반응을 3초 보여준 뒤 상시 상태 문구로 복귀.
  // 직전과 같은 문구가 연속으로 나오지 않도록 로테이션.
  function showMascotMoment(event) {
    if (mascotMomentTimer.current) clearTimeout(mascotMomentTimer.current);
    const message = pickMomentMessage(event, lastMascotMomentMessage.current);
    lastMascotMomentMessage.current = message;
    setMascotMoment(message);
    mascotMomentTimer.current = setTimeout(() => setMascotMoment(null), MASCOT_MOMENT_DURATION_MS);
  }

  // 진행 중 상시 상태 문구 로테이션 — ② 미니스텝 체크 시(showMascotMoment STEP_CHECKED)와 동일 시점에 호출
  function refreshInProgressMessage() {
    const message = pickInProgressMessage(lastInProgressMessage.current);
    lastInProgressMessage.current = message;
    setInProgressMessage(message);
  }

  // ---------- 할 일 추가 ----------
  async function handleSubmit(e) {
    e.preventDefault();
    const text = inputText.trim();
    if (!text || generating) return;

    setGenerating(true);
    track(EVENTS.TODO_INPUT, { length: text.length });

    let result;
    try {
      const candidates = sampleStrategies(3);
      // 최소 로딩 시간 보장 — 캐릭터 점프 연출이 최소 1사이클은 보이도록 (md 7-1)
      const [generated] = await Promise.all([generateSteps(text, candidates), sleep(MIN_LOADING_MS)]);
      result = generated;
    } catch (err) {
      setGenerating(false);
      showToast(err instanceof GenerateStepsError ? err.message : '잠깐 삐끗했어요. 한 번만 다시 눌러줄래요?');
      return;
    }

    const newTodo = {
      id: crypto.randomUUID(),
      text,
      date: selectedDate,
      steps: result.ministeps.map((s) => ({
        id: crypto.randomUUID(),
        text: s.text,
        minutes: s.minutes,
        checked: false,
        checkedAt: null,
      })),
      originalChecked: false,
      lastStrategy: result.strategy,
    };
    // 새 할 일은 항상 최상단
    setTodosForSelected([newTodo, ...todos]);
    setInputText('');
    setGenerating(false);
    track(EVENTS.MINISTEP_GENERATED, { strategy: result.strategy });
    showToast('5분만 해볼까요?');
    showMascotMoment(MOMENT_EVENT.MINISTEP_GENERATED);
  }

  // ---------- 체크 토글 ----------
  function applyTodoUpdate(todoId, updater) {
    const prevTodo = todos.find((t) => t.id === todoId);
    if (!prevTodo) return;
    const nextTodo = updater(prevTodo);
    setTodosForSelected(todos.map((t) => (t.id === todoId ? nextTodo : t)));

    // 첫 미니스텝 체크 → 응원 / 전체 완수 → 마무리
    const prevCheckedCount =
      prevTodo.steps.filter((s) => s.checked).length + (prevTodo.originalChecked ? 1 : 0);
    const nextCheckedCount =
      nextTodo.steps.filter((s) => s.checked).length + (nextTodo.originalChecked ? 1 : 0);
    const justChecked = nextCheckedCount > prevCheckedCount;
    const justCompletedTodo = !isTodoComplete(prevTodo) && isTodoComplete(nextTodo);
    const isFirstEverCompletion = justCompletedTodo && !wasFirstDonePopupShown();

    // 젤리 적립 (V1.0): 미니스텝이 새로 체크되면 1조각, 할 일이 완수되면 2조각. 하루 1회 제한·중복 방지는 서버가 처리.
    // 이 체크로 뜰 기존 토스트('시작이 반이에요' 또는 '오늘 몫은 충분해요')가 있으면, 젤리 팝업/토스트는 그게 끝난 뒤 이어서 보여준다.
    const newlyCheckedStep = nextTodo.steps.some(
      (s) => s.checked && !prevTodo.steps.find((p) => p.id === s.id)?.checked,
    );
    if (newlyCheckedStep || justCompletedTodo) {
      const jellyDate = toDateKey(new Date());
      const calls = [];
      if (newlyCheckedStep) calls.push({ source: 'ministep', promise: earnJelly('ministep', jellyDate) });
      if (justCompletedTodo) calls.push({ source: 'todo', promise: earnJelly('todo', jellyDate) });
      const hadExistingToast = justCompletedTodo || (justChecked && prevCheckedCount === 0);
      // 생애 첫 완수 별점 팝업과 바텀시트가 겹치지 않게, 그 순간엔 별점 팝업이 닫힌 뒤 이어서 보여준다(생략 안 함)
      handleJellyResults(calls, hadExistingToast, { deferUntilFirstDonePopupCloses: isFirstEverCompletion });
    }

    if (justCompletedTodo) {
      showToast('오늘 몫은 충분해요');
      track(EVENTS.ALL_COMPLETE, { todoId: prevTodo.id });

      const nextTodos = todos.map((t) => (t.id === todoId ? nextTodo : t));
      const dayNowAllComplete = getMascotState(nextTodos) === MASCOT_STATE.ALL_COMPLETE;

      if (isFirstEverCompletion) {
        // 생애 첫 완수 — 순간 반응(③·⑤) 전부 생략하고 별점 피드백 팝업으로 대체
        markFirstDonePopupShown();
        setShowFirstDonePopup(true);
      } else if (dayNowAllComplete) {
        // ⑤ 오늘 할 일 전체 완수가 ③ 개별 할일 완수보다 우선
        showMascotMoment(MOMENT_EVENT.ALL_TODOS_COMPLETE);
      } else {
        showMascotMoment(MOMENT_EVENT.TODO_COMPLETED);
      }
    } else if (justChecked) {
      showMascotMoment(MOMENT_EVENT.STEP_CHECKED);
      refreshInProgressMessage();
      if (prevCheckedCount === 0) {
        showToast('시작이 반이에요. 이대로 잘하고 있어요');
        track(EVENTS.FIRST_STEP_CHECKED, { todoId: prevTodo.id });
      }
    }
  }

  function toggleStep(todoId, stepId) {
    applyTodoUpdate(todoId, (todo) => ({
      ...todo,
      steps: todo.steps.map((s) =>
        s.id === stepId
          ? { ...s, checked: !s.checked, checkedAt: !s.checked ? new Date().toISOString() : null }
          : s,
      ),
    }));
  }

  function toggleOriginal(todoId) {
    applyTodoUpdate(todoId, (todo) => ({ ...todo, originalChecked: !todo.originalChecked }));
  }

  // 전체 완료된 카드만 축소/재펼침 토글 (미완료 카드는 항상 펼침, 대상 아님)
  function toggleCompletedCard(todoId) {
    setExpandedCompletedIds((prev) => {
      const next = new Set(prev);
      if (next.has(todoId)) next.delete(todoId);
      else next.add(todoId);
      return next;
    });
  }

  function toggleMenu(todoId) {
    setMenuOpenId((prev) => (prev === todoId ? null : todoId));
  }

  function closeMenu() {
    setMenuOpenId(null);
  }

  function startEdit(todoId) {
    setMenuOpenId(null);
    setEditModeId(todoId);
    const todo = todos.find((t) => t.id === todoId);
    if (!todo) return;
    editOriginalTextSnapshot.current = todo.text;
    const checkedItems = todo.steps.filter((s) => s.checked).length + (todo.originalChecked ? 1 : 0);
    const totalItems = todo.steps.length + 1;
    if (checkedItems === totalItems) {
      setExpandedCompletedIds((prev) => new Set(prev).add(todoId));
    }
  }

  // ---------- 메뉴 액션 ----------
  function deleteTodo(todoId) {
    setTodosForSelected(todos.filter((t) => t.id !== todoId));
    setMenuOpenId(null);
    track(EVENTS.DELETED, { todoId });
  }

  async function resplitTodo(todoId) {
    const todo = todos.find((t) => t.id === todoId);
    if (!todo) return;
    setMenuOpenId(null);
    setResplittingId(todoId); // 해당 카드에 인라인 로더 표시 (작은 피드백)

    let result;
    try {
      // 직전에 사용한 전략은 재샘플링 후보에서 제외 (PRD 7번·7-1번)
      const candidates = sampleStrategies(3, todo.lastStrategy);
      // 최소 로딩 시간 보장 — 인라인 로더 연출이 최소한 인지되도록 (md 7-1)
      const [generated] = await Promise.all([
        generateSteps(todo.text, candidates),
        sleep(MIN_LOADING_MS),
      ]);
      result = generated;
    } catch (err) {
      setResplittingId(null);
      showToast(err instanceof GenerateStepsError ? err.message : '잠깐 삐끗했어요. 한 번만 다시 눌러줄래요?');
      return;
    }
    setResplittingId(null);

    // 원본 할 일과 그 체크 상태는 유지, 미니스텝만 교체
    applyTodoUpdate(todoId, (t) => ({
      ...t,
      steps: result.ministeps.map((s) => ({
        id: crypto.randomUUID(),
        text: s.text,
        minutes: s.minutes,
        checked: false,
        checkedAt: null,
      })),
      lastStrategy: result.strategy,
    }));
    track(EVENTS.RESPLIT, { todoId, strategy: result.strategy });
    showToast('5분만 해볼까요?');
    showMascotMoment(MOMENT_EVENT.MINISTEP_GENERATED);
  }

  function editStepText(todoId, stepId, text) {
    applyTodoUpdate(todoId, (todo) => ({
      ...todo,
      steps: todo.steps.map((s) => (s.id === stepId ? { ...s, text } : s)),
    }));
  }

  // 헤더(할일명)와 체크리스트 맨 아래 원본 할일 항목이 같은 todo.text를 참조하므로 하나만 갱신하면 함께 바뀜
  function editOriginalText(todoId, text) {
    applyTodoUpdate(todoId, (todo) => ({ ...todo, text }));
  }

  function finishEdit(todoId) {
    const todo = todos.find((t) => t.id === todoId);
    if (!todo) return;
    const trimmedText = todo.text.trim();
    if (trimmedText === '') return; // 공백만 남으면 저장 차단(버튼도 비활성화되어 정상 흐름에선 도달하지 않음)

    const textChanged = trimmedText !== editOriginalTextSnapshot.current;

    applyTodoUpdate(todoId, (t) => ({
      ...t,
      text: trimmedText,
      steps: t.steps.filter((s) => s.text.trim() !== ''), // 빈 스텝은 정리
    }));
    setEditModeId(null);
    track(EVENTS.STEP_EDITED, { todoId });

    // 원본 할일 텍스트가 실제로 바뀐 경우에만 미니스텝 처리 얼럿 노출
    if (textChanged) {
      setResplitAlertTodoId(todoId);
    }
  }

  function handleResplitAlertResplit() {
    const todoId = resplitAlertTodoId;
    setResplitAlertTodoId(null);
    if (todoId) resplitTodo(todoId);
  }

  function handleResplitAlertKeepText() {
    setResplitAlertTodoId(null);
  }

  // ---------- 드래그 정렬 ----------
  function handleDrop(targetId) {
    if (!dragId || dragId === targetId) return;
    const fromIdx = todos.findIndex((t) => t.id === dragId);
    const toIdx = todos.findIndex((t) => t.id === targetId);
    if (fromIdx < 0 || toIdx < 0) return;
    const next = [...todos];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    setTodosForSelected(next);
    setDragId(null);
  }

  // ---------- 주간 내비게이션 ----------
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(weekStart, i);
    return { key: toDateKey(d), dayOfWeek: d.getDay(), dayOfMonth: d.getDate() };
  });
  const todayKey = toDateKey(today);
  const [selectedYear, selectedMonth, selectedDay] = selectedDate.split('-').map(Number);
  const weekHeaderLabel = `${selectedYear}년 ${selectedMonth}월 ${selectedDay}일`;

  // ---------- 할 일 리스트 분리 ----------
  // 메인 할 일 체크까지 끝난 것만 완료 섹션으로. 미니스텝만 다 하고 메인 체크 전이면 그대로 오늘 할 일에 남는다.
  const incompleteTodos = todos.filter((t) => !isTodoComplete(t));
  const completedTodos = todos.filter((t) => isTodoComplete(t));

  // ---------- 할 일 리스트 제목 ----------
  const listTitle =
    (selectedDate === todayKey ? '오늘 할 일' : `${selectedMonth}월 ${selectedDay}일 할 일`) +
    ` ${incompleteTodos.length}개`;

  // ---------- 생애 첫 완수 별점 피드백 팝업 ----------
  function closeFirstFeedbackPopup() {
    setShowFirstDonePopup(false);
    setFeedbackRating(0);
    if (pendingJellyRun.current) {
      const run = pendingJellyRun.current;
      pendingJellyRun.current = null;
      setTimeout(run, 300); // 바텀시트가 바뀌는 느낌이 너무 갑작스럽지 않게 살짝 틈을 둠
    }
  }

  function handleFeedbackDismiss() {
    saveFirstFeedback('dismissed');
    track(EVENTS.FIRST_FEEDBACK, { rating: 'dismissed' });
    closeFirstFeedbackPopup();
  }

  function handleFeedbackSubmit() {
    if (feedbackRating === 0) return;
    saveFirstFeedback(feedbackRating);
    track(EVENTS.FIRST_FEEDBACK, { rating: feedbackRating });
    closeFirstFeedbackPopup();
  }

  // ---------- 마스코트 말풍선 ----------
  const mascotState = getMascotState(todos);
  // 신규 등록 생성 중에는 로딩 문구가 최우선 (완료되면 generating=false → 순간 반응 ①로 전환)
  const mascotMessage = generating
    ? '할일을 쪼개고 있어요'
    : (mascotMoment ??
      (mascotState === MASCOT_STATE.IN_PROGRESS ? inProgressMessage : MASCOT_STATE_MESSAGES[mascotState]));

  return (
    <div className="mx-auto min-h-screen w-full max-w-[480px] bg-bg-default">
      <div style={{ paddingBottom: 'calc(56px + var(--spacing-32))' }}>
        {/* 헤더 */}
        <header className="flex items-start justify-between px-20px pt-24px pb-8px">
          <div>
            <h1 className="text-20 font-semibold text-text-primary">조각투두</h1>
            <p className="text-14 font-normal text-text-muted">쪼개서 쉽게 시작하는 투두리스트</p>
          </div>
          {/* 보조 버튼 스펙(bg-tint + brand-pressed 텍스트) 그대로 — 로그인 상태면 로그아웃으로 전환 */}
          <button
            type="button"
            onClick={async () => {
              if (loggedIn) {
                await signOutUser();
                window.location.reload(); // 익명 계정으로 새로 시작
              } else {
                router.push('/login');
              }
            }}
            className="shrink-0 rounded-8 bg-bg-tint px-12px py-8px text-14 font-medium text-brand-pressed"
          >
            {loggedIn ? '로그아웃' : '로그인'}
          </button>
        </header>

        {/* 주간 내비게이션 (WeekStrip) */}
        <WeekStrip
          weekDays={weekDays}
          selectedDate={selectedDate}
          todayKey={todayKey}
          headerLabel={weekHeaderLabel}
          onPrevWeek={() => setWeekStart(addDays(weekStart, -7))}
          onNextWeek={() => setWeekStart(addDays(weekStart, 7))}
          onSelectDate={setSelectedDate}
        />

        {/* 브랜드 캐릭터 마스코트 + 말풍선 (머리 위 중앙 정렬) */}
        <div className="flex flex-col items-center gap-12px py-8px">
          <MascotSpeechBubble message={mascotMessage} />
          <Image
            src="/mascot-starcandy.png"
            alt="조각투두 마스코트"
            width={120}
            height={120}
            priority
            className={`h-[120px] w-[120px] ${generating ? 'animate-mascot-jump' : ''}`}
          />
        </div>

        {/* 입력 (TodoInput) */}
        <section className="px-20px py-12px">
          <form onSubmit={handleSubmit} className="flex gap-8px">
            <input
              type="text"
              value={inputText}
              maxLength={50}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="예: 가계부 작성, 운동 가기, 영어 공부 …"
              className="min-w-0 flex-1 rounded-12 bg-bg-surface px-20px py-16px text-17 font-normal text-text-primary outline-none placeholder:text-text-dim focus:ring-2 focus:ring-brand-primary"
            />
            <Button type="submit" disabled={!inputText.trim() || generating} className="shrink-0 px-20px">
              {generating ? '쪼개는 중이에요' : '할일 등록'}
            </Button>
          </form>
          <div className="relative flex items-center gap-4px px-4px pt-8px">
            <p className="text-12 font-normal text-text-dim">
              할일을 쉽게 시작할 수 있도록 작게 조각내어 드릴게요
            </p>
            <button
              type="button"
              aria-label="입력 안내"
              onClick={() => setShowInputInfoTooltip((v) => !v)}
              className="flex h-16px w-16px shrink-0 items-center justify-center text-status-info"
            >
              <InfoIcon filled />
            </button>
            {showInputInfoTooltip && (
              <div className="absolute left-4px top-full z-10 mt-4px flex w-full max-w-[320px] items-start gap-4px rounded-12 bg-bg-tint px-16px py-12px shadow-[0_8px_24px_rgba(25,31,40,0.08)]">
                <span
                  className="text-12 font-normal text-text-secondary"
                  style={{ lineHeight: 'var(--line-height-heading)' }}
                >
                  할 일을 적을 때, '네일'보다 '네일 받기'처럼 적으면
                  <br />더 정확하게 할 일을 쪼갤 수 있어요.
                </span>
                <button
                  type="button"
                  aria-label="닫기"
                  onClick={() => setShowInputInfoTooltip(false)}
                  className="flex h-16px w-16px shrink-0 items-center justify-center text-text-dim"
                >
                  <CloseIcon size={14} />
                </button>
              </div>
            )}
          </div>
          {/* 최근 완료 할 일 추천 칩 — 최근 10일 내 완료했던 일만, 탭하면 입력창에 채워줌(바로 등록 X) */}
          {recentDoneSuggestions.length > 0 && (
            <div className="no-scrollbar -mx-4px flex gap-8px overflow-x-auto px-4px pt-12px">
              {recentDoneSuggestions.map((text) => (
                <button
                  key={text}
                  type="button"
                  onClick={() => setInputText(text)}
                  className="shrink-0 whitespace-nowrap rounded-full bg-bg-tint px-12px py-8px text-14 font-medium text-brand-pressed"
                >
                  {text}
                </button>
              ))}
            </div>
          )}
        </section>

        {/* 할 일 리스트 (TodoList) */}
        <section className="px-20px pt-20px">
          {/* 이어가기(V1.3) — 날짜 바뀐 뒤 첫 접속 때만, 최근 3일 내 미완료 할 일을 칩으로 재노출 */}
          {carryoverVisible && carryoverVisible.length > 0 && (
            <div
              className="mb-24px rounded-12 bg-bg-tint px-20px py-20px"
              style={{
                transform: `perspective(800px) rotateY(${carryoverFlip ? 360 : 0}deg)`,
                transition: carryoverFlip ? 'transform 0.6s ease' : 'none',
              }}
            >
              <div className="flex items-start justify-between gap-8px">
                <p className="text-15 font-medium text-text-primary">
                  <span className="text-status-warning">✦</span> 잠깐, 아직 남은 할 일이 있어요.{' '}
                  <span className="whitespace-nowrap">이어서 해볼까요?</span>
                </p>
                <button
                  type="button"
                  aria-label="닫기"
                  onClick={dismissCarryover}
                  className="flex h-24px w-24px shrink-0 items-center justify-center rounded-8 text-text-dim transition duration-[96ms] ease-out active:scale-[0.98]"
                >
                  <CloseIcon size={16} />
                </button>
              </div>
              <p className="text-14 font-normal text-text-muted">
                남은 일은 조금이에요. 이어갈 수 있도록 응원해줄게요!
              </p>
              <div className="mt-12px flex flex-wrap gap-8px">
                {carryoverVisible.map(({ dateKey, todo }) => {
                  const key = `${dateKey}:${todo.id}`;
                  const loading = carryoverLoadingKey === key;
                  const checkedSteps = todo.steps.filter((s) => s.checked).length;
                  return (
                    <button
                      key={key}
                      type="button"
                      disabled={carryoverLoadingKey !== null}
                      onClick={() => consumeCarryoverItem(dateKey, todo)}
                      className="flex shrink-0 items-center gap-4px whitespace-nowrap rounded-full bg-bg-default px-12px py-8px text-14 font-medium text-brand-pressed disabled:opacity-60"
                    >
                      {loading ? (
                        '쪼개는 중…'
                      ) : (
                        <>
                          {todo.text}
                          {/* 본체 체크까지 포함해 3개(●●○) — TodoCard 헤더 도트와 동일 공식 */}
                          <ProgressDots
                            filled={checkedSteps + (todo.originalChecked ? 1 : 0)}
                            total={todo.steps.length + 1}
                          />
                        </>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <h2 className="pb-24px text-17 font-medium text-text-secondary">{listTitle}</h2>
          {incompleteTodos.length === 0 ? null : (
            <ul className="flex flex-col gap-12px">
              {incompleteTodos.map((todo) => {
                const isEditing = editModeId === todo.id;

                return (
                  <TodoCard
                    key={todo.id}
                    todo={todo}
                    isMenuOpen={menuOpenId === todo.id}
                    onToggleMenu={toggleMenu}
                    onCloseMenu={closeMenu}
                    isEditing={isEditing}
                    onStartEdit={startEdit}
                    onFinishEdit={finishEdit}
                    onEditStepText={editStepText}
                    onEditOriginalText={editOriginalText}
                    onResplit={resplitTodo}
                    isResplitting={resplittingId === todo.id}
                    onDelete={deleteTodo}
                    onToggleStep={toggleStep}
                    onToggleOriginal={toggleOriginal}
                    isCollapsed={false}
                    isComplete={false}
                    onToggleCollapse={toggleCompletedCard}
                    draggable={!isEditing}
                    onDragStart={() => setDragId(todo.id)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => handleDrop(todo.id)}
                  />
                );
              })}
            </ul>
          )}

          {/* 완료한 할 일 — 메인 할 일 체크까지 끝난 것만. 스텝만 다 하고 메인 체크 전이면 위 "오늘 할 일"에 그대로 남는다. */}
          {completedTodos.length > 0 && (
            <div className="pt-32px">
              <h2 className="pb-24px text-17 font-medium text-text-secondary">완료한 할 일 {completedTodos.length}개</h2>
              <ul className="flex flex-col gap-12px">
                {completedTodos.map((todo) => {
                  const isEditing = editModeId === todo.id;
                  const isCollapsed = !expandedCompletedIds.has(todo.id);

                  return (
                    <TodoCard
                      key={todo.id}
                      todo={todo}
                      isMenuOpen={menuOpenId === todo.id}
                      onToggleMenu={toggleMenu}
                      onCloseMenu={closeMenu}
                      isEditing={isEditing}
                      onStartEdit={startEdit}
                      onFinishEdit={finishEdit}
                      onEditStepText={editStepText}
                      onEditOriginalText={editOriginalText}
                      onResplit={resplitTodo}
                      isResplitting={resplittingId === todo.id}
                      onDelete={deleteTodo}
                      onToggleStep={toggleStep}
                      onToggleOriginal={toggleOriginal}
                      isCollapsed={isCollapsed}
                      isComplete
                      onToggleCollapse={toggleCompletedCard}
                      draggable={!isEditing}
                      onDragStart={() => setDragId(todo.id)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => handleDrop(todo.id)}
                    />
                  );
                })}
              </ul>
            </div>
          )}
        </section>
      </div>

      {/* 하단 토스트 */}
      {toast && (
        <div
          className="fixed inset-x-0 z-30 mx-auto w-full max-w-[480px] px-20px"
          style={{ bottom: 'calc(56px + var(--spacing-16))' }}
        >
          <div className="w-full rounded-12 bg-bg-inverse px-20px py-20px text-center text-15 font-medium text-text-on-inverse shadow-[0_8px_24px_rgba(25,31,40,0.08)]">
            {toast}
          </div>
        </div>
      )}

      {/* 이어가기 응원카드 (V1.3) — 생애 최초 1회만 */}
      {encouragementCard && (
        <EncouragementCard card={encouragementCard} onClose={() => setEncouragementCard(null)} />
      )}

      {/* 젤리 획득/보너스/별자리 완성 팝업 (V1.0 M3) */}
      {jellyPopup && (
        <JellyPopup
          {...jellyPopup}
          onClose={() => {
            const [next, ...rest] = nextJellyPopup.current;
            nextJellyPopup.current = rest;
            setJellyPopup(next ?? null);
          }}
          onView={() => {
            if (nextJellyPopup.current.length > 0) {
              // 뒤에 보여줄 팝업이 남아있으면 아직 이동하지 않고 그것부터 보여준다
              const [next, ...rest] = nextJellyPopup.current;
              nextJellyPopup.current = rest;
              setJellyPopup(next);
              return;
            }
            setJellyPopup(null);
            // '선물 도착' 팝업은 보관소가 아니라 선물 수령 페이지로 보낸다
            router.push(jellyPopup?.kind === 'gift_arrived' ? '/invite/claim' : '/vault?from=popup_cta');
          }}
        />
      )}

      {/* 생애 첫 할 일 완수 팝업 — 별점 피드백, 바텀 시트 */}
      {showFirstDonePopup && (
        <div className="fixed inset-0 z-40">
          <button
            type="button"
            aria-label="닫기"
            onClick={handleFeedbackDismiss}
            className="absolute inset-0 cursor-default"
            style={{ background: 'rgba(25, 31, 40, 0.4)' }}
          />
          <div className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-[480px] rounded-t-16 bg-bg-default p-20px pb-32px shadow-[0_8px_24px_rgba(25,31,40,0.08)]">
            <div className="flex items-start justify-between pb-4px">
              <h2 className="text-17 font-semibold text-text-primary">첫 할 일을 해냈어요!</h2>
              <button
                type="button"
                aria-label="닫기"
                onClick={handleFeedbackDismiss}
                className="flex h-32px w-32px shrink-0 items-center justify-center rounded-8 text-text-dim transition duration-[96ms] ease-out active:scale-[0.98]"
              >
                <CloseIcon />
              </button>
            </div>
            <p className="pb-24px text-15 font-normal text-text-secondary">
              할 일을 시작하는 데 도움이 됐나요?
            </p>
            <div className="flex flex-col items-center gap-8px pb-32px">
              <div className="flex justify-center gap-8px">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    aria-label={`${n}점`}
                    aria-pressed={n <= feedbackRating}
                    onClick={() => setFeedbackRating(n)}
                    className="flex h-48px w-48px items-center justify-center transition duration-[96ms] ease-out active:scale-[0.98]"
                  >
                    <StarIcon filled={n <= feedbackRating} size={40} />
                  </button>
                ))}
              </div>
              {/* 라벨 — 선택 전에도 고정 높이로 자리 확보(레이아웃 흔들림 방지) */}
              <div className="flex h-24px items-center justify-center">
                <span className="text-15 font-normal text-text-secondary">
                  {feedbackRating ? RATING_LABELS[feedbackRating] : ''}
                </span>
              </div>
            </div>
            <Button className="w-full" disabled={feedbackRating === 0} onClick={handleFeedbackSubmit}>
              알려주기
            </Button>
          </div>
        </div>
      )}

      {/* 원본 할일 텍스트 수정 후 미니스텝 처리 얼럿 — X/백드롭 닫기 없음, 두 버튼 중 선택 강제 */}
      {resplitAlertTodoId && (
        <div className="fixed inset-0 z-40">
          <div className="absolute inset-0" style={{ background: 'rgba(25, 31, 40, 0.4)' }} />
          <div className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-[480px] rounded-t-16 bg-bg-default p-20px pb-32px shadow-[0_8px_24px_rgba(25,31,40,0.08)]">
            <h2 className="pb-4px text-17 font-semibold text-text-primary">
              할 일이 바뀌었어요. 미니스텝은 어떻게 할까요?
            </h2>
            <div className="flex flex-col gap-8px pt-16px">
              <Button className="w-full" onClick={handleResplitAlertKeepText}>
                텍스트만 수정
              </Button>
              <Button variant="secondary" className="w-full" onClick={handleResplitAlertResplit}>
                다시 쪼개기
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 캐릭터 젤리 보관소 기능 추가 소개 팝업 — 생애 최초 1회만, 다른 팝업과 겹치지 않을 때만 */}
      {showVaultIntro &&
        !encouragementCard &&
        !jellyPopup &&
        !showFirstDonePopup &&
        !resplitAlertTodoId && (
          <VaultFeatureIntro onClose={closeVaultIntro} onView={closeVaultIntro} />
        )}

      <BottomNav active="home" />
    </div>
  );
}

// ---------- 화면 내 공통 조각 (컴포넌트 추출 아님 — 화면 파일 내부 헬퍼) ----------

// ---------- 아이콘 (플랫 벡터, currentColor) ----------

function StarIcon({ filled, size = 24 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      className={filled ? 'text-brand-primary' : 'text-border-strong'}
    >
      <path
        d="M12 3.5L14.8 9.2L21 10.1L16.5 14.5L17.6 20.7L12 17.7L6.4 20.7L7.5 14.5L3 10.1L9.2 9.2L12 3.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CloseIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M6 6L18 18M18 6L6 18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function InfoIcon({ filled = false }) {
  if (filled) {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" fill="currentColor" />
        <path
          d="M12 11V17"
          stroke="var(--color-bg-default)"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle cx="12" cy="7.5" r="1.25" fill="var(--color-bg-default)" />
      </svg>
    );
  }
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <path
        d="M12 11V17"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="12" cy="7.5" r="1.25" fill="currentColor" />
    </svg>
  );
}

