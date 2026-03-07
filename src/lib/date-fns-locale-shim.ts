// Shim for date-fns/locale used by react-day-picker
export const enUS = {
  code: "en-US",
  formatDistance: (...args: any[]) => "",
  formatRelative: (...args: any[]) => "",
  localize: {
    ordinalNumber: (n: number) => String(n),
    era: (n: number) => ["BC", "AD"][n],
    quarter: (n: number) => `Q${n + 1}`,
    month: (n: number) => ["January","February","March","April","May","June","July","August","September","October","November","December"][n],
    day: (n: number) => ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][n],
    dayPeriod: (n: string) => n,
  },
  formatLong: {
    date: () => "MM/dd/yyyy",
    time: () => "HH:mm:ss",
    dateTime: () => "MM/dd/yyyy HH:mm:ss",
  },
  match: {
    ordinalNumber: () => ({ value: 0, rest: "" }),
    era: () => ({ value: 0, rest: "" }),
    quarter: () => ({ value: 0, rest: "" }),
    month: () => ({ value: 0, rest: "" }),
    day: () => ({ value: 0, rest: "" }),
    dayPeriod: () => ({ value: "", rest: "" }),
  },
  options: {
    weekStartsOn: 0,
    firstWeekContainsDate: 1,
  },
};

export const ar = {
  ...enUS,
  code: "ar-SA",
  localize: {
    ...enUS.localize,
    month: (n: number) => ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"][n],
    day: (n: number) => ["الأحد","الإثنين","الثلاثاء","الأربعاء","الخميس","الجمعة","السبت"][n],
  },
  options: {
    weekStartsOn: 6,
    firstWeekContainsDate: 1,
  },
};

export const arSA = ar;
