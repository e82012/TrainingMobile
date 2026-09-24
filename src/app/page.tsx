"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Home,
  Dumbbell,
  ClipboardList,
  History,
  TrendingUp,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  Info,
} from "lucide-react";
import { DashboardData } from "@/types";
import GeminiAssistantModal from "@/components/GeminiAssistantModal";

export default function TrainingMobileApp() {
  const [activeTab, setActiveTab] = useState<"home" | "workout" | "plan" | "logs" | "progress">("home");
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  // 抓取儀表板與試算表資料
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/data");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      console.error("載入訓練資料失敗:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Primary Lift 動態 SVG 柱狀圖計算
  const renderPrimaryLiftChart = () => {
    const sessions = data?.primaryLift.sessions || [];
    if (sessions.length === 0) {
      return (
        <div className="tip text-center py-4">
          <p className="text-[var(--muted)]">尚無主項紀錄。</p>
          <p className="text-[11px] text-[var(--accent)] mt-1">點擊右下角「Gemini 記日誌」輸入今日訓練即可生成圖表！</p>
        </div>
      );
    }

    const rows = sessions.map((s) => ({
      date: s.date,
      volume: s.volume || s.sets.reduce((sum, [kg, reps]) => sum + kg * reps, 0),
    }));

    const fmt = (n: number) => n.toLocaleString("en-US");
    const W = 320, H = 160, left = 36, right = 316, top = 22, bottom = 124;
    const max = Math.max(...rows.map((r) => r.volume), 100);
    const step = max > 2000 ? 1000 : 500;
    const yMax = Math.ceil((max * 1.15) / step) * step;
    const y = (v: number) => bottom - (v / yMax) * (bottom - top);

    const slot = (right - left) / rows.length;
    const barW = Math.min(44, slot * 0.6);
    const tilt = slot < 52;

    const gridLines = [];
    for (let v = 0; v <= yMax; v += step) {
      gridLines.push(
        <g key={v}>
          <line x1={left} y1={y(v)} x2={right} y2={y(v)} className="chart-grid" />
          <text x={0} y={y(v) + 3} fill="var(--muted)" fontSize={10}>
            {v >= 1000 ? `${v / 1000}k` : v}
          </text>
        </g>
      );
    }

    return (
      <div className="mini-chart" role="img" aria-label="主項訓練 Volume 圖表">
        <svg viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
          {gridLines}
          {rows.map((r, i) => {
            const cx = left + slot * (i + 0.5);
            const isLatest = i === rows.length - 1;
            const barH = Math.max(bottom - y(r.volume), 4);
            return (
              <g key={i}>
                <rect
                  className={`chart-bar ${isLatest ? "top" : ""}`}
                  x={cx - barW / 2}
                  y={y(r.volume)}
                  width={barW}
                  height={barH}
                  rx={6}
                />
                {(isLatest || rows.length <= 6) && (
                  <text className="bar-label" x={cx} y={y(r.volume) - 6} textAnchor="middle">
                    {fmt(r.volume)}
                  </text>
                )}
                <text
                  x={cx}
                  y={tilt ? bottom + 12 : bottom + 16}
                  textAnchor={tilt ? "end" : "middle"}
                  transform={tilt ? `rotate(-40 ${cx} ${bottom + 12})` : undefined}
                >
                  {tilt ? r.date.slice(4) : r.date}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    );
  };

  const nextWorkoutId = data?.status.nextWorkout.workout || "Push A";
  const nextWorkoutPlan = data?.plans[nextWorkoutId] || data?.plans["Push A"];

  const hasSessions = (data?.primaryLift.sessions.length || 0) > 0;
  const maxWeight = hasSessions
    ? Math.max(...(data?.primaryLift.sessions || []).flatMap((s) => s.sets.map(([kg]) => kg)))
    : 0;

  const latestVolume = hasSessions
    ? data?.primaryLift.sessions[(data?.primaryLift.sessions.length || 1) - 1].volume || 0
    : 0;

  return (
    <div className="app">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1>PPL Training</h1>
          <div className="sub">8 週滾動式 PPL · Google Sheets 雲端連動</div>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="p-2 rounded-xl bg-[var(--card)] border border-[var(--line)] text-[var(--muted)] hover:text-[var(--accent)] active:scale-95 transition-all"
          title="重新載入雲端試算表資料"
          aria-label="重新載入"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-[var(--accent)]" : ""}`} />
        </button>
      </header>

      {/* 雲端連線狀態橫幅 */}
      <div className="mx-4 mt-3 px-3 py-2 rounded-xl bg-[var(--sunken)] border border-[var(--line)] text-[11px] text-[var(--muted)] flex items-center justify-between">
        {data?.isDemoMode ? (
          <div className="flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-[var(--orange)] flex-shrink-0" />
            <span>展示模式（配置 Google Service Account 即可連線雲端試算表）</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-[var(--accent)] font-medium">
            <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
            <span>已成功連線 Google 試算表：{data?.spreadsheetTitle || "Workout Tracker"}</span>
          </div>
        )}
      </div>

      <main>
        {/* ==================== 1. 總覽 (Home) ==================== */}
        {activeTab === "home" && (
          <section className="fade-in">
            <div className="card hero">
              <div className="kicker">Next Workout</div>
              <div className="title">{data?.status.nextWorkout.workout || "Push A"}</div>
              <div className="next">
                {data?.status.lastWorkout.workout === "尚未開始" ? (
                  <span>目前尚未有訓練紀錄 → 準備開始第一課 <b>{data?.status.nextWorkout.workout}</b></span>
                ) : (
                  <span>
                    上一次：<b>{data?.status.lastWorkout.date} {data?.status.lastWorkout.workout}</b> → 下一次直接進入{" "}
                    <b>{data?.status.nextWorkout.workout}</b>
                  </span>
                )}
              </div>
            </div>

            <div className="card">
              <div className="section-title">
                <h2>目前循環位置</h2>
                <span className="badge">Rolling PPL</span>
              </div>
              <div className="timeline">
                {(data?.status.cycle || ["Push A", "Pull A", "Legs A", "Push B", "Pull B", "Legs B"]).map(
                  (item, idx) => {
                    const currentIdx = data?.status.currentIndex ?? 0;
                    const isDone = data?.logs.length ? idx === (currentIdx - 1 + 6) % 6 : false;
                    const isCurrent = idx === currentIdx;
                    return (
                      <div
                        key={item}
                        className={`step ${isDone ? "done" : ""} ${isCurrent ? "current" : ""}`}
                      >
                        <div className="n">{isCurrent ? "NEXT" : isDone ? "完成" : "之後"}</div>
                        <strong>{item}</strong>
                      </div>
                    );
                  }
                )}
              </div>
              <p className="tip">不依星期重置；完成哪一課，就從下一課繼續。少練一天也不補課。</p>
            </div>

            <div className="grid-stats">
              <div className="stat">
                <span>計畫</span>
                <b>V1.0</b>
              </div>
              <div className="stat">
                <span>週期</span>
                <b>8 週</b>
              </div>
              <div className="stat">
                <span>課表動作</span>
                <b>
                  {Object.values(data?.plans || {}).reduce((acc, p) => acc + p.exercises.length, 0)} 個
                </b>
              </div>
              <div className="stat">
                <span>訓練日誌</span>
                <b>{data?.logs.length || 0} 筆</b>
              </div>
            </div>

            <section className="card">
              <div className="section-title">
                <div>
                  <div className="eyebrow">Primary Lift</div>
                  <h2>{data?.primaryLift.name || "上斜槓鈴臥推"}</h2>
                </div>
                <span className="badge">{data?.primaryLift.target || "4 × 6–8"}</span>
              </div>

              <div className="lift-summary">
                <div className="metric">
                  <strong>{hasSessions ? `${latestVolume.toLocaleString()} kg` : "-"}</strong>
                  <span>最近一次總 Volume</span>
                </div>
                <div className="metric">
                  <strong>{hasSessions ? `${maxWeight} kg` : "-"}</strong>
                  <span>主項最大訓練重量</span>
                </div>
              </div>

              {renderPrimaryLiftChart()}

              <div className="trend-note">
                <b>總 Volume = Σ（重量 × Reps）</b>，每次訓練只記一筆，計算該 Workout 的 Primary Lift。
              </div>
            </section>
          </section>
        )}

        {/* ==================== 2. 訓練 (Workout) ==================== */}
        {activeTab === "workout" && (
          <section className="fade-in">
            <div className="card hero">
              <div className="kicker">Next Workout</div>
              <div className="title">{nextWorkoutPlan?.name || "Push A"}</div>
              <div className="next">{nextWorkoutPlan?.description || "下一次訓練直接執行這張課表"}</div>
            </div>

            <div className="card">
              <div className="section-title">
                <h2>{nextWorkoutPlan?.name} 課表</h2>
                <span className="badge">
                  {nextWorkoutPlan?.exercises.length || 0} 動作 ·{" "}
                  {nextWorkoutPlan?.exercises.reduce(
                    (sum, e) => sum + (parseInt(e.sets.split("×")[0]) || 3),
                    0
                  )}{" "}
                  組
                </span>
              </div>

              {(nextWorkoutPlan?.exercises || []).map((ex, i) => (
                <div key={i} className="exercise">
                  <div className="exercise-top">
                    <h3 className="flex items-center gap-2">
                      {ex.name}
                      {ex.isPrimary && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--accent-bg)] text-[var(--accent)] border border-[var(--accent-line)]">
                          主項
                        </span>
                      )}
                    </h3>
                    <span className="sets">{ex.sets}</span>
                  </div>
                  <div className="note">{ex.notes}</div>
                </div>
              ))}
            </div>

            <div className="card">
              <div className="section-title">
                <h2>之後的課表</h2>
                <span className="muted">固定滾動</span>
              </div>
              {(() => {
                const cycle = data?.status.cycle || ["Push A", "Pull A", "Legs A", "Push B", "Pull B", "Legs B"];
                const curr = data?.status.currentIndex ?? 0;
                const nexts = [1, 2, 3, 4].map((offset) => cycle[(curr + offset) % cycle.length]);
                return nexts.map((name, idx) => (
                  <div key={idx} className="row">
                    <span>{idx === 0 ? "下一課" : "再下一課"}</span>
                    <b>{name}</b>
                  </div>
                ));
              })()}
            </div>
          </section>
        )}

        {/* ==================== 3. 課表 (Plan) ==================== */}
        {activeTab === "plan" && (
          <section className="fade-in">
            <div className="card">
              <div className="section-title">
                <h2>8 週滾動式 PPL 課表</h2>
                <span className="badge">Google Sheets</span>
              </div>
              <div className="row">
                <span>建立日期</span>
                <b className="num">2026-09-22</b>
              </div>
              <div className="row">
                <span>目標</span>
                <span>肌肥大／力量維持與提升／漸進超負荷</span>
              </div>
            </div>

            <div className="card">
              <h2>六課循環計畫</h2>
              {Object.values(data?.plans || {}).map((p, idx) => (
                <div key={p.id} className="row">
                  <span className="num">0{idx + 1}</span>
                  <div>
                    <b>{p.name}</b>
                    <span className="block text-[11px] text-[var(--muted)]">{p.category}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="card">
              <h2>週期階段</h2>
              <div className="row">
                <span>Week 1–2</span>
                <span>適應／基準建立（掌握負重節奏）</span>
              </div>
              <div className="row">
                <span>Week 3–4</span>
                <span>漸進超負荷（每週微增次數或重量）</span>
              </div>
              <div className="row">
                <span>Week 5–7</span>
                <span>主要增肌期（穩定高強度訓練）</span>
              </div>
              <div className="row">
                <span>Week 8</span>
                <span>Deload（減量恢復週，降 40% 組數）</span>
              </div>
            </div>
          </section>
        )}

        {/* ==================== 4. 紀錄 (Logs) ==================== */}
        {activeTab === "logs" && (
          <section className="fade-in">
            <div className="card">
              <div className="section-title">
                <h2>訓練日誌歷史</h2>
                <span className="badge">{data?.logs.length || 0} 筆紀錄</span>
              </div>

              {(!data?.logs || data.logs.length === 0) ? (
                <div className="py-8 text-center">
                  <p className="text-sm text-[var(--muted)]">目前 Google 試算表「訓練日誌」中尚無紀錄。</p>
                  <p className="text-xs text-[var(--accent)] mt-2">
                    點擊右下角【Gemini 記日誌】，輸入今天的訓練內容即可自動寫入！✨
                  </p>
                </div>
              ) : (
                <div className="scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>日期</th>
                        <th>課表</th>
                        <th>主項動作</th>
                        <th>工作組明細</th>
                        <th>最高重量</th>
                        <th>輔助動作</th>
                        <th>充血 / 感受</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.logs.map((row, idx) => (
                        <tr key={idx}>
                          <td>{row.date}</td>
                          <td>
                            <span className="font-bold text-[var(--accent)]">{row.workout}</span>
                          </td>
                          <td className="font-semibold text-[var(--text)]">{row.mainExercise}</td>
                          <td>{row.mainSetsDetail}</td>
                          <td className="text-[var(--blue)] font-bold">{row.maxWeight ? `${row.maxWeight} kg` : "-"}</td>
                          <td className="text-[var(--muted)] max-w-[140px] truncate">{row.accessoryExercises || "-"}</td>
                          <td>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--sunken)] text-[var(--orange)] border border-[var(--line)]">
                              {row.pumpLevel || "良好"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <p className="tip">訓練日誌與 Google Sheets「訓練日誌」工作表 100% 同步。透過 Gemini 助理口語記錄後即時刷新！</p>
            </div>
          </section>
        )}

        {/* ==================== 5. 進度 (Progress) ==================== */}
        {activeTab === "progress" && (
          <section className="fade-in">
            <div className="card">
              <div className="section-title">
                <h2>主項進度</h2>
                <span className="badge">Primary Lift</span>
              </div>
              <div className="row">
                <span>{data?.primaryLift.name || "上斜槓鈴臥推"}</span>
                <b>Push A</b>
              </div>
              <div className="row">
                <span>最高重量紀錄</span>
                <b className="num">{hasSessions ? `${maxWeight} kg` : "-"}</b>
              </div>
              <div className="row">
                <span>最近總 Volume</span>
                <b className="num">{hasSessions ? `${latestVolume.toLocaleString()} kg` : "-"}</b>
              </div>
              <div className="row">
                <span>進階標準</span>
                <span>4 組皆達 8 Reps 且動作穩定無借力 → 增加 2.5–5 kg</span>
              </div>
            </div>

            <div className="card">
              <h2>8 週觀察重點</h2>
              <div className="row">
                <span>訓練表現</span>
                <span>主項負重穩定度／動作離心控制／每週 Volume 微幅上升</span>
              </div>
              <div className="row">
                <span>身體變化</span>
                <span>胸圍／上臂圍／肩寬／大腿圍／每週晨起體重平均</span>
              </div>
              <div className="row">
                <span>主觀感受</span>
                <span>睡眠恢復品質／關節舒適度／肌肉張力與疲勞累積</span>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Gemini 智慧對話助理 Modal */}
      <GeminiAssistantModal onDataUpdated={loadData} />

      {/* 底部 TabBar */}
      <nav className="tabs" aria-label="主要導覽">
        <div className="tabs-inner">
          <button
            onClick={() => setActiveTab("home")}
            className={`tab-btn ${activeTab === "home" ? "active" : ""}`}
          >
            <Home />
            <span>總覽</span>
          </button>
          <button
            onClick={() => setActiveTab("workout")}
            className={`tab-btn ${activeTab === "workout" ? "active" : ""}`}
          >
            <Dumbbell />
            <span>訓練</span>
          </button>
          <button
            onClick={() => setActiveTab("plan")}
            className={`tab-btn ${activeTab === "plan" ? "active" : ""}`}
          >
            <ClipboardList />
            <span>課表</span>
          </button>
          <button
            onClick={() => setActiveTab("logs")}
            className={`tab-btn ${activeTab === "logs" ? "active" : ""}`}
          >
            <History />
            <span>紀錄</span>
          </button>
          <button
            onClick={() => setActiveTab("progress")}
            className={`tab-btn ${activeTab === "progress" ? "active" : ""}`}
          >
            <TrendingUp />
            <span>進度</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
