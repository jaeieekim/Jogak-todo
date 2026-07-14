// 주간 내비게이션. 날짜 사이 간격은 grid + 명시적 spacing/8 토큰 사용
// (기존엔 justify-between 자동 분배라 토큰이 없었음).

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

export default function WeekStrip({
  weekDays,
  selectedDate,
  todayKey,
  headerLabel,
  onPrevWeek,
  onNextWeek,
  onSelectDate,
}) {
  return (
    <section className="px-20px py-12px">
      <div className="flex items-center justify-between pb-8px">
        <button
          type="button"
          aria-label="이전 주"
          onClick={onPrevWeek}
          className="flex h-32px w-32px items-center justify-center rounded-8 text-text-muted transition duration-[96ms] ease-out active:scale-[0.98]"
        >
          <ChevronLeftIcon />
        </button>
        <span className="text-15 font-medium tabular-nums text-text-primary">{headerLabel}</span>
        <button
          type="button"
          aria-label="다음 주"
          onClick={onNextWeek}
          className="flex h-32px w-32px items-center justify-center rounded-8 text-text-muted transition duration-[96ms] ease-out active:scale-[0.98]"
        >
          <ChevronRightIcon />
        </button>
      </div>
      <div className="grid grid-cols-7 items-center justify-items-center gap-8px">
        {weekDays.map((d) => {
          const key = d.key;
          const isSelected = key === selectedDate;
          const isToday = key === todayKey;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelectDate(key)}
              className="flex flex-col items-center gap-4px"
            >
              <span className="text-12 font-normal text-text-muted">{DAY_LABELS[d.dayOfWeek]}</span>
              <span
                className={`flex h-32px w-32px items-center justify-center rounded-full text-15 font-medium tabular-nums transition duration-[96ms] ease-out active:scale-[0.98] ${
                  isSelected
                    ? 'bg-brand-primary text-text-on-brand'
                    : isToday
                      ? 'text-brand-primary'
                      : 'text-text-secondary'
                }`}
              >
                {d.dayOfMonth}
              </span>
            </button>
          );
        })}
      </div>
    </section>
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
