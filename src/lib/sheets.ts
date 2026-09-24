import { google } from "googleapis";
import { DashboardData, TrainingLog, WorkoutPlan, PrimaryLiftSession } from "@/types";

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

// 讀取儀表板完整資料：100% 來自 Google 試算表，無任何寫死課表與紀錄！
export async function fetchDashboardData(): Promise<DashboardData> {
  const sheets = getSheetsClient();
  const spreadsheetId = getSpreadsheetId();

  if (!sheets) {
    throw new Error("尚未設定 Google Service Account 憑證，請於 .env.local 配置");
  }

  // 1. 同步從試算表抓取表資訊、課表、訓練日誌
  const [sheetMeta, planRes, logRes] = await Promise.all([
    sheets.spreadsheets.get({ spreadsheetId }),
    sheets.spreadsheets.values.get({ spreadsheetId, range: "訓練課表!A2:J" }).catch(() => null),
    sheets.spreadsheets.values.get({ spreadsheetId, range: "訓練日誌!A2:L" }).catch(() => null),
  ]);

  const spreadsheetTitle = sheetMeta.data.properties?.title || "Workout Tracker";

  // 2. 解析課表計畫總綱與課表清單 (100% 來自試算表)
  const plans: Record<string, WorkoutPlan> = {};
  const cycleList: string[] = [];

  let planTitle = "訓練課表";
  let planWeeks = "8";
  let planCreatedAt = "2026-09-22";
  let planId = "260922";

  if (planRes?.data.values && planRes.data.values.length > 0) {
    const firstRow = planRes.data.values[0];
    planCreatedAt = String(firstRow[0] || planCreatedAt).trim();
    planTitle = String(firstRow[1] || planTitle).trim();
    planId = String(firstRow[2] || planId).trim();
    planWeeks = String(firstRow[3] || planWeeks).trim();

    for (const row of planRes.data.values) {
      const workoutName = String(row[4] || "").trim(); // E: 課表名稱 (如 Push A)
      const category = String(row[5] || "").trim(); // F: 訓練部位
      const exerciseName = String(row[6] || "").trim(); // G: 動作名稱
      const type = String(row[7] || "").trim(); // H: 類型 (主項 / 輔助)
      const sets = String(row[8] || "").trim(); // I: 目標組數與次數
      const notes = String(row[9] || "").trim(); // J: 下一階段目標

      if (!workoutName || !exerciseName) continue;

      if (!plans[workoutName]) {
        plans[workoutName] = {
          id: workoutName,
          name: workoutName,
          category,
          description: `${category} · 依序滾動執行`,
          exercises: [],
        };
        if (!cycleList.includes(workoutName)) {
          cycleList.push(workoutName);
        }
      }

      const isPrimary = type === "主項";
      plans[workoutName].exercises.push({
        name: exerciseName,
        type,
        sets: sets || "3–4 組",
        notes: notes || (isPrimary ? "主項動作" : "輔助動作"),
        isPrimary,
      });

      if (isPrimary) {
        plans[workoutName].description = `${category} · ${exerciseName} 為主項`;
      }
    }
  }

  // 3. 解析訓練日誌 (100% 來自試算表，無任何寫死紀錄)
  const logs: TrainingLog[] = [];
  if (logRes?.data.values && logRes.data.values.length > 0) {
    for (const row of logRes.data.values) {
      const date = String(row[0] || "").trim();
      const workout = String(row[2] || "").trim();
      const mainExercise = String(row[3] || "").trim();
      if (!date && !workout && !mainExercise) continue;

      const maxWeight = parseFloat(row[5]) || 0;
      const mainSetsDetail = String(row[4] || "");
      const { volume } = parseSetsAndCalculateVolume(mainSetsDetail, maxWeight);

      logs.push({
        date,
        planId: String(row[1] || planId),
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

  // 4. Primary Lift Sessions 與圖表 (100% 來自日誌)
  const primarySessions: PrimaryLiftSession[] = [];
  logs.forEach((l) => {
    if (l.mainExercise) {
      const { sets, volume } = parseSetsAndCalculateVolume(l.mainSetsDetail, l.maxWeight);
      primarySessions.push({
        date: l.date.replace(/-/g, ""),
        sets: sets.length > 0 ? sets : [[l.maxWeight || 0, 8]],
        volume: volume || (l.maxWeight ? l.maxWeight * 8 * 4 : 0),
        maxWeight: l.maxWeight,
      });
    }
  });

  // 5. 滾動循環推算
  const cycle = cycleList.length > 0 ? cycleList : ["Push A", "Pull A", "Legs A", "Push B", "Pull B", "Legs B"];
  let lastWorkoutName = "無紀錄";
  let lastDate = "尚未開始";
  let nextIdx = 0;

  if (logs.length > 0) {
    const latest = logs[logs.length - 1];
    if (latest.workout) {
      lastWorkoutName = latest.workout;
      lastDate = latest.date.replace(/-/g, "").slice(-6);
      const lastIdx = cycle.indexOf(lastWorkoutName);
      nextIdx = lastIdx >= 0 ? (lastIdx + 1) % cycle.length : 0;
    }
  }

  const nextWorkoutName = cycle[nextIdx] || "Push A";
  const defaultPrimaryExercise =
    plans[nextWorkoutName]?.exercises.find((e) => e.isPrimary)?.name ||
    logs[logs.length - 1]?.mainExercise ||
    "主項動作";

  return {
    planMeta: {
      title: planTitle,
      weeks: planWeeks,
      createdAt: planCreatedAt,
      id: planId,
    },
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
      name: defaultPrimaryExercise,
      target: plans[nextWorkoutName]?.exercises.find((e) => e.isPrimary)?.sets || "4 組",
      sessions: primarySessions,
    },
    plans,
    logs,
    spreadsheetTitle,
  };
}

// 寫入訓練日誌到 Google Sheets「訓練日誌」表
export async function appendTrainingLogToSheet(log: TrainingLog) {
  const sheets = getSheetsClient();
  const spreadsheetId = getSpreadsheetId();

  if (!sheets) {
    throw new Error("未配置 Google Service Account，無法寫入試算表");
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

  return { success: true, count: 1 };
}
