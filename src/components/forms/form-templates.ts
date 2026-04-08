export interface FormTemplate {
  id: string;
  title: string;
  category: "general" | "behavior" | "confidential";
  icon: string;
  description: string;
  fields: FormField[];
}

export interface FormField {
  id: string;
  label: string;
  type: "text" | "textarea" | "date" | "auto";
  autoKey?: "student_name" | "class_name" | "national_id" | "date" | "grade" | "section";
  required?: boolean;
  placeholder?: string;
}

const commonAutoFields: FormField[] = [
  { id: "student_name", label: "اسم الطالب", type: "auto", autoKey: "student_name" },
  { id: "class_name", label: "الفصل", type: "auto", autoKey: "class_name" },
  { id: "national_id", label: "السجل المدني", type: "auto", autoKey: "national_id" },
  { id: "date", label: "التاريخ", type: "auto", autoKey: "date" },
];

export const categoryLabels: Record<string, { label: string; color: string }> = {
  general: { label: "عام", color: "hsl(var(--primary))" },
  behavior: { label: "سلوكي", color: "hsl(var(--warning))" },
  confidential: { label: "سري", color: "hsl(var(--destructive))" },
};

export const formTemplates: FormTemplate[] = [
  {
    id: "commitment",
    title: "نموذج الالتزام",
    category: "general",
    icon: "📝",
    description: "نموذج التزام عام للطالب",
    fields: [...commonAutoFields, { id: "commitment_text", label: "نص الالتزام", type: "textarea", placeholder: "أتعهد بـ..." }],
  },
  {
    id: "behavior_grades",
    title: "رصد درجات السلوك",
    category: "behavior",
    icon: "⭐",
    description: "رصد وتقييم درجات السلوك",
    fields: [...commonAutoFields, { id: "score", label: "الدرجة", type: "text" }, { id: "notes", label: "ملاحظات", type: "textarea" }],
  },
  {
    id: "behavior_plan",
    title: "خطة تعديل السلوك",
    category: "behavior",
    icon: "📋",
    description: "خطة لتعديل سلوك الطالب",
    fields: [...commonAutoFields, { id: "behavior_issue", label: "المشكلة السلوكية", type: "textarea" }, { id: "plan", label: "الخطة العلاجية", type: "textarea" }],
  },
  {
    id: "behavior_issue",
    title: "رصد مشكلة سلوكية",
    category: "behavior",
    icon: "⚠️",
    description: "توثيق مشكلة سلوكية",
    fields: [...commonAutoFields, { id: "issue_desc", label: "وصف المشكلة", type: "textarea" }, { id: "action_taken", label: "الإجراء المتخذ", type: "textarea" }],
  },
  {
    id: "problems_log",
    title: "رصد المشكلات",
    category: "behavior",
    icon: "📊",
    description: "سجل رصد المشكلات",
    fields: [...commonAutoFields, { id: "problem", label: "المشكلة", type: "textarea" }, { id: "solution", label: "الحل المقترح", type: "textarea" }],
  },
  {
    id: "grade_compensation",
    title: "فرص تعويض الدرجات",
    category: "general",
    icon: "📈",
    description: "نموذج فرص تعويض الدرجات",
    fields: [...commonAutoFields, { id: "subject", label: "المادة", type: "text" }, { id: "reason", label: "سبب التعويض", type: "textarea" }],
  },
  {
    id: "confidential_referral",
    title: "إحالة سري",
    category: "confidential",
    icon: "🔒",
    description: "إحالة سرية للطالب مع QR Code",
    fields: [...commonAutoFields, { id: "referral_reason", label: "سبب الإحالة", type: "textarea" }, { id: "recommendations", label: "التوصيات", type: "textarea" }],
  },
  {
    id: "behavior_pledge",
    title: "تعهد سلوكي",
    category: "behavior",
    icon: "✍️",
    description: "تعهد سلوكي من الطالب",
    fields: [...commonAutoFields, { id: "pledge_text", label: "نص التعهد", type: "textarea" }],
  },
  {
    id: "parent_notice",
    title: "إشعار ولي أمر",
    category: "general",
    icon: "📬",
    description: "إشعار رسمي لولي الأمر",
    fields: [...commonAutoFields, { id: "parent_name", label: "اسم ولي الأمر", type: "text" }, { id: "notice_body", label: "نص الإشعار", type: "textarea" }],
  },
  {
    id: "invitation_letter",
    title: "خطاب دعوة",
    category: "general",
    icon: "✉️",
    description: "خطاب دعوة رسمي",
    fields: [...commonAutoFields, { id: "invited_to", label: "المدعو إلى", type: "text" }, { id: "purpose", label: "الغرض من الدعوة", type: "textarea" }],
  },
  {
    id: "incident_report",
    title: "محضر ضبط واقعة",
    category: "confidential",
    icon: "🚨",
    description: "محضر ضبط واقعة رسمي",
    fields: [...commonAutoFields, { id: "incident_desc", label: "وصف الواقعة", type: "textarea" }, { id: "witnesses", label: "الشهود", type: "text" }, { id: "action", label: "الإجراء المتخذ", type: "textarea" }],
  },
  {
    id: "committee_meeting",
    title: "محضر اجتماع اللجنة",
    category: "general",
    icon: "🏛️",
    description: "محضر اجتماع لجنة رسمي",
    fields: [...commonAutoFields, { id: "attendees", label: "الحاضرون", type: "textarea" }, { id: "agenda", label: "جدول الأعمال", type: "textarea" }, { id: "decisions", label: "القرارات", type: "textarea" }],
  },
  {
    id: "violence_report",
    title: "بلاغ عنف",
    category: "confidential",
    icon: "🛡️",
    description: "بلاغ حالة عنف",
    fields: [...commonAutoFields, { id: "violence_desc", label: "وصف الحالة", type: "textarea" }, { id: "immediate_action", label: "الإجراء الفوري", type: "textarea" }],
  },
  {
    id: "high_risk_report",
    title: "بلاغ عالية الخطورة",
    category: "confidential",
    icon: "🔴",
    description: "بلاغ حالة عالية الخطورة",
    fields: [...commonAutoFields, { id: "risk_desc", label: "وصف الخطورة", type: "textarea" }, { id: "risk_action", label: "الإجراءات المتخذة", type: "textarea" }],
  },
  {
    id: "excused_absence",
    title: "غياب بعذر",
    category: "general",
    icon: "📗",
    description: "نموذج غياب بعذر مقبول",
    fields: [...commonAutoFields, { id: "absence_date", label: "تاريخ الغياب", type: "date" }, { id: "excuse_reason", label: "سبب الغياب", type: "textarea" }],
  },
  {
    id: "unexcused_absence",
    title: "غياب بدون عذر",
    category: "general",
    icon: "📕",
    description: "نموذج غياب بدون عذر",
    fields: [...commonAutoFields, { id: "absence_date_un", label: "تاريخ الغياب", type: "date" }, { id: "parent_contacted", label: "هل تم التواصل مع ولي الأمر؟", type: "text" }],
  },
  {
    id: "attendance_pledge",
    title: "تعهد بالمواظبة",
    category: "general",
    icon: "📆",
    description: "تعهد بالمواظبة والانتظام",
    fields: [...commonAutoFields, { id: "pledge_attendance", label: "نص التعهد", type: "textarea", placeholder: "أتعهد بالمواظبة على الحضور..." }],
  },
];
