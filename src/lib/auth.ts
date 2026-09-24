// 入口密碼驗證：token = 日期 + HMAC(key=APP_PASSWORD, msg=日期)，只在「台北時間當日」有效。
// 使用 Web Crypto，middleware（Edge）與 API route 都能共用。

export const AUTH_COOKIE = "tm_auth";
export const AUTH_TIMEZONE = "Asia/Taipei";

// 伺服器（如 Vercel）多半跑 UTC，必須明確指定時區，否則會在台北早上 8 點才換日
export function getTaipeiDate(date: Date = new Date()): string {
  // en-CA 的日期格式即為 YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: AUTH_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

// 距離台北時間下一個午夜的秒數，作為 cookie 的有效期限
export function secondsUntilTaipeiMidnight(now: Date = new Date()): number {
  // 台北無日光節約時間，固定 UTC+8
  const taipeiMs = now.getTime() + 8 * 3600_000;
  const msIntoDay = taipeiMs % 86_400_000;
  return Math.max(1, Math.ceil((86_400_000 - msIntoDay) / 1000));
}

async function hmacHex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
  ]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
}

// 固定時間比對，避免從回應時間差推測出正確字元
export function safeEqual(a: string, b: string): boolean {
  let diff = a.length ^ b.length;
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}

export async function signToken(date: string, secret: string): Promise<string> {
  return `${date}.${await hmacHex(secret, date)}`;
}

// 以伺服器的「今天」重算簽章比對；cookie 裡自帶的日期不被信任，跨日即失效
export async function verifyToken(token: string | undefined, secret: string | undefined): Promise<boolean> {
  if (!token || !secret) return false;
  const expected = await signToken(getTaipeiDate(), secret);
  return safeEqual(token, expected);
}
