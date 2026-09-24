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
  AlertCircle,
  ChevronRight,
  Settings,
} from "lucide-react";
import { DashboardData, WorkoutPlan, TrainingLog } from "@/types";
import GeminiAssistantModal from "@/components/GeminiAssistantModal";
import PlanDetailModal from "@/components/PlanDetailModal";
import LogDetailModal from "@/components/LogDetailModal";
import ConfigPanel from "@/components/ConfigPanel";
import Skeleton from "@/components/Skeleton";

export default function TrainingMobileApp() {
  const [activeTab, setActiveTab] = useState<"home" | "workout" | "plan" | "logs" | "progress">("home");
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 彈跳視窗狀態：選取的課表與日誌
  const [selectedPlan, setSelectedPlan] = useState<WorkoutPlan | null>(null);
  const [selectedLog, setSelectedLog] = useState<TrainingLog | null>(null);
  const [configOpen, setConfigOpen] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const closeConfig = useCallback(() => setConfigOpen(false), []);
  // 只有「第一次、還沒有任何資料」時才顯示骨架；重新整理時保留舊資料並淡化
  const initialLoading = loading && !data;

  // 抓取儀表板與試算表資料（100% 來自 Google Sheets）
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await fetch("/api/data");
      // 頁面開著跨過午夜後 token 失效，直接回登入頁
      if (res.status === 401) {
        window.location.replace("/login");
        return;
      }
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || json.error || "無法讀取 Google 試算表");
      }
      setData(json);
      setLastSyncedAt(new Date());
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
  const currentPrimary = currentWorkoutPlan?.primaryExercise;

  // 篩選當天主項動作的歷史紀錄
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

  // 總覽統計：以本地日期的「日」為單位計算，避免時區造成差一天
  const DAY_MS = 86_400_000;
  const toDay = (s?: string) => {
    const m = s?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return m ? new Date(+m[1], +m[2] - 1, +m[3]).getTime() : null;
  };
  const now = new Date();
  const todayTs = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const logDays = (data?.logs || []).map((l) => toDay(l.date)).filter((t): t is number => t !== null);
  const last7DaysCount = logDays.filter((t) => todayTs - t >= 0 && todayTs - t < 7 * DAY_MS).length;
  const daysSinceLast = logDays.length > 0 ? Math.round((todayTs - Math.max(...logDays)) / DAY_MS) : null;
  const planStartTs = toDay(data?.planMeta.createdAt);
  const cycleWeek = planStartTs !== null && todayTs >= planStartTs
    ? Math.floor((todayTs - planStartTs) / (7 * DAY_MS)) + 1
    : null;

  // Primary Lift 動態 SVG 柱狀圖計算
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
          <h1>{initialLoading ? <Skeleton w="9em" h="1em" /> : data?.planMeta.title || "PPL Training"}</h1>
          <div className="sub">
            {initialLoading ? (
              <Skeleton w="12em" h="0.85em" />
            ) : (
              <>
                {data?.planMeta.weeks ? `${data.planMeta.weeks} 週週期` : "週期訓練"}
                {data?.planMeta.createdAt ? ` · ${data.planMeta.createdAt} 建立` : ""}
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => setConfigOpen(true)}
            className="p-2 rounded-xl bg-[var(--card)] border border-[var(--line)] text-[var(--muted)] hover:text-[var(--accent)] active:scale-95 transition-all"
            title="組態：資料來源與服務狀態"
            aria-label="組態"
          >
            <Settings className="w-4 h-4" />
          </button>
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 rounded-xl bg-[var(--card)] border border-[var(--line)] text-[var(--muted)] hover:text-[var(--accent)] active:scale-95 transition-all"
            title="重新載入雲端試算表資料"
            aria-label="重新載入"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-[var(--accent)]" : ""}`} />
          </button>
        </div>
      </header>

      {/* 雲端狀態橫幅：連線正常時不佔版面，只在異常時提示 */}
      {errorMsg && (
        <div className="mx-4 mt-3 px-3 py-2 rounded-xl bg-[var(--sunken)] border border-[var(--line)] text-[11px] flex items-center gap-1.5 text-[var(--orange)] font-medium">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>連線異常：{errorMsg}</span>
        </div>
      )}

      <main className={loading && data ? "is-refreshing" : ""} aria-busy={loading}>
        {/* ==================== 1. 總覽 (Home) ==================== */}
        {activeTab === "home" && (
          <section className="fade-in">
            <div className="card hero">
              <div className="kicker">Next Workout</div>
              <div className="title">{initialLoading ? <Skeleton w="5em" h="0.95em" /> : currentWorkoutId}</div>
              <div className="next">
                {initialLoading ? (
                  <Skeleton w="15em" />
                ) : data?.status.lastWorkout.workout === "尚未開始" || data?.status.lastWorkout.workout === "無紀錄" ? (
                  <span>目前尚未有訓練紀錄 → 準備執行第一課 <b>{currentWorkoutId}</b></span>
                ) : (
                  <span>
                    上一次：<b>{data?.status.lastWorkout.date} {data?.status.lastWorkout.workout}</b> → 下一次直接進入{" "}
                    <b>{currentWorkoutId}</b>
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
                {initialLoading &&
                  Array.from({ length: 6 }, (_, i) => (
                    <div key={i} className="step">
                      <Skeleton w="2.5em" h="0.7em" />
                      <Skeleton block w="4em" h="1em" className="mx-auto mt-1.5" />
                    </div>
                  ))}
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

            <div className="grid-stats">
              {[
                {
                  label: "週期進度",
                  value: (
                    <>
                      {cycleWeek !== null ? `第 ${cycleWeek} 週` : "-"}
                      {data?.planMeta.weeks && <small className="text-[11px] text-[var(--muted)] font-normal"> / {data.planMeta.weeks}</small>}
                    </>
                  ),
                },
                { label: "近 7 天訓練", value: `${last7DaysCount} 次` },
                { label: "距上次訓練", value: daysSinceLast === null ? "-" : daysSinceLast === 0 ? "今天" : `${daysSinceLast} 天` },
                { label: "累計訓練", value: `${data?.logs.length || 0} 次` },
              ].map((s) => (
                <div key={s.label} className="stat">
                  <span>{s.label}</span>
                  <b>{initialLoading ? <Skeleton w="3.5em" h="1em" /> : s.value}</b>
                </div>
              ))}
            </div>

            {initialLoading ? (
              <section className="card">
                <Skeleton block w="8em" h="0.7em" />
                <Skeleton block w="12em" h="1em" className="mt-2" />
                <div className="lift-summary mt-3">
                  {[0, 1].map((i) => (
                    <div key={i} className="metric">
                      <Skeleton block w="5em" h="1.1em" />
                      <Skeleton block w="7em" h="0.7em" className="mt-2" />
                    </div>
                  ))}
                </div>
                <Skeleton block w="100%" h="140px" className="mt-3 !rounded-xl" />
              </section>
            ) : (
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
            )}
          </section>
        )}

        {/* ==================== 2. 訓練 (Workout) ==================== */}
        {activeTab === "workout" && (
          <section className="fade-in">
            <div className="card hero">
              <div className="kicker">Next Workout</div>
              <div className="title">{initialLoading ? <Skeleton w="5em" h="0.95em" /> : currentWorkoutPlan?.name || "課表"}</div>
              <div className="next">
                {initialLoading ? <Skeleton w="12em" /> : currentWorkoutPlan?.description || "下一次訓練直接執行這張課表"}
              </div>
            </div>

            <div className="card">
              <div className="section-title">
                <h2>{initialLoading ? <Skeleton w="7em" h="1em" /> : `${currentWorkoutPlan?.name ?? ""} 動作清單`}</h2>
                <span className="badge">
                  {initialLoading ? <Skeleton w="3em" h="0.8em" /> : `${currentWorkoutPlan?.exercises.length || 0} 個動作`}
                </span>
              </div>

              {initialLoading &&
                Array.from({ length: 4 }, (_, i) => (
                  <div key={i} className="exercise">
                    <div className="exercise-top">
                      <Skeleton w="6em" h="1em" />
                      <Skeleton w="4.5em" h="0.9em" />
                    </div>
                    <Skeleton block w="9em" h="0.75em" className="mt-2" />
                  </div>
                ))}

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
                if (initialLoading) {
                  return Array.from({ length: 5 }, (_, i) => (
                    <div key={i} className="row">
                      <Skeleton w="4em" h="0.85em" />
                      <span>
                        <Skeleton w="3.5em" h="0.85em" />
                      </span>
                    </div>
                  ));
                }
                const cycle = data?.status.cycle || [];
                const curr = data?.status.currentIndex ?? 0;
                if (cycle.length <= 1) return <p className="tip">目前試算表中只有一張課表。</p>;
                // 從目前這課的下一課開始輪，才符合滾動循環的實際順序
                return Array.from({ length: cycle.length - 1 }, (_, i) => cycle[(curr + 1 + i) % cycle.length])
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

        {/* ==================== 3. 課表 (Plan) - 支援點擊查看詳細內容 ==================== */}
        {activeTab === "plan" && (
          <section className="fade-in">

            <div className="card">
              <div className="section-title">
                <h2>完整循環課表</h2>
                <span className="text-[11px] text-[var(--accent)]">點擊卡片查看詳細內容</span>
              </div>

              {initialLoading &&
                Array.from({ length: 6 }, (_, i) => (
                  <div key={i} className="flex items-center gap-3 py-3 border-b border-[var(--line)] last:border-b-0">
                    <Skeleton w="1.2em" h="0.8em" />
                    <div className="flex-1">
                      <Skeleton block w="10em" h="1em" />
                      <Skeleton block w="7em" h="0.7em" className="mt-1.5" />
                    </div>
                  </div>
                ))}
              {Object.values(data?.plans || {}).map((p, idx) => (
                <div
                  key={p.id}
                  onClick={() => setSelectedPlan(p)}
                  className="flex items-center justify-between py-3 border-b border-[var(--line)] last:border-b-0 cursor-pointer group hover:bg-[var(--sunken)]/60 px-2 -mx-2 rounded-xl transition-all"
                >
                  <div className="flex items-center gap-3">
                    <span className="num text-xs font-bold text-[var(--muted)] group-hover:text-[var(--accent)]">
                      0{idx + 1}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <b className="group-hover:text-[var(--accent)] transition-colors">{p.name}</b>
                        {p.primaryExercise && (
                          <span className="text-[10px] text-[var(--accent)] bg-[var(--accent-bg)] px-1.5 py-0.5 rounded border border-[var(--accent-line)]">
                            主項: {p.primaryExercise.name}
                          </span>
                        )}
                      </div>
                      <span className="block text-[11px] text-[var(--muted)]">
                        {p.category} · {p.exercises.length} 個動作
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[var(--muted)] group-hover:text-[var(--accent)] group-hover:translate-x-0.5 transition-all" />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ==================== 4. 紀錄 (Logs) - 支援點擊查看詳細內容 ==================== */}
        {activeTab === "logs" && (
          <section className="fade-in">
            <div className="card">
              <div className="section-title">
                <h2>訓練日誌歷史</h2>
                <span className="text-[11px] text-[var(--accent)]">點擊紀錄可看完整細節</span>
              </div>

              {initialLoading ? (
                // 載入中顯示卡片骨架，避免先閃出「尚無紀錄」的空狀態
                <div className="space-y-2">
                  {Array.from({ length: 3 }, (_, i) => (
                    <div key={i} className="p-3 rounded-xl bg-[var(--sunken)] border border-[var(--line)]">
                      <Skeleton w="8em" h="0.7em" />
                      <div className="mt-2 flex items-center justify-between">
                        <Skeleton w="6em" h="1em" />
                        <Skeleton w="3em" h="1em" />
                      </div>
                      <Skeleton block w="11em" h="0.7em" className="mt-2" />
                    </div>
                  ))}
                </div>
              ) : (!data?.logs || data.logs.length === 0) ? (
                <div className="py-8 text-center">
                  <p className="text-sm text-[var(--muted)]">目前 Google 試算表「訓練日誌」中尚無紀錄。</p>
                  <p className="text-xs text-[var(--accent)] mt-2">
                    點擊右下角【Gemini 記日誌】，輸入今天的訓練內容即可自動寫入！✨
                  </p>
                </div>
              ) : (
                // 手機上改用卡片列表取代寬表格；最新一筆排最上面
                <div className="space-y-2">
                  {[...data.logs].reverse().map((row, idx) => (
                    <button
                      type="button"
                      key={`${row.date}-${row.workout}-${idx}`}
                      onClick={() => setSelectedLog(row)}
                      className="w-full text-left p-3 rounded-xl bg-[var(--sunken)] border border-[var(--line)] hover:border-[var(--accent-line)] active:scale-[0.99] transition-all flex items-center gap-3"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 text-[11px]">
                          <span className="num text-[var(--muted)]">{row.date}</span>
                          <span className="font-bold text-[var(--accent)]">{row.workout}</span>
                          {row.pumpLevel && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--card)] text-[var(--orange)] border border-[var(--line)]">
                              {row.pumpLevel}
                            </span>
                          )}
                        </div>
                        <div className="mt-1 flex items-baseline justify-between gap-2">
                          <b className="text-sm text-[var(--text)] truncate">{row.mainExercise}</b>
                          <span className="num text-sm font-bold text-[var(--blue)] whitespace-nowrap">
                            {row.maxWeight ? `${row.maxWeight} kg` : "-"}
                          </span>
                        </div>
                        <div className="mt-0.5 text-[11px] text-[var(--muted)] break-words">{row.mainSetsDetail}</div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-[var(--muted)] flex-shrink-0" />
                    </button>
                  ))}
                </div>
              )}
              <p className="tip">訓練日誌 100% 與 Google 試算表「訓練日誌」同步。點擊任一筆日誌可查看 AI 評估、下次建議與身體反饋！</p>
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
              {initialLoading &&
                Array.from({ length: 6 }, (_, i) => (
                  <div key={i} className="row row-split">
                    <div>
                      <Skeleton block w="10em" h="0.95em" />
                      <Skeleton block w="13em" h="0.7em" className="mt-1.5" />
                    </div>
                    <div>
                      <Skeleton w="3.5em" h="0.95em" />
                    </div>
                  </div>
                ))}
              {Object.values(data?.plans || {}).map((p) => {
                const logsForP = (data?.logs || []).filter(
                  (l) => (p.primaryExercise?.name && l.mainExercise === p.primaryExercise.name) || l.workout === p.name
                );
                const max = logsForP.length > 0 ? Math.max(...logsForP.map((l) => l.maxWeight || 0)) : 0;
                const vol = logsForP.length > 0 ? logsForP[logsForP.length - 1].volume || 0 : 0;

                return (
                  <div key={p.id} className="row row-split">
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

      {/* 課表詳細內容彈跳視窗 */}
      <PlanDetailModal plan={selectedPlan} onClose={() => setSelectedPlan(null)} />

      {/* 組態面板：資料來源、服務狀態、欄位對照 */}
      <ConfigPanel open={configOpen} onClose={closeConfig} data={data} lastSyncedAt={lastSyncedAt} />

      {/* 訓練日誌詳細內容彈跳視窗 */}
      <LogDetailModal log={selectedLog} onClose={() => setSelectedLog(null)} />

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
