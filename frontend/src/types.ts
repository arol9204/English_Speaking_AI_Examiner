export type Level = "easy" | "medium" | "hard";
export type Skill = "Reading" | "Listening" | "Writing" | "Speaking";

export interface Task {
  key: string;
  exam: string;
  /** Which page component shows the task. */
  screen: string;
  kind: "auto" | "writing" | "speaking" | "conversation";
  name: string;
  subscore: Skill;
  time_seconds: number;
  time_note?: string;
  part2_seconds?: number;
  prep_seconds: number;
  choose_seconds?: number;
  count: string;
  question_count?: number;
  max_plays?: number;
  summary: string;
  instruction?: string;
  sections_note?: string;
  speak_questions?: boolean;
  word_range?: [number, number];
  spellcheck?: boolean;
  tips: string[];
  criteria?: string[];
  needs_photos?: boolean;
  available: boolean;
}

export interface Exam {
  key: string;
  name: string;
  short_name: string;
  summary: string;
  facts?: { label: string; value: string }[];
  skills?: Skill[];
  skill_times?: Partial<Record<Skill, string>>;
  source?: string;
  criteria_names?: Record<string, string>;
  available: boolean;
  task_count?: number;
  available_task_count?: number;
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
  per_answer?: string[];
}

export interface Feedback {
  metrics: Record<string, unknown>;
  claude_prompt: string;
  scale: { name: string; levels: string[] };
  criteria_names: Record<string, string>;
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

/** A multiple-choice question in a CELPIP reading or listening part. */
export interface ChoiceQuestion {
  id: string;
  prompt?: string;
  options?: string[];
}

export interface CheckResult {
  score: number;
  correct: number;
  total: number;
  results: { id: string; chosen: number | null; answer: number; correct: boolean; explanation: string }[];
}
