import { TrainingLog } from "@/types";

interface CycleRoadProps {
  totalWeeks: number | null; // 計畫週數；null 時不畫路線，只留最近 7 天
  week: number; // 目前第幾週（從 1 起算）
  sessionInWeek: number; // 本週已練幾課
  cycleLen: number;
  finished: boolean;
  remainingSessions: number; // 整期還剩幾課，用來推估完成日
  nextWorkout: string;
  logs: TrainingLog[]; // 全部日誌（休息天數與身體狀態不分計畫）
}

const DAY_MS = 86_400_000;

const toDay = (s?: string) => {
  const m = s?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? new Date(+m[1], +m[2] - 1, +m[3]).getTime() : null;
};

// 強度分級：和同一個主項動作的歷史最高 Volume 比，不跨動作比較（腿日的 Volume 天生就比較大）
function intensityLevel(log: TrainingLog, bestByExercise: Map<string, number>): 0 | 1 | 2 | 3 {
  const best = bestByExercise.get(log.mainExercise) || 0;
  if (!log.volume || best <= 0) return 0;
  const ratio = log.volume / best;
  if (ratio >= 0.95) return 3;
  if (ratio >= 0.8) return 2;
  return 1;
}

const LEVEL_LABEL = ["", "低", "中", "高"];

