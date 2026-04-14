// Radar quiz question types
export interface RadarQuestion {
  id: string;
  type: "mcq" | "truefalse";
  text: string;
  options: string[]; // 4 for mcq, 2 for truefalse
  correctIndex: number;
  score: number;
  enabled: boolean;
}

const STORAGE_KEY = "radar_quiz_questions";

export function loadQuestions(): RadarQuestion[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveQuestions(questions: RadarQuestion[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(questions));
}

export function getRandomQuestion(questions: RadarQuestion[]): RadarQuestion | null {
  const enabled = questions.filter((q) => q.enabled);
  if (enabled.length === 0) return null;
  return enabled[Math.floor(Math.random() * enabled.length)];
}

export function createEmptyQuestion(type: "mcq" | "truefalse"): RadarQuestion {
  return {
    id: crypto.randomUUID(),
    type,
    text: "",
    options: type === "mcq" ? ["", "", "", ""] : ["صح", "خطا"],
    correctIndex: 0,
    score: 1,
    enabled: true,
  };
}
