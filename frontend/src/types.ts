export type Level = "easy" | "medium" | "hard";

export interface Task {
  key: string;
  name: string;
  subscore: "Reading" | "Listening" | "Writing" | "Speaking";
  time_seconds: number;
  time_note?: string;
  part2_seconds?: number;
  prep_seconds: number;
  count: string;
  max_plays?: number;
  summary: string;
  tips: string[];
  criteria?: string[];
  needs_photos?: boolean;
  available: boolean;
}

export interface ServiceStatus {
  available: boolean;
  model: string;
  reason: string | null;
}

export interface Status {
  llm: ServiceStatus;
  stt: ServiceStatus;
  photos: number;
}

export interface CriterionResult {
  level: string;
  comment: string;
}

export interface AIFeedback {
  criteria: Record<string, CriterionResult>;
  overall_level: string;
  strengths: string[];
  improvements: string[];
  corrections: { original: string; corrected: string; explanation: string }[];
  improved_answer: string;
}

export interface Feedback {
  metrics: Record<string, unknown>;
  claude_prompt: string;
  ai: AIFeedback | null;
  ai_error: string | null;
}

/** Props every task component receives. `onDone` records a 0-1 score in the history. */
export interface TaskProps {
  task: Task;
  level: Level;
  onDone: (score: number | null) => void;
}

export interface Gap {
  type: "gap";
  index: number;
  prefix: string;
  missing_length: number;
}

export type Segment = { type: "text"; text: string } | Gap;
