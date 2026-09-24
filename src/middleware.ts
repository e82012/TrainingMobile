import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE, verifyToken } from "@/lib/auth";

// 所有頁面與 API 都要先通過入口密碼；未設定 APP_PASSWORD 時 verifyToken 一律回 false（fail-closed）
export async function middleware(req: NextRequest) {
  const ok = await verifyToken(req.cookies.get(AUTH_COOKIE)?.value, process.env.APP_PASSWORD);
  if (ok) return NextResponse.next();

  if (req.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "未登入或登入已過期", message: "請重新輸入入口密碼" }, { status: 401 });
  }

  const loginUrl = new URL("/login", req.url);
  const res = NextResponse.redirect(loginUrl);
  // 清掉過期或無效的 cookie，避免帶著舊 token 反覆被擋
  res.cookies.delete(AUTH_COOKIE);
  return res;
}

export const config = {
  // 放行登入頁、登入 API 與 Next.js 靜態資源
  matcher: ["/((?!login|api/login|_next/static|_next/image|favicon.ico).*)"],
};
