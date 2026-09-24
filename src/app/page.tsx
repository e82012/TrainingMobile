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
  AlertCircle,
  Flame,
} from "lucide-react";
import { DashboardData, TrainingLog } from "@/types";
import GeminiAssistantModal from "@/components/GeminiAssistantModal";

export default function TrainingMobileApp() {
  const [activeTab, setActiveTab] = useState<"home" | "workout" | "plan" | "logs" | "progress">("home");
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 抓取儀表板與試算表資料（100% 來自 Google Sheets）
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await fetch("/api/data");
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || json.error || "無法讀取 Google 試算表");
      }
      setData(json);
    } catch (e: any) {
      console.error("載入訓練資料失敗:", e);
      setErrorMsg(e.message || "讀取試算表失敗");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 當天課表 (Next Workout)
  const currentWorkoutId = data?.status.nextWorkout.workout || Object.keys(data?.plans || {})[0] || "課表";
  const currentWorkoutPlan = data?.plans[currentWorkoutId] || Object.values(data?.plans || {})[0];
  // 當天課表之主項動作 (Primary Lift) - 動態取自試算表！
  const currentPrimary = currentWorkoutPlan?.primaryExercise;

  // 篩選出歷史上針對「當天主項」或「當天課表」的所有日誌紀錄
  const currentPrimaryLogs = (data?.logs || []).filter(
    (l) => (currentPrimary?.name && l.mainExercise === currentPrimary.name) || l.workout === currentWorkoutId
  );

  const hasPrimaryHistory = currentPrimaryLogs.length > 0;
  const currentMaxWeight = hasPrimaryHistory
    ? Math.max(...currentPrimaryLogs.map((l) => l.maxWeight || 0))
    : 0;
  const currentLatestVolume = hasPrimaryHistory
    ? currentPrimaryLogs[currentPrimaryLogs.length - 1].volume || 0
    : 0;

  // Primary Lift 動態 SVG 柱狀圖計算（專門繪製當天主項動作的歷史趨勢）
  const renderPrimaryLiftChart = () => {
    if (currentPrimaryLogs.length === 0) {
      return (
        <div className="tip text-center py-4">
          <p className="text-[var(--muted)]">試算表中尚無【{currentPrimary?.name || "此主項"}】的歷史紀錄。</p>
          <p className="text-[11px] text-[var(--accent)] mt-1">
            今天訓練執行完畢後，點擊右下角「Gemini 記日誌」即可建立第 1 筆基準！
          </p>
        </div>
      );
    }

    const rows = currentPrimaryLogs.map((l) => ({
      date: l.date.replace(/-/g, ""),
      volume: l.volume || 0,
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
      <div className="mini-chart" role="img" aria-label={`${currentPrimary?.name} 訓練 Volume 圖表`}>
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

  return (
    <div className="app">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1>{data?.planMeta.title || "PPL Training"}</h1>
          <div className="sub">
            {data?.planMeta.weeks ? `${data.planMeta.weeks} 週週期` : "週期訓練"} ·{" "}
            {data?.planMeta.createdAt ? `${data.planMeta.createdAt} 建立` : ""} · Google Sheets 雲端連動
          </div>
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

      {/* 雲端狀態橫幅 */}
      <div className="mx-4 mt-3 px-3 py-2 rounded-xl bg-[var(--sunken)] border border-[var(--line)] text-[11px] flex items-center justify-between">
        {errorMsg ? (
          <div className="flex items-center gap-1.5 text-[var(--orange)] font-medium">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            <span>連線異常：{errorMsg}</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-[var(--accent)] font-medium">
            <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
            <span>已連線 Google 試算表：{data?.spreadsheetTitle || "Workout Tracker"}</span>
          </div>
        )}
      </div>

      <main>
        {/* ==================== 1. 總覽 (Home) ==================== */}
        {activeTab === "home" && (
          <section className="fade-in">
            {/* Next Workout 卡片 */}
            <div className="card hero">
              <div className="kicker">Next Workout</div>
              <div className="title">{currentWorkoutId}</div>
              <div className="next">
                {data?.status.lastWorkout.workout === "尚未開始" || data?.status.lastWorkout.workout === "無紀錄" ? (
                  <span>目前尚未有訓練紀錄 → 準備執行第一課 <b>{currentWorkoutId}</b></span>
                ) : (
                  <span>
                    上一次：<b>{data?.status.lastWorkout.date} {data?.status.lastWorkout.workout}</b> → 下一次直接進入{" "}
                    <b>{currentWorkoutId}</b>
                  </span>
                )}
              </div>
            </div>

            {/* 滾動循環 Timeline */}
            <div className="card">
              <div className="section-title">
                <h2>目前循環位置</h2>
                <span className="badge">Rolling PPL</span>
              </div>
              <div className="timeline">
                {(data?.status.cycle || []).map((item, idx) => {
                  const currentIdx = data?.status.currentIndex ?? 0;
                  const isDone = (data?.logs.length || 0) > 0 && idx === (currentIdx - 1 + (data?.status.cycle.length || 6)) % (data?.status.cycle.length || 6);
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
                })}
              </div>
              <p className="tip">不依星期重置；完成哪一課，就從下一課繼續。少練一天也不補課。</p>
            </div>

            {/* 統計概覽 */}
            <div className="grid-stats">
              <div className="stat">
                <span>週期計畫</span>
                <b>{data?.planMeta.weeks ? `${data.planMeta.weeks} 週` : "-"}</b>
              </div>
              <div className="stat">
                <span>課表分類</span>
                <b>{Object.keys(data?.plans || {}).length} 課</b>
              </div>
              <div className="stat">
                <span>試算表動作</span>
                <b>
                  {Object.values(data?.plans || {}).reduce((acc, p) => acc + p.exercises.length, 0)} 個
                </b>
              </div>
              <div className="stat">
                <span>訓練日誌</span>
                <b>{data?.logs.length || 0} 筆</b>
              </div>
            </div>

            {/* Primary Lift 卡片：完全動態對齊「當天訓練主項」 */}
            <section className="card">
              <div className="section-title">
                <div>
                  <div className="eyebrow">當天主項 · Primary Lift</div>
                  <h2>{currentWorkoutId} · {currentPrimary?.name || "主項訓練"}</h2>
                </div>
                <span className="badge">{currentPrimary?.sets || "目標組數"}</span>
              </div>

              <div className="lift-summary">
                <div className="metric">
                  <strong>{hasPrimaryHistory ? `${currentLatestVolume.toLocaleString()} kg` : "-"}</strong>
                  <span>{currentPrimary?.name || "主項"} 最近一次 Volume</span>
                </div>
                <div className="metric">
                  <strong>{hasPrimaryHistory ? `${currentMaxWeight} kg` : "-"}</strong>
                  <span>{currentPrimary?.name || "主項"} 歷史最高負重</span>
                </div>
              </div>

              {renderPrimaryLiftChart()}

              <div className="trend-note">
                {currentPrimary?.notes ? (
                  <span><b>下一階段目標</b>：{currentPrimary.notes}</span>
                ) : (
                  <span><b>總 Volume = Σ（重量 × Reps）</b>，動態追蹤當天課表之主項複合動作。</span>
                )}
              </div>
            </section>
          </section>
        )}

        {/* ==================== 2. 訓練 (Workout) ==================== */}
        {activeTab === "workout" && (
          <section className="fade-in">
            <div className="card hero">
              <div className="kicker">Next Workout</div>
              <div className="title">{currentWorkoutPlan?.name || "課表"}</div>
              <div className="next">{currentWorkoutPlan?.description || "下一次訓練直接執行這張課表"}</div>
            </div>

            <div className="card">
              <div className="section-title">
                <h2>{currentWorkoutPlan?.name} 動作清單</h2>
                <span className="badge">
                  {currentWorkoutPlan?.exercises.length || 0} 個動作
                </span>
              </div>

              {(currentWorkoutPlan?.exercises || []).map((ex, i) => (
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
                <span className="muted">依試算表設定滾動</span>
              </div>
              {(() => {
                const cycle = data?.status.cycle || [];
                const curr = data?.status.currentIndex ?? 0;
                if (cycle.length <= 1) return <p className="tip">目前試算表中只有一張課表。</p>;
                return cycle
                  .filter((_, idx) => idx !== curr)
                  .map((name, idx) => (
                    <div key={idx} className="row">
                      <span>{idx === 0 ? "下一課" : "之後課表"}</span>
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
                <h2>{data?.planMeta.title || "訓練計畫"}</h2>
                <span className="badge">試算表來源</span>
              </div>
              <div className="row">
                <span>建立日期</span>
                <b className="num">{data?.planMeta.createdAt || "-"}</b>
              </div>
              <div className="row">
                <span>計畫週期</span>
                <span>{data?.planMeta.weeks || "-"} 週滾動式循環</span>
              </div>
              <div className="row">
                <span>計畫代碼</span>
                <span className="num">{data?.planMeta.id || "-"}</span>
              </div>
            </div>

            <div className="card">
              <h2>六課循環與主項對照</h2>
              {Object.values(data?.plans || {}).map((p, idx) => (
                <div key={p.id} className="row">
                  <span className="num">0{idx + 1}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <b>{p.name}</b>
                      {p.primaryExercise && (
                        <span className="text-[10px] text-[var(--accent)] bg-[var(--accent-bg)] px-1.5 py-0.5 rounded border border-[var(--accent-line)]">
                          主項: {p.primaryExercise.name}
                        </span>
                      )}
                    </div>
                    <span className="block text-[11px] text-[var(--muted)]">
                      {p.category} · {p.exercises.length} 動作
                    </span>
                  </div>
                </div>
              ))}
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
              <p className="tip">訓練日誌 100% 與 Google 試算表「訓練日誌」同步。清空試算表此處即為 0 筆，透過 Gemini 助理口語記錄後即時刷新！</p>
            </div>
          </section>
        )}

        {/* ==================== 5. 進度 (Progress) ==================== */}
        {activeTab === "progress" && (
          <section className="fade-in">
            <div className="card">
              <div className="section-title">
                <h2>各課表主項動作總覽</h2>
                <span className="badge">Primary Lifts</span>
              </div>
              <p className="text-xs text-[var(--muted)] mb-3">
                每一課表均設有專屬複合主項動作，訓練進度將隨滾動自動切換追蹤：
              </p>
              {Object.values(data?.plans || {}).map((p) => {
                const logsForP = (data?.logs || []).filter(
                  (l) => (p.primaryExercise?.name && l.mainExercise === p.primaryExercise.name) || l.workout === p.name
                );
                const max = logsForP.length > 0 ? Math.max(...logsForP.map((l) => l.maxWeight || 0)) : 0;
                const vol = logsForP.length > 0 ? logsForP[logsForP.length - 1].volume || 0 : 0;

                return (
                  <div key={p.id} className="row">
                    <div>
                      <b>{p.name} · {p.primaryExercise?.name || "主項"}</b>
                      <span className="block text-[11px] text-[var(--muted)]">
                        目標：{p.primaryExercise?.sets || "4 組"} · {p.primaryExercise?.notes || "主項動作"}
                      </span>
                    </div>
                    <div className="text-right">
                      {logsForP.length > 0 ? (
                        <div>
                          <b className="num text-[var(--accent)]">{max} kg</b>
                          <span className="block text-[10px] text-[var(--muted)]">{vol.toLocaleString()} kg Volume</span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-[var(--muted)]">尚未紀錄</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="card">
              <h2>8 週觀察指標</h2>
              <div className="row">
                <span>訓練表現</span>
                <span>各課表主項負重穩定度／動作離心控制／每週 Volume 微幅上升</span>
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
