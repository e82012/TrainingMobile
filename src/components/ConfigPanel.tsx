"use client";

import React, { useEffect, useState } from "react";
import { X, CheckCircle2, XCircle, ExternalLink, ChevronDown } from "lucide-react";
import { DashboardData } from "@/types";
import { useModalBehavior } from "@/lib/useModalBehavior";
import Skeleton from "@/components/Skeleton";
import { PLAN_SHEET, LOG_SHEET, orderedColumns, SheetColumn } from "@/lib/sheetSchema";

interface ConfigStatus {
  googleCredentials: boolean;
  geminiKey: boolean;
  geminiModel: string;
  googleSheetId: boolean;
  sheetUrl: string | null;
}

interface ConfigPanelProps {
  open: boolean;
  onClose: () => void;
  data: DashboardData | null;
  lastSyncedAt: Date | null;
}

function StatusBadge({ ok, okText = "已設定", ngText = "未設定" }: { ok: boolean; okText?: string; ngText?: string }) {
  return ok ? (
    <span className="inline-flex items-center gap-1 text-[var(--accent)] font-semibold">
      <CheckCircle2 className="w-3.5 h-3.5" /> {okText}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-[var(--orange)] font-semibold">
      <XCircle className="w-3.5 h-3.5" /> {ngText}
    </span>
  );
}

function ColumnTable({ title, range, columns }: { title: string; range: string; columns: Record<string, SheetColumn> }) {
  return (
    <details className="group rounded-xl bg-[var(--sunken)] border border-[var(--line)] px-3 py-2.5">
      <summary className="flex items-center justify-between cursor-pointer list-none text-xs font-semibold">
        <span>
          {title} <span className="text-[var(--muted)] font-normal num">{range}</span>
        </span>
        <ChevronDown className="w-4 h-4 text-[var(--muted)] transition-transform group-open:rotate-180" />
      </summary>
      <div className="mt-2">
        {orderedColumns(columns).map(([key, c]) => (
          <div key={key} className="flex gap-3 py-1.5 border-t border-[var(--line)] text-xs">
            <span className="num w-5 flex-shrink-0 font-bold text-[var(--accent)]">{c.col}</span>
            <span className="flex-1 min-w-0">
              {c.label}
              {c.note && <span className="block text-[11px] text-[var(--muted)]">{c.note}</span>}
            </span>
          </div>
        ))}
      </div>
    </details>
  );
}

