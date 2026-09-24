import { GoogleGenerativeAI } from "@google/generative-ai";
import { TrainingLog, WorkoutPlan } from "@/types";
import { getTaipeiDate } from "@/lib/auth";

export interface ParsedWorkoutResponse {
  reply: string;
  actionType: "ADD_LOG" | "UPDATE_PLAN" | "CHAT";
  workout: string;
  date: string;
  log: TrainingLog;
}

// 解析時需要的試算表現況：課表名稱與主項必須從這裡取，不可由模型自行發明
export interface WorkoutChatContext {
  plans: Record<string, WorkoutPlan>;
  nextWorkout: string;
  planId: string;
  lastLogDate?: string;
}

// 實際呼叫與組態頁共用同一個來源，避免顯示的模型與實際使用的不一致
export function getGeminiModelName(): string {
  return process.env.GEMINI_MODEL || "gemini-2.5-flash";
}

function describePlans(plans: Record<string, WorkoutPlan>): string {
  return Object.values(plans)
    .map((p) => {
      const list = p.exercises.map((ex, i) => `${i + 1}. ${ex.name}${ex.isPrimary ? "（主項）" : ""}`).join("；");
      return `- ${p.name}｜主項：${p.primaryExercise?.name ?? "未設定"}｜動作順序：${list}`;
    })
    .join("\n");
}

// 規則對應 docs/sheet-writing-rules.md 第 3、4 節
function buildSystemInstruction(ctx: WorkoutChatContext, today: string): string {
  return `你是專業且熱血的健身教練兼訓練日誌助手。使用者會用口語或簡寫告訴你今天的訓練內容，你要解析成 JSON，供程式寫入 Google 試算表「訓練日誌」。

【目前課表】名稱必須逐字照抄，不可自行改寫、簡稱或翻譯：
${describePlans(ctx.plans)}
- 下一課：${ctx.nextWorkout}
- 課表計畫 id：${ctx.planId}
- 今天：${today}
- 最後一筆日誌日期：${ctx.lastLogDate || "無"}

【欄位規則】
1. log.date：YYYY-MM-DD。使用者沒說日期就用今天 ${today}；不可早於最後一筆日誌日期。
2. log.planId：固定為 "${ctx.planId}"。
3. log.workout：必須是【目前課表】中的名稱之一。使用者沒說課表時，依提到的動作判斷；仍無法判斷就用下一課「${ctx.nextWorkout}」。
4. log.mainExercise：必須等於該課表「主項」的名稱，逐字相同。
5. log.mainSetsDetail：只描述主項，格式為「重量×次數」或「重量×次數×組數」，重量在前、單位 kg，多組以「, 」分隔。例："50kg×8, 55kg×8, 55kg×8" 或 "23.5kg×8×4"。不可寫成「4組×8下」這類缺少重量的格式。
6. log.maxWeight：主項明細中的最大重量，純數字。
7. log.accessoryExercises：輔助動作，格式「動作名稱 重量×次數×組數」，多個以「、」分隔；動作名稱優先使用該課表中的名稱。
8. log.pumpLevel、log.muscleFeeling、log.fatigueLevel：使用者有提到才填簡短文字，沒提到就填空字串。
9. log.aiSummary：一句話總結今天的強度與品質。
10. log.aiNextSuggestion：一句話建議下次同一課表如何微幅漸進。
11. reply：台灣繁體中文、熱血親切的教練語氣，簡短肯定使用者的付出。

【簡寫】
- 以「【已對應課表】」開頭的行，已由程式把使用者的簡寫對應到課表動作，動作名稱與數字完全以該行為準，不可更改。
- 「重量 次數*組數」例如「50 8*4」代表 50kg、8 下、4 組。

【不確定時】
- 任何數字或名稱不確定，就填空字串，不可猜測或填預設值。
- 無法確定課表、主項重量或次數時，actionType 改為 "CHAT"，在 reply 中具體說明缺少什麼並請使用者補充。
- 使用者只是聊天或提問、不是回報訓練時，actionType 為 "CHAT"。

【輸出】嚴格合法的 JSON：
{
  "actionType": "ADD_LOG",
  "reply": "教練回覆",
  "log": {
    "date": "${today}",
    "planId": "${ctx.planId}",
    "workout": "課表名稱",
    "mainExercise": "該課表主項名稱",
    "mainSetsDetail": "50kg×8, 55kg×8, 55kg×8",
    "maxWeight": 55,
    "accessoryExercises": "動作名稱 50kg×10×4、動作名稱 15kg×12×3",
    "pumpLevel": "",
    "muscleFeeling": "",
    "fatigueLevel": "",
    "aiSummary": "一句話總結",
    "aiNextSuggestion": "一句話建議"
  }
}`;
}

export async function parseWorkoutChat(userPrompt: string, ctx: WorkoutChatContext): Promise<ParsedWorkoutResponse> {
  const apiKey = process.env.GEMINI_API_KEY;
  const today = getTaipeiDate();

  // 沒有 key 就直接擋下，不用規則模擬——模擬出來的資料會被當真寫進試算表
  if (!apiKey) {
    throw new Error("尚未設定 GEMINI_API_KEY，無法解析訓練內容（未寫入試算表）");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: getGeminiModelName(),
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.2,
    },
    systemInstruction: buildSystemInstruction(ctx, today),
  });

  let data: any;
  try {
    const result = await model.generateContent(userPrompt);
    data = JSON.parse(result.response.text());
  } catch (err: any) {
    console.error("Gemini 解析失敗:", err);
    throw new Error(`Gemini 解析失敗，未寫入試算表：${err?.message || "未知錯誤"}`);
  }

  const log = data.log || {};
  const str = (v: unknown) => String(v ?? "").trim();

  return {
    actionType: data.actionType === "ADD_LOG" ? "ADD_LOG" : "CHAT",
    workout: str(log.workout),
    date: str(log.date) || today,
    reply: str(data.reply),
    log: {
      date: str(log.date) || today,
      planId: str(log.planId) || ctx.planId,
      workout: str(log.workout),
      mainExercise: str(log.mainExercise),
      mainSetsDetail: str(log.mainSetsDetail),
      maxWeight: Number(log.maxWeight) || 0,
      accessoryExercises: str(log.accessoryExercises),
      pumpLevel: str(log.pumpLevel),
      muscleFeeling: str(log.muscleFeeling),
      fatigueLevel: str(log.fatigueLevel),
      aiSummary: str(log.aiSummary),
      aiNextSuggestion: str(log.aiNextSuggestion),
    },
  };
}
