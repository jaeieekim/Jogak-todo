// 할일 카드. 스펙 원본: playful-todolist-ko.md '할일 카드 (TodoCard)' 섹션.
// 화면(TodoList)에서 3번째 반복 시점에 추출 승인받아 컴포넌트로 분리함.

import Button from './Button';

export default function TodoCard({
  todo,
  isMenuOpen,
  onToggleMenu,
  onCloseMenu,
  isEditing,
  onStartEdit,
  onFinishEdit,
  onEditStepText,
  onResplit,
  onDelete,
  onToggleStep,
  onToggleOriginal,
  isCollapsed,
  isComplete,
  onToggleCollapse,
  draggable,
  onDragStart,
  onDragOver,
  onDrop,
}) {
  const checkedSteps = todo.steps.filter((s) => s.checked).length;
  const totalItems = todo.steps.length + 1;
  const checkedItems = checkedSteps + (todo.originalChecked ? 1 : 0);

  return (
    <li
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={`rounded-12 px-24px py-20px transition duration-[96ms] ease-out ${
        isCollapsed
          ? 'bg-bg-tint'
          : 'border border-border bg-bg-default shadow-[0_1px_3px_rgba(25,31,40,0.04)] hover:border-border-strong'
      }`}
    >
      {/* 헤더 행 — 체크 기능 없는 타이틀. 체크박스가 체크리스트로 이동해 64px 탭 타겟 근거가 없어져 32px 토큰으로 축소 */}
      <div
        role={isComplete ? 'button' : undefined}
        tabIndex={isComplete ? 0 : undefined}
        onClick={() => isComplete && onToggleCollapse(todo.id)}
        onKeyDown={(e) => {
          if (isComplete && (e.key === 'Enter' || e.key === ' ')) onToggleCollapse(todo.id);
        }}
        className={`flex h-32px items-center gap-16px ${isComplete ? 'cursor-pointer' : ''}`}
      >
        <div className="flex min-w-0 flex-1 items-center gap-24px">
          <span
            className={`truncate text-15 font-medium ${
              isComplete ? 'text-text-muted' : 'text-text-secondary'
            }`}
          >
            {todo.text}
          </span>
          <ProgressDots filled={checkedItems} total={totalItems} />
        </div>
        <div className="relative shrink-0">
          <button
            type="button"
            aria-label="메뉴"
            onClick={(e) => {
              e.stopPropagation();
              onToggleMenu(todo.id);
            }}
            className="flex h-32px w-32px items-center justify-center rounded-8 text-text-muted transition duration-[96ms] ease-out active:scale-[0.98]"
          >
            <DotsIcon />
          </button>
          {isMenuOpen && (
            <>
              <button
                type="button"
                aria-label="메뉴 닫기"
                onClick={(e) => {
                  e.stopPropagation();
                  onCloseMenu();
                }}
                className="fixed inset-0 z-10 cursor-default"
              />
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute right-0 z-20 w-max rounded-12 border border-border bg-bg-default py-8px shadow-[0_8px_24px_rgba(25,31,40,0.08)]"
              >
                <MenuItem onClick={() => onStartEdit(todo.id)}>스텝 편집</MenuItem>
                <MenuItem onClick={() => onResplit(todo.id)}>할일 다시 쪼개기</MenuItem>
                <MenuItem danger onClick={() => onDelete(todo.id)}>
                  삭제
                </MenuItem>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 체크리스트 — 헤더와 같은 카드 안, 테두리·구분선 없이 표시. 전체 완료 시 축소되어 숨김 */}
      {!isCollapsed && (
        <>
          <ul className="flex flex-col gap-4px pt-20px">
            {todo.steps.map((step) => (
              <li key={step.id} className="flex items-center gap-12px">
                {isEditing ? (
                  <input
                    type="text"
                    value={step.text}
                    maxLength={40}
                    autoFocus={step.text === ''}
                    onChange={(e) => onEditStepText(todo.id, step.id, e.target.value)}
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
                <Checkbox
                  checked={step.checked}
                  onToggle={() => onToggleStep(todo.id, step.id)}
                  label={`${step.text} 했어요`}
                />
              </li>
            ))}
            {/* 원본 할 일 — 항상 맨 아래, 시간 표기 없음 */}
            <li className="flex items-center gap-12px">
              <span
                className={`min-w-0 flex-1 text-15 font-normal ${
                  todo.originalChecked ? 'text-text-dim' : 'text-text-secondary'
                }`}
              >
                {todo.text}
              </span>
              <Checkbox
                checked={todo.originalChecked}
                onToggle={() => onToggleOriginal(todo.id)}
                label={`${todo.text} 했어요`}
              />
            </li>
          </ul>
          {isEditing && (
            <div className="pt-16px">
              <Button variant="secondary" className="w-full" onClick={() => onFinishEdit(todo.id)}>
                편집 끝내기
              </Button>
            </div>
          )}
        </>
      )}
    </li>
  );
}

// ---------- TodoCard 전용 조각 ----------

function ProgressDots({ filled, total }) {
  return (
    <span className="flex shrink-0 items-center gap-4px" aria-label={`${filled}/${total} 완료`}>
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={`h-[6px] w-[6px] rounded-full ${i < filled ? 'bg-brand-primary' : 'bg-border-strong'}`}
        />
      ))}
    </span>
  );
}

// 시각 지름 24px, 탭 타겟 32×32(spacing/32 토큰) (playful-todolist-ko.md '체크 컨트롤' 참조)
function Checkbox({ checked, onToggle, label }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={onToggle}
      className="-mr-4px flex h-32px w-32px shrink-0 items-center justify-center transition active:scale-[0.98]"
    >
      <span
        className={`flex h-[24px] w-[24px] items-center justify-center rounded-full border-[1.5px] duration-[96ms] ease-out ${
          checked ? 'border-brand-primary bg-brand-primary' : 'border-border-strong bg-transparent'
        }`}
      >
        {checked && <CheckIcon />}
      </span>
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

function DotsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="5" cy="12" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="19" cy="12" r="1.8" />
    </svg>
  );
}
