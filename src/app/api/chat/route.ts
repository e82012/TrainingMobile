import { NextRequest, NextResponse } from "next/server";
import { parseWorkoutChat } from "@/lib/gemini";
import { appendTrainingLogToSheet } from "@/lib/sheets";

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
    if (parsed.actionType === "ADD_LOG" && parsed.log) {
      try {
        sheetResult = await appendTrainingLogToSheet(parsed.log);
      } catch (writeErr: any) {
        console.error("寫入 Google Sheets 失敗:", writeErr);
        return NextResponse.json({
          reply: `解析完成，但寫入 Google Sheet 遭遇問題：${writeErr.message || "權限不足"}。請確認 Service Account 具備試算表編輯權限！`,
          actionType: parsed.actionType,
          log: parsed.log,
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
      log: parsed.log,
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
