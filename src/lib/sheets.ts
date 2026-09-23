import { google } from "googleapis";
import { DashboardData, TrainingLog, WorkoutPlan, PrimaryLiftSession } from "@/types";

// 原版模板的預設基準課表（作為 Fallback 或初始化範本）
export const DEFAULT_PLANS: Record<string, WorkoutPlan> = {
  "Push A": {
    id: "Push A",
    name: "Push A · 胸部主導",
    description: "胸部主導 · 上斜臥推為 Primary Lift",
    exercises: [
      { name: "上斜槓鈴臥推", sets: "4 × 6–8", notes: "RIR 1–2 · 主項，重視離心控制與上胸張力", isPrimary: true },
      { name: "平椅啞鈴臥推", sets: "3 × 8–10", notes: "RIR 1–2 · 底部充分拉伸，向心頂峰收縮" },
      { name: "機械雙槓臂屈伸", sets: "3 × 8–12", notes: "RIR 1–2 · 軀幹微前傾聚焦下胸與三頭" },
      { name: "啞鈴側平舉", sets: "4 × 12–15", notes: "RIR 1–2 · 手肘引導，頂峰微停頓" },
      { name: "繩索三頭下壓", sets: "3 × 10–12", notes: "RIR 0–1 · 大臂夾緊身體，充分伸展" },
    ],
  },
  "Pull A": {
    id: "Pull A",
    name: "Pull A · 背部主導",
    description: "背部主導 · 下一次訓練直接執行這張課表",
    exercises: [
      { name: "高位下拉／引體向上", sets: "4 × 6–10", notes: "RIR 1–2 · 想像手肘往身體兩側／髖部方向移動，避免大幅後仰借力", isPrimary: true },
      { name: "水平機械划船", sets: "4 × 8–10", notes: "RIR 1–2 · 胸部固定，拉回時肩胛向後收" },
      { name: "機械下拉", sets: "3 × 8–12", notes: "RIR 1–2 · 第二個背闊肌刺激，控制離心" },
      { name: "單邊機械下拉", sets: "3 × 10–12", notes: "RIR 1–2 · 弱側先做，強側不要超過弱側 Reps" },
      { name: "後三角飛鳥", sets: "4 × 12–15", notes: "RIR 1–2 · 不需要很重，專注後三角收縮" },
      { name: "二頭彎舉", sets: "3 × 8–12", notes: "RIR 1–2 · 手肘固定、下放完整，最後一組可接近力竭" },
    ],
  },
  "Legs A": {
    id: "Legs A",
    name: "Legs A · 腿部主導",
    description: "腿部主導 · 股四頭肌與小腿聚焦",
    exercises: [
      { name: "深蹲 / 史密斯深蹲", sets: "4 × 6–8", notes: "RIR 1–2 · 軀幹緊繃，下蹲至大腿與地面平行或更深", isPrimary: true },
      { name: "機械腿推機", sets: "3 × 10–12", notes: "RIR 1–2 · 腳掌中置，全行程推動" },
      { name: "機械腿屈伸", sets: "3 × 12–15", notes: "RIR 0–1 · 頂峰收縮維持 1 秒" },
      { name: "羅馬尼亞硬舉", sets: "3 × 8–10", notes: "RIR 1–2 · 髖鉸鏈主導，拉伸膕繩肌" },
      { name: "站姿提踵", sets: "4 × 15–20", notes: "RIR 0–1 · 底部徹底伸展，頂峰充分收縮" },
    ],
  },
  "Push B": {
    id: "Push B",
    name: "Push B · 肩部主導",
    description: "肩部主導 · 肩推與胸部輔助",
    exercises: [
      { name: "站姿槓鈴肩推 / 啞鈴肩推", sets: "4 × 6–8", notes: "RIR 1–2 · 核心收緊，垂直向上推舉", isPrimary: true },
      { name: "上斜啞鈴臥推", sets: "3 × 8–10", notes: "RIR 1–2 · 穩定節奏" },
      { name: "機械胸飛鳥", sets: "3 × 12–15", notes: "RIR 1 · 胸大肌最大張力伸展" },
      { name: "埃及側平舉 / 纜繩側平舉", sets: "4 × 12–15", notes: "RIR 0–1 · 持續恆張力" },
      { name: "過頂三頭臂屈伸", sets: "3 × 10–12", notes: "RIR 1 · 伸展三頭長頭" },
    ],
  },
  "Pull B": {
    id: "Pull B",
    name: "Pull B · 背厚度與上背",
    description: "上背與菱形肌主導 · 強化後側鏈",
    exercises: [
      { name: "俯身槓鈴划船", sets: "4 × 6–8", notes: "RIR 1–2 · 腹部收緊，拉向肚臍", isPrimary: true },
      { name: "寬握高位下拉", sets: "3 × 8–10", notes: "RIR 1–2 · 手肘向下收" },
      { name: "坐姿纜繩面拉", sets: "4 × 12–15", notes: "RIR 1 · 外旋動作，強化肩袖與後三角" },
      { name: "啞鈴鎚式彎舉", sets: "3 × 10–12", notes: "RIR 1 · 針對肱橈肌與肱肌" },
      { name: "斜板支撐蜘蛛彎舉", sets: "3 × 10–12", notes: "RIR 0–1 · 孤立二頭短頭" },
    ],
  },
  "Legs B": {
    id: "Legs B",
    name: "Legs B · 後側鏈主導",
    description: "臀部、膕繩肌主導 · 平衡下肢發展",
    exercises: [
      { name: "傳統硬舉 / 陷阱槓硬舉", sets: "3 × 5–6", notes: "RIR 2 · 建立後側力量基底", isPrimary: true },
      { name: "啞鈴保加利亞分腿蹲", sets: "3 × 8–10 (每腿)", notes: "RIR 1–2 · 單側平衡與臀大肌" },
      { name: "俯臥腿彎舉", sets: "4 × 10–12", notes: "RIR 0–1 · 離心 3 秒緩慢下放" },
      { name: "機械臀推", sets: "3 × 10–12", notes: "RIR 1 · 頂峰夾緊臀肌" },
      { name: "坐姿提踵", sets: "4 × 12–15", notes: "RIR 0–1 · 針對比目魚肌" },
    ],
  },
};

