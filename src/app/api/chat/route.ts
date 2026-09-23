import { NextRequest, NextResponse } from "next/server";
import { parseWorkoutChat } from "@/lib/gemini";
import { appendTrainingLogsToSheet } from "@/lib/sheets";

export const dynamic = "force-dynamic";

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

    // 1. 呼叫 Gemini 解析對話與訓練內容
    const parsed = await parseWorkoutChat(message);

    let sheetResult = { success: true, count: 0, demo: true };

    // 2. 若為新增日誌，自動寫入 Google Sheets
    if (parsed.actionType === "ADD_LOG" && parsed.logs && parsed.logs.length > 0) {
      try {
        sheetResult = await appendTrainingLogsToSheet(parsed.logs);
      } catch (writeErr: any) {
        console.error("寫入 Google Sheets 失敗:", writeErr);
        return NextResponse.json({
          reply: `解析完成，但寫入 Google Sheet 時遭遇問題（${writeErr.message || "權限不足"}）。請確認 Service Account 已加入試算表共用名單！`,
          actionType: parsed.actionType,
          logs: parsed.logs,
          workout: parsed.workout,
          date: parsed.date,
          sheetSuccess: false,
          sheetError: writeErr.message,
        });
      }
    }

    return NextResponse.json({
      reply: parsed.reply,
      actionType: parsed.actionType,
      logs: parsed.logs,
      workout: parsed.workout,
      date: parsed.date,
      sheetSuccess: true,
      demo: sheetResult.demo,
    });
  } catch (error: any) {
    console.error("API /api/chat error:", error);
    return NextResponse.json(
      { error: "處理訊息時發生錯誤", message: error.message },
      { status: 500 }
    );
  }
}
