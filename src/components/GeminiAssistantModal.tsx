"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Sparkles, X, Send, Bot, User, CheckCircle2, AlertCircle } from "lucide-react";
import { ChatMessage } from "@/types";
import { useModalBehavior } from "@/lib/useModalBehavior";

interface GeminiAssistantModalProps {
  onDataUpdated?: () => void;
}

export default function GeminiAssistantModal({ onDataUpdated }: GeminiAssistantModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "嗨！我是你的專屬 Gemini 訓練助理。你可以直接用自然語言告訴我今天的訓練內容（例如：「今天練了 Pull A，高位下拉 45kg 4組8下，機械划船 40kg 3組，背部充血很有感覺」），我會自動為你解析並寫入 Google Sheets「訓練日誌」！🔥\n\n懶得打動作名稱也可以用簡寫，一行一個動作，依課表順序對應：\n1. 50 8*4\n2. 50 10*4\n（重量 次數*組數；沒寫課表名稱就當作「下一課」）",
      timestamp: Date.now(),
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const closeModal = useCallback(() => setIsOpen(false), []);
  useModalBehavior(isOpen, closeModal);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = async (customPrompt?: string) => {
    const textToSend = customPrompt || input;
    if (!textToSend.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: textToSend.trim(),
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!customPrompt) setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: textToSend }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || data.error || "傳送失敗");
      }

      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        role: "assistant",
        content: data.reply,
        timestamp: Date.now(),
        // 只有真的走到寫入流程才附上結果卡，一般對話不顯示「已寫入」
        structuredAction: data.actionType !== "ADD_LOG" ? undefined : {
          actionType: data.actionType,
          details: {
            workout: data.workout,
            log: data.log,
            sheetSuccess: data.sheetSuccess,
          },
          success: data.sheetSuccess,
        },
      };

      setMessages((prev) => [...prev, botMsg]);

      if (data.actionType === "ADD_LOG" && onDataUpdated) {
        onDataUpdated();
      }
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: "assistant",
        content: `發生錯誤：${err.message || "請檢查網路或 API 設定"}`,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const quickPrompts = [
    // 簡寫：第 N 行對應課表第 N 個動作，格式「重量 次數*組數」
    "1. 50 8*4\n2. 50 10*4\n3. 55 9*3",
    "今天 Push A：上斜臥推 55kg 8下四組，啞鈴側平舉 10kg 15下三組，胸肌充血極佳",
    "今天練 Pull A：高位下拉 50kg 8下四組，機械划船 40kg 10下三組，背部感受很好",
    "今天 Legs A：深蹲 80kg 6下四組，機械腿推 140kg 10下三組，疲勞度中等",
  ];

  return (
    <>
      {/* 右下角浮動快捷按鈕 (FAB) */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed right-4 z-40 flex items-center gap-2 px-4 py-3 rounded-full font-bold text-sm shadow-xl transition-all duration-200 active:scale-95"
        style={{
          bottom: "calc(var(--tabbar-h) + var(--safe-bottom) + 14px)",
          background: "linear-gradient(135deg, #1f2a1a 0%, #15181d 100%)",
          border: "1px solid var(--accent-line)",
          color: "var(--accent)",
          boxShadow: "0 8px 24px rgba(155, 225, 93, 0.2)",
        }}
        aria-label="打開 Gemini 訓練助手"
      >
        <Sparkles className="w-4 h-4 animate-pulse text-[var(--accent)]" />
        <span>Gemini 記日誌</span>
      </button>

      {/* 對話 Drawer / Modal */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm transition-opacity"
          onClick={(e) => e.target === e.currentTarget && closeModal()}
        >
          <div
            className="w-full sm:max-w-lg bg-[var(--card)] border border-[var(--line)] rounded-t-[24px] sm:rounded-[24px] flex flex-col h-[85vh] sm:h-[650px] shadow-2xl overflow-hidden"
            style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--line)] bg-[var(--card2)]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[var(--accent-bg)] border border-[var(--accent-line)] flex items-center justify-center text-[var(--accent)]">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[var(--text)] flex items-center gap-2">
                    Gemini 訓練助手
                    <span className="w-2 h-2 rounded-full bg-[var(--accent)] inline-block"></span>
                  </h3>
                  <p className="text-[11px] text-[var(--muted)]">自動結構化寫入「訓練日誌」表</p>
                </div>
              </div>
              <button
                onClick={closeModal}
                aria-label="關閉"
                className="p-1.5 text-[var(--muted)] hover:text-[var(--text)] rounded-full hover:bg-[var(--sunken)] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Prompts */}
            <div className="px-4 py-2 border-b border-[var(--line)] bg-[var(--sunken)] flex items-center gap-2 overflow-x-auto text-[11px] no-scrollbar">
              <span className="text-[var(--muted)] whitespace-nowrap">範例：</span>
              {quickPrompts.map((p, idx) => (
                <button
                  key={idx}
                  // 範例只填進輸入框，避免一點就把示範資料寫進真實的訓練日誌
                  onClick={() => {
                    setInput(p);
                    inputRef.current?.focus();
                  }}
                  className="px-2.5 py-1 rounded-full bg-[var(--card)] hover:bg-[var(--card2)] border border-[var(--line)] text-[var(--muted)] hover:text-[var(--text)] whitespace-nowrap transition-colors flex-shrink-0"
                >
                  {p.slice(0, 14)}...
                </button>
              ))}
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex gap-3 ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {m.role === "assistant" && (
                    <div className="w-7 h-7 rounded-full bg-[var(--accent-bg)] border border-[var(--accent-line)] flex items-center justify-center text-[var(--accent)] flex-shrink-0 mt-0.5">
                      <Bot className="w-3.5 h-3.5" />
                    </div>
                  )}

                  <div
                    className={`max-w-[88%] rounded-[16px] px-3.5 py-2.5 text-xs leading-relaxed ${
                      m.role === "user"
                        ? "bg-[var(--accent-bg)] text-[var(--text)] border border-[var(--accent-line)]"
                        : "bg-[var(--sunken)] text-[var(--text)] border border-[var(--line)]"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{m.content}</p>

                    {/* 結構化寫入結果卡片 */}
                    {m.structuredAction?.details && (
                      <div className="mt-2.5 pt-2 border-t border-[var(--line)] space-y-2">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-[var(--muted)]">課表：{m.structuredAction.details.workout}</span>
                          {m.structuredAction.success ? (
                            <span className="text-[var(--accent)] flex items-center gap-1 font-bold">
                              <CheckCircle2 className="w-3 h-3" />
                              已寫入 Google 試算表
                            </span>
                          ) : (
                            <span className="text-[var(--orange)] flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" /> 寫入失敗
                            </span>
                          )}
                        </div>

                        {m.structuredAction.details.log && (
                          <div className="bg-[var(--card)] rounded-lg p-2.5 text-[11px] space-y-1.5 border border-[var(--line)]">
                            <div className="flex justify-between items-center">
                              <span className="text-[var(--muted)]">主項動作：</span>
                              <b className="text-[var(--accent)]">{m.structuredAction.details.log.mainExercise}</b>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-[var(--muted)]">工作組明細：</span>
                              <span>{m.structuredAction.details.log.mainSetsDetail}</span>
                            </div>
                            {m.structuredAction.details.log.accessoryExercises && (
                              <div className="flex justify-between items-start">
                                <span className="text-[var(--muted)] flex-shrink-0">輔助動作：</span>
                                <span className="text-right text-[var(--muted)]">{m.structuredAction.details.log.accessoryExercises}</span>
                              </div>
                            )}
                            {m.structuredAction.details.log.aiNextSuggestion && (
                              <div className="pt-1 border-t border-[var(--line)] text-[10px] text-[var(--orange)]">
                                💡 下次建議：{m.structuredAction.details.log.aiNextSuggestion}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {m.role === "user" && (
                    <div className="w-7 h-7 rounded-full bg-[var(--card2)] border border-[var(--line)] flex items-center justify-center text-[var(--muted)] flex-shrink-0 mt-0.5">
                      <User className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Form */}
            <div className="p-3 border-t border-[var(--line)] bg-[var(--card2)]">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="flex items-end gap-2"
              >
                {/* 訓練內容通常很長，用多行輸入；字級 16px 以免 iOS Safari 聚焦時自動放大整頁 */}
                <textarea
                  ref={inputRef}
                  rows={3}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    // 手機上 Enter 保留換行；桌機可用 Ctrl／Cmd + Enter 直接送出
                    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="輸入今日訓練，如：今天 Push A 臥推 50kg×8、55kg×8、55kg×8..."
                  disabled={loading}
                  className="flex-1 resize-none bg-[var(--sunken)] border border-[var(--line)] rounded-xl px-3.5 py-2.5 text-base leading-snug text-[var(--text)] placeholder-[var(--muted)] focus:outline-none focus:border-[var(--accent)] transition-colors"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || loading}
                  className="p-2.5 rounded-xl bg-[var(--accent)] text-[var(--bg)] font-bold disabled:opacity-40 hover:opacity-90 active:scale-95 transition-all"
                  aria-label="發送訊息"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
