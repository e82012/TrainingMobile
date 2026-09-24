// 試算表結構的單一定義：解析、寫入與組態頁都讀這份，避免欄位位置在各處各寫一份而對不起來。
// 本檔不依賴任何伺服器端套件，前端可直接 import。

export interface SheetColumn {
  col: string; // 欄位字母（A、B…）
  label: string;
  note?: string;
}

const colIndex = (col: string) => col.charCodeAt(0) - 65;

export const PLAN_SHEET = {
  name: "訓練課表",
  range: "訓練課表!A2:J",
  columns: {
    createdAt: { col: "A", label: "建立日期", note: "只讀第一列" },
    title: { col: "B", label: "計畫名稱", note: "只讀第一列" },
    planId: { col: "C", label: "計畫代碼", note: "只讀第一列" },
    weeks: { col: "D", label: "週期週數", note: "只讀第一列" },
    workoutName: { col: "E", label: "課表名稱", note: "如 Push A；出現順序即循環順序" },
    category: { col: "F", label: "訓練部位" },
    exerciseName: { col: "G", label: "動作名稱" },
    type: { col: "H", label: "類型", note: "填「主項」者為該課表的 Primary Lift" },
    sets: { col: "I", label: "目標組數與次數" },
    notes: { col: "J", label: "下一階段目標" },
  },
} as const;

export const LOG_SHEET = {
  name: "訓練日誌",
  range: "訓練日誌!A2:L",
  appendRange: "訓練日誌!A:L",
  columns: {
    date: { col: "A", label: "日期", note: "YYYY-MM-DD" },
    planId: { col: "B", label: "計畫代碼" },
    workout: { col: "C", label: "課表" },
    mainExercise: { col: "D", label: "主項動作" },
    mainSetsDetail: { col: "E", label: "工作組明細", note: "Volume 由此欄計算" },
    maxWeight: { col: "F", label: "最高重量 (kg)" },
    accessoryExercises: { col: "G", label: "輔助動作" },
    pumpLevel: { col: "H", label: "充血度" },
    muscleFeeling: { col: "I", label: "肌群感受" },
    fatigueLevel: { col: "J", label: "疲勞度" },
    aiSummary: { col: "K", label: "AI 評估摘要" },
    aiNextSuggestion: { col: "L", label: "下次行動建議" },
  },
} as const;

export type PlanColumnKey = keyof typeof PLAN_SHEET.columns;
export type LogColumnKey = keyof typeof LOG_SHEET.columns;

// 依欄位字母取出該列的儲存格字串
export function cell(row: unknown[], column: SheetColumn): string {
  return String(row[colIndex(column.col)] ?? "").trim();
}

// 依欄位字母順序排出所有欄位，用於寫入整列與組態頁顯示
export function orderedColumns<K extends string>(columns: Record<K, SheetColumn>): [K, SheetColumn][] {
  return (Object.entries(columns) as [K, SheetColumn][]).sort(
    (a, b) => colIndex(a[1].col) - colIndex(b[1].col)
  );
}
