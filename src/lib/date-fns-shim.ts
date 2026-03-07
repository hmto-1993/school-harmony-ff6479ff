// Shim for date-fns - provides the exports that react-day-picker needs
// This replaces the broken date-fns package

export { format, subDays, addDays, isToday, isAfter, isBefore, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subWeeks, subMonths, eachDayOfInterval } from "./date-utils";

// Additional exports that react-day-picker uses internally
export function addMonths(date: Date | number, amount: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + amount);
  return d;
}

export function addWeeks(date: Date | number, amount: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + amount * 7);
  return d;
}

export function addYears(date: Date | number, amount: number): Date {
  const d = new Date(date);
  d.setFullYear(d.getFullYear() + amount);
  return d;
}

export function differenceInCalendarDays(dateLeft: Date | number, dateRight: Date | number): number {
  const a = new Date(dateLeft);
  const b = new Date(dateRight);
  a.setHours(0, 0, 0, 0);
  b.setHours(0, 0, 0, 0);
  return Math.round((a.getTime() - b.getTime()) / 86400000);
}

export function differenceInCalendarMonths(dateLeft: Date | number, dateRight: Date | number): number {
  const a = new Date(dateLeft);
  const b = new Date(dateRight);
  return (a.getFullYear() - b.getFullYear()) * 12 + (a.getMonth() - b.getMonth());
}

export function startOfDay(date: Date | number): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfDay(date: Date | number): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function getUnixTime(date: Date | number): number {
  return Math.floor(new Date(date).getTime() / 1000);
}

export function getWeek(date: Date | number): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
}

export function getWeeksInMonth(date: Date | number, options?: { weekStartsOn?: number }): number {
  const start = startOfMonth(date);
  const end = endOfMonth(date);
  const weekStart = options?.weekStartsOn ?? 0;
  const startDay = (start.getDay() - weekStart + 7) % 7;
  const totalDays = end.getDate();
  return Math.ceil((startDay + totalDays) / 7);
}

export function isSameDay(dateLeft: Date | number, dateRight: Date | number): boolean {
  const a = new Date(dateLeft);
  const b = new Date(dateRight);
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function isSameMonth(dateLeft: Date | number, dateRight: Date | number): boolean {
  const a = new Date(dateLeft);
  const b = new Date(dateRight);
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

export function isSameYear(dateLeft: Date | number, dateRight: Date | number): boolean {
  return new Date(dateLeft).getFullYear() === new Date(dateRight).getFullYear();
}

export function isDate(value: any): value is Date {
  return value instanceof Date && !isNaN(value.getTime());
}

export function isValid(date: any): boolean {
  return date instanceof Date && !isNaN(date.getTime());
}

export function setMonth(date: Date | number, month: number): Date {
  const d = new Date(date);
  d.setMonth(month);
  return d;
}

export function setYear(date: Date | number, year: number): Date {
  const d = new Date(date);
  d.setFullYear(year);
  return d;
}

export function startOfYear(date: Date | number): Date {
  const d = new Date(date);
  d.setMonth(0, 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfYear(date: Date | number): Date {
  const d = new Date(date);
  d.setMonth(11, 31);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function max(dates: (Date | number)[]): Date {
  return new Date(Math.max(...dates.map(d => new Date(d).getTime())));
}

export function min(dates: (Date | number)[]): Date {
  return new Date(Math.min(...dates.map(d => new Date(d).getTime())));
}

// Re-export startOfMonth/endOfMonth for internal use
import { startOfMonth, endOfMonth, startOfWeek as _startOfWeek } from "./date-utils";

export function startOfISOWeek(date: Date | number): Date {
  return _startOfWeek(date, { weekStartsOn: 1 });
}

export function endOfISOWeek(date: Date | number): Date {
  const d = startOfISOWeek(date);
  d.setDate(d.getDate() + 6);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function getISOWeek(date: Date | number): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
}

export function parse(dateString: string, formatString: string, referenceDate: Date): Date {
  // Simple parse implementation for common formats
  const d = new Date(dateString);
  return isNaN(d.getTime()) ? referenceDate : d;
}
