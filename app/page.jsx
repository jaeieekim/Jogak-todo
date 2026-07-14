'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import TodoCard from '../components/TodoCard';
import Button from '../components/Button';
import WeekStrip from '../components/WeekStrip';
import MascotSpeechBubble from '../components/MascotSpeechBubble';
import {
  getMascotState,
  MASCOT_STATE_MESSAGES,
  MASCOT_MOMENT_MESSAGE,
  MASCOT_MOMENT_DURATION_MS,
} from '../lib/mascotState';
import { generateSteps, GenerateStepsError } from '../lib/generateSteps';
import { sampleStrategies } from '../lib/prompts/miniStepPrompt';
import { track, EVENTS } from '../lib/mixpanel';
import {
  loadTodosByDate,
  saveTodosByDate,
  wasFirstDonePopupShown,
  markFirstDonePopupShown,
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
  const [mascotMoment, setMascotMoment] = useState(false);
  const mascotMomentTimer = useRef(null);

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

  // 체크하는 순간 마스코트 말풍선에 순간 반응을 3초 보여준 뒤 상시 상태 문구로 복귀
  function showMascotMoment() {
    if (mascotMomentTimer.current) clearTimeout(mascotMomentTimer.current);
    setMascotMoment(true);
    mascotMomentTimer.current = setTimeout(() => setMascotMoment(false), MASCOT_MOMENT_DURATION_MS);
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
      result = await generateSteps(text, candidates);
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

    if (justChecked) showMascotMoment();

    if (!isTodoComplete(prevTodo) && isTodoComplete(nextTodo)) {
      showToast('오늘 몫은 충분해요');
      track(EVENTS.ALL_COMPLETE, { todoId: prevTodo.id });
      if (!wasFirstDonePopupShown()) {
        markFirstDonePopupShown();
        setShowFirstDonePopup(true);
      }
    } else if (justChecked && prevCheckedCount === 0) {
      showToast('시작이 반이에요. 이대로 잘하고 있어요');
      track(EVENTS.FIRST_STEP_CHECKED, { todoId: prevTodo.id });
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
    showToast('잘게 쪼개는 중이에요');

    let result;
    try {
      // 직전에 사용한 전략은 재샘플링 후보에서 제외 (PRD 7번·7-1번)
      const candidates = sampleStrategies(3, todo.lastStrategy);
      result = await generateSteps(todo.text, candidates);
    } catch (err) {
      showToast(err instanceof GenerateStepsError ? err.message : '잠깐 삐끗했어요. 한 번만 다시 눌러줄래요?');
      return;
    }

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
  }

  function editStepText(todoId, stepId, text) {
    applyTodoUpdate(todoId, (todo) => ({
      ...todo,
      steps: todo.steps.map((s) => (s.id === stepId ? { ...s, text } : s)),
    }));
  }

  function finishEdit(todoId) {
    // 빈 스텝은 정리
    applyTodoUpdate(todoId, (todo) => ({
      ...todo,
      steps: todo.steps.filter((s) => s.text.trim() !== ''),
    }));
    setEditModeId(null);
    track(EVENTS.STEP_EDITED, { todoId });
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
  const weekHeaderLabel = `${weekStart.getFullYear()}년 ${weekStart.getMonth() + 1}월`;

  // ---------- 할 일 리스트 제목 ----------
  const [, selectedMonth, selectedDay] = selectedDate.split('-').map(Number);
  const listTitle =
    selectedDate === todayKey ? '오늘 할 일' : `${selectedMonth}월 ${selectedDay}일 할 일`;

  // ---------- 마스코트 말풍선 ----------
  const mascotState = getMascotState(todos);
  const mascotMessage = mascotMoment ? MASCOT_MOMENT_MESSAGE : MASCOT_STATE_MESSAGES[mascotState];

  return (
    <div className="mx-auto min-h-screen w-full max-w-[480px] bg-bg-default">
      <div style={{ paddingBottom: 'calc(56px + var(--spacing-32))' }}>
        {/* 헤더 */}
        <header className="px-20px pt-24px pb-8px">
          <h1 className="text-20 font-semibold text-text-primary">조각투두</h1>
          <p className="text-14 font-normal text-text-muted">일을 미루는 사람을 위한 투두</p>
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
            src="/mascot-star.png"
            alt="조각투두 마스코트"
            width={120}
            height={120}
            priority
            className="h-[120px] w-[120px]"
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
              placeholder="시작해야 하는 일 하나만 적어봐요"
              className="min-w-0 flex-1 rounded-12 bg-bg-surface px-20px py-16px text-15 font-normal text-text-primary outline-none placeholder:text-text-dim focus:ring-2 focus:ring-brand-primary"
            />
            <Button type="submit" disabled={!inputText.trim() || generating} className="shrink-0 px-20px">
              {generating ? '잘게 쪼개는 중이에요' : '할일 등록'}
            </Button>
          </form>
          <p className="px-4px pt-8px text-12 font-normal text-text-dim">
            할일을 쉽게 시작할 수 있도록 작게 조각내어 드릴게요
          </p>
        </section>

        {/* 할 일 리스트 (TodoList) */}
        <section className="px-20px pt-8px">
          <h2 className="pb-24px text-17 font-medium text-text-secondary">{listTitle}</h2>
          {todos.length === 0 ? (
            <p className="py-48px text-center text-15 font-normal text-text-dim">
              부담 없이, 하나면 돼요
            </p>
          ) : (
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
                    onResplit={resplitTodo}
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
          <div className="w-full rounded-12 bg-bg-inverse px-20px py-16px text-center text-15 font-medium text-text-on-inverse shadow-[0_8px_24px_rgba(25,31,40,0.08)]">
            {toast}
          </div>
        </div>
      )}

      {/* 생애 첫 할 일 완수 팝업 — 바텀 시트 */}
      {showFirstDonePopup && (
        <div className="fixed inset-0 z-40">
          <button
            type="button"
            aria-label="닫기"
            onClick={() => setShowFirstDonePopup(false)}
            className="absolute inset-0 cursor-default"
            style={{ background: 'rgba(25, 31, 40, 0.4)' }}
          />
          <div className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-[480px] rounded-t-16 bg-bg-default p-20px pb-32px shadow-[0_8px_24px_rgba(25,31,40,0.08)]">
            <h2 className="pb-4px text-17 font-semibold text-text-primary">첫 할 일을 해냈어요!</h2>
            <p className="pb-20px text-15 font-normal text-text-secondary">
              이 기능이 일을 시작하는 데 도움이 됐나요?
            </p>
            <div className="flex gap-8px">
              <Button
                className="flex-1"
                onClick={() => {
                  track(EVENTS.FEEDBACK_RESPONDED, { helpful: true });
                  setShowFirstDonePopup(false);
                }}
              >
                도움됐어요
              </Button>
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => {
                  track(EVENTS.FEEDBACK_RESPONDED, { helpful: false });
                  setShowFirstDonePopup(false);
                }}
              >
                도움이 안 됐어요
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
            disabled
            aria-label="기록·리포트 보관소 (준비 중)"
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
