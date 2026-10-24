/** Practice history saved in this browser (localStorage). */

export interface Attempt {
  task: string;
  level?: string;
  score: number | null;
  at: string;
}

const KEY = "det-practice-history";

export function loadHistory(): Attempt[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function saveAttempt(attempt: Attempt) {
  try {
    localStorage.setItem(KEY, JSON.stringify([...loadHistory(), attempt].slice(-500)));
  } catch {
    /* storage unavailable: history is a convenience only */
  }
}
