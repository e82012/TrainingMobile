import { google } from "googleapis";
import { DashboardData, TrainingLog, WorkoutPlan, PrimaryLiftSession, WorkoutExercise } from "@/types";

export const DEFAULT_PLANS: Record<string, WorkoutPlan> = {
  "Push A": {
    id: "Push A",
    name: "Push A",
    category: "胸、側三角、三頭",
    description: "胸、側三角、三頭 · 上斜槓鈴臥推為 Primary Lift",
    exercises: [
      { name: "上斜槓鈴臥推", type: "主項", sets: "4 × 6–8", notes: "RIR 1–2 · 主項動作", isPrimary: true },
      { name: "機械平胸推", type: "輔助", sets: "3 × 8–10", notes: "控制離心" },
      { name: "機械下胸 Dip", type: "輔助", sets: "3 × 8–12", notes: "微前傾" },
      { name: "蝴蝶機夾胸", type: "輔助", sets: "3 × 12–15", notes: "頂峰收縮" },
      { name: "啞鈴側平舉", type: "輔助", sets: "4 × 12–15", notes: "手肘引導" },
      { name: "機械三頭下壓", type: "輔助", sets: "3 × 10–12", notes: "充分伸展" },
    ],
  },
  "Pull A": {
    id: "Pull A",
    name: "Pull A",
    category: "背部、二頭",
    description: "背部、二頭 · 高位下拉／引體向上為 Primary Lift",
    exercises: [
      { name: "高位下拉／引體向上", type: "主項", sets: "4 × 6–10", notes: "RIR 1–2", isPrimary: true },
      { name: "划船動作", type: "輔助", sets: "4 × 8–10", notes: "胸部固定，肩胛後收" },
      { name: "後三角動作", type: "輔助", sets: "4 × 12–15", notes: "專注收縮" },
      { name: "二頭彎舉", type: "輔助", sets: "3 × 8–12", notes: "手肘固定" },
    ],
  },
  "Legs A": {
    id: "Legs A",
    name: "Legs A",
    category: "腿部主導",
    description: "腿部主導 · 深蹲為 Primary Lift",
    exercises: [
      { name: "深蹲", type: "主項", sets: "4 × 6–8", notes: "深蹲至大腿平行", isPrimary: true },
      { name: "機械腿推機", type: "輔助", sets: "3 × 10–12", notes: "全行程推動" },
      { name: "腿屈伸", type: "輔助", sets: "3 × 12–15", notes: "頂峰停頓" },
    ],
  },
  "Push B": {
    id: "Push B",
    name: "Push B",
    category: "肩部主導",
    description: "肩部主導 · 肩推為 Primary Lift",
    exercises: [
      { name: "站姿肩推", type: "主項", sets: "4 × 6–8", notes: "核心收緊", isPrimary: true },
      { name: "上斜啞鈴臥推", type: "輔助", sets: "3 × 8–10", notes: "穩定節奏" },
      { name: "側平舉", type: "輔助", sets: "4 × 12–15", notes: "恆張力" },
    ],
  },
  "Pull B": {
    id: "Pull B",
    name: "Pull B",
    category: "背厚度",
    description: "背厚度 · 划船為 Primary Lift",
    exercises: [
      { name: "槓鈴划船", type: "主項", sets: "4 × 6–8", notes: "腹部收緊", isPrimary: true },
      { name: "面拉", type: "輔助", sets: "4 × 12–15", notes: "肩袖強化" },
    ],
  },
  "Legs B": {
    id: "Legs B",
    name: "Legs B",
    category: "後側鏈",
    description: "後側鏈 · 硬舉為 Primary Lift",
    exercises: [
      { name: "硬舉", type: "主項", sets: "3 × 5–6", notes: "後側發力", isPrimary: true },
      { name: "腿彎舉", type: "輔助", sets: "4 × 10–12", notes: "離心慢放" },
    ],
  },
};

export const DEFAULT_LOGS: TrainingLog[] = [
  {
    date: "2026-09-22",
    planId: "260922",
    workout: "Push A",
    mainExercise: "上斜槓鈴臥推",
    mainSetsDetail: "50×8 / 55×8 / 55×8 / 50×8",
    maxWeight: 55,
    accessoryExercises: "機械平胸推、啞鈴側平舉、機械三頭下壓",
    pumpLevel: "極佳",
    muscleFeeling: "上胸與側三角充血顯著",
    fatigueLevel: "中等",
    aiSummary: "基準日主項 4 組達成，動作穩定度佳",
    aiNextSuggestion: "下次可嘗試將第 1 組直接從 55kg 起跳",
    volume: 1680,
  },
];

