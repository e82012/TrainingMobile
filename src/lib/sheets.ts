import { google } from "googleapis";
import { DashboardData, TrainingLog, WorkoutPlan, PrimaryLiftSession, WorkoutExercise } from "@/types";
import { PLAN_SHEET, LOG_SHEET, cell, orderedColumns } from "@/lib/sheetSchema";
import { parseWorkSets } from "@/lib/workoutInput";

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
  // 與寫入驗證共用同一套解析；下方「N組M下」的估算僅為相容既有的舊紀錄
  const sets: [number, number][] = parseWorkSets(detailStr);

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

// 讀取儀表板完整資料：100% 來自 Google 試算表
export async function fetchDashboardData(): Promise<DashboardData> {
  const sheets = getSheetsClient();
  const spreadsheetId = getSpreadsheetId();

  if (!sheets) {
    throw new Error("尚未設定 Google Service Account 憑證，請於 .env.local 配置");
  }

  // 1. 同步從試算表抓取表資訊、課表、訓練日誌
  const [sheetMeta, planRes, logRes] = await Promise.all([
    sheets.spreadsheets.get({ spreadsheetId }),
    sheets.spreadsheets.values.get({ spreadsheetId, range: PLAN_SHEET.range }).catch(() => null),
    sheets.spreadsheets.values.get({ spreadsheetId, range: LOG_SHEET.range }).catch(() => null),
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
    const P = PLAN_SHEET.columns;
    const firstRow = planRes.data.values[0];
    planCreatedAt = cell(firstRow, P.createdAt) || planCreatedAt;
    planTitle = cell(firstRow, P.title) || planTitle;
    planId = cell(firstRow, P.planId) || planId;
    planWeeks = cell(firstRow, P.weeks) || planWeeks;

    for (const row of planRes.data.values) {
      const workoutName = cell(row, P.workoutName);
      const category = cell(row, P.category);
      const exerciseName = cell(row, P.exerciseName);
      const type = cell(row, P.type);
      const sets = cell(row, P.sets);
      const notes = cell(row, P.notes);

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
      const exerciseObj: WorkoutExercise = {
        name: exerciseName,
        type,
        sets: sets || "3–4 組",
        notes: notes || (isPrimary ? "主項動作" : "輔助動作"),
        isPrimary,
      };

      plans[workoutName].exercises.push(exerciseObj);

      // 動態設定該課表的主項動作 (Primary Lift)
      if (isPrimary && !plans[workoutName].primaryExercise) {
        plans[workoutName].primaryExercise = exerciseObj;
        plans[workoutName].description = `${category} · ${exerciseName} 為主項`;
      }
    }
  }

  // 若某課表沒特別標記主項，預設取第一個動作
  Object.values(plans).forEach((p) => {
    if (!p.primaryExercise && p.exercises.length > 0) {
      p.primaryExercise = p.exercises[0];
    }
  });

  // 3. 解析訓練日誌 (100% 來自試算表)
  const logs: TrainingLog[] = [];
  if (logRes?.data.values && logRes.data.values.length > 0) {
    const L = LOG_SHEET.columns;
    for (const row of logRes.data.values) {
      const date = cell(row, L.date);
      const workout = cell(row, L.workout);
      const mainExercise = cell(row, L.mainExercise);
      if (!date && !workout && !mainExercise) continue;

      const maxWeight = parseFloat(cell(row, L.maxWeight)) || 0;
      const mainSetsDetail = cell(row, L.mainSetsDetail);
      const { volume } = parseSetsAndCalculateVolume(mainSetsDetail, maxWeight);

      logs.push({
        date,
        planId: cell(row, L.planId) || planId,
        workout,
        mainExercise,
        mainSetsDetail,
        maxWeight,
        accessoryExercises: cell(row, L.accessoryExercises),
        pumpLevel: cell(row, L.pumpLevel),
        muscleFeeling: cell(row, L.muscleFeeling),
        fatigueLevel: cell(row, L.fatigueLevel),
        aiSummary: cell(row, L.aiSummary),
        aiNextSuggestion: cell(row, L.aiNextSuggestion),
        volume,
      });
    }
  }

  // 4. 滾動循環推算
  const cycle = cycleList.length > 0 ? cycleList : Object.keys(plans);
  let lastWorkoutName = "無紀錄";
  let lastDate = "尚未開始";
  let nextIdx = 0;

  if (logs.length > 0) {
    const latest = logs[logs.length - 1];
    if (latest.workout) {
      lastWorkoutName = latest.workout;
      // YYYY-MM-DD 顯示成 MM/DD；非標準格式就原樣呈現
      const ymd = latest.date.match(/^\d{4}-(\d{2})-(\d{2})$/);
      lastDate = ymd ? `${ymd[1]}/${ymd[2]}` : latest.date;
      const lastIdx = cycle.indexOf(lastWorkoutName);
      nextIdx = lastIdx >= 0 ? (lastIdx + 1) % cycle.length : 0;
    }
  }

  const nextWorkoutName = cycle[nextIdx] || Object.keys(plans)[0] || "Push A";

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
    plans,
    logs,
    spreadsheetTitle,
  };
}

// 寫入訓練日誌到 Google Sheets
export async function appendTrainingLogToSheet(log: TrainingLog) {
  const sheets = getSheetsClient();
  const spreadsheetId = getSpreadsheetId();

  if (!sheets) {
    throw new Error("未配置 Google Service Account，無法寫入試算表");
  }

  // 依 schema 的欄位字母順序排出整列，欄位調整時只需改 sheetSchema.ts
  const values: Record<keyof typeof LOG_SHEET.columns, string | number> = {
    date: log.date,
    planId: log.planId || "260922",
    workout: log.workout,
    mainExercise: log.mainExercise,
    mainSetsDetail: log.mainSetsDetail,
    maxWeight: log.maxWeight || 0,
    accessoryExercises: log.accessoryExercises || "",
    pumpLevel: log.pumpLevel || "",
    muscleFeeling: log.muscleFeeling || "",
    fatigueLevel: log.fatigueLevel || "",
    aiSummary: log.aiSummary || "",
    aiNextSuggestion: log.aiNextSuggestion || "",
  };
  const rowValues = orderedColumns(LOG_SHEET.columns).map(([key]) => values[key]);

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: LOG_SHEET.appendRange,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [rowValues],
    },
  });

  return { success: true, count: 1 };
}
