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
  onEditOriginalText,
  onResplit,
  onDelete,
  onToggleStep,
  onToggleOriginal,
  isCollapsed,
  isComplete,
  onToggleCollapse,
  isResplitting,
  draggable,
  onDragStart,
  onDragOver,
  onDrop,
}) {
  const checkedSteps = todo.steps.filter((s) => s.checked).length;
  const totalItems = todo.steps.length + 1;
  const checkedItems = checkedSteps + (todo.originalChecked ? 1 : 0);
  const isOriginalTextBlank = todo.text.trim() === '';
  // 재생성 중에는 축소 상태여도 카드를 펼친 모습(보더·화이트)으로 유지하고 인라인 로더를 보여준다
  const showChecklistArea = !isCollapsed || isResplitting;

  return (
    <li
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={`rounded-16 px-24px py-20px transition duration-[96ms] ease-out ${
        isCollapsed && !isResplitting
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

      {/* 재생성 중 — 체크리스트 자리에 인라인 로더(작은 피드백). md 7-1 참조 */}
      {isResplitting && (
        <div className="flex items-center justify-center gap-8px pt-20px">
          <ResplitLoader />
          <span className="text-14 font-normal text-text-dim">쪼개는 중이에요</span>
        </div>
      )}

      {/* 체크리스트 — 헤더와 같은 카드 안, 테두리·구분선 없이 표시. 전체 완료 시 축소되어 숨김 */}
      {showChecklistArea && !isResplitting && (
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
                    className="min-w-0 flex-1 rounded-8 bg-bg-surface px-12px py-8px text-17 font-normal text-text-primary outline-none focus:ring-2 focus:ring-brand-primary"
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
            {/* 원본 할 일 — 항상 맨 아래, 실제 시간 표기는 없음(더미 뱃지는 invisible). 편집 모드에서 텍스트 수정 가능(헤더와 같은 데이터라 자동 동기화).
                미니스텝 행과 동일하게 항상 세로 중앙 정렬 — 2줄일 때 상단 고정하던 예외는 제거함(실사용상 드묾) */}
            <li className="flex items-center gap-12px">
              {isEditing ? (
                <input
                  type="text"
                  value={todo.text}
                  maxLength={50}
                  onChange={(e) => onEditOriginalText(todo.id, e.target.value)}
                  className="min-w-0 flex-1 rounded-8 bg-bg-surface px-12px py-8px text-17 font-normal text-text-primary outline-none focus:ring-2 focus:ring-brand-primary"
                />
              ) : (
                <span
                  className={`min-w-0 flex-1 text-15 font-normal ${
                    todo.originalChecked ? 'text-text-dim' : 'text-text-secondary'
                  }`}
                >
                  {todo.text}
                </span>
              )}
              {/* 원본 할일 행은 시간 뱃지를 invisible로 유지해 행 구조를 통일함 (경계 착시 방지) */}
              <span className="invisible shrink-0 text-12 font-normal tabular-nums text-text-dim" aria-hidden="true">
                0분
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
              {isOriginalTextBlank && (
                <p className="pb-8px text-12 font-normal text-status-warning">할 일 내용을 적어주세요</p>
              )}
              <Button
                variant="secondary"
                className="w-full"
                disabled={isOriginalTextBlank}
                onClick={() => onFinishEdit(todo.id)}
              >
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

// 재생성 인라인 로더 — 진행 도트와 같은 6px brand 원 3개가 순차 펄스 (md 7-1)
function ResplitLoader() {
  return (
    <span className="flex items-center gap-4px" role="status" aria-label="쪼개는 중이에요">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-[6px] w-[6px] rounded-full bg-brand-primary animate-loader-pulse"
          style={{ animationDelay: `${i * 150}ms` }}
        />
      ))}
    </span>
  );
}

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
      <circle cx="12" cy="5" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="12" cy="19" r="1.8" />
    </svg>
  );
}
