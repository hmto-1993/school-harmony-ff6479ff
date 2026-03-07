// Type shim for date-fns compatibility
declare module "date-fns" {
  export function format(date: Date | number | string, formatStr: string, options?: any): string;
  export function startOfWeek(date: Date | number, options?: any): Date;
  export function endOfWeek(date: Date | number, options?: any): Date;
  export function startOfMonth(date: Date | number): Date;
  export function endOfMonth(date: Date | number): Date;
  export function subWeeks(date: Date | number, amount: number): Date;
  export function subMonths(date: Date | number, amount: number): Date;
  export function eachDayOfInterval(interval: { start: Date | number; end: Date | number }): Date[];
  export function isToday(date: Date | number): boolean;
  export function isSameDay(dateLeft: Date | number, dateRight: Date | number): boolean;
  export function addDays(date: Date | number, amount: number): Date;
  export function subDays(date: Date | number, amount: number): Date;
  export function parseISO(argument: string): Date;
  export function isValid(date: any): boolean;
  export function differenceInDays(dateLeft: Date | number, dateRight: Date | number): number;
  export function startOfDay(date: Date | number): Date;
  export function endOfDay(date: Date | number): Date;
  export function isAfter(date: Date | number, dateToCompare: Date | number): boolean;
  export function isBefore(date: Date | number, dateToCompare: Date | number): boolean;
  export function addMonths(date: Date | number, amount: number): Date;
  export function getDay(date: Date | number): number;
  export function getMonth(date: Date | number): number;
  export function getYear(date: Date | number): number;
  export function setMonth(date: Date | number, month: number): Date;
  export function setYear(date: Date | number, year: number): Date;
}

declare module "date-fns/locale" {
  export const ar: any;
  export const arSA: any;
  export const enUS: any;
}