export const DEFAULT_LOGS: TrainingLog[] = [
  {
    date: "20260922",
    workout: "Push A",
    exercise: "上斜槓鈴臥推",
    setsReps: "50×8 / 55×8 / 55×8 / 50×8",
    volume: 1680,
    notes: "首日基準測試，4組狀態良好",
  },
  {
    date: "20260922",
    workout: "Push A",
    exercise: "平椅啞鈴臥推",
    setsReps: "24×10 / 26×10 / 26×8",
    volume: 1472,
    notes: "頂峰感受度極佳",
  },
  {
    date: "20260922",
    workout: "Push A",
    exercise: "啞鈴側平舉",
    setsReps: "10×15 / 10×15 / 10×12 / 10×12",
    volume: 540,
    notes: "側三角肌充血顯著",
  },
];

export const DEFAULT_SESSIONS: PrimaryLiftSession[] = [
  {
    date: "20260922",
    sets: [
      [50, 8],
      [55, 8],
      [55, 8],
      [50, 8],
    ],
    volume: 1680,
  },
];

// 取得 Google Sheets 授權客戶端
export function getSheetsClient() {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  let privateKey = process.env.GOOGLE_PRIVATE_KEY;

  if (!clientEmail || !privateKey) {
    return null;
  }

  // 處理 Vercel 或 .env 中私鑰換行字元
  if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
    privateKey = privateKey.slice(1, -1);
  }
  privateKey = privateKey.replace(/\\n/g, "\n");

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  return google.sheets({ version: "v4", auth });
}

// 取得試算表 ID
export function getSpreadsheetId(): string {
  return process.env.GOOGLE_SHEET_ID || "your_google_sheet_id_here";
}