export default function ConfigPanel({ open, onClose, data, lastSyncedAt }: ConfigPanelProps) {
  const [status, setStatus] = useState<ConfigStatus | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);

  useModalBehavior(open, onClose);

  // 每次開啟都重抓，環境變數改完重啟後能立即反映
  useEffect(() => {
    if (!open) return;
    setStatusError(null);
    fetch("/api/config")
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then(setStatus)
      .catch((e: Error) => setStatusError(e.message));
  }, [open]);

  if (!open) return null;

  const meta = data?.planMeta;
  const cycle = data?.status.cycle || [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full sm:max-w-lg bg-[var(--card)] border border-[var(--line)] rounded-t-[24px] sm:rounded-[24px] flex flex-col max-h-[90vh] shadow-2xl overflow-hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        role="dialog"
        aria-label="組態"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--line)] bg-[var(--card2)]">
          <div>
            <h3 className="font-bold text-base text-[var(--text)]">組態</h3>
            <p className="text-[11px] text-[var(--muted)] mt-0.5">資料來源、服務狀態與記錄格式</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[var(--muted)] hover:text-[var(--text)] rounded-full hover:bg-[var(--sunken)] transition-colors"
            aria-label="關閉"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* 服務狀態 */}
          <section>
            <div className="eyebrow mb-1">服務狀態</div>
            {statusError ? (
              <p className="tip text-[var(--orange)]">無法取得組態狀態：{statusError}</p>
            ) : (
              <>
                <div className="row">
                  <span>Google 服務帳戶</span>
                  <span>{status ? <StatusBadge ok={status.googleCredentials} /> : <Skeleton w="4em" h="0.85em" />}</span>
                </div>
                <div className="row">
                  <span>Gemini API Key</span>
                  <span>{status ? <StatusBadge ok={status.geminiKey} /> : <Skeleton w="4em" h="0.85em" />}</span>
                </div>
                <div className="row">
                  <span>Gemini 模型</span>
                  <span className="num">{status?.geminiModel || <Skeleton w="7em" h="0.85em" />}</span>
                </div>
                {status && !status.geminiKey && (
                  <p className="tip">未設定 Gemini API Key 時，「Gemini 記日誌」會回報錯誤且不寫入試算表。</p>
                )}
              </>
            )}
          </section>

          {/* 資料來源 */}
          <section>
            <div className="eyebrow mb-1">資料來源</div>
            <div className="row">
              <span>試算表</span>
              <span>{data?.spreadsheetTitle || "-"}</span>
            </div>
            <div className="row">
              <span>GOOGLE_SHEET_ID</span>
              <span>{status ? <StatusBadge ok={status.googleSheetId} /> : <Skeleton w="4em" h="0.85em" />}</span>
            </div>
            <div className="row">
              <span>上次同步</span>
              <span className="num">{lastSyncedAt ? lastSyncedAt.toLocaleString("zh-TW", { hour12: false }) : "-"}</span>
            </div>
            {status?.sheetUrl && (
              <a
                href={status.sheetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl bg-[var(--accent-bg)] border border-[var(--accent-line)] text-[var(--accent)] text-xs font-bold"
              >
                開啟 Google 試算表 <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </section>

          {/* 計畫資訊 */}
          <section>
            <div className="eyebrow mb-1">計畫資訊</div>
            <div className="row">
              <span>計畫名稱</span>
              <span>{meta?.title || "-"}</span>
            </div>
            <div className="row">
              <span>計畫代碼</span>
              <span className="num">{meta?.id || "-"}</span>
            </div>
            <div className="row">
              <span>建立日期</span>
              <span className="num">{meta?.createdAt || "-"}</span>
            </div>
            <div className="row">
              <span>週期長度</span>
              <span>{meta?.weeks ? `${meta.weeks} 週` : "-"}</span>
            </div>
            <div className="row">
              <span>循環順序</span>
              <span>{cycle.length > 0 ? cycle.join(" → ") : "-"}</span>
            </div>
          </section>

          {/* 記錄格式 */}
          <section>
            <div className="eyebrow mb-1">記錄格式</div>
            <div className="tip mt-1 space-y-1.5">
              <p>
                「工作組明細」寫成 <b className="text-[var(--text)]">重量×次數</b>，每組以逗號或斜線分隔，Volume 才算得出來：
              </p>
              <p className="num text-[var(--text)]">50kg×8, 55kg×8, 55kg×8</p>
              <p>
                同重量多組可寫成 <b className="text-[var(--text)]">重量×次數×組數</b>：
                <span className="num text-[var(--text)]"> 23.5kg×8×4</span>
              </p>
              <p>「×」也可用 x 或 *；kg 單位可省略。</p>
              <p className="pt-1.5 border-t border-[var(--line)]">
                <b className="text-[var(--text)]">簡寫輸入</b>：一行一個動作，第 N 行對應課表第 N 個動作，格式為「重量 次數*組數」。
                沒寫課表名稱時當作下一課。
              </p>
              <p className="num text-[var(--text)] whitespace-pre-line">{"1. 50 8*4\n2. 50 10*4"}</p>
            </div>
          </section>

          {/* 欄位對照 */}
          <section className="space-y-2">
            <div className="eyebrow">試算表欄位對照</div>
            <ColumnTable title={PLAN_SHEET.name} range={PLAN_SHEET.range} columns={PLAN_SHEET.columns} />
            <ColumnTable title={LOG_SHEET.name} range={LOG_SHEET.range} columns={LOG_SHEET.columns} />
          </section>
        </div>
      </div>
    </div>
  );
}
