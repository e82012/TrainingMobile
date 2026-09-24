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

// 讀取儀表板完整資料（真實反映 Google 試算表現況，不盲目注入假資料）
export async function fetchDashboardData(): Promise<DashboardData> {
  const sheets = getSheetsClient();
  const spreadsheetId = getSpreadsheetId();

  if (!sheets) {
    // 只有在未設定金鑰時才回傳 Demo 假資料
    return {
      status: {
        lastWorkout: { date: "無紀錄", workout: "尚未開始" },
        nextWorkout: { workout: "Push A", subtitle: "胸、側三角、三頭 · 循環第一課" },
        cycle: ["Push A", "Pull A", "Legs A", "Push B", "Pull B", "Legs B"],
        currentIndex: 0,
      },
      primaryLift: {
        name: "上斜槓鈴臥推",
        target: "4 × 6–8",
        sessions: [],
      },
      plans: DEFAULT_PLANS,
      logs: [],
      isDemoMode: true,
    };
  }

  try {
    const [sheetMeta, planRes, logRes] = await Promise.all([
      sheets.spreadsheets.get({ spreadsheetId }),
      sheets.spreadsheets.values.get({ spreadsheetId, range: "訓練課表!A2:J" }).catch(() => null),
      sheets.spreadsheets.values.get({ spreadsheetId, range: "訓練日誌!A2:L" }).catch(() => null),
    ]);

    const title = sheetMeta.data.properties?.title || "Workout Tracker";

    // 1. 解析課表 (Workout Plans)
    let plans: Record<string, WorkoutPlan> = { ...DEFAULT_PLANS };
    if (planRes?.data.values && planRes.data.values.length > 0) {
      const dynamicPlans: Record<string, WorkoutPlan> = {};
      for (const row of planRes.data.values) {
        const workoutName = String(row[4] || "").trim(); // E: 課表名稱
        const category = String(row[5] || "").trim(); // F: 訓練部位
        const exerciseName = String(row[6] || "").trim(); // G: 動作名稱
        const type = String(row[7] || "").trim(); // H: 類型
        const sets = String(row[8] || "").trim(); // I: 目標組數
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

    // 2. 解析訓練日誌 (Training Logs) - 若使用者清空，logs 必須是真實的空陣列 []！
    const logs: TrainingLog[] = [];
    if (logRes?.data.values && logRes.data.values.length > 0) {
      for (const row of logRes.data.values) {
        const date = String(row[0] || "").trim();
        const workout = String(row[2] || "").trim();
        const mainExercise = String(row[3] || "").trim();
        if (!date && !workout && !mainExercise) continue; // 過濾全空列

        const maxWeight = parseFloat(row[5]) || 0;
        const mainSetsDetail = String(row[4] || "");
        const { volume } = parseSetsAndCalculateVolume(mainSetsDetail, maxWeight);

        logs.push({
          date,
          planId: String(row[1] || ""),
          workout,
          mainExercise,
          mainSetsDetail,
          maxWeight,
          accessoryExercises: String(row[6] || ""),
          pumpLevel: String(row[7] || ""),
          muscleFeeling: String(row[8] || ""),
          fatigueLevel: String(row[9] || ""),
          aiSummary: String(row[10] || ""),
          aiNextSuggestion: String(row[11] || ""),
          volume,
        });
      }
    }

    // 3. 計算 Primary Lift 進度數據 - 若日誌清空，sessions 就是空陣列！
    const primarySessions: PrimaryLiftSession[] = [];
    logs.forEach((l) => {
      if (l.mainExercise) {
        const { sets, volume } = parseSetsAndCalculateVolume(l.mainSetsDetail, l.maxWeight);
        primarySessions.push({
          date: l.date.replace(/-/g, ""),
          sets: sets.length > 0 ? sets : [[l.maxWeight || 50, 8]],
          volume: volume || (l.maxWeight ? l.maxWeight * 8 * 4 : 0),
          maxWeight: l.maxWeight,
        });
      }
    });

    // 4. 滾動循環判斷
    const cycle = ["Push A", "Pull A", "Legs A", "Push B", "Pull B", "Legs B"];
    let lastWorkoutName = "無紀錄";
    let lastDate = "尚未開始";
    let nextIdx = 0; // 若無紀錄，第一課是 Push A

    if (logs.length > 0) {
      const latest = logs[logs.length - 1];
      if (latest.workout) {
        lastWorkoutName = latest.workout;
        lastDate = latest.date.replace(/-/g, "").slice(-6);
        const lastIdx = cycle.indexOf(lastWorkoutName);
        nextIdx = lastIdx >= 0 ? (lastIdx + 1) % cycle.length : 0;
      }
    }

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
        name: logs.length > 0 ? logs[logs.length - 1].mainExercise : "上斜槓鈴臥推",
        target: "4 × 6–8",
        sessions: primarySessions,
      },
      plans,
      logs,
      isDemoMode: false,
      spreadsheetTitle: title,
    };
  } catch (err) {
    console.error("讀取 Google Sheet 發生錯誤:", err);
    return {
      status: {
        lastWorkout: { date: "無紀錄", workout: "尚未開始" },
        nextWorkout: { workout: "Push A", subtitle: "胸、側三角、三頭 · 循環第一課" },
        cycle: ["Push A", "Pull A", "Legs A", "Push B", "Pull B", "Legs B"],
        currentIndex: 0,
      },
      primaryLift: {
        name: "上斜槓鈴臥推",
        target: "4 × 6–8",
        sessions: [],
      },
      plans: DEFAULT_PLANS,
      logs: [],
      isDemoMode: true,
    };
  }
}

// 寫入訓練日誌到 Google Sheets（追加至「訓練日誌」表）
export async function appendTrainingLogToSheet(log: TrainingLog) {
  const sheets = getSheetsClient();
  const spreadsheetId = getSpreadsheetId();

  if (!sheets) {
    return { success: true, count: 1, demo: true };
  }

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
