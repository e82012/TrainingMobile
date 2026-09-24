import { NextRequest, NextResponse } from "next/server";
import { parseWorkoutChat } from "@/lib/gemini";
import { appendTrainingLogToSheet, fetchDashboardData } from "@/lib/sheets";
import { applyShorthand, resolveShorthand, validateLog } from "@/lib/workoutInput";

export const dynamic = "force-dynamic";

// 不寫入時的統一回覆：說明原因，前端不會顯示「已寫入」卡片
const notWritten = (reply: string) => NextResponse.json({ reply, actionType: "CHAT", sheetSuccess: false });

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "請提供對話訊息內容" },
        { status: 400 }
      );
    }

    // 1. 讀取試算表現況：課表名稱、主項與動作順序都以此為準
    const dashboard = await fetchDashboardData();
    const lastLogDate = dashboard.logs[dashboard.logs.length - 1]?.date;
    const ctx = {
      plans: dashboard.plans,
      nextWorkout: dashboard.status.nextWorkout.workout,
      planId: dashboard.planMeta.id,
      lastLogDate,
    };

    // 2. 簡寫輸入（如「1. 50 8*4」）先由程式對應到課表動作，對應不到就不送出
    const shorthand = resolveShorthand(message, dashboard.plans, ctx.nextWorkout);
    if (shorthand && shorthand.errors.length > 0) {
      return notWritten(`簡寫無法對應課表，這次先不寫入：\n・${shorthand.errors.join("\n・")}`);
    }

    // 3. 呼叫 Gemini 解析；簡寫時送出已展開完整動作名稱的版本
    const parsed = await parseWorkoutChat(shorthand ? shorthand.expandedText : message, ctx);
    if (parsed.actionType !== "ADD_LOG") {
      return notWritten(parsed.reply || "這段內容看起來不是訓練紀錄，所以沒有寫入。");
    }

    // 4. 簡寫已確定的欄位由程式覆蓋，再依規範驗證；任何一項不符就不寫入
    const draft = shorthand
      ? applyShorthand(parsed.log, shorthand, dashboard.plans[shorthand.workout]?.primaryExercise?.name)
      : parsed.log;
    const { log, errors } = validateLog(draft, ctx);
    if (errors.length > 0) {
      return notWritten(`內容不符合寫入規範，這次先不寫入：\n・${errors.join("\n・")}`);
    }

    // 5. 寫入 Google Sheets
    try {
      await appendTrainingLogToSheet(log);
    } catch (writeErr: any) {
      console.error("寫入 Google Sheets 失敗:", writeErr);
      return NextResponse.json({
        reply: `解析完成，但寫入 Google Sheet 遭遇問題：${writeErr.message || "權限不足"}。請確認 Service Account 具備試算表編輯權限！`,
        actionType: "ADD_LOG",
        log,
        workout: log.workout,
        date: log.date,
        sheetSuccess: false,
        sheetError: writeErr.message,
      });
    }

    return NextResponse.json({
      reply: parsed.reply,
      actionType: "ADD_LOG",
      log,
      workout: log.workout,
      date: log.date,
      sheetSuccess: true,
    });
  } catch (error: any) {
    console.error("API /api/chat error:", error);
    return NextResponse.json(
      { error: "處理訊息時發生錯誤", message: error.message },
      { status: 500 }
    );
  }
}
