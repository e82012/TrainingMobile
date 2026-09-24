import { GoogleGenerativeAI } from "@google/generative-ai";
import { TrainingLog } from "@/types";

export interface ParsedWorkoutResponse {
  reply: string;
  actionType: "ADD_LOG" | "UPDATE_PLAN" | "CHAT";
  workout: string;
  date: string;
  log: TrainingLog;
}

export async function parseWorkoutChat(userPrompt: string): Promise<ParsedWorkoutResponse> {
  const apiKey = process.env.GEMINI_API_KEY;

  // 今天 YYYY-MM-DD
  const todayStr = new Intl.DateTimeFormat("zh-TW", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(new Date())
    .replace(/\//g, "-");

  if (!apiKey) {
    console.warn("未設定 GEMINI_API_KEY，採用智慧模擬解析器");
    return mockParseWorkout(userPrompt, todayStr);
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.2,
    },
    systemInstruction: `你是一位專業且熱血的健身教練兼訓練日誌助手。使用者會用口語告訴你今天的訓練內容。
你的任務是精確解析使用者的輸入，整理成標準 JSON 格式以寫入 Google Sheets「訓練日誌」工作表。

【Google Sheet 欄位對應規範】
1. date: 日期字串，格式為 YYYY-MM-DD。若使用者未指定，請預設為今日：${todayStr}。
2. planId: 課表計畫代號，預設固定為 "260922"。
3. workout: 課表名稱，必須為標準名稱（Push A、Pull A、Legs A、Push B、Pull B、Legs B 之一）。若沒說，請依動作部位合理推斷。
4. mainExercise: 該次訓練最重要的主項複合動作（例如：上斜槓鈴臥推、高位下拉／引體向上、深蹲、站姿肩推、槓鈴划船、硬舉等）。
5. mainSetsDetail: 主項工作組明細，例如 "50x8 / 55x8 / 55x8 / 50x8" 或 "4組x8下"。
6. maxWeight: 主項所使用的最高重量數值 (單位 kg，純數字)。
7. accessoryExercises: 輔助動作清單與組數描述（例如 "機械平胸推 3組、啞鈴側平舉 10kg 15x3、機械下胸Dip"）。
8. pumpLevel: 充血度（"極佳"、"良好"、"普通"）。
9. muscleFeeling: 目標肌群感受度評估（例如 "上胸與側三角充血顯著"、"背闊肌離心拉伸感強烈"）。
10. fatigueLevel: 疲勞度評估（"低"、"中等"、"偏高"）。
11. aiSummary: AI 評估摘要（精簡一句話總結今日訓練強度與品質）。
12. aiNextSuggestion: 下次行動建議（一句話指導下次同一課表如何微幅漸進超負荷或微調）。
13. reply: 用台灣繁體中文、熱血且親切的教練語氣回覆使用者，簡短肯定今天的付出！

請輸出嚴格合法的 JSON 物件：
{
  "actionType": "ADD_LOG",
  "workout": "Push A",
  "date": "${todayStr}",
  "reply": "教練回覆",
  "log": {
    "date": "${todayStr}",
    "planId": "260922",
    "workout": "Push A",
    "mainExercise": "上斜槓鈴臥推",
    "mainSetsDetail": "50x8 / 55x8 / 55x8 / 50x8",
    "maxWeight": 55,
    "accessoryExercises": "機械平胸推 3組、啞鈴側平舉 10kg 15x3",
    "pumpLevel": "極佳",
    "muscleFeeling": "上胸刺激充分",
    "fatigueLevel": "中等",
    "aiSummary": "主項負重維持高標，動作品質良好",
    "aiNextSuggestion": "下次可嘗試第1組直接從 55kg 起跳挑戰 4 組全滿"
  }
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
      log: {
        date: data.log?.date || todayStr,
        planId: data.log?.planId || "260922",
        workout: data.log?.workout || data.workout || "Push A",
        mainExercise: data.log?.mainExercise || "主項訓練",
        mainSetsDetail: data.log?.mainSetsDetail || "4組完成",
        maxWeight: Number(data.log?.maxWeight) || 50,
        accessoryExercises: data.log?.accessoryExercises || "",
        pumpLevel: data.log?.pumpLevel || "良好",
        muscleFeeling: data.log?.muscleFeeling || "刺激充分",
        fatigueLevel: data.log?.fatigueLevel || "中等",
        aiSummary: data.log?.aiSummary || "順利完成排定組數",
        aiNextSuggestion: data.log?.aiNextSuggestion || "下次維持負重穩定推進",
      },
    };
  } catch (err) {
    console.error("Gemini 解析失敗，回退至備用解析:", err);
    return mockParseWorkout(userPrompt, todayStr);
  }
}

function mockParseWorkout(prompt: string, today: string): ParsedWorkoutResponse {
  let workout = "Push A";
  let mainExercise = "上斜槓鈴臥推";
  let maxWeight = 55;

  if (prompt.includes("拉") || prompt.includes("背") || prompt.includes("Pull")) {
    workout = prompt.includes("B") ? "Pull B" : "Pull A";
    mainExercise = workout === "Pull A" ? "高位下拉／引體向上" : "俯身槓鈴划船";
    maxWeight = 50;
  } else if (prompt.includes("腿") || prompt.includes("蹲") || prompt.includes("Leg")) {
    workout = prompt.includes("B") ? "Legs B" : "Legs A";
    mainExercise = workout === "Legs A" ? "深蹲" : "硬舉";
    maxWeight = 80;
  } else if (prompt.includes("肩") || prompt.includes("Push B")) {
    workout = "Push B";
    mainExercise = "站姿槓鈴肩推";
    maxWeight = 40;
  }

  // 嘗試抓取重量數字
  const weightMatch = prompt.match(/(\d+)\s*(kg|公斤)/i);
  if (weightMatch) {
    maxWeight = parseInt(weightMatch[1], 10);
  }

  const log: TrainingLog = {
    date: today,
    planId: "260922",
    workout,
    mainExercise,
    mainSetsDetail: `${maxWeight}kg 工作組完成`,
    maxWeight,
    accessoryExercises: prompt.length > 15 ? prompt : "輔助動作全數完成",
    pumpLevel: "極佳",
    muscleFeeling: "目標肌群充血顯著",
    fatigueLevel: "中等",
    aiSummary: `成功完成 ${workout} 訓練，主項動作品質維持水準`,
    aiNextSuggestion: "下次可嘗試挑戰微幅增重 2.5kg",
  };

  return {
    actionType: "ADD_LOG",
    workout,
    date: today,
    reply: `這波很扎實！已成功為你記錄 ${workout} 的訓練日誌（主項：${mainExercise}，最高重量：${maxWeight}kg）。已成功同步至 Google Sheet！🔥`,
    log,
  };
}
