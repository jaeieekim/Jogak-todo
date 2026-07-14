'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
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
const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

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
  const toastTimer = useRef(null);

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
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const todayKey = toDateKey(today);

  return (
    <div className="mx-auto min-h-screen w-full max-w-[480px] bg-bg-default">
      <div style={{ paddingBottom: 'calc(56px + var(--spacing-32))' }}>
        {/* 헤더 */}
        <header className="px-20px pt-24px pb-8px">
          <h1 className="text-20 font-semibold text-text-primary">조각투두</h1>
          <p className="text-14 font-normal text-text-muted">일을 미루는 사람을 위한 투두</p>
        </header>

        {/* 주간 내비게이션 (WeekStrip) */}
        <section className="px-20px py-12px">
          <div className="flex items-center justify-between pb-8px">
            <button
              type="button"
              aria-label="이전 주"
              onClick={() => setWeekStart(addDays(weekStart, -7))}
              className="flex h-[36px] w-[36px] items-center justify-center rounded-8 text-text-muted transition duration-[96ms] ease-out active:scale-[0.98]"
            >
              <ChevronLeftIcon />
            </button>
            <span className="text-15 font-medium tabular-nums text-text-primary">
              {weekStart.getFullYear()}년 {weekStart.getMonth() + 1}월
            </span>
            <button
              type="button"
              aria-label="다음 주"
              onClick={() => setWeekStart(addDays(weekStart, 7))}
              className="flex h-[36px] w-[36px] items-center justify-center rounded-8 text-text-muted transition duration-[96ms] ease-out active:scale-[0.98]"
            >
              <ChevronRightIcon />
            </button>
          </div>
          <div className="flex justify-between">
            {weekDays.map((d) => {
              const key = toDateKey(d);
              const isSelected = key === selectedDate;
              const isToday = key === todayKey;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedDate(key)}
                  className="flex flex-col items-center gap-4px"
                >
                  <span className="text-12 font-normal text-text-muted">
                    {DAY_LABELS[d.getDay()]}
                  </span>
                  <span
                    className={`flex h-[36px] w-[36px] items-center justify-center rounded-full text-15 font-medium tabular-nums transition duration-[96ms] ease-out active:scale-[0.98] ${
                      isSelected
                        ? 'bg-brand-primary text-text-on-brand'
                        : isToday
                          ? 'text-brand-primary'
                          : 'text-text-secondary'
                    }`}
                  >
                    {d.getDate()}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* 브랜드 캐릭터 마스코트 */}
        <div className="flex justify-center py-8px">
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
              placeholder="미루고 있는 거 하나만 적어봐요"
              className="min-w-0 flex-1 rounded-12 bg-bg-surface px-20px py-16px text-17 font-normal text-text-primary outline-none placeholder:text-text-dim focus:ring-2 focus:ring-brand-primary"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || generating}
              className="shrink-0 rounded-8 bg-brand-primary px-20px py-[14px] text-17 font-medium text-text-on-brand transition duration-[96ms] ease-out active:scale-[0.98] disabled:opacity-40"
            >
              {generating ? '잘게 쪼개는 중이에요' : '할일 쪼개기'}
            </button>
          </form>
          <p className="px-4px pt-8px text-12 font-normal text-text-dim">
            할일을 쉽게 시작할 수 있도록 작게 조각내요
          </p>
        </section>

        {/* 할 일 리스트 (TodoList) */}
        <section className="px-20px pt-12px">
          {todos.length === 0 ? (
            <p className="py-48px text-center text-15 font-normal text-text-dim">
              부담 없이, 하나면 돼요
            </p>
          ) : (
            <ul className="flex flex-col gap-12px">
              {todos.map((todo) => {
                const checkedSteps = todo.steps.filter((s) => s.checked).length;
                const totalItems = todo.steps.length + 1;
                const checkedItems = checkedSteps + (todo.originalChecked ? 1 : 0);
                const isEditing = editModeId === todo.id;

                return (
                  <li
                    key={todo.id}
                    draggable={!isEditing}
                    onDragStart={() => setDragId(todo.id)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => handleDrop(todo.id)}
                    className="rounded-12 border border-border bg-bg-default p-16px shadow-[0_1px_3px_rgba(25,31,40,0.04)]"
                  >
                    {/* 헤더 행 — 64px 고정 */}
                    <div className="flex h-[64px] items-center gap-12px">
                      <Checkbox
                        checked={todo.originalChecked}
                        onToggle={() => toggleOriginal(todo.id)}
                        label={`${todo.text} 했어요`}
                      />
                      <div className="flex min-w-0 flex-1 items-center gap-8px">
                        <span
                          className={`truncate text-17 font-normal ${
                            todo.originalChecked ? 'text-text-dim' : 'text-text-secondary'
                          }`}
                        >
                          {todo.text}
                        </span>
                        <span className="shrink-0 rounded-4 bg-bg-surface px-8px py-4px text-12 font-normal tabular-nums text-text-muted">
                          {checkedItems}/{totalItems}
                        </span>
                      </div>
                      <div className="relative shrink-0">
                        <button
                          type="button"
                          aria-label="메뉴"
                          onClick={() => setMenuOpenId(menuOpenId === todo.id ? null : todo.id)}
                          className="flex h-[36px] w-[36px] items-center justify-center rounded-8 text-text-muted transition duration-[96ms] ease-out active:scale-[0.98]"
                        >
                          <DotsIcon />
                        </button>
                        {menuOpenId === todo.id && (
                          <>
                            <button
                              type="button"
                              aria-label="메뉴 닫기"
                              onClick={() => setMenuOpenId(null)}
                              className="fixed inset-0 z-10 cursor-default"
                            />
                            <div className="absolute right-0 z-20 w-[160px] rounded-12 border border-border bg-bg-default py-8px shadow-[0_8px_24px_rgba(25,31,40,0.08)]">
                              <MenuItem
                                onClick={() => {
                                  setMenuOpenId(null);
                                  setEditModeId(todo.id);
                                }}
                              >
                                스텝 편집
                              </MenuItem>
                              <MenuItem onClick={() => resplitTodo(todo.id)}>할일 다시 쪼개기</MenuItem>
                              <MenuItem danger onClick={() => deleteTodo(todo.id)}>
                                삭제
                              </MenuItem>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* 체크리스트 — 헤더와 같은 카드 안, 테두리·구분선 없이 항상 표시 */}
                    <ul className="flex flex-col gap-12px pt-12px">
                      {todo.steps.map((step) => (
                        <li key={step.id} className="flex items-center gap-12px">
                          <Checkbox
                            checked={step.checked}
                            onToggle={() => toggleStep(todo.id, step.id)}
                            label={`${step.text} 했어요`}
                          />
                          {isEditing ? (
                            <input
                              type="text"
                              value={step.text}
                              maxLength={40}
                              autoFocus={step.text === ''}
                              onChange={(e) => editStepText(todo.id, step.id, e.target.value)}
                              className="min-w-0 flex-1 rounded-8 bg-bg-surface px-12px py-8px text-15 font-normal text-text-primary outline-none focus:ring-2 focus:ring-brand-primary"
                            />
                          ) : (
                            <span
                              className={`min-w-0 flex-1 text-15 font-normal ${
                                step.checked ? 'text-text-dim' : 'text-text-secondary'
                              }`}
                            >
                              {step.text}
                            </span>
                          )}
                          <span className="shrink-0 text-12 font-normal tabular-nums text-text-dim">
                            {step.minutes}분
                          </span>
                        </li>
                      ))}
                      {/* 원본 할 일 — 항상 맨 아래, 시간 표기 없음 */}
                      <li className="flex items-center gap-12px">
                        <Checkbox
                          checked={todo.originalChecked}
                          onToggle={() => toggleOriginal(todo.id)}
                          label={`${todo.text} 했어요`}
                        />
                        <span
                          className={`min-w-0 flex-1 text-15 font-normal ${
                            todo.originalChecked ? 'text-text-dim' : 'text-text-secondary'
                          }`}
                        >
                          {todo.text}
                        </span>
                      </li>
                    </ul>
                    {isEditing && (
                      <div className="pt-16px">
                        <button
                          type="button"
                          onClick={() => finishEdit(todo.id)}
                          className="w-full rounded-8 bg-bg-tint py-[14px] text-15 font-medium text-brand-pressed transition duration-[96ms] ease-out active:scale-[0.98]"
                        >
                          편집 끝내기
                        </button>
                      </div>
                    )}
                  </li>
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
              <button
                type="button"
                onClick={() => {
                  track(EVENTS.FEEDBACK_RESPONDED, { helpful: true });
                  setShowFirstDonePopup(false);
                }}
                className="flex-1 rounded-8 bg-brand-primary py-[14px] text-17 font-medium text-text-on-brand transition duration-[96ms] ease-out active:scale-[0.98]"
              >
                도움됐어요
              </button>
              <button
                type="button"
                onClick={() => {
                  track(EVENTS.FEEDBACK_RESPONDED, { helpful: false });
                  setShowFirstDonePopup(false);
                }}
                className="flex-1 rounded-8 bg-bg-tint py-[14px] text-17 font-medium text-brand-pressed transition duration-[96ms] ease-out active:scale-[0.98]"
              >
                도움이 안 됐어요
              </button>
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

function Checkbox({ checked, onToggle, label }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={onToggle}
      className={`flex h-[24px] w-[24px] shrink-0 items-center justify-center rounded-full border transition duration-[96ms] ease-out active:scale-[0.98] ${
        checked ? 'border-status-success bg-status-success' : 'border-border-strong bg-bg-default'
      }`}
    >
      {checked && <CheckIcon />}
    </button>
  );
}

function MenuItem({ children, onClick, danger = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`block w-full px-16px py-12px text-left text-15 font-normal ${
        danger ? 'text-status-danger' : 'text-text-secondary'
      }`}
    >
      {children}
    </button>
  );
}

// ---------- 아이콘 (플랫 벡터, currentColor) ----------

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-text-on-brand">
      <path
        d="M5 12.5L10 17.5L19 7"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronLeftIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path
        d="M15 5L8 12L15 19"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path
        d="M9 5L16 12L9 19"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DotsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="5" cy="12" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="19" cy="12" r="1.8" />
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
