// سياسة كلمة المرور الموحّدة عبر التطبيق بأكمله.
// المتطلبات: 8+ خانات، حرف واحد على الأقل (لاتيني أو عربي)، رقم، ورمز.

export const PASSWORD_MIN_LENGTH = 8;

export const PASSWORD_POLICY_HINT =
  "يجب ألا تقل عن 8 خانات وتحتوي على حروف وأرقام ورمز (مثال: Ahmed@2026).";

export function validatePassword(pw: string): string | null {
  if (!pw || pw.length < PASSWORD_MIN_LENGTH) {
    return `كلمة المرور يجب أن تكون 8 خانات على الأقل.`;
  }
  if (!/[A-Za-z\u0600-\u06FF]/.test(pw)) {
    return "كلمة المرور يجب أن تحتوي على حرف واحد على الأقل.";
  }
  if (!/\d/.test(pw)) {
    return "كلمة المرور يجب أن تحتوي على رقم واحد على الأقل.";
  }
  if (!/[^A-Za-z0-9\u0600-\u06FF\s]/.test(pw)) {
    return "كلمة المرور يجب أن تحتوي على رمز واحد على الأقل (مثل @ # ! $).";
  }
  return null;
}

export function isStrongPassword(pw: string): boolean {
  return validatePassword(pw) === null;
}
