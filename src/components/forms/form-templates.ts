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
  /** Render an official stamp placeholder in the footer */
  requiresStamp?: boolean;
  /** Official table layout (mimics ministry forms). When provided, takes priority over bodyTemplate. */
  tableLayout?: TableRow[];
}

/** Official ministry-style table row types */
export type TableRow =
  | { type: "section"; title: string }
  | { type: "row"; cells: Array<{ label: string; fieldId?: string; flex?: number; minHeight?: number; staticValue?: string }> }
  | { type: "block"; label: string; fieldId: string; minHeight?: number }
  | {
      type: "escalation";
      title: string;
      columns: string[]; // header labels
      rows: Array<{ label: string; fieldIds: string[] }>; // first col = label, rest = fieldIds
    };

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
  "abuse_report",
];

export const formTemplates: FormTemplate[] = [
  {
    id: "commitment",
    title: "نموذج الالتزام المدرسي",
    category: "general",
    icon: "📝",
    description: "إقرار الالتزام بقواعد السلوك والمواظبة (مطابق ص58 من دليل الوزارة)",
    requiresStamp: true,
    tableLayout: [
      { type: "section", title: "خاص بالطالب/الطالبة" },
      { type: "row", cells: [{ label: "اسم الطالب/الطالبة", fieldId: "student_name", flex: 2 }, { label: "السجل المدني", fieldId: "national_id" }] },
      { type: "row", cells: [{ label: "المرحلة", fieldId: "stage" }, { label: "الصف/الفصل", fieldId: "class_name" }, { label: "التاريخ", fieldId: "date" }] },
      { type: "block", label: "إقرار الطالب", fieldId: "_student_pledge", minHeight: 22 },
      { type: "section", title: "خاص بولي الأمر" },
      { type: "row", cells: [{ label: "اسم ولي الأمر", fieldId: "parent_name", flex: 2 }, { label: "صلة القرابة", fieldId: "parent_relation" }] },
      { type: "row", cells: [{ label: "العمل", fieldId: "parent_job" }, { label: "هاتف العمل", fieldId: "parent_work_phone" }] },
      { type: "row", cells: [{ label: "الهاتف المنزلي", fieldId: "home_phone" }, { label: "رقم الجوال", fieldId: "mobile_phone" }, { label: "رقم آخر للتواصل", fieldId: "alt_phone" }] },
      { type: "block", label: "إقرار ولي الأمر", fieldId: "_parent_pledge", minHeight: 22 },
    ],
    bodyTemplate:
      "نموذج الالتزام المدرسي\n\n— خاص بالطالب/الطالبة —\nالاسم: {student_name}\nالمرحلة: {stage}\nالصف/الفصل: {class_name}\n\nأنا الطالب/الطالبة الموضح اسمي وبياناتي أعلاه، قد اطلعت على محتوى قواعد السلوك والمواظبة، وأتعهد بالالتزام بالأنظمة والتعليمات الخاصة بها.\n\n— خاص بولي الأمر —\nاسم ولي الأمر: {parent_name}\nصلة القرابة: {parent_relation}\nالعمل: {parent_job}\nهاتف العمل: {parent_work_phone}\nالهاتف المنزلي: {home_phone}\nرقم الجوال: {mobile_phone}\nرقم آخر للتواصل: {alt_phone}\n\nأنا ولي أمر الطالب/الطالبة، اطلعت على قواعد السلوك والمواظبة وأتعهد بالتعاون مع إدارة المدرسة لمصلحة ابني/ابنتي وأتحمل مسؤولية صحة أرقام التواصل أعلاه.\n\nالسجل المدني للطالب: {national_id}\nالتاريخ: {date}\n\nملاحظة: يؤخذ التوقيع في بداية العام الدراسي ويُحفظ النموذج لدى وكيل/وكيلة شؤون الطلبة.",
    signatureLabels: ["توقيع الطالب", "توقيع ولي الأمر", "وكيل شؤون الطلبة"],
    fields: [
      ...commonAutoFields,
      { id: "stage", label: "المرحلة", type: "text", placeholder: "مثال: المرحلة الثانوية" },
      { id: "parent_name", label: "اسم ولي الأمر", type: "text" },
      { id: "parent_relation", label: "صلة القرابة", type: "text", placeholder: "أب / أم / ولي" },
      { id: "parent_job", label: "عمل ولي الأمر", type: "text" },
      { id: "parent_work_phone", label: "هاتف العمل", type: "text" },
      { id: "home_phone", label: "الهاتف المنزلي", type: "text" },
      { id: "mobile_phone", label: "رقم الجوال", type: "text" },
      { id: "alt_phone", label: "رقم آخر للتواصل", type: "text" },
    ],
  },
  {
    id: "behavior_grades",
    title: "رصد درجات السلوك المتميز",
    category: "behavior",
    icon: "⭐",
    description: "رصد شواهد السلوك المتميز والدرجات المكتسبة (مطابق ص59)",
    requiresStamp: true,
    tableLayout: [
      { type: "section", title: "بيانات الطالب" },
      { type: "row", cells: [{ label: "اسم الطالب/الطالبة", fieldId: "student_name", flex: 2 }, { label: "السجل المدني", fieldId: "national_id" }] },
      { type: "row", cells: [{ label: "المرحلة", fieldId: "stage" }, { label: "الصف", fieldId: "class_name" }, { label: "تاريخ التنفيذ", fieldId: "execution_date" }] },
      { type: "section", title: "تفاصيل رصد السلوك المتميز" },
      { type: "row", cells: [{ label: "موضوع الممارسة", fieldId: "topic", flex: 2 }, { label: "نوع الممارسة", fieldId: "behavior_type" }] },
      { type: "block", label: "شواهد السلوك المتميز", fieldId: "evidence", minHeight: 28 },
      { type: "row", cells: [{ label: "الدرجة المكتسبة", fieldId: "score" }, { label: "اسم راصد السلوك", fieldId: "observer_name", flex: 2 }] },
      { type: "block", label: "ملاحظات إضافية", fieldId: "teacher_notes", minHeight: 22 },
    ],
    bodyTemplate:
      "نموذج رصد درجات السلوك المتميز\n\nاسم الطالب/الطالبة: {student_name}\nالمرحلة: {stage}\nالصف: {class_name}\n\n— تفاصيل الرصد —\nموضوع ممارسة السلوك المتميز: {topic}\nنوع ممارسة السلوك المتميز: {behavior_type}\nتاريخ التنفيذ: {execution_date}\nشواهد السلوك المتميز: {evidence}\nالدرجة المكتسبة: {score}\nاسم راصد السلوك: {observer_name}\n\nملاحظات إضافية:\n{teacher_notes}\n\nالسجل المدني: {national_id}\nالتاريخ: {date}",
    signatureLabels: ["راصد السلوك", "المرشد الطلابي", "مدير المدرسة"],
    fields: [
      ...commonAutoFields,
      { id: "stage", label: "المرحلة", type: "text" },
      { id: "topic", label: "موضوع ممارسة السلوك المتميز", type: "text" },
      { id: "behavior_type", label: "نوع ممارسة السلوك المتميز", type: "combobox", suggestions: ["تعاون", "مبادرة", "إيثار", "نظافة", "احترام", "تفوق دراسي", "مشاركة فاعلة"] },
      { id: "execution_date", label: "تاريخ التنفيذ", type: "date" },
      { id: "evidence", label: "شواهد السلوك المتميز", type: "textarea", placeholder: "اذكر الشواهد والأدلة..." },
      { id: "score", label: "الدرجة المكتسبة", type: "text" },
      { id: "observer_name", label: "اسم راصد السلوك", type: "text" },
      { id: "teacher_notes", label: "ملاحظات إضافية", type: "textarea" },
    ],
  },
  {
    id: "behavior_plan",
    title: "خطة تعديل السلوك",
    category: "behavior",
    icon: "📋",
    description: "خطة شاملة لتعديل السلوك بالمثيرات القبلية والبعدية (مطابق ص60-61)",
    requiresStamp: true,
    tableLayout: [
      { type: "section", title: "أولاً: البيانات الأولية" },
      { type: "row", cells: [{ label: "اسم الطالب", fieldId: "student_name", flex: 2 }, { label: "الصف/الفصل", fieldId: "class_name" }] },
      { type: "row", cells: [{ label: "تاريخ الميلاد", fieldId: "birth_date" }, { label: "العمر الزمني", fieldId: "age" }] },
      { type: "row", cells: [{ label: "تاريخ بداية الخطة", fieldId: "plan_start" }, { label: "تاريخ نهاية الخطة", fieldId: "plan_end" }] },
      { type: "section", title: "ثانياً: تحديد المشكلة السلوكية" },
      { type: "row", cells: [{ label: "المشكلة السلوكية", fieldId: "behavior_issue", flex: 2 }, { label: "درجتها", fieldId: "issue_degree" }] },
      { type: "block", label: "وصف المشكلة", fieldId: "issue_description", minHeight: 22 },
      { type: "block", label: "المظاهر السلوكية الملحوظة", fieldId: "behavior_signs", minHeight: 22 },
      { type: "section", title: "ثالثاً: المثيرات والأسباب" },
      { type: "block", label: "المثيرات القبلية (الأسباب)", fieldId: "antecedents", minHeight: 22 },
      { type: "block", label: "المثيرات البعدية", fieldId: "consequences", minHeight: 22 },
      { type: "block", label: "ما يحققه الطالب من السلوك", fieldId: "function_of_behavior", minHeight: 18 },
      { type: "block", label: "الإجراءات السابقة المستخدمة", fieldId: "previous_actions", minHeight: 18 },
      { type: "section", title: "رابعاً: تصميم الخطة العلاجية" },
      { type: "block", label: "السلوك المرغوب إكسابه", fieldId: "target_behavior", minHeight: 18 },
      { type: "block", label: "الإجراءات والاستراتيجيات", fieldId: "plan", minHeight: 28 },
      { type: "section", title: "خامساً: تقييم فاعلية الخطة" },
      { type: "block", label: "رأي وكيل المدرسة", fieldId: "vice_opinion", minHeight: 16 },
      { type: "block", label: "رأي معلم الفصل", fieldId: "teacher_opinion", minHeight: 16 },
      { type: "block", label: "رأي ولي الأمر", fieldId: "parent_opinion", minHeight: 16 },
      { type: "row", cells: [{ label: "تقييم الفاعلية", fieldId: "effectiveness", flex: 2 }, { label: "التاريخ", fieldId: "date" }] },
    ],
    bodyTemplate:
      "نموذج خطة تعديل السلوك\n\nأولاً: البيانات الأولية\nاسم الطالب: {student_name}\nالصف/الفصل: {class_name}\nتاريخ الميلاد: {birth_date}    العمر الزمني: {age}\nتاريخ بداية الخطة: {plan_start}\nتاريخ نهاية الخطة: {plan_end}\n\nثانياً: تحديد المشكلة السلوكية\nالمشكلة: {behavior_issue}    درجتها: {issue_degree}\nوصف المشكلة:\n{issue_description}\nالمظاهر السلوكية الملحوظة:\n{behavior_signs}\n\nثالثاً: المثيرات والأسباب\n• المثيرات القبلية (الأسباب المسببة للسلوك): {antecedents}\n• المثيرات البعدية (ما يحدث بعد السلوك): {consequences}\n• ما يحققه الطالب من السلوك: {function_of_behavior}\n• الإجراءات السابقة المستخدمة: {previous_actions}\n\nرابعاً: تصميم الخطة العلاجية\nالسلوك المرغوب إكسابه: {target_behavior}\nالإجراءات والاستراتيجيات:\n{plan}\n\nخامساً: تقييم فاعلية الخطة\nرأي وكيل المدرسة: {vice_opinion}\nرأي معلم الفصل: {teacher_opinion}\nرأي ولي الأمر: {parent_opinion}\nتقييم الفاعلية: {effectiveness}\n\nالسجل المدني: {national_id}\nالتاريخ: {date}",
    signatureLabels: ["القائم بتعديل السلوك", "المرشد الطلابي", "ولي الأمر", "مدير المدرسة"],
    fields: [
      ...commonAutoFields,
      { id: "birth_date", label: "تاريخ الميلاد", type: "text", placeholder: "هـ" },
      { id: "age", label: "العمر الزمني", type: "text" },
      { id: "plan_start", label: "تاريخ بداية الخطة", type: "date" },
      { id: "plan_end", label: "تاريخ نهاية الخطة", type: "date" },
      { id: "behavior_issue", label: "المشكلة السلوكية", type: "text" },
      { id: "issue_degree", label: "درجة المشكلة", type: "combobox", suggestions: ["الدرجة الأولى", "الدرجة الثانية", "الدرجة الثالثة", "الدرجة الرابعة", "الدرجة الخامسة"] },
      { id: "issue_description", label: "وصف المشكلة", type: "textarea" },
      { id: "behavior_signs", label: "المظاهر السلوكية", type: "textarea" },
      { id: "antecedents", label: "المثيرات القبلية (أسباب السلوك)", type: "textarea", placeholder: "ما الذي يسبق السلوك ويحفّزه..." },
      { id: "consequences", label: "المثيرات البعدية (ما يحدث بعد السلوك)", type: "textarea" },
      { id: "function_of_behavior", label: "ما يحققه الطالب من السلوك", type: "textarea" },
      { id: "previous_actions", label: "الإجراءات السابقة المستخدمة", type: "textarea" },
      { id: "target_behavior", label: "السلوك المرغوب إكسابه", type: "textarea" },
      { id: "plan", label: "الإجراءات والاستراتيجيات", type: "textarea" },
      { id: "vice_opinion", label: "رأي وكيل المدرسة", type: "textarea" },
      { id: "teacher_opinion", label: "رأي معلم الفصل", type: "textarea" },
      { id: "parent_opinion", label: "رأي ولي الأمر", type: "textarea" },
      { id: "effectiveness", label: "تقييم فاعلية الخطة", type: "combobox", suggestions: ["فعالة جداً", "فعالة", "فعالة جزئياً", "غير فعالة وتحتاج تعديل"] },
    ],
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
    fields: [
      ...commonAutoFields,
      { id: "issue_desc", label: "وصف المشكلة", type: "combobox", placeholder: "اختر أو اكتب وصف المشكلة...", suggestions: ["النوم أثناء الحصة", "إثارة الفوضى", "عدم إحضار الأدوات", "استخدام الجوال", "التلفظ بألفاظ غير لائقة", "الكتابة على الطاولات", "التأخر عن الحصة"] },
      { id: "action_taken", label: "الإجراء المتخذ", type: "combobox", placeholder: "اختر أو اكتب الإجراء المتخذ...", suggestions: ["تنبيه شفهي", "تدوين في سجل المتابعة", "أخذ تعهد خطي", "إحالة للموجه الطلابي", "إشعار ولي الأمر", "حسم درجات"] },
      { id: "teacher_notes", label: "ملاحظات المعلم", type: "textarea", placeholder: "أضف ملاحظاتك الخاصة بالحالة..." },
    ],
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
    fields: [
      ...commonAutoFields,
      { id: "problem", label: "المشكلة ونوع المخالفة", type: "combobox", placeholder: "اختر أو اكتب وصف المشكلة...", suggestions: ["النوم أثناء الحصة", "إثارة الفوضى", "عدم إحضار الأدوات", "استخدام الجوال", "التلفظ بألفاظ غير لائقة", "الكتابة على الطاولات", "التأخر عن الحصة"] },
      { id: "solution", label: "الحل المقترح", type: "combobox", placeholder: "اختر أو اكتب الحل المقترح...", suggestions: ["تنبيه شفهي", "تدوين في سجل المتابعة", "أخذ تعهد خطي", "إحالة للموجه الطلابي", "إشعار ولي الأمر", "حسم درجات"] },
      { id: "teacher_notes", label: "ملاحظات المعلم", type: "textarea", placeholder: "أضف ملاحظاتك الخاصة بالحالة..." },
    ],
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
      "⚠️ تنبيه إداري: تم رصد إحالة سرية للطالب/ {student_name} تتطلب تدخلاً عاجلاً.\nالتفاصيل متوفرة في المنصة.\n\nالإدارة المدرسية",
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
      "المكرم ولي أمر الطالب/ {student_name}\n\nالسلام عليكم ورحمة الله وبركاته\n\nنأمل منكم مراجعة المدرسة (قسم التوجيه الطلابي) في يوم/ {visit_day} الموافق/ {visit_date} لمناقشة أمر يخص الطالب.\n\nالإدارة المدرسية",
    fields: [
      ...commonAutoFields,
      { id: "visit_day", label: "يوم الزيارة", type: "text", placeholder: "مثال: الأحد" },
      { id: "visit_date", label: "تاريخ الزيارة", type: "date" },
    ],
  },
  // ====== CONFIDENTIAL FORM #11 — محضر ضبط واقعة (مطابق ص69) ======
  {
    id: "incident_report",
    title: "محضر ضبط واقعة",
    category: "confidential",
    icon: "🚨",
    description: "محضر رسمي لضبط واقعة بأنواع المشاهدات وتواقيع الشهود (مطابق ص69)",
    parentHidden: true,
    confidentialWatermark: true,
    requiresStamp: true,
    witnessPickerEnabled: true,
    tableLayout: [
      { type: "section", title: "بيانات الواقعة" },
      { type: "row", cells: [{ label: "اسم الطالب/الطالبة", fieldId: "student_name", flex: 2 }, { label: "السجل المدني", fieldId: "national_id" }] },
      { type: "row", cells: [{ label: "المرحلة", fieldId: "stage" }, { label: "الصف/الفصل", fieldId: "class_name" }, { label: "التاريخ", fieldId: "date" }] },
      { type: "row", cells: [{ label: "المشكلة السلوكية", fieldId: "behavior_issue", flex: 2 }, { label: "درجتها", fieldId: "issue_degree" }] },
      { type: "row", cells: [{ label: "وقت الواقعة", fieldId: "incident_time" }, { label: "مكان الواقعة", fieldId: "incident_location", flex: 2 }] },
      { type: "section", title: "المشاهدات والأدلة" },
      { type: "row", cells: [{ label: "نوع المشاهدة", fieldId: "evidence_types" }] },
      { type: "block", label: "تفاصيل/روابط المشاهدة", fieldId: "evidence_details", minHeight: 22 },
      { type: "section", title: "تفاصيل الواقعة" },
      { type: "block", label: "وصف الواقعة بالتفصيل", fieldId: "incident_desc", minHeight: 30 },
      { type: "block", label: "الأطراف المشاركة", fieldId: "involved_parties", minHeight: 18 },
      { type: "block", label: "أقوال الأطراف", fieldId: "party_statements", minHeight: 22 },
      { type: "block", label: "الشهود", fieldId: "witnesses_names", minHeight: 16 },
      { type: "block", label: "التوصيات والإجراءات المتخذة", fieldId: "recommendations", minHeight: 22 },
    ],
    bodyTemplate:
      "محضر ضبط واقعة (سري)\n\nاسم الطالب/الطالبة: {student_name}\nالمرحلة: {stage}     الصف/الفصل: {class_name}\nالمشكلة السلوكية: {behavior_issue}     درجتها: {issue_degree}\n\nنوع المشاهدة المضبوطة:\n{evidence_types}\n\nتفاصيل المشاهدة (روابط/أوصاف):\n{evidence_details}\n\nمكان ضبط الواقعة: {incident_location}\nوقت الواقعة: {incident_time}\n\nوصف الواقعة بالتفصيل:\n{incident_desc}\n\nالأطراف المشاركة:\n{involved_parties}\n\nأقوال الأطراف:\n{party_statements}\n\nالشهود:\n{witnesses_names}\n\nالتوصيات والإجراءات المتخذة:\n{recommendations}\n\nالسجل المدني: {national_id}\nالتاريخ: {date}",
    signatureLabels: ["المعلم المبلّغ", "الموجه الطلابي", "ولي الأمر", "مدير المدرسة"],
    adminAlertEnabled: true,
    adminAlertTemplate:
      "⚠️ تنبيه إداري: تم رصد واقعة تتطلب تدخلاً عاجلاً.\nالطالب: {student_name}\nالتفاصيل في المرفق/المنصة.\n\nالإدارة المدرسية",
    fields: [
      ...commonAutoFields,
      { id: "stage", label: "المرحلة", type: "text" },
      { id: "behavior_issue", label: "المشكلة السلوكية", type: "text" },
      { id: "issue_degree", label: "درجة المشكلة", type: "combobox", suggestions: ["الدرجة الأولى", "الدرجة الثانية", "الدرجة الثالثة", "الدرجة الرابعة", "الدرجة الخامسة"] },
      { id: "evidence_types", label: "نوع المشاهدة المضبوطة", type: "combobox", placeholder: "اختر أو اكتب", suggestions: ["صور", "مقاطع فيديو", "محادثات", "صور + محادثات", "أخرى"] },
      { id: "evidence_details", label: "تفاصيل/روابط المشاهدة", type: "textarea", placeholder: "أوصاف أو روابط للأدلة..." },
      { id: "incident_time", label: "وقت الواقعة", type: "text", placeholder: "مثال: 10:30 صباحاً" },
      { id: "incident_location", label: "مكان الواقعة", type: "text", placeholder: "مثال: الفصل / الساحة" },
      { id: "incident_desc", label: "وصف الواقعة بالتفصيل", type: "textarea" },
      { id: "involved_parties", label: "الأطراف المشاركة", type: "textarea" },
      { id: "party_statements", label: "أقوال الأطراف", type: "textarea" },
      { id: "recommendations", label: "التوصيات والإجراءات المتخذة", type: "textarea" },
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
      "محضر اجتماع لجنة التوجيه الطلابي\n\n⚠️ سري للغاية\n\nإنه في يوم/ {meeting_day} الموافق/ {date} عقدت لجنة التوجيه الطلابي اجتماعاً لدراسة حالة الطالب/ {student_name} المقيد في فصل/ {class_name} والمسجلة في منصة منصة المتميز الرقمية.\n\nوبعد الاطلاع على سجل السلوك والبيانات، توصي اللجنة بالآتي:\n\nالحاضرون:\n{attendees}\n\nجدول الأعمال:\n{agenda}\n\nتوصيات وقرارات اللجنة:\n{decisions}\n\nالسجل المدني: {national_id}",
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
      "🚨 تنبيه عاجل: تم رصد حالة عنف تتطلب تدخلاً فورياً.\nالطالب: {student_name}\nالتفاصيل في المنصة.\n\nالإدارة المدرسية",
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
      "بلاغ عاجل — حالة عالية الخطورة\n\n🔴 سري للغاية\n\nحالة عالية الخطورة تتطلب تدخلاً فورياً من إدارة المدرسة وجهات الاختصاص.\n\nالطالب/ {student_name} المقيد في فصل/ {class_name}.\n\nتم توثيق الحالة عبر منصة منصة المتميز الرقمية لضمان سرعة الاستجابة وحماية سلامة الطالب والبيئة المدرسية.\n\nنوع الخطورة: {risk_type}\n\nوصف الخطورة بالتفصيل:\n{risk_desc}\n\nالأدلة والقرائن:\n{risk_evidence}\n\nالإجراءات المتخذة:\n{risk_action}\n\nالسجل المدني: {national_id}\nالتاريخ: {date}",
    signatureLabels: ["المعلم المبلّغ", "وكيل المدرسة", "المرشد الطلابي", "قائد المدرسة"],
    adminAlertEnabled: true,
    adminAlertTemplate:
      "🔴 تنبيه عالي الخطورة: تم رصد حالة تتطلب تدخلاً إدارياً عاجلاً.\nالطالب: {student_name}\nالتفاصيل في المنصة.\n\nالإدارة المدرسية",
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
    description: "إثبات حالة غياب بعذر مع جدول الإجراءات التصاعدي (مطابق ص73)",
    requiresStamp: true,
    bodyTemplate:
      "نموذج إجراءات الغياب بعذر\n\nاسم الطالب/الطالبة: {student_name}\nالمرحلة: {stage}     الصف/الفصل: {class_name}\n\nتاريخ الغياب الأخير: {absence_date}\nسبب الغياب ونوع العذر: {excuse_reason}\n\n— جدول الإجراءات التصاعدية حسب عدد أيام الغياب —\n\n• ٣ أيام  →  الإجراء: {action_3}\n   تاريخ الإجراء: {action_3_date}\n• ٥ أيام  →  الإجراء: {action_5}\n   تاريخ الإجراء: {action_5_date}\n• ١٠ أيام →  الإجراء: {action_10}\n   تاريخ الإجراء: {action_10_date}\n\nملاحظات:\n{teacher_notes}\n\nالسجل المدني: {national_id}\nالتاريخ: {date}",
    signatureLabels: ["معلم المادة", "وكيل شؤون الطلبة", "ولي الأمر", "مدير المدرسة"],
    fields: [
      ...commonAutoFields,
      { id: "stage", label: "المرحلة", type: "text" },
      { id: "absence_date", label: "تاريخ الغياب الأخير", type: "date" },
      { id: "excuse_reason", label: "سبب الغياب ونوع العذر", type: "textarea", placeholder: "عذر طبي / اجتماعي - التفاصيل..." },
      { id: "action_3", label: "الإجراء عند 3 أيام غياب", type: "combobox", suggestions: ["إشعار ولي الأمر هاتفياً", "تنبيه شفهي للطالب", "تدوين في سجل المتابعة"] },
      { id: "action_3_date", label: "تاريخ إجراء 3 أيام", type: "date" },
      { id: "action_5", label: "الإجراء عند 5 أيام غياب", type: "combobox", suggestions: ["استدعاء ولي الأمر", "إنذار خطي", "تكليف بمهام تعويضية"] },
      { id: "action_5_date", label: "تاريخ إجراء 5 أيام", type: "date" },
      { id: "action_10", label: "الإجراء عند 10 أيام غياب", type: "combobox", suggestions: ["إحالة للجنة التوجيه الطلابي", "رفع للإدارة العامة للتعليم", "تطبيق ما تنص عليه اللائحة"] },
      { id: "action_10_date", label: "تاريخ إجراء 10 أيام", type: "date" },
      { id: "teacher_notes", label: "ملاحظات", type: "textarea" },
    ],
  },
  {
    id: "unexcused_absence",
    title: "إجراءات الغياب بدون عذر",
    category: "general",
    icon: "📕",
    description: "إجراءات تصاعدية مع حسم درجات المواظبة (مطابق ص74)",
    requiresStamp: true,
    bodyTemplate:
      "نموذج إجراءات الغياب بدون عذر\n\nاسم الطالب/الطالبة: {student_name}\nالمرحلة: {stage}     الصف/الفصل: {class_name}\n\nتاريخ الغياب الأخير: {absence_date_un}\nهل تم التواصل مع ولي الأمر: {parent_contacted}\n\n— جدول الإجراءات التصاعدية وحسم درجات المواظبة —\n\n• 3 أيام         →  الإجراء: {action_3}     | تاريخ: {action_3_date}     | درجات محسومة: {deduct_3}\n• 3 أيام متصلة  →  الإجراء: {action_3c}    | تاريخ: {action_3c_date}    | درجات محسومة: {deduct_3c}\n• 5 أيام         →  الإجراء: {action_5}     | تاريخ: {action_5_date}     | درجات محسومة: {deduct_5}\n• 10 أيام        →  الإجراء: {action_10}    | تاريخ: {action_10_date}    | درجات محسومة: {deduct_10}\n\nملاحظات:\n{teacher_notes}\n\nالسجل المدني: {national_id}\nالتاريخ: {date}",
    signatureLabels: ["معلم المادة", "وكيل شؤون الطلبة", "ولي الأمر", "مدير المدرسة"],
    fields: [
      ...commonAutoFields,
      { id: "stage", label: "المرحلة", type: "text" },
      { id: "absence_date_un", label: "تاريخ الغياب الأخير", type: "date" },
      { id: "parent_contacted", label: "هل تم التواصل مع ولي الأمر؟", type: "text", placeholder: "نعم / لا - التفاصيل..." },
      { id: "action_3", label: "الإجراء عند 3 أيام", type: "text" },
      { id: "action_3_date", label: "تاريخ إجراء 3 أيام", type: "date" },
      { id: "deduct_3", label: "درجات محسومة (3 أيام)", type: "text" },
      { id: "action_3c", label: "الإجراء عند 3 أيام متصلة", type: "text" },
      { id: "action_3c_date", label: "تاريخ إجراء 3 أيام متصلة", type: "date" },
      { id: "deduct_3c", label: "درجات محسومة (3 متصلة)", type: "text" },
      { id: "action_5", label: "الإجراء عند 5 أيام", type: "text" },
      { id: "action_5_date", label: "تاريخ إجراء 5 أيام", type: "date" },
      { id: "deduct_5", label: "درجات محسومة (5 أيام)", type: "text" },
      { id: "action_10", label: "الإجراء عند 10 أيام", type: "text" },
      { id: "action_10_date", label: "تاريخ إجراء 10 أيام", type: "date" },
      { id: "deduct_10", label: "درجات محسومة (10 أيام)", type: "text" },
      { id: "teacher_notes", label: "ملاحظات", type: "textarea" },
    ],
  },
  // ====== CONFIDENTIAL — نموذج إبلاغ عن حالة إيذاء (مطابق ص71) ======
  {
    id: "abuse_report",
    title: "إبلاغ عن حالة إيذاء",
    category: "confidential",
    icon: "🆘",
    description: "بلاغ لمركز البلاغات بوزارة الموارد البشرية والتنمية الاجتماعية (مطابق ص71)",
    parentHidden: true,
    confidentialWatermark: true,
    requiresStamp: true,
    bodyTemplate:
      "نموذج إبلاغ عن حالة إيذاء\nلمركز البلاغات بوزارة الموارد البشرية والتنمية الاجتماعية\n\n(سري للغاية)\n\nاليوم: {report_day}     الساعة: {report_time}     التاريخ: {date}\n\n— بيانات الحالة المتعرضة للعنف —\nالاسم: {victim_name}     العمر: {victim_age}\nالحالة الاجتماعية: {victim_marital}     الجنس: {victim_gender}\nرقم السجل المدني: {victim_id}     الجنسية: {victim_nationality}\nرقم الهاتف: {victim_phone}     رقم الجوال: {victim_mobile}\nالعنوان: {victim_address}\n\n— بيانات الجهة المبلِّغة —\nاسم المبلغ: {reporter_name}     رقم السجل المدني: {reporter_id}\nالجنسية: {reporter_nationality}     رقم الهاتف: {reporter_phone}     رقم الجوال: {reporter_mobile}\nالعنوان: {reporter_address}\n\nملخص المشكلة:\n{problem_summary}\n\nأبرز الإجراءات المتخذة:\n{actions_taken}",
    signatureLabels: ["المرشد الطلابي", "وكيل المدرسة", "مدير المدرسة"],
    adminAlertEnabled: true,
    adminAlertTemplate:
      "🚨 تنبيه عاجل: تم رصد حالة إيذاء تستوجب الإبلاغ.\nالطالب: {student_name}\nالتفاصيل في المنصة.\n\nالإدارة المدرسية",
    fields: [
      ...commonAutoFields,
      { id: "report_day", label: "اليوم", type: "text", placeholder: "مثال: الأحد" },
      { id: "report_time", label: "الساعة", type: "text", placeholder: "مثال: 10:00 ص" },
      { id: "victim_name", label: "اسم الحالة المتعرضة للعنف", type: "text" },
      { id: "victim_age", label: "العمر", type: "text" },
      { id: "victim_marital", label: "الحالة الاجتماعية", type: "text" },
      { id: "victim_gender", label: "الجنس", type: "combobox", suggestions: ["ذكر", "أنثى"] },
      { id: "victim_id", label: "رقم السجل المدني", type: "text" },
      { id: "victim_nationality", label: "الجنسية", type: "text" },
      { id: "victim_phone", label: "رقم الهاتف", type: "text" },
      { id: "victim_mobile", label: "رقم الجوال", type: "text" },
      { id: "victim_address", label: "العنوان", type: "textarea" },
      { id: "reporter_name", label: "اسم المبلِّغ", type: "text" },
      { id: "reporter_id", label: "رقم سجل المبلِّغ", type: "text" },
      { id: "reporter_nationality", label: "جنسية المبلِّغ", type: "text" },
      { id: "reporter_phone", label: "هاتف المبلِّغ", type: "text" },
      { id: "reporter_mobile", label: "جوال المبلِّغ", type: "text" },
      { id: "reporter_address", label: "عنوان المبلِّغ", type: "textarea" },
      { id: "problem_summary", label: "ملخص المشكلة", type: "textarea" },
      { id: "actions_taken", label: "أبرز الإجراءات المتخذة", type: "textarea" },
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
