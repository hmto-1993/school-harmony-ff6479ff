import vision2030 from "@/assets/vision-2030-education.png";

/**
 * شعار افتراضي لخانة الشعار رقم 2 (الوسط) في ترويسة الطباعة:
 * شعار رؤية 2030 - وزارة التعليم.
 *
 * يُستخدم تلقائياً عندما تكون خانة الشعار رقم 2 فارغة في إعدادات المستخدم.
 */
export const DEFAULT_CENTER_LOGO_2 = vision2030;

/**
 * يُرجع رابط الصورة لخانة شعار حسب الفهرس، مع تطبيق الافتراضيات.
 * - الفهرس 1 (الخانة الوسطى/شعار 2): رؤية 2030 - وزارة التعليم
 */
export function resolveLogoSrc(index: number, value: string | undefined | null): string {
  if (value && value.trim()) return value;
  if (index === 1) return DEFAULT_CENTER_LOGO_2;
  return "";
}
