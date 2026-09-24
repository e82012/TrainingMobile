import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE, getTaipeiDate, safeEqual, secondsUntilTaipeiMidnight, signToken } from "@/lib/auth";

// 與 middleware 同樣跑在 Edge，確保兩邊用同一套 Web Crypto 與時區計算
export const runtime = "edge";

export async function POST(req: NextRequest) {
  const secret = process.env.APP_PASSWORD;
  if (!secret) {
    return NextResponse.json({ error: "伺服器尚未設定 APP_PASSWORD，暫時無法登入" }, { status: 503 });
  }

  let body: { password?: unknown; date?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "請求格式錯誤" }, { status: 400 });
  }

  const password = typeof body.password === "string" ? body.password : "";
  const clientDate = typeof body.date === "string" ? body.date : "";
  const today = getTaipeiDate();

  if (!safeEqual(password, secret)) {
    return NextResponse.json({ error: "密碼錯誤" }, { status: 401 });
  }

  // 前端帶來的日期必須等於伺服器的台北日期；token 一律用伺服器日期簽，不採信前端時間
  if (clientDate !== today) {
    return NextResponse.json(
      { error: `裝置日期（${clientDate || "未提供"}）與伺服器日期（${today}）不一致，請校正時間後再試` },
      { status: 400 }
    );
  }

  const res = NextResponse.json({ ok: true, validDate: today });
  res.cookies.set(AUTH_COOKIE, await signToken(today, secret), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: secondsUntilTaipeiMidnight(),
  });
  return res;
}
