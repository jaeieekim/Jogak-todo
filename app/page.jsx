'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import TodoCard from '../components/TodoCard';
import Button from '../components/Button';
import WeekStrip from '../components/WeekStrip';
import MascotSpeechBubble from '../components/MascotSpeechBubble';
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
import { track, EVENTS } from '../lib/mixpanel';
import {
  loadTodosByDate,
  saveTodosByDate,
  wasFirstDonePopupShown,
  markFirstDonePopupShown,
  saveFirstFeedback,
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

  // ---------- 저장/로드 ----------
  useEffect(() => {
    setTodosByDate(loadTodosByDate());
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) saveTodosByDate(todosByDate);
  }, [todosByDate, loaded]);

  const todos = todosByDate[selectedDate] || [];

  function setTodosForSelected(next) {
    setTodosByDate((prev) => ({ ...prev, [selectedDate]: next }));
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

  // ---------- 할 일 리스트 제목 ----------
  const listTitle =
    (selectedDate === todayKey ? '오늘 할 일' : `${selectedMonth}월 ${selectedDay}일 할 일`) +
    ` ${todos.length}개`;

  // ---------- 생애 첫 완수 별점 피드백 팝업 ----------
  function closeFirstFeedbackPopup() {
    setShowFirstDonePopup(false);
    setFeedbackRating(0);
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
        <header className="px-20px pt-24px pb-8px">
          <h1 className="text-20 font-semibold text-text-primary">조각투두</h1>
          <p className="text-14 font-normal text-text-muted">쪼개서 쉽게 시작하는 투두리스트</p>
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
        </section>

        {/* 할 일 리스트 (TodoList) */}
        <section className="px-20px pt-20px">
          <h2 className="pb-24px text-17 font-medium text-text-secondary">{listTitle}</h2>
          {todos.length === 0 ? null : (
            <ul className="flex flex-col gap-12px">
              {todos.map((todo) => {
                const checkedItems =
                  todo.steps.filter((s) => s.checked).length + (todo.originalChecked ? 1 : 0);
                const totalItems = todo.steps.length + 1;
                const isEditing = editModeId === todo.id;
                const isComplete = checkedItems === totalItems;
                const isCollapsed = isComplete && !expandedCompletedIds.has(todo.id);

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
                    isComplete={isComplete}
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

      {/* 하단 내비게이션 — 홈 활성 / 보관소 잠금 (V1.3 오픈 예정) */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-bg-default">
        <div className="mx-auto flex h-[56px] w-full max-w-[480px]">
          <button
            type="button"
            className="flex flex-1 flex-col items-center justify-center gap-4px text-brand-primary"
          >
            <HomeIcon />
            <span className="text-12 font-medium">홈</span>
          </button>
          <button
            type="button"
            aria-label="기록·리포트 보관소 (준비 중)"
            onClick={() => showToast('보관소 기능이 열릴 예정이에요. 곧 만나요!')}
            className="flex flex-1 flex-col items-center justify-center gap-4px text-text-dim"
          >
            <LockIcon />
            <span className="text-12 font-medium">보관소</span>
          </button>
        </div>
      </nav>
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

function HomeIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path
        d="M4 10.5L12 4L20 10.5V19C20 19.5523 19.5523 20 19 20H5C4.44772 20 4 19.5523 4 19V10.5Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <rect
        x="5"
        y="11"
        width="14"
        height="9"
        rx="2"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M8 11V8C8 5.79086 9.79086 4 12 4C14.2091 4 16 5.79086 16 8V11"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
