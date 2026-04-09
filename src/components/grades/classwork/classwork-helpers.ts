import type { GradeLevel, CategoryInfo } from "./classwork-types";

export const isParticipation = (name: string) => name === "المشاركة" || name.includes("المشاركة");
export const DEFAULT_MAX_SLOTS = 3;

export function getMaxDisplayIcons(catName: string): number {
  if (catName === "المشاركة") return 20;
  if (catName === "الواجبات") return 8;
  if (catName === "الكتاب") return 8;
  if (catName === "الأعمال والمشاريع") return 8;
  return 8;
}

export function restoreSlotsFromScore({
  score,
  maxScore,
  slotCount,
  isParticipationCategory,
}: {
  score: number | null;
  maxScore: number;
  slotCount: number;
  isParticipationCategory: boolean;
}): { slots: GradeLevel[]; starred: boolean } {
  if (score === null) return { slots: [], starred: false };
  // Full score → starred for ALL categories (not just participation)
  if (score >= maxScore) return { slots: [], starred: true };
  if (score === 0) return { slots: ["zero"], starred: false };

  const perSlot = Math.round(maxScore / slotCount);
  const averageScore = Math.round(perSlot / 2);
  const restoredSlots: GradeLevel[] = [];
  let remaining = score;
  while (remaining > 0 && restoredSlots.length < slotCount) {
    if (remaining >= perSlot) { restoredSlots.push("excellent"); remaining -= perSlot; continue; }
    if (remaining >= averageScore) { restoredSlots.push("average"); remaining -= averageScore; continue; }
    restoredSlots.push("average"); remaining = 0;
  }
  return { slots: restoredSlots.length > 0 ? restoredSlots : [], starred: false };
}

export const calcManualSubtotal = (scores: Record<string, number>, cats: CategoryInfo[]) => {
  let score = 0, max = 0;
  cats.forEach(cat => {
    max += Number(cat.max_score);
    score += scores[cat.id] ?? 0;
  });
  return { score, max };
};
