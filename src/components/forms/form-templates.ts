export interface FormTemplate {
  id: string;
  title: string;
  category: "general" | "behavior" | "confidential";
  icon: string;
  description: string;
  fields: FormField[];
  /** Pre-filled official body text with placeholders like {student_name}, {class_name} */
  bodyTemplate?: string;
  /** Custom signature labels (overrides default) */
  signatureLabels?: string[];
  /** Enable WhatsApp send button */
  whatsappEnabled?: boolean;
  /** WhatsApp message template */
  whatsappTemplate?: string;
}

export interface FormField {
  id: string;
  label: string;
  type: "text" | "textarea" | "date" | "auto";
  autoKey?: "student_name" | "class_name" | "national_id" | "date" | "grade" | "section";
  required?: boolean;
  placeholder?: string;
  /** If true, the field is hidden from UI (used only in PDF body template) */
  hidden?: boolean;
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
    title: "نموذج الالتزام المدرسي",
    category: "general",
    icon: "📝",
    description: "إقرار الالتزام بقواعد السلوك والمواظبة",
    bodyTemplate:
      "نموذج إقرار الالتزام بقواعد السلوك والمواظبة لعام 1447هـ\n\nيقر الطالب/ {student_name} المقيد في فصل/ {class_name} وولي أمره بالاطلاع على لائحة السلوك والمواظبة والالتزام بما جاء فيها لضمان بيئة تعليمية محفزة.\n\nالسجل المدني: {national_id}\nالتاريخ: {date}",
    signatureLabels: ["توقيع الطالب", "توقيع ولي الأمر", "معلم المادة", "المرشد الطلابي"],
    fields: [...commonAutoFields],
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
    description: "تعهد سلوكي رسمي من الطالب بالالتزام بقواعد السلوك",
    bodyTemplate:
      "أنا الطالب/ {student_name} المقيد في فصل/ {class_name} أتعهد بالالتزام بقواعد السلوك والمواظبة داخل فصل الفيزياء وفي المدرسة، وفي حال تكرار المخالفة يحق للمدرسة اتخاذ الإجراءات النظامية بحقي.\n\nالسجل المدني: {national_id}\nالتاريخ: {date}",
    signatureLabels: ["توقيع الطالب", "توقيع ولي الأمر"],
    fields: [...commonAutoFields],
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
    title: "خطاب دعوة ولي أمر",
    category: "general",
    icon: "✉️",
    description: "خطاب دعوة رسمي لولي الأمر لمراجعة المدرسة",
    bodyTemplate:
      "المكرم ولي أمر الطالب/ {student_name}\n\nالسلام عليكم ورحمة الله وبركاته..\n\nنأمل منكم مراجعة المدرسة (قسم التوجيه الطلابي) في يوم/ {visit_day} الموافق/ {visit_date} لمناقشة أمر يخص الطالب.\n\nفصل الطالب: {class_name}\nالسجل المدني: {national_id}\n\nشاكرين لكم حسن تعاونكم.",
    signatureLabels: ["معلم المادة", "المرشد الطلابي", "قائد المدرسة"],
    whatsappEnabled: true,
    whatsappTemplate:
      "المكرم ولي أمر الطالب/ {student_name}\n\nالسلام عليكم ورحمة الله وبركاته\n\nنأمل منكم مراجعة المدرسة (قسم التوجيه الطلابي) في يوم/ {visit_day} الموافق/ {visit_date} لمناقشة أمر يخص الطالب.\n\nثانوية الفيصلية - ألفا فيزياء",
    fields: [
      ...commonAutoFields,
      { id: "visit_day", label: "يوم الزيارة", type: "text", placeholder: "مثال: الأحد" },
      { id: "visit_date", label: "تاريخ الزيارة", type: "date" },
    ],
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
    description: "تعهد بالمواظبة والانتظام في حصة الفيزياء",
    bodyTemplate:
      "أتعهد أنا الطالب/ {student_name} بالمواظبة على الحضور وعدم التأخر عن حصة الفيزياء، وأدرك أن الغياب والتأخر يؤثر سلباً على مستواي التحصيلي.\n\nالفصل: {class_name}\nالسجل المدني: {national_id}\nالتاريخ: {date}",
    signatureLabels: ["توقيع الطالب", "توقيع ولي الأمر", "معلم المادة"],
    fields: [...commonAutoFields],
  },
];
