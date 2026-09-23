export interface TrainingLog {
  id?: string;
  date: string; // YYYYMMDD 或 YYYY-MM-DD
  workout: string; // 例如 Push A, Pull A
  exercise: string; // 動作名稱
  setsReps: string; // 例如 50x8 / 55x8 / 55x8 / 50x8
  volume?: number; // 該動作總訓練量 kg
  notes?: string;
}

export interface WorkoutExercise {
  name: string;
  sets: string; // 例如 4 × 6–10
  notes: string; // 例如 RIR 1–2 · 說明
  isPrimary?: boolean;
}

export interface WorkoutPlan {
  id: string; // Push A
  name: string; // Push A · 胸部主導
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
