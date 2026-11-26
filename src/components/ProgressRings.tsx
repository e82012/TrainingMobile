export interface ProgressRing {
  label: string;
  value: number; // 顯示的數字
  unit?: string; // 顯示在數字後的單位或分母，如「/ 8」「次」
  ratio: number; // 0～1，環的填滿比例
  color: string; // CSS 顏色，建議傳 CSS 變數
}

interface ProgressRingsProps {
  rings: ProgressRing[]; // 由外而內
}

const SIZE = 120;
const STROKE = 11;
const GAP = 3;

// 同心進度環；旁邊一律附數字與文字，不只靠顏色區分
export default function ProgressRings({ rings }: ProgressRingsProps) {
  const c = SIZE / 2;
  const summary = rings.map((r) => `${r.label} ${r.value}${r.unit ? ` ${r.unit}` : ""}`).join("、");

  return (
    <div className="rings">
      <svg width={104} height={104} viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label={summary}>
        {rings.map((r, i) => {
          const radius = c - STROKE / 2 - i * (STROKE + GAP);
          const circ = 2 * Math.PI * radius;
          const ratio = Math.min(Math.max(r.ratio, 0), 1);
          return (
            <g key={r.label}>
              <circle cx={c} cy={c} r={radius} fill="none" stroke={r.color} strokeOpacity={0.2} strokeWidth={STROKE} />
              {ratio > 0 && (
                <circle
                  cx={c}
                  cy={c}
                  r={radius}
                  fill="none"
                  stroke={r.color}
                  strokeWidth={STROKE}
                  strokeLinecap="round"
                  strokeDasharray={`${circ * ratio} ${circ}`}
                  transform={`rotate(-90 ${c} ${c})`}
                />
              )}
            </g>
          );
        })}
      </svg>
      <div className="ring-legend">
        {rings.map((r) => (
          <div key={r.label}>
            <i style={{ background: r.color }} aria-hidden="true" />
            <b className="num-display" style={{ color: r.color }}>
              {r.value}
              {r.unit && <small className="unit"> {r.unit}</small>}
            </b>
            <span>{r.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
