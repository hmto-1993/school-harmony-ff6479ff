export const levelLabels = ["ممتاز", "جيد جداً", "جيد", "مقبول", "ضعيف"];
export const levelColors: [number, number, number][] = [
  [16, 185, 129], [59, 130, 246], [251, 191, 36], [249, 115, 22], [239, 68, 68],
];

export const attColors: [number, number, number][] = [
  [16, 185, 129], [239, 68, 68], [251, 191, 36], [156, 163, 175],
];
export const attLabels = ["حاضر", "غائب", "متأخر", "لم يُسجل"];

export const classLineColors: [number, number, number][] = [
  [59, 130, 246], [16, 185, 129], [239, 68, 68], [251, 191, 36],
  [139, 92, 246], [249, 115, 22], [6, 182, 212], [236, 72, 153],
];

export const getLevel = (avg: number) => {
  if (avg >= 90) return 0;
  if (avg >= 80) return 1;
  if (avg >= 70) return 2;
  if (avg >= 60) return 3;
  return 4;
};
