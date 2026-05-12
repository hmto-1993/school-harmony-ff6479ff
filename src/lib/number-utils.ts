// ── Number digit normalization ─────────────────────────────────────
// Converts Arabic (٠-٩) and Persian (۰-۹) digits to English (0-9)

const DIGIT_MAP: Record<string, string> = {
  "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4",
  "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9",
  "۰": "0", "۱": "1", "۲": "2", "۳": "3", "۴": "4",
  "۵": "5", "۶": "6", "۷": "7", "۸": "8", "۹": "9",
};

export function toEnglishDigits(value: string | number | null | undefined): string {
  if (value == null) return "";
  return String(value).replace(/[٠-٩۰-۹]/g, (ch) => DIGIT_MAP[ch] ?? ch);
}

/** React onChange wrapper that normalizes digits before calling handler */
export function withEnglishDigits(
  handler: (value: string) => void
): (e: React.ChangeEvent<HTMLInputElement>) => void {
  return (e) => {
    handler(toEnglishDigits(e.target.value));
  };
}

/** Input event handler for inline normalization (mutates input.value) */
export function normalizeInputDigits(e: React.FormEvent<HTMLInputElement>): void {
  const input = e.currentTarget;
  const val = input.value;
  const norm = toEnglishDigits(val);
  if (norm !== val) {
    const start = input.selectionStart ?? 0;
    const end = input.selectionEnd ?? 0;
    const delta = norm.length - val.length;
    input.value = norm;
    input.setSelectionRange(Math.max(0, start + delta), Math.max(0, end + delta));
  }
}
