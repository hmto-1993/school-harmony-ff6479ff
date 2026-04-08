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
  type: "text" | "textarea" | "date" | "auto" | "combobox";
  autoKey?: "student_name" | "class_name" | "national_id" | "date" | "grade" | "section";
  required?: boolean;
  placeholder?: string;
  /** If true, the field is hidden from UI (used only in PDF body template) */
  hidden?: boolean;
  /** Suggestion list for combobox fields */
  suggestions?: string[];
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
    title: "رصد درجات السلوك المتميز",
    category: "behavior",
    icon: "⭐",
    description: "شهادة تميز سلوكي للطالب المثالي",
    bodyTemplate:
      "شهادة تميز سلوكي\n\nيُمنح الطالب/ {student_name} المقيد في فصل/ {class_name} هذه البطاقة تقديراً لسلوكه المثالي ومساهمته الفعالة في إنجاح الحصة الدراسية، مما يمنحه الأولوية في نقاط التميز بنظام (ألفا فيزياء).\n\nالدرجة الممنوحة: {score}\n\nالسجل المدني: {national_id}\nالتاريخ: {date}",
    signatureLabels: ["معلم المادة", "المرشد الطلابي"],
    fields: [...commonAutoFields, { id: "score", label: "الدرجة", type: "text" }, { id: "teacher_notes", label: "ملاحظات المعلم", type: "textarea", placeholder: "أضف ملاحظاتك الخاصة بالحالة..." }],
  },
  {
    id: "behavior_plan",
    title: "خطة تعديل السلوك",
    category: "behavior",
    icon: "📋",
    description: "خطة علاجية لتعديل سلوك الطالب",
    bodyTemplate:
      "خطة تعديل السلوك\n\nبناءً على السلوك الملحوظ من الطالب/ {student_name} المقيد في فصل/ {class_name}، تقرر وضع خطة علاجية تشمل:\n(1) جلسات إرشادية فردية.\n(2) تكليفه بمهام قيادية داخل الفصل.\n(3) مراقبة التطور السلوكي أسبوعياً.\n\nالهدف: تحويل السلوك السلبي إلى مشاركة إيجابية.\n\nالمشكلة السلوكية:\n{behavior_issue}\n\nالخطة العلاجية التفصيلية:\n{plan}\n\nالسجل المدني: {national_id}\nالتاريخ: {date}",
    signatureLabels: ["معلم المادة", "المرشد الطلابي", "ولي الأمر"],
    fields: [...commonAutoFields, { id: "behavior_issue", label: "المشكلة السلوكية", type: "textarea", placeholder: "وصف السلوك الملحوظ..." }, { id: "plan", label: "الخطة العلاجية التفصيلية", type: "textarea", placeholder: "تفاصيل إضافية للخطة العلاجية..." }, { id: "teacher_notes", label: "ملاحظات المعلم", type: "textarea", placeholder: "أضف ملاحظاتك الخاصة بالحالة..." }],
  },
  {
    id: "behavior_issue",
    title: "رصد المعلم لمشكلة سلوكية",
    category: "behavior",
    icon: "⚠️",
    description: "توثيق مشكلة سلوكية لاحظها المعلم",
    bodyTemplate:
      "رصد المعلم لمشكلة سلوكية\n\nتم ملاحظة قيام الطالب/ {student_name} المقيد في فصل/ {class_name} بسلوك مخالف خلال حصة الفيزياء.\n\nوصف المشكلة:\n{issue_desc}\n\nتم التنبيه شفهياً في المرة الأولى، وهذا النموذج لتوثيق الحالة في حال التكرار.\n\nالإجراء المتخذ:\n{action_taken}\n\nالسجل المدني: {national_id}\nالتاريخ: {date}",
    signatureLabels: ["معلم المادة", "المرشد الطلابي"],
    fields: [...commonAutoFields, { id: "issue_desc", label: "وصف المشكلة", type: "textarea", placeholder: "وصف السلوك الملاحظ بالتفصيل..." }, { id: "action_taken", label: "الإجراء المتخذ", type: "textarea", placeholder: "الإجراء الذي تم اتخاذه..." }, { id: "teacher_notes", label: "ملاحظات المعلم", type: "textarea", placeholder: "أضف ملاحظاتك الخاصة بالحالة..." }],
  },
  {
    id: "problems_log",
    title: "رصد المشكلات السلوكية",
    category: "behavior",
    icon: "📊",
    description: "تقرير رصد شامل للملاحظات السلوكية",
    bodyTemplate:
      "تقرير رصد المشكلات السلوكية\n\nيتضمن هذا النموذج كافة الملاحظات السلوكية التي تعيق سير العملية التعليمية للطالب/ {student_name} المقيد في فصل/ {class_name}، مع تحديد نوع المخالفة (درجة أولى، ثانية، ثالثة) حسب لائحة السلوك والمواظبة.\n\nالمشكلة:\n{problem}\n\nالحل المقترح:\n{solution}\n\nالسجل المدني: {national_id}\nالتاريخ: {date}",
    signatureLabels: ["معلم المادة", "المرشد الطلابي"],
    fields: [...commonAutoFields, { id: "problem", label: "المشكلة ونوع المخالفة", type: "textarea", placeholder: "وصف المشكلة وتحديد درجة المخالفة..." }, { id: "solution", label: "الحل المقترح", type: "textarea", placeholder: "الحل المقترح للمشكلة..." }, { id: "teacher_notes", label: "ملاحظات المعلم", type: "textarea", placeholder: "أضف ملاحظاتك الخاصة بالحالة..." }],
  },
  {
    id: "grade_compensation",
    title: "فرص تعويض درجات السلوك الإيجابي",
    category: "general",
    icon: "📈",
    description: "بطاقة تعويض لاسترداد نقاط السلوك المخصومة",
    bodyTemplate:
      "بطاقة تعويض درجات السلوك الإيجابي\n\nتقرر منح الطالب/ {student_name} المقيد في فصل/ {class_name} فرصة لتعويض ما نقصه من درجات السلوك من خلال القيام بالمهام التالية:\n• إعداد بحث علمي.\n• تقديم عرض تقديمي.\n• التزام تام بالهدوء لمدة أسبوع.\n\nعند الإنجاز، تُسترد النقاط المخصومة.\n\nالمادة: {subject}\nسبب التعويض:\n{reason}\n\nالسجل المدني: {national_id}\nالتاريخ: {date}",
    signatureLabels: ["معلم المادة", "المرشد الطلابي"],
    fields: [...commonAutoFields, { id: "subject", label: "المادة", type: "text" }, { id: "reason", label: "سبب التعويض", type: "textarea", placeholder: "سبب الحاجة للتعويض..." }, { id: "teacher_notes", label: "ملاحظات المعلم", type: "textarea", placeholder: "أضف ملاحظاتك الخاصة بالحالة..." }],
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
    title: "محضر اجتماع لجنة التوجيه الطلابي",
    category: "confidential",
    icon: "🏛️",
    description: "محضر اجتماع لجنة التوجيه الطلابي لدراسة حالة طالب — سري",
    parentHidden: false,
    confidentialWatermark: true,
    bodyTemplate:
      "محضر اجتماع لجنة التوجيه الطلابي\n\n⚠️ سري للغاية\n\nإنه في يوم/ {meeting_day} الموافق/ {date} عقدت لجنة التوجيه الطلابي اجتماعاً لدراسة حالة الطالب/ {student_name} المقيد في فصل/ {class_name} والمسجلة في منصة ألفا فيزياء.\n\nوبعد الاطلاع على سجل السلوك والبيانات، توصي اللجنة بالآتي:\n\nالحاضرون:\n{attendees}\n\nجدول الأعمال:\n{agenda}\n\nتوصيات وقرارات اللجنة:\n{decisions}\n\nالسجل المدني: {national_id}",
    signatureLabels: ["معلم المادة", "وكيل المدرسة", "المرشد الطلابي", "قائد المدرسة"],
    fields: [
      ...commonAutoFields,
      { id: "meeting_day", label: "يوم الاجتماع", type: "text", placeholder: "مثال: الأحد" },
      { id: "attendees", label: "الحاضرون", type: "textarea", placeholder: "أسماء أعضاء اللجنة الحاضرين..." },
      { id: "agenda", label: "جدول الأعمال", type: "textarea", placeholder: "بنود الاجتماع..." },
      { id: "decisions", label: "توصيات وقرارات اللجنة", type: "textarea", placeholder: "اكتب توصيات اللجنة هنا..." },
      { id: "teacher_notes", label: "ملاحظات إضافية", type: "textarea", placeholder: "أضف ملاحظاتك الخاصة..." },
    ],
  },
  // ====== CONFIDENTIAL FORM #13 ======
  {
    id: "violence_report",
    title: "بلاغ حالة عنف",
    category: "confidential",
    icon: "🛡️",
    description: "نموذج بلاغ حماية — سري للغاية",
    parentHidden: true,
    confidentialWatermark: true,
    protocolLayout: true,
    protocolSections: [
      { title: "بيانات الحالة", fieldId: "case_data" },
      { title: "وصف الحالة والتفاصيل", fieldId: "violence_desc" },
      { title: "الإجراءات العاجلة", fieldId: "immediate_action" },
    ],
    bodyTemplate:
      "نموذج بلاغ حماية\n\n⚠️ سري للغاية\n\nتم رصد مؤشرات (عنف جسدي / نفسي / إهمال) على الطالب/ {student_name} المقيد في فصل/ {class_name}.\n\nووفقاً لنظام حماية الطفل، جرى الرفع لمركز البلاغات بوزارة الموارد البشرية والتنمية الاجتماعية (أو وحدة الحماية المدرسية) لاتخاذ اللازم.\n\nنوع العنف: {violence_type}\nتاريخ ووقت الحالة: {violence_date_time}\nمكان الحالة: {violence_location}\n\nوصف الحالة بالتفصيل:\n{violence_desc}\n\nبيانات المتضرر:\n{victim_info}\n\nالإجراء العاجل المتخذ:\n{immediate_action}\n\nالسجل المدني: {national_id}\nالتاريخ: {date}",
    signatureLabels: ["المعلم المبلّغ", "وكيل المدرسة", "المرشد الطلابي", "قائد المدرسة"],
    adminAlertEnabled: true,
    adminAlertTemplate:
      "🚨 تنبيه عاجل: تم رصد حالة عنف تتطلب تدخلاً فورياً.\nالطالب: {student_name}\nالتفاصيل في المنصة.\n\nثانوية الفيصلية - ألفا فيزياء",
    fields: [
      ...commonAutoFields,
      { id: "violence_type", label: "نوع العنف", type: "text", placeholder: "مثال: جسدي / لفظي / نفسي / إهمال" },
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
    bodyTemplate:
      "بلاغ عاجل — حالة عالية الخطورة\n\n🔴 سري للغاية\n\nحالة عالية الخطورة تتطلب تدخلاً فورياً من إدارة المدرسة وجهات الاختصاص.\n\nالطالب/ {student_name} المقيد في فصل/ {class_name}.\n\nتم توثيق الحالة عبر منصة ألفا فيزياء لضمان سرعة الاستجابة وحماية سلامة الطالب والبيئة المدرسية.\n\nنوع الخطورة: {risk_type}\n\nوصف الخطورة بالتفصيل:\n{risk_desc}\n\nالأدلة والقرائن:\n{risk_evidence}\n\nالإجراءات المتخذة:\n{risk_action}\n\nالسجل المدني: {national_id}\nالتاريخ: {date}",
    signatureLabels: ["المعلم المبلّغ", "وكيل المدرسة", "المرشد الطلابي", "قائد المدرسة"],
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
    title: "إجراءات الغياب بعذر",
    category: "general",
    icon: "📗",
    description: "إثبات حالة غياب بعذر مقبول مع تمكين التعويض",
    bodyTemplate:
      "إثبات حالة غياب بعذر\n\nبناءً على المستند المقدم من الطالب/ {student_name} المقيد في فصل/ {class_name} (عذر طبي / عذر اجتماعي)، تقرر قبول العذر واعتبار غيابه عن حصة الفيزياء ليوم/ {absence_date} غياباً مبرراً، مع تمكينه من تعويض ما فاته من مهام.\n\nسبب الغياب:\n{excuse_reason}\n\nالسجل المدني: {national_id}\nالتاريخ: {date}",
    signatureLabels: ["معلم المادة", "وكيل المدرسة", "المرشد الطلابي"],
    fields: [
      ...commonAutoFields,
      { id: "absence_date", label: "تاريخ الغياب", type: "date" },
      { id: "excuse_reason", label: "سبب الغياب ونوع العذر", type: "textarea", placeholder: "عذر طبي / عذر اجتماعي - التفاصيل..." },
      { id: "teacher_notes", label: "ملاحظات المعلم", type: "textarea", placeholder: "أضف ملاحظاتك الخاصة بالحالة..." },
    ],
  },
  {
    id: "unexcused_absence",
    title: "إجراءات الغياب بدون عذر",
    category: "general",
    icon: "📕",
    description: "إشعار غياب بدون عذر مع التأثير على درجات المواظبة",
    bodyTemplate:
      "إشعار غياب بدون عذر\n\nنود إحاطتكم بتغيب الطالب/ {student_name} المقيد في فصل/ {class_name} عن حصة الفيزياء ليوم/ {absence_date_un} دون تقديم مبرر نظامي.\n\nنأمل التعاون لضمان عدم تكرار الغياب لما له من أثر مباشر على درجات المواظبة والتحصيل الدراسي.\n\nهل تم التواصل مع ولي الأمر: {parent_contacted}\n\nالسجل المدني: {national_id}\nالتاريخ: {date}",
    signatureLabels: ["معلم المادة", "وكيل المدرسة", "المرشد الطلابي"],
    fields: [
      ...commonAutoFields,
      { id: "absence_date_un", label: "تاريخ الغياب", type: "date" },
      { id: "parent_contacted", label: "هل تم التواصل مع ولي الأمر؟", type: "text", placeholder: "نعم / لا - التفاصيل..." },
      { id: "teacher_notes", label: "ملاحظات المعلم", type: "textarea", placeholder: "أضف ملاحظاتك الخاصة بالحالة..." },
    ],
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
