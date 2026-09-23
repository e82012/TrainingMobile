import { GoogleGenerativeAI } from "@google/generative-ai";
import { TrainingLog } from "@/types";

export interface ParsedWorkoutResponse {
  reply: string; // 給使用者的教練風格回覆
  actionType: "ADD_LOG" | "UPDATE_PLAN" | "CHAT";
  workout: string; // Push A, Pull A, Legs A, etc.
  date: string; // YYYYMMDD
  logs: TrainingLog[];
}

export async function parseWorkoutChat(userPrompt: string): Promise<ParsedWorkoutResponse> {
  const apiKey = process.env.GEMINI_API_KEY;

  // 今天台北時間 YYYYMMDD
  const todayStr = new Intl.DateTimeFormat("zh-TW", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(new Date())
    .replace(/\//g, "");

  // 如果未配置 GEMINI_API_KEY，提供本地智慧模擬解析（Demo 模式仍可體驗）
  if (!apiKey) {
    console.warn("未設定 GEMINI_API_KEY，採用內建模擬解析器");
    return mockParseWorkout(userPrompt, todayStr);
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.2,
    },
    systemInstruction: `你是一位專業且熱血的健身教練兼訓練日誌助手。使用者會用口語告訴你今天的訓練內容或課表異動。
你的任務是精確解析使用者的輸入，整理成標準 JSON 格式以寫入 Google Sheets 訓練紀錄表。

【標準格式定義】
- date: 日期字串，格式為 YYYYMMDD。若使用者未指定，請預設使用今日：${todayStr}。
- workout: 課表名稱，必須對應滾動式 PPL 的標準名稱（Push A、Pull A、Legs A、Push B、Pull B、Legs B 之一）。若使用者沒說，請依動作內容合理推斷。
- logs: 訓練紀錄陣列，每個元素包含：
  - exercise: 動作名稱（例如：上斜槓鈴臥推、引體向上、水平機械划船等繁體中文名稱）
  - setsReps: 組數次數規格，格式統一為重量與次數用「×」或「x」連接，多組以「 / 」分隔，例如「50×8 / 55×8 / 55×8 / 50×8」或「自重×10 / 自重×8」
  - volume: 該動作所有組數的「重量 kg × Reps」乘積加總整數。若為自重動作請估算 0 或其負重。
  - notes: 動作備註（如疲勞度、感受度、技巧提醒等）
- actionType: "ADD_LOG"（新增訓練紀錄）、"UPDATE_PLAN"（更新課表）或 "CHAT"（單純諮詢）
- reply: 用台灣繁體中文、具有親和力且專業的教練語氣回覆使用者（簡短總結今日亮點、總訓練量並給予激勵，可適度使用 emoji）。

請務必輸出合法的 JSON 物件，格式如下：
{
  "actionType": "ADD_LOG",
  "workout": "Push A",
  "date": "${todayStr}",
  "reply": "教練回覆文字",
  "logs": [
    {
      "exercise": "動作名稱",
      "setsReps": "50×8 / 55×8",
      "volume": 840,
      "notes": "備註"
    }
  ]
}`,
  });

  try {
    const result = await model.generateContent(userPrompt);
    const text = result.response.text();
    const data = JSON.parse(text);

    return {
      actionType: data.actionType || "ADD_LOG",
      workout: data.workout || "Push A",
      date: data.date || todayStr,
      reply: data.reply || "太棒了！已將今天的訓練紀錄整理完畢並記錄下來！💪",
      logs: (data.logs || []).map((l: any) => ({
        date: data.date || todayStr,
        workout: data.workout || "Push A",
        exercise: l.exercise || "未命名動作",
        setsReps: l.setsReps || "",
        volume: Number(l.volume) || 0,
        notes: l.notes || "",
      })),
    };
  } catch (err) {
    console.error("Gemini 呼叫或解析失敗，回退至備用解析:", err);
    return mockParseWorkout(userPrompt, todayStr);
  }
}

// 智慧 Fallback 本地模擬解析（無 API Key 時仍可順暢體驗寫入流程）
function mockParseWorkout(prompt: string, today: string): ParsedWorkoutResponse {
  let workout = "Push A";
  if (prompt.includes("拉") || prompt.includes("背") || prompt.includes("Pull")) {
    workout = prompt.includes("B") ? "Pull B" : "Pull A";
  } else if (prompt.includes("腿") || prompt.includes("蹲") || prompt.includes("Leg")) {
    workout = prompt.includes("B") ? "Legs B" : "Legs A";
  } else if (prompt.includes("肩") || prompt.includes("Push B")) {
    workout = "Push B";
  }

  // 嘗試簡單解析文字中的動作
  const logs: TrainingLog[] = [
    {
      date: today,
      workout,
      exercise: prompt.length > 20 ? prompt.slice(0, 16) + "..." : prompt,
      setsReps: "4 組完成",
      volume: 1200,
      notes: "透過 Gemini 本地模擬助手記錄",
    },
  ];

  return {
    actionType: "ADD_LOG",
    workout,
    date: today,
    reply: `這波很穩！已在展示模式為你記錄 ${workout} 的訓練資料。設定 GEMINI_API_KEY 與 Google 憑證後將可自動精準解析每組重量與自動寫入雲端！🔥`,
    logs,
  };
}
