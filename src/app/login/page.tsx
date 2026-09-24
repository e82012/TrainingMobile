"use client";

import React, { useState } from "react";
import { Lock, LogIn, AlertCircle } from "lucide-react";
import { getTaipeiDate } from "@/lib/auth";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || loading) return;
    setLoading(true);
    setError(null);

    try {
      // 自動帶上當天（台北時間）日期，後端比對通過才發當日有效的 token
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, date: getTaipeiDate() }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "登入失敗");

      // 整頁導向，讓 middleware 以新 cookie 重新驗證
      window.location.replace("/");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "登入失敗");
      setPassword("");
      setLoading(false);
    }
  };

  return (
    // 固定蓋滿畫面，不受 body 為底部 tab bar 預留的留白影響
    <div className="fixed inset-0 overflow-y-auto flex items-center justify-center px-4 bg-[var(--bg)]">
      <form onSubmit={handleSubmit} className="card hero w-full max-w-sm !p-6">
        <div className="w-11 h-11 rounded-full bg-[var(--accent-bg)] border border-[var(--accent-line)] flex items-center justify-center text-[var(--accent)]">
          <Lock className="w-5 h-5" />
        </div>
        <div className="kicker mt-4">PPL Training</div>
        <h1 className="!text-[22px] !mt-1">輸入入口密碼</h1>
        <p className="text-xs text-[var(--muted)] mt-1.5 leading-relaxed">登入後當天有效，跨日需重新輸入。</p>

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
          autoComplete="current-password"
          placeholder="密碼"
          aria-label="入口密碼"
          disabled={loading}
          // 16px 以免 iOS Safari 聚焦時自動放大
          className="mt-5 w-full bg-[var(--sunken)] border border-[var(--line)] rounded-xl px-4 py-3 text-base text-[var(--text)] placeholder-[var(--muted)] focus:outline-none focus:border-[var(--accent)] transition-colors"
        />

        {error && (
          <p className="mt-3 flex items-start gap-1.5 text-xs text-[var(--orange)]" role="alert">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </p>
        )}

        <button
          type="submit"
          disabled={!password || loading}
          className="mt-4 w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[var(--accent)] text-[var(--bg)] text-sm font-bold disabled:opacity-40 active:scale-[0.98] transition-all"
        >
          <LogIn className="w-4 h-4" />
          {loading ? "驗證中…" : "進入"}
        </button>
      </form>
    </div>
  );
}
