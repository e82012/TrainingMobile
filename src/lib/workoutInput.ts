// 訓練輸入的純邏輯：工作組明細解析、簡寫輸入對應課表、寫入前驗證。
// 規則依據 docs/sheet-writing-rules.md；本檔不依賴任何外部服務，方便單獨測試。
import type { TrainingLog, WorkoutPlan } from "../types";

export type WorkSet = [kg: number, reps: number];

// 嚴格解析「重量×次數」與「重量×次數×組數」，其他寫法一律不計入
export function parseWorkSets(detail: string): WorkSet[] {
  const sets: WorkSet[] = [];
  const pattern = /(\d+(?:\.\d+)?)\s*(?:kg|公斤)?\s*[x×*]\s*(\d+)(?:\s*[x×*]\s*(\d+))?/gi;
  let m: RegExpExecArray | null;
  while ((m = pattern.exec(detail)) !== null) {
    const kg = parseFloat(m[1]);
    const reps = parseInt(m[2], 10);
    const setCount = m[3] ? parseInt(m[3], 10) : 1;
    if (!isNaN(kg) && !isNaN(reps)) {
      for (let i = 0; i < setCount; i++) sets.push([kg, reps]);
    }
  }
  return sets;
}

// ─── 簡寫輸入 ────────────────────────────────────────────

export interface ShorthandEntry {
  index: number; // 對應課表第幾個動作（1 起算）
  exercise: string;
  isPrimary: boolean;
  kg: number;
  reps: number;
  sets: number;
  detail: string; // 例：50kg×8×4
}

export interface ShorthandResult {
  workout: string;
  entries: ShorthandEntry[];
  expandedText: string; // 已把簡寫行換成完整動作名稱，交給 Gemini 用
  errors: string[];
}

const WEIGHT = String.raw`(\d+(?:\.\d+)?)\s*(?:kg|公斤)?`;
const REPS_SETS = String.raw`(\d+)(?:\s*[x×*]\s*(\d+))?`;
// 「1. 50 8*4」「2.50 10*4」「3、22.5x8x4」：編號＋重量＋次數（＋組數）
const WITH_INDEX = new RegExp(String.raw`^\s*(\d{1,2})\s*[.、．)）:：]\s*${WEIGHT}\s*(?:[x×*]|\s)\s*${REPS_SETS}\s*$`, "i");
// 「50 8*4」「50*8*4」：沒有編號，依行序對應
const NO_INDEX = new RegExp(String.raw`^\s*${WEIGHT}\s*(?:[x×*]|\s)\s*${REPS_SETS}\s*$`, "i");

const normalizeName = (s: string) => s.replace(/\s+/g, "").toLowerCase();

// 訊息中若提到課表名稱就用該課表（取最長的吻合，避免「Push A」被「Push」吃掉），否則用下一課
export function resolveWorkout(message: string, planNames: string[], fallback: string): string {
  const text = normalizeName(message);
  const hits = planNames.filter((n) => text.includes(normalizeName(n)));
  return hits.sort((a, b) => b.length - a.length)[0] || fallback;
}

export function formatDetail(kg: number, reps: number, sets: number): string {
  return sets > 1 ? `${kg}kg×${reps}×${sets}` : `${kg}kg×${reps}`;
}

