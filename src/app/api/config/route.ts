import { NextResponse } from "next/server";
import { getSpreadsheetId } from "@/lib/sheets";
import { getGeminiModelName } from "@/lib/gemini";

export const dynamic = "force-dynamic";

// 組態狀態：本 App 沒有登入機制，任何人都能呼叫此端點，
// 因此只回傳「是否已設定」，金鑰、私鑰、服務帳戶 email 的實際值一律不外流。
export async function GET() {
  const spreadsheetId = getSpreadsheetId();

  return NextResponse.json({
    googleCredentials: Boolean(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY),
    geminiKey: Boolean(process.env.GEMINI_API_KEY),
    geminiModel: getGeminiModelName(),
    sheetIdFromEnv: Boolean(process.env.GOOGLE_SHEET_ID),
    sheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
  });
}
