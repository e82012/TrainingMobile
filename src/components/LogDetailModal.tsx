"use client";

import React from "react";
import { X, Calendar, Flame, Activity, Zap, Sparkles, Lightbulb } from "lucide-react";
import { TrainingLog } from "@/types";
import { useModalBehavior } from "@/lib/useModalBehavior";

interface LogDetailModalProps {
  log: TrainingLog | null;
  onClose: () => void;
}

export default function LogDetailModal({ log, onClose }: LogDetailModalProps) {
  useModalBehavior(Boolean(log), onClose);

  if (!log) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm transition-opacity"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full sm:max-w-lg bg-[var(--card)] border border-[var(--line)] rounded-t-[24px] sm:rounded-[24px] flex flex-col max-h-[85vh] shadow-2xl overflow-hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--line)] bg-[var(--card2)]">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--accent-bg)] text-[var(--accent)] border border-[var(--accent-line)] font-bold">
                {log.workout}
              </span>
              <h3 className="font-bold text-base text-[var(--text)]">訓練日誌詳情</h3>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-[var(--muted)] mt-1">
              <Calendar className="w-3 h-3" />
              <span>{log.date}</span>
              <span>·</span>
              <span>課表計畫 ID: {log.planId || "260922"}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[var(--muted)] hover:text-[var(--text)] rounded-full hover:bg-[var(--sunken)] transition-colors"
            aria-label="關閉"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
          {/* 核心主項數據卡 */}
          <div className="p-4 rounded-xl bg-[var(--sunken)] border border-[var(--line)] space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="eyebrow text-[var(--accent)]">主項複合動作</div>
              {(log.volume ?? 0) > 0 && (
                <span className="text-xs text-[var(--blue)] font-bold">
                  總 Volume: {(log.volume ?? 0).toLocaleString()} kg
                </span>
              )}
            </div>
            <h4 className="text-lg font-bold text-[var(--text)]">{log.mainExercise}</h4>

            {/* 工作組明細是最關鍵的資訊，獨立一整列並允許換行，不做截斷 */}
            <div className="space-y-2 pt-2 border-t border-[var(--line)]">
              <div className="bg-[var(--card)] p-2.5 rounded-lg border border-[var(--line)]">
                <span className="text-[11px] text-[var(--muted)] block">最高訓練重量</span>
                <b className="text-base text-[var(--accent)] font-bold">{log.maxWeight ? `${log.maxWeight} kg` : "-"}</b>
              </div>
              <div className="bg-[var(--card)] p-2.5 rounded-lg border border-[var(--line)]">
                <span className="text-[11px] text-[var(--muted)] block">工作組明細</span>
                <b className="text-xs text-[var(--text)] block break-words leading-relaxed">{log.mainSetsDetail || "-"}</b>
              </div>
            </div>
          </div>

          {/* 輔助動作 */}
          {log.accessoryExercises && (
            <div className="p-3.5 rounded-xl bg-[var(--sunken)] border border-[var(--line)]">
              <div className="text-[11px] font-bold text-[var(--muted)] mb-1">輔助動作紀錄</div>
              <p className="text-xs text-[var(--text)] leading-relaxed whitespace-pre-wrap">
                {log.accessoryExercises}
              </p>
            </div>
          )}

          {/* 身體感受與疲勞指標 */}
          <div className="grid grid-cols-3 gap-2">
            <div className="p-2.5 rounded-xl bg-[var(--sunken)] border border-[var(--line)] text-center">
              <div className="flex items-center justify-center gap-1 text-[11px] text-[var(--orange)] mb-1">
                <Flame className="w-3.5 h-3.5" /> 充血度
              </div>
              <b className="text-xs text-[var(--text)]">{log.pumpLevel || "-"}</b>
            </div>
            <div className="p-2.5 rounded-xl bg-[var(--sunken)] border border-[var(--line)] text-center">
              <div className="flex items-center justify-center gap-1 text-[11px] text-[var(--accent)] mb-1">
                <Activity className="w-3.5 h-3.5" /> 肌群感受
              </div>
              <b className="text-xs text-[var(--text)] truncate block">{log.muscleFeeling || "-"}</b>
            </div>
            <div className="p-2.5 rounded-xl bg-[var(--sunken)] border border-[var(--line)] text-center">
              <div className="flex items-center justify-center gap-1 text-[11px] text-[var(--blue)] mb-1">
                <Zap className="w-3.5 h-3.5" /> 疲勞度
              </div>
              <b className="text-xs text-[var(--text)]">{log.fatigueLevel || "-"}</b>
            </div>
          </div>

          {/* AI 評估摘要與建議 */}
          {(log.aiSummary || log.aiNextSuggestion) && (
            <div className="p-3.5 rounded-xl bg-[var(--card2)] border border-[var(--accent-line)] space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--accent)]">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Gemini AI 教練洞察</span>
              </div>

              {log.aiSummary && (
                <div className="text-xs text-[var(--text)] leading-relaxed bg-[var(--card)] p-2.5 rounded-lg border border-[var(--line)]">
                  <span className="text-[var(--muted)] block text-[10px] mb-0.5">評估總結：</span>
                  {log.aiSummary}
                </div>
              )}

              {log.aiNextSuggestion && (
                <div className="text-xs text-[var(--orange)] leading-relaxed bg-[var(--accent-bg)]/40 p-2.5 rounded-lg border border-[var(--accent-line)] flex items-start gap-1.5">
                  <Lightbulb className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block text-[10px]">下次行動建議：</span>
                    {log.aiNextSuggestion}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-[var(--line)] bg-[var(--card2)] flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[var(--sunken)] hover:bg-[var(--line)] text-xs text-[var(--text)] font-semibold transition-colors"
          >
            關閉
          </button>
        </div>
      </div>
    </div>
  );
}