// 沒有簡寫行時回傳 null，交由 Gemini 照一般口語解析
export function resolveShorthand(
  message: string,
  plans: Record<string, WorkoutPlan>,
  nextWorkout: string
): ShorthandResult | null {
  const lines = message.split(/\r?\n/);
  const workout = resolveWorkout(message, Object.keys(plans), nextWorkout);
  const plan = plans[workout];
  const exercises = plan?.exercises || [];
  const primaryName = plan?.primaryExercise?.name;

  const entries: ShorthandEntry[] = [];
  const errors: string[] = [];
  const outLines: string[] = [];
  let order = 0;

  for (const line of lines) {
    let idx: number | null = null;
    let kg = NaN, reps = NaN, sets = 1;

    // 「2.50」可能是「第 2 項 50kg」或「2.5kg」：編號落在課表動作數內才採用編號解讀
    const wi = line.match(WITH_INDEX);
    if (wi && +wi[1] >= 1 && +wi[1] <= exercises.length) {
      idx = +wi[1];
      [kg, reps, sets] = [parseFloat(wi[2]), +wi[3], wi[4] ? +wi[4] : 1];
    } else {
      const ni = line.match(NO_INDEX);
      if (ni) {
        [kg, reps, sets] = [parseFloat(ni[1]), +ni[2], ni[3] ? +ni[3] : 1];
      } else if (wi) {
        // 有編號但超出課表動作數
        order++;
        errors.push(`第 ${wi[1]} 項超出 ${workout} 的動作數（共 ${exercises.length} 個）`);
        outLines.push(line);
        continue;
      }
    }

    if (isNaN(kg)) {
      outLines.push(line);
      continue;
    }

    order++;
    const index = idx ?? order;
    const ex = exercises[index - 1];
    if (!ex) {
      errors.push(`第 ${index} 行找不到對應動作：${workout} 只有 ${exercises.length} 個動作`);
      outLines.push(line);
      continue;
    }
    if (entries.some((e) => e.index === index)) {
      errors.push(`第 ${index} 項（${ex.name}）重複輸入`);
      continue;
    }

    const detail = formatDetail(kg, reps, sets);
    const isPrimary = ex.name === primaryName;
    entries.push({ index, exercise: ex.name, isPrimary, kg, reps, sets, detail });
    outLines.push(`【已對應課表】${index}. ${ex.name}${isPrimary ? "（主項）" : ""} ${detail}`);
  }

  if (entries.length === 0 && errors.length === 0) return null;

  if (!plan) errors.push(`找不到課表「${workout}」`);

  // 日誌的主項欄位為必填，簡寫若漏了主項，直接指出是第幾項比事後報「明細空白」清楚
  if (plan && entries.length > 0 && !entries.some((e) => e.isPrimary) && primaryName) {
    const primaryIndex = exercises.findIndex((ex) => ex.name === primaryName) + 1;
    errors.push(`缺少主項「${primaryName}」（第 ${primaryIndex} 項）的紀錄，日誌必須包含主項`);
  }

  return {
    workout,
    entries,
    expandedText: [`課表：${workout}`, ...outLines].join("\n"),
    errors,
  };
}

// 簡寫已確定的欄位由程式直接決定，覆蓋 Gemini 的輸出，避免模型改寫數字或名稱
export function applyShorthand(log: TrainingLog, sh: ShorthandResult, primaryName: string | undefined): TrainingLog {
  const primary = sh.entries.find((e) => e.isPrimary);
  const accessories = sh.entries.filter((e) => !e.isPrimary).sort((a, b) => a.index - b.index);
  return {
    ...log,
    workout: sh.workout,
    mainExercise: primary ? primary.exercise : primaryName || log.mainExercise,
    mainSetsDetail: primary ? primary.detail : log.mainSetsDetail,
    maxWeight: primary ? primary.kg : log.maxWeight,
    accessoryExercises: accessories.length
      ? accessories.map((e) => `${e.exercise} ${e.detail}`).join("、")
      : log.accessoryExercises,
  };
}

// ─── 寫入前驗證 ──────────────────────────────────────────

export interface ValidationContext {
  plans: Record<string, WorkoutPlan>;
  planId: string;
  lastLogDate?: string; // 目前最後一列日誌的日期
}

// 依規範檢查並正規化；有錯誤時不得寫入
export function validateLog(input: TrainingLog, ctx: ValidationContext): { log: TrainingLog; errors: string[] } {
  const errors: string[] = [];
  const trim = (v: unknown) => String(v ?? "").trim();
  const log: TrainingLog = {
    ...input,
    date: trim(input.date),
    planId: trim(input.planId) || ctx.planId,
    workout: trim(input.workout),
    mainExercise: trim(input.mainExercise),
    mainSetsDetail: trim(input.mainSetsDetail),
    accessoryExercises: trim(input.accessoryExercises),
  };

  if (!/^\d{4}-\d{2}-\d{2}$/.test(log.date)) {
    errors.push(`日期「${log.date || "空白"}」不是 YYYY-MM-DD 格式`);
  } else if (ctx.lastLogDate && /^\d{4}-\d{2}-\d{2}$/.test(ctx.lastLogDate) && log.date < ctx.lastLogDate) {
    errors.push(`日期 ${log.date} 早於最後一筆日誌（${ctx.lastLogDate}），日誌只能依時間順序往後新增`);
  }

  const plan = ctx.plans[log.workout];
  if (!plan) {
    errors.push(`課表「${log.workout || "空白"}」不在訓練課表中（可用：${Object.keys(ctx.plans).join("、")}）`);
  } else {
    const primary = plan.primaryExercise?.name;
    if (primary && log.mainExercise !== primary) {
      errors.push(`主項動作「${log.mainExercise || "空白"}」與 ${log.workout} 的主項「${primary}」不一致`);
    }
  }

  const sets = parseWorkSets(log.mainSetsDetail);
  if (sets.length === 0) {
    errors.push(`工作組明細「${log.mainSetsDetail || "空白"}」無法解析，請用「重量×次數」或「重量×次數×組數」`);
  } else {
    // 最高重量一律由明細推得，不採信另外填寫的數字
    log.maxWeight = Math.max(...sets.map(([kg]) => kg));
  }

  return { log, errors };
}
