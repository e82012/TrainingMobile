export interface TrainingLog {
  id?: string;
  date: string; // YYYY-MM-DD
  planId?: string; // 課表計畫id
  workout: string; // Push A, Pull A, etc.
  mainExercise: string; // 主項動作
  mainSetsDetail: string; // 主項工作組明細，例如 50x8 / 55x8 / 55x8 / 50x8
  maxWeight: number; // 最高重量(kg)
  accessoryExercises: string; // 輔助動作
  pumpLevel?: string; // 充血度 (高/佳/良好)
  muscleFeeling?: string; // 目標肌群感受
  fatigueLevel?: string; // 疲勞度
  aiSummary?: string; // AI評估摘要
  aiNextSuggestion?: string; // 下次行動建議
  volume?: number; // 計算的主項 Volume
}

export interface WorkoutExercise {
  name: string; // 動作名稱
  type?: string; // 主項 / 輔助
  sets: string; // 目標組數與次數
  notes: string; // 下一階段目標或備註
  isPrimary?: boolean;
}

export interface WorkoutPlan {
  id: string; // Push A
  name: string; // Push A
  category?: string; // 訓練部位，例如 胸、側三角、三頭
  description: string;
  exercises: WorkoutExercise[];
}

export interface CycleStatus {
  lastWorkout: {
    date: string;
    workout: string;
  };
  nextWorkout: {
    workout: string;
    subtitle: string;
  };
  cycle: string[]; // ["Push A", "Pull A", "Legs A", "Push B", "Pull B", "Legs B"]
  currentIndex: number;
}

export interface PrimaryLiftSession {
  date: string;
  sets: [number, number][]; // [重量 kg, 次數 reps][]
  volume?: number;
  maxWeight?: number;
}

export interface DashboardData {
  status: CycleStatus;
  primaryLift: {
    name: string;
    target: string;
    sessions: PrimaryLiftSession[];
  };
  plans: Record<string, WorkoutPlan>;
  logs: TrainingLog[];
  isDemoMode?: boolean;
  spreadsheetTitle?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  structuredAction?: {
    actionType: "ADD_LOG" | "UPDATE_PLAN" | "QUERY";
    details?: any;
    success?: boolean;
  };
}