export function getSheetsClient() {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  let privateKey = process.env.GOOGLE_PRIVATE_KEY;

  if (!clientEmail || !privateKey) {
    return null;
  }

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

export function getSpreadsheetId(): string {
  return process.env.GOOGLE_SHEET_ID || "your_google_sheet_id_here";
}

// 輔助函式：解析組數次數字串（如 "50x8 / 55x8 / 55x8 / 50x8" 或 "4組x8下"）
function parseSetsAndCalculateVolume(detailStr: string, maxKg: number): { sets: [number, number][]; volume: number } {
  const sets: [number, number][] = [];
  const matches = detailStr.match(/(\d+)\s*[x×*]\s*(\d+)/gi);

  if (matches) {
    for (const m of matches) {
      const parts = m.split(/[x×*]/i);
      const kg = parseInt(parts[0], 10);
      const reps = parseInt(parts[1], 10);
      if (!isNaN(kg) && !isNaN(reps)) {
        sets.push([kg, reps]);
      }
    }
  }

  // 若只有像 "4組x8下" 且給了 maxKg
  if (sets.length === 0 && detailStr.includes("組")) {
    const numSetsMatch = detailStr.match(/(\d+)\s*組/);
    const repsMatch = detailStr.match(/(\d+)\s*下/);
    const numSets = numSetsMatch ? parseInt(numSetsMatch[1], 10) : 4;
    const reps = repsMatch ? parseInt(repsMatch[1], 10) : 8;
    for (let i = 0; i < numSets; i++) {
      sets.push([maxKg || 50, reps]);
    }
  }

  const volume = sets.reduce((sum, [kg, reps]) => sum + kg * reps, 0);
  return { sets, volume };
}

// 讀取儀表板完整資料（直接連動使用者的 Google Sheet）
export async function fetchDashboardData(): Promise<DashboardData> {
  const sheets = getSheetsClient();
  const spreadsheetId = getSpreadsheetId();

  if (!sheets) {
    return {
      status: {
        lastWorkout: { date: "260922", workout: "Push A" },
        nextWorkout: { workout: "Pull A", subtitle: "背部、二頭 · 下一次訓練直接執行這張課表" },
        cycle: ["Push A", "Pull A", "Legs A", "Push B", "Pull B", "Legs B"],
        currentIndex: 1,
      },
      primaryLift: {
        name: "上斜槓鈴臥推",
        target: "4 × 6–8",
        sessions: [{ date: "2026-09-22", sets: [[50, 8], [55, 8], [55, 8], [50, 8]], volume: 1680, maxWeight: 55 }],
      },
      plans: DEFAULT_PLANS,
      logs: DEFAULT_LOGS,
      isDemoMode: true,
    };
  }

  try {
    // 1. 同時讀取「訓練課表」與「訓練日誌」
    const [sheetMeta, planRes, logRes] = await Promise.all([
      sheets.spreadsheets.get({ spreadsheetId }),
      sheets.spreadsheets.values.get({ spreadsheetId, range: "訓練課表!A2:J" }).catch(() => null),
      sheets.spreadsheets.values.get({ spreadsheetId, range: "訓練日誌!A2:L" }).catch(() => null),
    ]);

    const title = sheetMeta.data.properties?.title || "Workout Tracker";

    // 2. 解析課表 (Workout Plans)
    let plans: Record<string, WorkoutPlan> = { ...DEFAULT_PLANS };
    if (planRes?.data.values && planRes.data.values.length > 0) {
      const dynamicPlans: Record<string, WorkoutPlan> = {};
      for (const row of planRes.data.values) {
        const workoutName = String(row[4] || "").trim(); // E: 課表名稱
        const category = String(row[5] || "").trim(); // F: 訓練部位
        const exerciseName = String(row[6] || "").trim(); // G: 動作名稱
        const type = String(row[7] || "").trim(); // H: 類型 (主項 / 輔助)
        const sets = String(row[8] || "").trim(); // I: 目標組數與次數
        const notes = String(row[9] || "").trim(); // J: 下一階段目標

        if (!workoutName || !exerciseName) continue;

        if (!dynamicPlans[workoutName]) {
          dynamicPlans[workoutName] = {
            id: workoutName,
            name: workoutName,
            category,
            description: `${category} · ${type === "主項" ? exerciseName + " 為主項" : "滾動循環"}`,
            exercises: [],
          };
        }

        dynamicPlans[workoutName].exercises.push({
          name: exerciseName,
          type,
          sets: sets || "3 × 8–12",
          notes: notes || (type === "主項" ? "主項動作" : "輔助刺激"),
          isPrimary: type === "主項",
        });
      }

      if (Object.keys(dynamicPlans).length > 0) {
        plans = dynamicPlans;
      }
    }

    // 3. 解析訓練日誌 (Training Logs)
    let logs: TrainingLog[] = DEFAULT_LOGS;
    if (logRes?.data.values && logRes.data.values.length > 0) {
      logs = logRes.data.values.map((row) => {
        const maxWeight = parseFloat(row[5]) || 0;
        const mainSetsDetail = String(row[4] || "");
        const { volume } = parseSetsAndCalculateVolume(mainSetsDetail, maxWeight);

        return {
          date: String(row[0] || ""),
          planId: String(row[1] || ""),
          workout: String(row[2] || ""),
          mainExercise: String(row[3] || ""),
          mainSetsDetail,
          maxWeight,
          accessoryExercises: String(row[6] || ""),
          pumpLevel: String(row[7] || ""),
          muscleFeeling: String(row[8] || ""),
          fatigueLevel: String(row[9] || ""),
          aiSummary: String(row[10] || ""),
          aiNextSuggestion: String(row[11] || ""),
          volume,
        };
      });
    }

    // 4. 計算 Primary Lift 進度數據
    const primarySessions: PrimaryLiftSession[] = [];
    logs.forEach((l) => {
      if (l.mainExercise) {
        const { sets, volume } = parseSetsAndCalculateVolume(l.mainSetsDetail, l.maxWeight);
        primarySessions.push({
          date: l.date.replace(/-/g, ""),
          sets: sets.length > 0 ? sets : [[l.maxWeight || 50, 8]],
          volume: volume || (l.maxWeight ? l.maxWeight * 8 * 4 : 1600),
          maxWeight: l.maxWeight,
        });
      }
    });

    if (primarySessions.length === 0) {
      primarySessions.push({
        date: "20260922",
        sets: [[50, 8], [55, 8], [55, 8], [50, 8]],
        volume: 1680,
        maxWeight: 55,
      });
    }

    // 5. 滾動循環判斷
    const cycle = ["Push A", "Pull A", "Legs A", "Push B", "Pull B", "Legs B"];
    let lastWorkoutName = "Push A";
    let lastDate = "260922";
    if (logs.length > 0) {
      const latest = logs[logs.length - 1];
      if (latest.workout) {
        lastWorkoutName = latest.workout;
        lastDate = latest.date.replace(/-/g, "").slice(-6);
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
          subtitle: plans[nextWorkoutName]?.description || "下一次訓練直接執行這張課表",
        },
        cycle,
        currentIndex: nextIdx,
      },
      primaryLift: {
        name: logs[logs.length - 1]?.mainExercise || "上斜槓鈴臥推",
        target: "4 × 6–8",
        sessions: primarySessions,
      },
      plans,
      logs,
      isDemoMode: false,
      spreadsheetTitle: title,
    };
  } catch (err) {
    console.error("讀取 Google Sheet 發生錯誤，回退至備用:", err);
    return {
      status: {
        lastWorkout: { date: "260922", workout: "Push A" },
        nextWorkout: { workout: "Pull A", subtitle: "背部、二頭 · 下一次訓練直接執行這張課表" },
        cycle: ["Push A", "Pull A", "Legs A", "Push B", "Pull B", "Legs B"],
        currentIndex: 1,
      },
      primaryLift: {
        name: "上斜槓鈴臥推",
        target: "4 × 6–8",
        sessions: [{ date: "20260922", sets: [[50, 8], [55, 8], [55, 8], [50, 8]], volume: 1680, maxWeight: 55 }],
      },
      plans: DEFAULT_PLANS,
      logs: DEFAULT_LOGS,
      isDemoMode: true,
    };
  }
}

// 寫入訓練日誌到 Google Sheets（精確對齊 12 欄表頭）
export async function appendTrainingLogToSheet(log: TrainingLog) {
  const sheets = getSheetsClient();
  const spreadsheetId = getSpreadsheetId();

  if (!sheets) {
    console.warn("尚未配置 Google Service Account，暫存於 Demo 模式");
    return { success: true, count: 1, demo: true };
  }

  // 欄位依序：日期, 課表計畫id, 課表, 主項動作, 主項工作組明細, 最高重量(kg), 輔助動作, 充血度, 目標肌群感受, 疲勞度, AI評估摘要, 下次行動建議
  const rowValues = [
    log.date,
    log.planId || "260922",
    log.workout,
    log.mainExercise,
    log.mainSetsDetail,
    log.maxWeight || 0,
    log.accessoryExercises || "",
    log.pumpLevel || "佳",
    log.muscleFeeling || "良好",
    log.fatigueLevel || "中等",
    log.aiSummary || "",
    log.aiNextSuggestion || "",
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: "訓練日誌!A:L",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [rowValues],
    },
  });

  return { success: true, count: 1, demo: false };
}