// 讀取儀表板完整資料（支援 Google Sheets 讀取 + 容錯 Fallback）
export async function fetchDashboardData(): Promise<DashboardData> {
  const sheets = getSheetsClient();
  const spreadsheetId = getSpreadsheetId();

  // 若尚未設定 Google Service Account，回傳預設展示資料
  if (!sheets) {
    return {
      status: {
        lastWorkout: { date: "260922", workout: "Push A" },
        nextWorkout: { workout: "Pull A", subtitle: "背部主導 · 下一次訓練直接執行這張課表" },
        cycle: ["Push A", "Pull A", "Legs A", "Push B", "Pull B", "Legs B"],
        currentIndex: 1,
      },
      primaryLift: {
        name: "上斜槓鈴臥推",
        target: "4 × 6–8",
        sessions: DEFAULT_SESSIONS,
      },
      plans: DEFAULT_PLANS,
      logs: DEFAULT_LOGS,
      isDemoMode: true,
    };
  }

  try {
    // 嘗試從 Google Sheets 讀取 Training_Logs
    const logsRes = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "Training_Logs!A2:F",
    }).catch(() => null);

    let logs = DEFAULT_LOGS;
    if (logsRes?.data.values && logsRes.data.values.length > 0) {
      logs = logsRes.data.values.map((row) => ({
        date: String(row[0] || ""),
        workout: String(row[1] || ""),
        exercise: String(row[2] || ""),
        setsReps: String(row[3] || ""),
        volume: Number(row[4]) || 0,
        notes: String(row[5] || ""),
      }));
    }

    // 計算 Primary Lift（上斜槓鈴臥推） Sessions
    const primarySessions: PrimaryLiftSession[] = [];
    const primaryLogs = logs.filter((l) => l.exercise.includes("上斜") || l.exercise.includes("臥推"));
    
    // 依日期分組
    const dateMap = new Map<string, [number, number][]>();
    primaryLogs.forEach((log) => {
      // 解析 50x8 / 55x8
      const setMatches = log.setsReps.match(/(\d+)\s*[x×*]\s*(\d+)/g);
      if (setMatches) {
        const parsedSets = setMatches.map((m) => {
          const parts = m.split(/[x×*]/);
          return [parseInt(parts[0], 10), parseInt(parts[1], 10)] as [number, number];
        });
        const existing = dateMap.get(log.date) || [];
        dateMap.set(log.date, [...existing, ...parsedSets]);
      }
    });

    dateMap.forEach((sets, date) => {
      const volume = sets.reduce((sum, [kg, reps]) => sum + kg * reps, 0);
      primarySessions.push({ date, sets, volume });
    });

    if (primarySessions.length === 0) {
      primarySessions.push(...DEFAULT_SESSIONS);
    }

    // 動態判斷最新完成的課表與下一個課表
    const cycle = ["Push A", "Pull A", "Legs A", "Push B", "Pull B", "Legs B"];
    let lastWorkoutName = "Push A";
    let lastDate = "260922";
    if (logs.length > 0) {
      const latestLog = logs[logs.length - 1];
      if (latestLog.workout) {
        lastWorkoutName = latestLog.workout;
        lastDate = latestLog.date.slice(-6);
      }
    }

    const lastIdx = cycle.indexOf(lastWorkoutName);
    const nextIdx = lastIdx >= 0 ? (lastIdx + 1) % cycle.length : 1;
    const nextWorkoutName = cycle[nextIdx];

    return {
      status: {
        lastWorkout: { date: lastDate, workout: lastWorkoutName },
        nextWorkout: {
          workout: nextWorkoutName,
          subtitle: DEFAULT_PLANS[nextWorkoutName]?.description || "下一次訓練直接執行這張課表",
        },
        cycle,
        currentIndex: nextIdx,
      },
      primaryLift: {
        name: "上斜槓鈴臥推",
        target: "4 × 6–8",
        sessions: primarySessions,
      },
      plans: DEFAULT_PLANS,
      logs,
      isDemoMode: false,
    };
  } catch (err) {
    console.error("讀取 Google Sheet 失敗，切換至 Fallback 模式:", err);
    return {
      status: {
        lastWorkout: { date: "260922", workout: "Push A" },
        nextWorkout: { workout: "Pull A", subtitle: "背部主導 · 下一次訓練直接執行這張課表" },
        cycle: ["Push A", "Pull A", "Legs A", "Push B", "Pull B", "Legs B"],
        currentIndex: 1,
      },
      primaryLift: {
        name: "上斜槓鈴臥推",
        target: "4 × 6–8",
        sessions: DEFAULT_SESSIONS,
      },
      plans: DEFAULT_PLANS,
      logs: DEFAULT_LOGS,
      isDemoMode: true,
    };
  }
}

// 寫入訓練日誌到 Google Sheets
export async function appendTrainingLogsToSheet(logs: TrainingLog[]) {
  const sheets = getSheetsClient();
  const spreadsheetId = getSpreadsheetId();

  if (!sheets) {
    console.warn("尚未配置 Google Service Account，暫存於 Demo 模式");
    return { success: true, count: logs.length, demo: true };
  }

  // 準備寫入列格式：日期, 課表, 動作, 重量xReps, Volume, 備註
  const rows = logs.map((log) => [
    log.date,
    log.workout,
    log.exercise,
    log.setsReps,
    log.volume || 0,
    log.notes || "",
  ]);

  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: "Training_Logs!A:F",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: rows,
      },
    });
    return { success: true, count: rows.length, demo: false };
  } catch (error: any) {
    // 若 Training_Logs 工作表尚未建立，嘗試寫入第一個工作表 (Sheet1)
    if (error?.message?.includes("Unable to parse range")) {
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: "A:F",
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: rows,
        },
      });
      return { success: true, count: rows.length, demo: false };
    }
    throw error;
  }
}
