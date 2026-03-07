// Native date utility functions to replace date-fns

export function format(date: Date | number | string, formatStr: string): string {
  const d = typeof date === "string" ? new Date(date) : date instanceof Date ? date : new Date(date);

  const pad = (n: number, len = 2) => String(n).padStart(len, "0");

  const year = d.getFullYear();
  const month = d.getMonth(); // 0-based
  const day = d.getDate();
  const hours24 = d.getHours();
  const hours12 = hours24 % 12 || 12;
  const minutes = d.getMinutes();
  const seconds = d.getSeconds();
  const ampm = hours24 >= 12 ? "م" : "ص";

  const weekdaysAr = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
  const monthsShort = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  return formatStr
    .replace("yyyy", String(year))
    .replace("MM", pad(month + 1))
    .replace("dd", pad(day))
    .replace("HH", pad(hours24))
    .replace("hh", pad(hours12))
    .replace("mm", pad(minutes))
    .replace("ss", pad(seconds))
    .replace("EEEE", weekdaysAr[d.getDay()])
    .replace("MMM", monthsShort[month])
    .replace(/\ba\b/, ampm)
    .replace("PPP", d.toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" }))
    .replace("PP", d.toLocaleDateString("ar-SA", { year: "numeric", month: "short", day: "numeric" }));
}

export function subDays(date: Date | number, amount: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - amount);
  return d;
}

export function addDays(date: Date | number, amount: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + amount);
  return d;
}

export function isToday(date: Date | number): boolean {
  const d = new Date(date);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

export function isAfter(date: Date | number, dateToCompare: Date | number): boolean {
  return new Date(date).getTime() > new Date(dateToCompare).getTime();
}

export function isBefore(date: Date | number, dateToCompare: Date | number): boolean {
  return new Date(date).getTime() < new Date(dateToCompare).getTime();
}

export function startOfWeek(date: Date | number, options?: { weekStartsOn?: number }): Date {
  const d = new Date(date);
  const day = d.getDay();
  const start = options?.weekStartsOn ?? 0;
  const diff = (day - start + 7) % 7;
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfWeek(date: Date | number, options?: { weekStartsOn?: number }): Date {
  const d = startOfWeek(date, options);
  d.setDate(d.getDate() + 6);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function startOfMonth(date: Date | number): Date {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfMonth(date: Date | number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + 1, 0);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function subWeeks(date: Date | number, amount: number): Date {
  return subDays(date, amount * 7);
}

export function subMonths(date: Date | number, amount: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() - amount);
  return d;
}

export function eachDayOfInterval(interval: { start: Date | number; end: Date | number }): Date[] {
  const days: Date[] = [];
  const current = new Date(interval.start);
  current.setHours(0, 0, 0, 0);
  const end = new Date(interval.end);
  end.setHours(0, 0, 0, 0);
  while (current <= end) {
    days.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return days;
}
