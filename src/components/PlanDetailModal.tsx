"use client";

import React from "react";
import { X } from "lucide-react";
import { WorkoutPlan } from "@/types";

interface PlanDetailModalProps {
  plan: WorkoutPlan | null;
  onClose: () => void;
}

export default function PlanDetailModal({ plan, onClose }: PlanDetailModalProps) {
  if (!plan) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm transition-opacity">
      <div
        className="w-full sm:max-w-lg bg-[var(--card)] border border-[var(--line)] rounded-t-[24px] sm:rounded-[24px] flex flex-col max-h-[85vh] shadow-2xl overflow-hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--line)] bg-[var(--card2)]">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-base text-[var(--text)]">{plan.name} 完整課表</h3>
              <span className="badge text-[10px] py-0.5 px-2">{plan.category}</span>
            </div>
            <p className="text-[11px] text-[var(--muted)] mt-0.5">{plan.description}</p>
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
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <div className="flex items-center justify-between text-xs text-[var(--muted)] px-1">
            <span>動作清單（共 {plan.exercises.length} 個動作）</span>
            <span>目標規格</span>
          </div>

          {plan.exercises.map((ex, idx) => (
            <div
              key={idx}
              className={`p-3.5 rounded-xl border transition-all ${
                ex.isPrimary
                  ? "bg-[var(--accent-bg)] border-[var(--accent-line)]"
                  : "bg-[var(--sunken)] border-[var(--line)]"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[var(--muted)]">#{idx + 1}</span>
                  <h4 className="font-bold text-sm text-[var(--text)]">{ex.name}</h4>
                  {ex.isPrimary && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-[var(--accent)] text-[var(--bg)]">
                      主項
                    </span>
                  )}
                </div>
                <span className="text-xs font-bold text-[var(--blue)] whitespace-nowrap">{ex.sets}</span>
              </div>

              {ex.notes && (
                <div className="mt-2 text-xs text-[var(--muted)] bg-[var(--card)]/60 rounded-lg p-2 border border-[var(--line)]">
                  <span className="text-[var(--accent)] font-semibold">備註 / 下階段目標：</span>
                  {ex.notes}
                </div>
              )}
            </div>
          ))}
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
