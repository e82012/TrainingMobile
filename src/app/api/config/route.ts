import { NextResponse } from "next/server";
import { getGeminiModelName } from "@/lib/gemini";

export const dynamic = "force-dynamic";

// 組態狀態：只回傳「是否已設定」，金鑰、私鑰、服務帳戶 email 的實際值一律不外流。
export async function GET() {
  const sheetId = process.env.GOOGLE_SHEET_ID?.trim();

  return NextResponse.json({
    googleCredentials: Boolean(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY),
    googleSheetId: Boolean(sheetId),
    geminiKey: Boolean(process.env.GEMINI_API_KEY),
    geminiModel: getGeminiModelName(),
    sheetUrl: sheetId ? `https://docs.google.com/spreadsheets/d/${sheetId}/edit` : null,
  });
}
