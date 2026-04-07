export interface ClassOption {
  id: string;
  name: string;
  grade: string;
  section: string;
}

export interface CategoryOption {
  id: string;
  name: string;
  max_score: number;
}

export interface GradeEntry {
  name: string;
  nationalId: string;
  scores: { categoryName: string; maxScore: number; score: number | null }[];
}
