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
  /** Admin urgent WhatsApp alert */
  adminAlertEnabled?: boolean;
  /** Admin alert WhatsApp message template */
  adminAlertTemplate?: string;
  /** Render as official protocol table layout in PDF */
  protocolLayout?: boolean;
  /** Protocol table sections */
  protocolSections?: { title: string; fieldId: string }[];
  /** Enable multi-student witness picker */
  witnessPickerEnabled?: boolean;
  /** Never visible in parent portal */
  parentHidden?: boolean;
  /** Add confidential watermark to PDF */
  confidentialWatermark?: boolean;
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

/** IDs of forms that must never appear in parent portal */
export const PARENT_HIDDEN_FORM_IDS = [
  "confidential_referral",
  "incident_report",
  "violence_report",
  "high_risk_report",
];

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
  // ====== CONFIDENTIAL FORM #7 ======
  {
    id: "confidential_referral",
    title: "إحالة سري",
    category: "confidential",
    icon: "🔒",
    description: "إحالة سرية موجهة للموجه الطلابي أو المدير — لا تظهر للطالب أو ولي الأمر",
    parentHidden: true,
    confidentialWatermark: true,
    bodyTemplate:
      "إحالة سرية\n\nيتم إحالة الطالب/ {student_name} المقيد في فصل/ {class_name} إلى قسم التوجيه الطلابي / الإدارة للنظر في الحالة التالية:\n\nسبب الإحالة:\n{referral_reason}\n\nالملاحظات والتفاصيل:\n{referral_details}\n\nالتوصيات:\n{recommendations}\n\nملاحظة: هذا النموذج سري ولا يُطلع عليه الطالب أو ولي أمره.\n\nالسجل المدني: {national_id}\nالتاريخ: {date}",
    signatureLabels: ["معلم المادة", "الموجه الطلابي", "قائد المدرسة"],
    adminAlertEnabled: true,
    adminAlertTemplate:
      "⚠️ تنبيه إداري: تم رصد إحالة سرية للطالب/ {student_name} تتطلب تدخلاً عاجلاً.\nالتفاصيل متوفرة في المنصة.\n\nثانوية الفيصلية - ألفا فيزياء",
    fields: [
      ...commonAutoFields,
      { id: "referral_reason", label: "سبب الإحالة", type: "textarea", placeholder: "اذكر سبب الإحالة بالتفصيل..." },
      { id: "referral_details", label: "الملاحظات والتفاصيل", type: "textarea", placeholder: "تفاصيل إضافية عن الحالة..." },
      { id: "recommendations", label: "التوصيات", type: "textarea", placeholder: "التوصيات المقترحة..." },
    ],
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
  // ====== CONFIDENTIAL FORM #11 ======
  {
    id: "incident_report",
    title: "محضر ضبط واقعة",
    category: "confidential",
    icon: "🚨",
    description: "محضر رسمي لضبط واقعة مع تحديد الشهود والأطراف",
    parentHidden: true,
    confidentialWatermark: true,
    protocolLayout: true,
    witnessPickerEnabled: true,
    protocolSections: [
      { title: "بيانات الواقعة", fieldId: "incident_data" },
      { title: "أقوال الأطراف", fieldId: "party_statements" },
      { title: "التوصيات والإجراءات", fieldId: "recommendations" },
    ],
    signatureLabels: ["المعلم المبلّغ", "الموجه الطلابي", "قائد المدرسة"],
    adminAlertEnabled: true,
    adminAlertTemplate:
      "⚠️ تنبيه إداري: تم رصد واقعة تتطلب تدخلاً عاجلاً.\nالطالب: {student_name}\nالتفاصيل في المرفق/المنصة.\n\nثانوية الفيصلية - ألفا فيزياء",
    fields: [
      ...commonAutoFields,
      { id: "incident_time", label: "وقت الواقعة", type: "text", placeholder: "مثال: 10:30 صباحاً" },
      { id: "incident_location", label: "مكان الواقعة", type: "text", placeholder: "مثال: الفصل / الساحة" },
      { id: "incident_desc", label: "وصف الواقعة بالتفصيل", type: "textarea", placeholder: "اذكر تفاصيل الواقعة كاملة..." },
      { id: "involved_parties", label: "الأطراف المشاركة", type: "textarea", placeholder: "أسماء جميع الأطراف المعنية..." },
      { id: "party_statements", label: "أقوال الأطراف", type: "textarea", placeholder: "أقوال كل طرف على حدة..." },
      { id: "recommendations", label: "التوصيات والإجراءات المتخذة", type: "textarea", placeholder: "الإجراءات الفورية والتوصيات..." },
    ],
  },
  {
    id: "committee_meeting",
    title: "محضر اجتماع اللجنة",
    category: "general",
    icon: "🏛️",
    description: "محضر اجتماع لجنة رسمي",
    fields: [...commonAutoFields, { id: "attendees", label: "الحاضرون", type: "textarea" }, { id: "agenda", label: "جدول الأعمال", type: "textarea" }, { id: "decisions", label: "القرارات", type: "textarea" }],
  },
  // ====== CONFIDENTIAL FORM #13 ======
  {
    id: "violence_report",
    title: "بلاغ حالة عنف",
    category: "confidential",
    icon: "🛡️",
    description: "بلاغ رسمي عن حالة عنف مع بيانات الحالة والإجراء العاجل",
    parentHidden: true,
    confidentialWatermark: true,
    protocolLayout: true,
    protocolSections: [
      { title: "بيانات الحالة", fieldId: "case_data" },
      { title: "وصف الحالة والتفاصيل", fieldId: "violence_desc" },
      { title: "الإجراءات العاجلة", fieldId: "immediate_action" },
    ],
    signatureLabels: ["المعلم المبلّغ", "الموجه الطلابي", "قائد المدرسة"],
    adminAlertEnabled: true,
    adminAlertTemplate:
      "🚨 تنبيه عاجل: تم رصد حالة عنف تتطلب تدخلاً فورياً.\nالطالب: {student_name}\nالتفاصيل في المنصة.\n\nثانوية الفيصلية - ألفا فيزياء",
    fields: [
      ...commonAutoFields,
      { id: "violence_type", label: "نوع العنف", type: "text", placeholder: "مثال: جسدي / لفظي / إلكتروني" },
      { id: "violence_date_time", label: "تاريخ ووقت الحالة", type: "text", placeholder: "مثال: 1447/3/15 - 9:00 ص" },
      { id: "violence_location", label: "مكان الحالة", type: "text", placeholder: "مثال: ساحة المدرسة" },
      { id: "violence_desc", label: "وصف الحالة بالتفصيل", type: "textarea", placeholder: "اذكر تفاصيل الحالة كاملة..." },
      { id: "victim_info", label: "بيانات المتضرر", type: "textarea", placeholder: "اسم المتضرر وبياناته..." },
      { id: "immediate_action", label: "الإجراء العاجل المتخذ", type: "textarea", placeholder: "الإجراءات الفورية التي تم اتخاذها..." },
    ],
  },
  // ====== CONFIDENTIAL FORM #14 ======
  {
    id: "high_risk_report",
    title: "بلاغ عالية الخطورة",
    category: "confidential",
    icon: "🔴",
    description: "بلاغ حالة عالية الخطورة — سري للغاية",
    parentHidden: true,
    confidentialWatermark: true,
    protocolLayout: true,
    protocolSections: [
      { title: "بيانات الحالة", fieldId: "risk_case_data" },
      { title: "وصف الخطورة", fieldId: "risk_desc" },
      { title: "الإجراءات المتخذة", fieldId: "risk_action" },
    ],
    signatureLabels: ["المعلم المبلّغ", "الموجه الطلابي", "قائد المدرسة"],
    adminAlertEnabled: true,
    adminAlertTemplate:
      "🔴 تنبيه عالي الخطورة: تم رصد حالة تتطلب تدخلاً إدارياً عاجلاً.\nالطالب: {student_name}\nالتفاصيل في المنصة.\n\nثانوية الفيصلية - ألفا فيزياء",
    fields: [
      ...commonAutoFields,
      { id: "risk_type", label: "نوع الخطورة", type: "text", placeholder: "مثال: تهديد / إيذاء نفسي / مخدرات" },
      { id: "risk_desc", label: "وصف الخطورة بالتفصيل", type: "textarea", placeholder: "اذكر تفاصيل الحالة..." },
      { id: "risk_evidence", label: "الأدلة والقرائن", type: "textarea", placeholder: "أي أدلة أو قرائن متاحة..." },
      { id: "risk_action", label: "الإجراءات المتخذة", type: "textarea", placeholder: "الإجراءات الفورية..." },
    ],
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