export default function CycleRoad({
  totalWeeks,
  week,
  sessionInWeek,
  cycleLen,
  finished,
  remainingSessions,
  nextWorkout,
  logs,
}: CycleRoadProps) {
  const now = new Date();
  const todayTs = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  const bestByExercise = new Map<string, number>();
  for (const l of logs) {
    if (l.mainExercise && (l.volume || 0) > (bestByExercise.get(l.mainExercise) || 0)) {
      bestByExercise.set(l.mainExercise, l.volume || 0);
    }
  }

  // 以今天為終點往回 7 天，不照星期一到日排——App 本身不依星期重置
  const days = Array.from({ length: 7 }, (_, i) => {
    const ts = todayTs - (6 - i) * DAY_MS;
    const dayLogs = logs.filter((l) => toDay(l.date) === ts);
    const d = new Date(ts);
    return {
      ts,
      isToday: i === 6,
      label: `${d.getMonth() + 1}/${d.getDate()}`,
      logs: dayLogs,
      level: dayLogs.length > 0 ? Math.max(...dayLogs.map((l) => intensityLevel(l, bestByExercise))) : 0,
    };
  });
  const trainedDays = days.filter((d) => d.logs.length > 0).length;

  // 預計完成日：最近 14 天平均幾天練一課 × 剩餘課數（只是節奏推估，不是承諾）
  const recent14 = logs.filter((l) => {
    const t = toDay(l.date);
    return t !== null && todayTs - t >= 0 && todayTs - t < 14 * DAY_MS;
  }).length;
  let etaText = "";
  if (finished) {
    etaText = "整期已完成";
  } else if (recent14 > 0 && remainingSessions > 0) {
    const eta = new Date(todayTs + Math.ceil((remainingSessions * 14) / recent14) * DAY_MS);
    const md = `${eta.getMonth() + 1}/${eta.getDate()}`;
    etaText = `預計 ${eta.getFullYear() !== now.getFullYear() ? `${eta.getFullYear()}/` : ""}${md} 完成`;
  }

  const showRoad = totalWeeks !== null && totalWeeks > 1;
  const weeks = totalWeeks ?? 0;
  const currentWeek = Math.min(week, weeks);
  const nodePct = (w: number) => ((w - 1) / Math.max(weeks - 1, 1)) * 100;
  const fillPct = finished ? 100 : Math.min(((currentWeek - 1 + sessionInWeek / Math.max(cycleLen, 1)) / Math.max(weeks - 1, 1)) * 100, 100);
  const ringR = 17;
  const ringC = 2 * Math.PI * ringR;

  return (
    <div className="road-block">
      {showRoad && (
        <>
          <div className="road-head">
            <span className="eyebrow">{weeks} 週路線</span>
            <span>
              第 <b className="num-display">{currentWeek}</b> / {weeks} 週
            </span>
          </div>
          <div className="road" role="img" aria-label={`第 ${currentWeek} 週，共 ${weeks} 週，本週 ${sessionInWeek}/${cycleLen} 課`}>
            <div className="road-track" />
            <div className="road-fill" style={{ width: `${fillPct}%` }} />
            {Array.from({ length: weeks }, (_, i) => i + 1).map((w) => {
              const isCurrent = !finished && w === currentWeek;
              const isDone = finished || w < currentWeek;
              if (isCurrent) {
                return (
                  <svg key={w} className="road-current" style={{ left: `${nodePct(w)}%` }} width="44" height="44" viewBox="0 0 44 44" aria-hidden="true">
                    <circle cx="22" cy="22" r={ringR} className="ring-bg" />
                    {sessionInWeek > 0 && (
                      <circle
                        cx="22"
                        cy="22"
                        r={ringR}
                        className="ring-fg"
                        strokeDasharray={`${(ringC * sessionInWeek) / Math.max(cycleLen, 1)} ${ringC}`}
                        transform="rotate(-90 22 22)"
                      />
                    )}
                    <text x="22" y="26.5" textAnchor="middle">W{w}</text>
                  </svg>
                );
              }
              return (
                <span key={w} className={`road-node ${isDone ? "done" : ""}`} style={{ left: `${nodePct(w)}%` }} aria-hidden="true">
                  {isDone ? "✓" : ""}
                </span>
              );
            })}
          </div>
          <div className="road-ends">
            <span>W1</span>
            <span>W{weeks} 完成</span>
          </div>
          {!finished && (
            <div className="road-caret-row">
              <span className="road-caret" style={{ left: `${nodePct(currentWeek)}%` }} />
            </div>
          )}
        </>
      )}

      <div className="days-panel">
        <div className="days-head">
          <span>
            最近 7 天 · 練 <b>{trainedDays}</b> 天
          </span>
          {cycleLen > 0 && (
            <span>
              本週 <b className="num-display accent">{sessionInWeek}/{cycleLen}</b> 課
            </span>
          )}
        </div>
        <div className="days">
          {days.map((d) => {
            const trained = d.logs.length > 0;
            const name = trained ? d.logs[0].workout + (d.logs.length > 1 ? ` +${d.logs.length - 1}` : "") : "";
            return (
              <div key={d.ts} className="day">
                <div
                  className={`day-cell ${trained ? `lv${d.level}` : ""} ${d.isToday && !trained ? "today" : ""}`}
                  title={trained ? `${name}${d.level ? ` · 強度${LEVEL_LABEL[d.level]}` : ""}` : undefined}
                >
                  {trained ? (
                    <>
                      <span className="day-name">{name}</span>
                      {d.level > 0 && (
                        <span className="pips" aria-label={`強度${LEVEL_LABEL[d.level]}`}>
                          {[1, 2, 3].map((p) => (
                            <i key={p} className={p <= d.level ? "on" : ""} />
                          ))}
                        </span>
                      )}
                    </>
                  ) : d.isToday ? (
                    <>
                      <small>今天</small>
                      <span className="day-name">{nextWorkout}</span>
                    </>
                  ) : (
                    "休"
                  )}
                </div>
                <div className={`day-date ${d.isToday ? "accent" : ""}`}>{d.isToday ? "今天" : d.label}</div>
              </div>
            );
          })}
        </div>
        <div className="days-foot">
          <span className="legend">
            強度
            <i className="lv1" />低
            <i className="lv2" />中
            <i className="lv3" />高
          </span>
          {etaText && <span title="依最近 14 天的訓練節奏推估">{etaText}</span>}
        </div>
      </div>
    </div>
  );
}
