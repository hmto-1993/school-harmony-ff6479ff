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
  /** Ministry guide page number used for official PDF rendering */
  officialPage?: number;
  /** Place الختم on the right and the signature block on the left (letter-style) */
  stampOnRight?: boolean;
  stampLabel?: string;
  suppressDefaultTitle?: boolean;
  /** Optional layout rendered AFTER the signature block (e.g., parent reply section) */
  parentReplyLayout?: TableRow[];
}

/** Official ministry-style table row types */
export type TableRow =
  | { type: "section"; title: string }
  | { type: "row"; cells: Array<{ label: string; fieldId?: string; flex?: number; minHeight?: number; staticValue?: string }> }
  | { type: "block"; label: string; fieldId: string; minHeight?: number; staticValue?: string }
  | { type: "note"; lines: string[] }
  | { type: "text_line"; label: string; fieldId?: string; staticValue?: string; noColon?: boolean }
  | { type: "text_pair"; left: { label: string; fieldId?: string; noColon?: boolean }; right: { label: string; fieldId?: string; noColon?: boolean } }
  | { type: "paragraph"; text: string; fieldIds?: string[]; bold?: boolean; align?: "right" | "center"; spacing?: number; fontSize?: number }
  | { type: "grid"; title?: string; columns: string[]; rows?: string[][]; rowCount?: number; columnFlex?: number[]; minRowHeight?: number }
  | { type: "checkbox_row"; options: string[]; trailingFieldId?: string; trailingLabel?: string }
  | { type: "text_triple"; cells: Array<{ label: string; fieldId?: string; noColon?: boolean }> }
  | {
      type: "escalation";
      title: string;
      columns: string[]; // header labels
      rows: Array<{ label: string; fieldIds: string[] }>; // first col = label, rest = fieldIds
      columnFlex?: number[]; // optional per-column flex weights
    }
  | {
      type: "signature_columns";
      columns: Array<{ title: string; nameFieldId?: string; sigFieldId?: string; dateFieldId?: string }>;
    };

export interface FormField {
  id: string;
  label: string;
  type: "text" | "textarea" | "date" | "auto" | "combobox" | "checkbox-list";
  autoKey?: "student_name" | "class_name" | "national_id" | "date" | "grade" | "section";
  required?: boolean;
  placeholder?: string;
  /** If true, the field is hidden from UI (used only in PDF body template) */
  hidden?: boolean;
  /** Suggestion list for combobox fields */
  suggestions?: string[];
  /** Options for checkbox-list (stored value = JSON array of selected labels) */
  options?: string[];
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
    officialPage: 58,
    tableLayout: [
      { type: "section", title: "خاص بالطالب/الطالبة" },
      { type: "row", cells: [{ label: "الاسم", fieldId: "student_name" }] },
      { type: "row", cells: [{ label: "المرحلة", fieldId: "stage" }] },
      { type: "row", cells: [{ label: "الصف", fieldId: "class_name" }] },
      { type: "block", label: "", fieldId: "_student_pledge", minHeight: 22, staticValue: "نعم أنا الطالب/الطالبة الموضح اسمه وبياناته أعلاه. قد اطلعت على محتوى قواعد السلوك والمواظبة. وبناء عليه أتعهد أن ألتزم بالأنظمة والتعليمات الخاصة بقواعد السلوك والمواظبة." },
      { type: "row", cells: [{ label: "التوقيع", fieldId: "student_signature" }, { label: "التاريخ", fieldId: "date", staticValue: undefined }] },
      { type: "section", title: "خاص بولي الأمر" },
      { type: "block", label: "", fieldId: "_parent_pledge", minHeight: 28, staticValue: "نعم أنا ولي أمر الطالب/الطالبة الموضح اسمه وبياناته أعلاه. قد اطلعت على محتوى قواعد السلوك والمواظبة. وبناء عليه أتعهد أن أتعاون مع إدارة المدرسة في سبيل مصلحة ابني/ابنتي، ليكون ملتزماً بالأنظمة والتعليمات الخاصة بقواعد السلوك والمواظبة، وأتحمل مسؤولية صحة أرقام التواصل التالية:" },
      { type: "row", cells: [{ label: "الاسم", fieldId: "parent_name" }] },
      { type: "row", cells: [{ label: "التوقيع", fieldId: "parent_signature" }, { label: "التاريخ", fieldId: "date" }] },
      { type: "row", cells: [{ label: "العمل", fieldId: "parent_job" }, { label: "هاتف العمل", fieldId: "parent_work_phone" }] },
      { type: "row", cells: [{ label: "هاتف المنزل", fieldId: "home_phone" }, { label: "رقم الجوال", fieldId: "mobile_phone" }] },
      { type: "row", cells: [{ label: "رقم آخر", fieldId: "alt_phone" }] },
      { type: "note", lines: ["يؤخذ توقيع الطالب وولي الأمر في بداية العام الدراسي.", "تحفظ النماذج في ملف خاص لدى وكيل/وكيلة شؤون الطلبة."] },
    ],
    signatureLabels: [],
    fields: [
      ...commonAutoFields,
      { id: "stage", label: "المرحلة", type: "text", placeholder: "مثال: المرحلة الثانوية" },
      { id: "student_signature", label: "توقيع الطالب", type: "text" },
      { id: "parent_name", label: "اسم ولي الأمر", type: "text" },
      { id: "parent_signature", label: "توقيع ولي الأمر", type: "text" },
      { id: "parent_job", label: "عمل ولي الأمر", type: "text" },
      { id: "parent_work_phone", label: "هاتف العمل", type: "text" },
      { id: "home_phone", label: "هاتف المنزل", type: "text" },
      { id: "mobile_phone", label: "رقم الجوال", type: "text" },
      { id: "alt_phone", label: "رقم آخر", type: "text" },
    ],
  },
  {
    id: "behavior_grades",
    title: "نموذج رصد درجات السلوك المتميز",
    category: "behavior",
    icon: "⭐",
    description: "رصد شواهد السلوك المتميز والدرجات المكتسبة (مطابق ص59)",
    officialPage: 59,
    tableLayout: [
      { type: "text_line", label: "اسم الطالب/ الطالبة", fieldId: "student_name" },
      { type: "text_line", label: "المرحلة", fieldId: "stage" },
      { type: "text_line", label: "الصف", fieldId: "class_name" },
      {
        type: "grid",
        columns: [
          "موضوع ممارسة السلوك المتميز",
          "نوع ممارسة السلوك المتميز",
          "تاريخ التنفيذ",
          "شواهد السلوك المتميز",
          "الدرجة المكتسبة",
          "اسم راصد السلوك",
          "توقيع راصد السلوك",
        ],
        rowCount: 8,
        minRowHeight: 14,
      },
    ],
    signatureLabels: ["مدير/مديرة المدرسة"],
    fields: [
      ...commonAutoFields,
      { id: "stage", label: "المرحلة", type: "text" },
    ],
  },
  {
    id: "behavior_plan",
    title: "خطة تعديل السلوك",
    category: "behavior",
    icon: "📋",
    description: "خطة شاملة لتعديل السلوك بالمثيرات القبلية والبعدية (مطابق ص60-61)",
    requiresStamp: true,
    officialPage: 60,
    tableLayout: [
      { type: "section", title: "أولاً: البيانات الأولية" },
      { type: "row", cells: [{ label: "اسم الطالب", fieldId: "student_name", flex: 2 }, { label: "الصف/الفصل", fieldId: "class_name" }] },
      { type: "row", cells: [{ label: "تاريخ الميلاد", fieldId: "birth_date" }, { label: "العمر الزمني", fieldId: "age" }] },
      { type: "row", cells: [{ label: "تاريخ بداية الخطة", fieldId: "plan_start" }, { label: "تاريخ نهاية الخطة", fieldId: "plan_end" }] },
      { type: "section", title: "ثانياً: تحديد المشكلة السلوكية" },
      { type: "row", cells: [{ label: "المشكلة السلوكية", fieldId: "behavior_issue", flex: 2 }, { label: "درجتها", fieldId: "issue_degree" }] },
      { type: "block", label: "وصف المشكلة", fieldId: "issue_description", minHeight: 22 },
      { type: "block", label: "المظاهر السلوكية الملحوظة", fieldId: "behavior_signs", minHeight: 22 },
      { type: "section", title: "ثالثاً: قياس شدة أو تكرار السلوك" },
      {
        type: "escalation",
        title: "جدول قياس تكرار السلوك (3 جلسات ملاحظة)",
        columns: ["اليوم", "التاريخ", "فترة الملاحظة", "ت1", "ت2", "ت3", "ت4", "ت5", "المجموع"],
        // أعمدة اليوم/التاريخ/فترة الملاحظة أعرض، وأعمدة ت1..ت5 ضيقة (إشارة فقط)
        columnFlex: [2, 2.4, 2.6, 1, 1, 1, 1, 1, 1.4],
        rows: [
          { label: "1", fieldIds: ["m1_date", "m1_period", "m1_t1", "m1_t2", "m1_t3", "m1_t4", "m1_t5", "m1_total"] },
          { label: "2", fieldIds: ["m2_date", "m2_period", "m2_t1", "m2_t2", "m2_t3", "m2_t4", "m2_t5", "m2_total"] },
          { label: "3", fieldIds: ["m3_date", "m3_period", "m3_t1", "m3_t2", "m3_t3", "m3_t4", "m3_t5", "m3_total"] },
        ],
      },
      { type: "section", title: "رابعاً: المثيرات والأسباب" },
      { type: "block", label: "المثيرات القبلية (الأسباب)", fieldId: "antecedents", minHeight: 22 },
      { type: "block", label: "المثيرات البعدية", fieldId: "consequences", minHeight: 22 },
      { type: "block", label: "ما يحققه الطالب من السلوك", fieldId: "function_of_behavior", minHeight: 18 },
      { type: "block", label: "الإجراءات السابقة المستخدمة", fieldId: "previous_actions", minHeight: 18 },
      { type: "section", title: "خامساً: تصميم الخطة العلاجية" },
      { type: "block", label: "السلوك المرغوب إكسابه", fieldId: "target_behavior", minHeight: 18 },
      { type: "block", label: "الإجراءات والاستراتيجيات", fieldId: "plan", minHeight: 28 },
      { type: "section", title: "سادساً: تقييم فاعلية الخطة" },
      { type: "block", label: "رأي وكيل المدرسة", fieldId: "vice_opinion", minHeight: 16 },
      { type: "block", label: "رأي معلم الفصل", fieldId: "teacher_opinion", minHeight: 16 },
      { type: "block", label: "رأي ولي الأمر", fieldId: "parent_opinion", minHeight: 16 },
      { type: "row", cells: [{ label: "تقييم الفاعلية", fieldId: "effectiveness", flex: 2 }, { label: "التاريخ", fieldId: "date" }] },
    ],
    bodyTemplate:
      "نموذج خطة تعديل السلوك\n\nأولاً: البيانات الأولية\nاسم الطالب: {student_name}\nالصف/الفصل: {class_name}\nتاريخ الميلاد: {birth_date}    العمر الزمني: {age}\nتاريخ بداية الخطة: {plan_start}\nتاريخ نهاية الخطة: {plan_end}\n\nثانياً: تحديد المشكلة السلوكية\nالمشكلة: {behavior_issue}    درجتها: {issue_degree}\nوصف المشكلة:\n{issue_description}\nالمظاهر السلوكية الملحوظة:\n{behavior_signs}\n\nثالثاً: المثيرات والأسباب\n• المثيرات القبلية (الأسباب المسببة للسلوك): {antecedents}\n• المثيرات البعدية (ما يحدث بعد السلوك): {consequences}\n• ما يحققه الطالب من السلوك: {function_of_behavior}\n• الإجراءات السابقة المستخدمة: {previous_actions}\n\nرابعاً: تصميم الخطة العلاجية\nالسلوك المرغوب إكسابه: {target_behavior}\nالإجراءات والاستراتيجيات:\n{plan}\n\nخامساً: تقييم فاعلية الخطة\nرأي وكيل المدرسة: {vice_opinion}\nرأي معلم الفصل: {teacher_opinion}\nرأي ولي الأمر: {parent_opinion}\nتقييم الفاعلية: {effectiveness}\n\nالسجل المدني: {national_id}\nالتاريخ: {date}",
    signatureLabels: ["القائم بتعديل السلوك (معلم/معلمة - موجه طلابي/موجهة طلابية)", "المرشد الطلابي", "ولي الأمر", "مدير المدرسة"],
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
      // Measurement table fields (3 sessions x 5 frequencies)
      { id: "m1_date", label: "ج1: التاريخ", type: "text" },
      { id: "m1_period", label: "ج1: فترة الملاحظة", type: "text" },
      { id: "m1_t1", label: "ج1: ت1", type: "text" }, { id: "m1_t2", label: "ج1: ت2", type: "text" },
      { id: "m1_t3", label: "ج1: ت3", type: "text" }, { id: "m1_t4", label: "ج1: ت4", type: "text" },
      { id: "m1_t5", label: "ج1: ت5", type: "text" }, { id: "m1_total", label: "ج1: المجموع", type: "text" },
      { id: "m2_date", label: "ج2: التاريخ", type: "text" },
      { id: "m2_period", label: "ج2: فترة الملاحظة", type: "text" },
      { id: "m2_t1", label: "ج2: ت1", type: "text" }, { id: "m2_t2", label: "ج2: ت2", type: "text" },
      { id: "m2_t3", label: "ج2: ت3", type: "text" }, { id: "m2_t4", label: "ج2: ت4", type: "text" },
      { id: "m2_t5", label: "ج2: ت5", type: "text" }, { id: "m2_total", label: "ج2: المجموع", type: "text" },
      { id: "m3_date", label: "ج3: التاريخ", type: "text" },
      { id: "m3_period", label: "ج3: فترة الملاحظة", type: "text" },
      { id: "m3_t1", label: "ج3: ت1", type: "text" }, { id: "m3_t2", label: "ج3: ت2", type: "text" },
      { id: "m3_t3", label: "ج3: ت3", type: "text" }, { id: "m3_t4", label: "ج3: ت4", type: "text" },
      { id: "m3_t5", label: "ج3: ت5", type: "text" }, { id: "m3_total", label: "ج3: المجموع", type: "text" },
      { id: "m4_date", label: "ج4: التاريخ", type: "text" },
      { id: "m4_period", label: "ج4: فترة الملاحظة", type: "text" },
      { id: "m4_t1", label: "ج4: ت1", type: "text" }, { id: "m4_t2", label: "ج4: ت2", type: "text" },
      { id: "m4_t3", label: "ج4: ت3", type: "text" }, { id: "m4_t4", label: "ج4: ت4", type: "text" },
      { id: "m4_t5", label: "ج4: ت5", type: "text" }, { id: "m4_total", label: "ج4: المجموع", type: "text" },
      { id: "m5_date", label: "ج5: التاريخ", type: "text" },
      { id: "m5_period", label: "ج5: فترة الملاحظة", type: "text" },
      { id: "m5_t1", label: "ج5: ت1", type: "text" }, { id: "m5_t2", label: "ج5: ت2", type: "text" },
      { id: "m5_t3", label: "ج5: ت3", type: "text" }, { id: "m5_t4", label: "ج5: ت4", type: "text" },
      { id: "m5_t5", label: "ج5: ت5", type: "text" }, { id: "m5_total", label: "ج5: المجموع", type: "text" },
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
    title: "نموذج رصد المعلم لمشكلة سلوكية",
    category: "behavior",
    icon: "⚠️",
    description: "جدول رصد المعلم لمشكلة سلوكية — مطابق لصفحة 62",
    requiresStamp: true,
    officialPage: 62,
    tableLayout: [
      { type: "text_line", label: "المادة", fieldId: "subject" },
      { type: "text_line", label: "الصف", fieldId: "class_name" },
      {
        type: "grid",
        columns: [
          "اسم الطالب / الطالبة",
          "المشكلة السلوكية",
          "درجة المشكلة",
          "الإجراء المتخذ",
          "مدى الاستجابة",
          "عدد مرات تكرار المشكلة السلوكية",
          "التاريخ",
          "الحصة",
        ],
        columnFlex: [3, 3, 1.4, 2.5, 1.8, 2, 1.6, 1.2],
        rowCount: 6,
        minRowHeight: 14,
      },
    ],
    bodyTemplate:
      "نموذج رصد المعلم لمشكلة سلوكية\n\nالمادة: {subject}\nالصف: {class_name}\n\nاسم الطالب: {student_name}\nالمشكلة: {issue_desc} — درجة: {issue_degree}\nالإجراء: {action_taken}\nمدى الاستجابة: {response_level}\nالتكرار: {repeat_count}\nالتاريخ: {date}\nالحصة: {lesson_period}\n\nملاحظات: {teacher_notes}",
    signatureLabels: ["المعلم/المعلمة"],
    fields: [
      ...commonAutoFields,
      { id: "subject", label: "المادة", type: "text", placeholder: "مثال: الفيزياء" },
      { id: "lesson_period", label: "الحصة", type: "combobox", suggestions: ["الأولى", "الثانية", "الثالثة", "الرابعة", "الخامسة", "السادسة", "السابعة"] },
      { id: "issue_desc", label: "المشكلة السلوكية", type: "combobox", placeholder: "اختر أو اكتب وصف المشكلة...", suggestions: ["النوم أثناء الحصة", "إثارة الفوضى", "عدم إحضار الأدوات", "استخدام الجوال", "التلفظ بألفاظ غير لائقة", "الكتابة على الطاولات", "التأخر عن الحصة"] },
      { id: "issue_degree", label: "درجة المشكلة", type: "combobox", suggestions: ["الدرجة الأولى", "الدرجة الثانية", "الدرجة الثالثة", "الدرجة الرابعة", "الدرجة الخامسة"] },
      { id: "repeat_count", label: "عدد مرات تكرار المشكلة", type: "text", placeholder: "مثال: 1" },
      { id: "action_taken", label: "الإجراء المتخذ", type: "combobox", placeholder: "اختر أو اكتب الإجراء المتخذ...", suggestions: ["تنبيه شفهي", "تدوين في سجل المتابعة", "أخذ تعهد خطي", "إحالة للموجه الطلابي", "إشعار ولي الأمر", "حسم درجات"] },
      { id: "response_level", label: "مدى الاستجابة", type: "combobox", suggestions: ["استجابة كاملة", "استجابة جزئية", "ضعيفة", "لا توجد استجابة"] },
      { id: "teacher_notes", label: "ملاحظات المعلم", type: "textarea", placeholder: "أضف ملاحظاتك الخاصة بالحالة..." },
    ],
  },
  {
    id: "problems_log",
    title: "نموذج رصد مشكلة سلوكية",
    category: "behavior",
    icon: "📊",
    description: "جدول رصد مشكلة سلوكية — مطابق لصفحة 63",
    requiresStamp: true,
    officialPage: 63,
    tableLayout: [
      { type: "text_line", label: "اسم الطالب/الطالبة", fieldId: "student_name" },
      { type: "text_line", label: "الصف", fieldId: "class_name" },
      { type: "text_line", label: "الفصل", fieldId: "section" },
      {
        type: "grid",
        columns: [
          "المشكلة السلوكية",
          "نوعها ودرجتها",
          "تاريخها",
          "درجات السلوك المحسومة",
          "الإجراءات المتخذة",
          "تاريخ الإجراء",
          "توقيع الطالب",
          "توقيع ولي الأمر",
        ],
        columnFlex: [3, 2, 1.5, 1.8, 3, 1.5, 1.5, 1.7],
        rowCount: 6,
        minRowHeight: 14,
      },
    ],
    bodyTemplate:
      "نموذج رصد مشكلة سلوكية\n\nاسم الطالب/الطالبة: {student_name}\nالصف: {class_name}     الفصل: {section}\n\nالمشكلة: {problem} — {problem_type}\nتاريخها: {problem_date}\nالدرجات المحسومة: {deducted_marks}\nالإجراءات: {solution}\nتاريخ الإجراء: {action_date}\n\nملاحظات: {teacher_notes}",
    signatureLabels: ["مدير/مديرة المدرسة"],
    fields: [
      ...commonAutoFields,
      { id: "section", label: "الفصل", type: "text" },
      { id: "problem", label: "المشكلة السلوكية", type: "combobox", placeholder: "اختر أو اكتب وصف المشكلة...", suggestions: ["النوم أثناء الحصة", "إثارة الفوضى", "عدم إحضار الأدوات", "استخدام الجوال", "التلفظ بألفاظ غير لائقة", "الكتابة على الطاولات", "التأخر عن الحصة"] },
      { id: "problem_type", label: "نوع ودرجة المشكلة", type: "combobox", suggestions: ["الدرجة الأولى", "الدرجة الثانية", "الدرجة الثالثة", "الدرجة الرابعة", "الدرجة الخامسة"] },
      { id: "problem_date", label: "تاريخ المشكلة", type: "date" },
      { id: "deducted_marks", label: "درجات السلوك المحسومة", type: "text", placeholder: "مثال: 3" },
      { id: "solution", label: "الإجراءات المتخذة", type: "textarea", placeholder: "اذكر الإجراءات المتخذة..." },
      { id: "action_date", label: "تاريخ الإجراء", type: "date" },
      { id: "teacher_notes", label: "ملاحظات المعلم", type: "textarea", placeholder: "أضف ملاحظاتك الخاصة بالحالة..." },
    ],
  },
  {
    id: "grade_compensation",
    title: "نموذج فرص تعويض درجات السلوك الإيجابي",
    category: "general",
    icon: "📈",
    description: "جدول فرص تعويض درجات السلوك — مطابق لصفحة 64",
    requiresStamp: true,
    officialPage: 64,
    tableLayout: [
      { type: "text_line", label: "اسم الطالب / الطالبة", fieldId: "student_name" },
      { type: "text_line", label: "المرحلة", fieldId: "stage" },
      { type: "text_line", label: "الصف", fieldId: "class_name" },
      {
        type: "grid",
        columns: [
          "المشكلة السلوكية",
          "نوعها ودرجتها",
          "درجات السلوك المحسومة",
          "فرص التعويض",
          "الدرجات المكتسبة",
          "توقيع الطالب",
        ],
        columnFlex: [3, 2, 1.8, 3, 1.8, 1.6],
        rowCount: 6,
        minRowHeight: 14,
      },
    ],
    bodyTemplate:
      "نموذج فرص تعويض درجات السلوك الإيجابي\n\nاسم الطالب: {student_name}\nالمرحلة: {stage}     الصف: {class_name}",
    signatureLabels: ["مدير/مديرة المدرسة"],
    fields: [
      ...commonAutoFields,
      { id: "stage", label: "المرحلة", type: "text" },
      { id: "problem", label: "المشكلة السلوكية", type: "text" },
      { id: "problem_type", label: "نوع ودرجة المشكلة", type: "combobox", suggestions: ["الدرجة الأولى", "الدرجة الثانية", "الدرجة الثالثة", "الدرجة الرابعة", "الدرجة الخامسة"] },
      { id: "deducted_marks", label: "درجات السلوك المحسومة", type: "text" },
      { id: "earned_marks", label: "الدرجات المكتسبة بعد التعويض", type: "text" },
      { id: "compensation_tasks", label: "فرص التعويض المقترحة", type: "textarea", placeholder: "مثال: إعداد بحث علمي، عرض تقديمي، الالتزام بالهدوء أسبوعاً..." },
      { id: "reason", label: "سبب الحاجة للتعويض / ملاحظات", type: "textarea" },
    ],
  },
  // ====== CONFIDENTIAL FORM #8 — إحالة طالب/ة (مطابق ص65) ======
  {
    id: "confidential_referral",
    title: "إحالة طالب/ة",
    category: "confidential",
    icon: "🔒",
    description: "خطاب إحالة سري للموجه الطلابي — مطابق لصفحة 65",
    parentHidden: true,
    confidentialWatermark: true,
    requiresStamp: true,
    officialPage: 65,
    stampOnRight: true,
    tableLayout: [
      { type: "paragraph", text: "سري", bold: true, align: "center", spacing: 4 },
      { type: "paragraph", text: "", spacing: 10 },
      { type: "paragraph", text: "المكرم الموجه الطلابي / الموجهة الطلابية", bold: true, spacing: 4 },
      { type: "paragraph", text: "السلام عليكم ورحمة الله وبركاته", align: "center", spacing: 5 },
      { type: "paragraph", text: "نحيل إليكم الطالب/الطالبة: {student_name}", spacing: 3 },
      { type: "paragraph", text: "بالصف {class_name}     ذي المشكلة السلوكية من الدرجة: {issue_degree}     وهي: {referral_reason}", spacing: 5 },
      { type: "paragraph", text: "يرجى متابعة الطالب/الطالبة ودراسة حالته ووضع الحلول التربوية والعلاجية المناسبة.", spacing: 6 },
    ],
    bodyTemplate:
      "إحالة طالب/ة (سري)\n\nالمكرم الموجه الطلابي / الموجهة الطلابية\nالسلام عليكم ورحمة الله وبركاته\n\nنحيل إليكم الطالب/الطالبة: {student_name}\nبالصف: {class_name} ذي المشكلة السلوكية من الدرجة: {issue_degree}\nوهي: {referral_reason}\n\nيرجى متابعة الطالب/الطالبة ودراسة حالته/حالتها ووضع الحلول التربوية المناسبة.\n\nالتفاصيل: {referral_details}\nالتوصيات: {recommendations}",
    signatureLabels: ["وكيل/وكيلة شؤون الطلبة"],
    adminAlertEnabled: true,
    adminAlertTemplate:
      "⚠️ تنبيه إداري: تم رصد إحالة سرية للطالب/ {student_name} تتطلب تدخلاً عاجلاً.\nالتفاصيل متوفرة في المنصة.\n\nالإدارة المدرسية",
    fields: [
      ...commonAutoFields,
      { id: "issue_degree", label: "درجة المشكلة", type: "combobox", suggestions: ["الدرجة الأولى", "الدرجة الثانية", "الدرجة الثالثة", "الدرجة الرابعة", "الدرجة الخامسة"] },
      { id: "referral_reason", label: "وصف المشكلة السلوكية", type: "textarea", placeholder: "اذكر سبب الإحالة بالتفصيل..." },
      { id: "referral_details", label: "الملاحظات والتفاصيل", type: "textarea", placeholder: "تفاصيل إضافية عن الحالة..." },
      { id: "recommendations", label: "التوصيات", type: "textarea", placeholder: "التوصيات المقترحة..." },
    ],
  },
  // ====== FORM #9 — تعهد سلوكي (مطابق ص66) ======
  {
    id: "behavior_pledge",
    title: "تعهد سلوكي",
    category: "behavior",
    icon: "✍️",
    description: "تعهد سلوكي رسمي من الطالب — مطابق لصفحة 66",
    officialPage: 66,
    tableLayout: [
      { type: "paragraph", text: "", spacing: 14 },
      { type: "text_line", label: "أنا الطالب/الطالبة", fieldId: "student_name", noColon: true },
      { type: "text_line", label: "بالصف", fieldId: "class_name", noColon: true },
      { type: "text_pair",
        right: { label: "أني قمت في يوم", fieldId: "pledge_day", noColon: true },
        left: { label: "الموافق", fieldId: "pledge_date", noColon: true },
      },
      { type: "text_line", label: "بمشكلة سلوكية من الدرجة", fieldId: "issue_degree", noColon: true },
      { type: "text_line", label: "وهي", fieldId: "issue_desc", noColon: true },
      { type: "paragraph", text: "وأتعهد بعدم تكرار أي مشكلة سلوكية مستقبلاً وعلى ذلك جرى التوقيع", spacing: 28 },
      {
        type: "signature_columns",
        columns: [
          { title: "الطالب/الطالبة", nameFieldId: "s_name", sigFieldId: "s_sig", dateFieldId: "s_date" },
          { title: "ولي الأمر", nameFieldId: "p_name", sigFieldId: "p_sig", dateFieldId: "p_date" },
          { title: "مدير/مديرة المدرسة", nameFieldId: "d_name", sigFieldId: "d_sig", dateFieldId: "d_date" },
        ],
      },
    ],
    bodyTemplate:
      "تعهد سلوكي\n\nأنا الطالب/الطالبة: {student_name}\nبالصف: {class_name}\nقمت في يوم {pledge_day} الموافق {pledge_date} بمشكلة سلوكية من الدرجة {issue_degree} وهي: {issue_desc}\n\nوأتعهد بعدم تكرار أي مشكلة سلوكية مستقبلاً.",
    signatureLabels: [],
    fields: [
      ...commonAutoFields,
      { id: "pledge_day", label: "يوم الواقعة", type: "text", placeholder: "مثال: الأحد" },
      { id: "pledge_date", label: "تاريخ الواقعة", type: "date" },
      { id: "issue_degree", label: "درجة المشكلة", type: "combobox", suggestions: ["الدرجة الأولى", "الدرجة الثانية", "الدرجة الثالثة", "الدرجة الرابعة", "الدرجة الخامسة"] },
      { id: "issue_desc", label: "وصف المشكلة السلوكية", type: "textarea" },
      { id: "s_name", label: "اسم الطالب", type: "text" },
      { id: "s_sig", label: "توقيع الطالب", type: "text" },
      { id: "s_date", label: "تاريخ الطالب", type: "text" },
      { id: "p_name", label: "اسم ولي الأمر", type: "text" },
      { id: "p_sig", label: "توقيع ولي الأمر", type: "text" },
      { id: "p_date", label: "تاريخ ولي الأمر", type: "text" },
      { id: "d_name", label: "اسم مدير المدرسة", type: "text" },
      { id: "d_sig", label: "توقيع مدير المدرسة", type: "text" },
      { id: "d_date", label: "تاريخ التوقيع", type: "text" },
    ],
  },
  // ====== FORM #10 — إشعار ولي الأمر بمشكلة سلوكية (مطابق ص67) ======
  {
    id: "parent_notice",
    title: "إشعار ولي أمر الطالب/الطالبة بمشكلة سلوكية",
    category: "general",
    icon: "📬",
    description: "إشعار رسمي لولي الأمر بمشكلة سلوكية والإجراءات المتخذة — مطابق لصفحة 67",
    requiresStamp: true,
    confidentialWatermark: true,
    officialPage: 67,
    stampOnRight: true,
    suppressDefaultTitle: true,
    tableLayout: [
      { type: "paragraph", text: " ", spacing: 4 },
      { type: "paragraph", text: "سري", bold: true, align: "center", spacing: 4 },
      { type: "paragraph", text: "إشعار ولي أمر الطالب/الطالبة بمشكلة سلوكية", bold: true, align: "center", spacing: 10 },
      { type: "paragraph", text: " ", spacing: 4 },
      { type: "text_line", label: "المكرم ولي أمر الطالب/الطالبة", fieldId: "student_name", noColon: true } as any,
      { type: "paragraph", text: " ", spacing: 1 },
      { type: "text_line", label: "بالصف", fieldId: "class_name" } as any,
      { type: "paragraph", text: " ", spacing: 3 },
      { type: "paragraph", text: "السلام عليكم ورحمة الله وبركاته", align: "center", spacing: 4 },
      { type: "text_line", label: "نشعركم بأن الطالب/الطالبة قام/قامت بمشكلة سلوكية من الدرجة", fieldId: "issue_degree", noColon: true } as any,
      { type: "paragraph", text: " ", spacing: 1 },
      { type: "text_line", label: "وهي", fieldId: "issue_desc", noColon: true } as any,
      { type: "paragraph", text: " ", spacing: 1 },
      { type: "paragraph", text: ":وقد قُررت الإجراءات التالية حياله/حيالها وفق ما ورد في قواعد السلوك والمواظبة", spacing: 3 },
      { type: "text_line", label: ".1", fieldId: "action_1", noColon: true } as any,
      { type: "text_line", label: ".2", fieldId: "action_2", noColon: true } as any,
      { type: "text_line", label: ".3", fieldId: "action_3", noColon: true } as any,
      { type: "paragraph", text: " ", spacing: 2 },
      { type: "paragraph", text: ".لذا يرجى منكم المتابعة والتعاون مع المدرسة بما يسهم في انضباط سلوك ابنكم/ابنتكم", spacing: 4 },
    ],
    bodyTemplate:
      "إشعار ولي أمر الطالب/الطالبة بمشكلة سلوكية\n\nالمكرم ولي أمر الطالب/الطالبة: {student_name}\nبالصف: {class_name}\n\nنُشعركم بأن الطالب/الطالبة قام بمشكلة سلوكية من الدرجة {issue_degree} وهي: {issue_desc}\n\nالإجراءات:\n1. {action_1}\n2. {action_2}\n3. {action_3}",
    signatureLabels: ["مدير/مديرة المدرسة"],
    fields: [
      ...commonAutoFields,
      { id: "issue_degree", label: "درجة المشكلة", type: "combobox", suggestions: ["الدرجة الأولى", "الدرجة الثانية", "الدرجة الثالثة", "الدرجة الرابعة", "الدرجة الخامسة"] },
      { id: "issue_desc", label: "وصف المشكلة السلوكية", type: "textarea" },
      { id: "action_1", label: "الإجراء الأول", type: "text" },
      { id: "action_2", label: "الإجراء الثاني", type: "text" },
      { id: "action_3", label: "الإجراء الثالث", type: "text" },
    ],
  },
  {
    id: "invitation_letter",
    title: "خطاب دعوة ولي الأمر",
    category: "general",
    icon: "✉️",
    description: "خطاب دعوة رسمي لولي الأمر مع قسم رد ولي الأمر (مطابق ص68)",
    requiresStamp: true,
    stampOnRight: true,
    officialPage: 68,
    tableLayout: [
      { type: "paragraph", text: " ", spacing: 4 },
      { type: "text_line", label: "المكرم ولي أمر الطالب/الطالبة", fieldId: "student_name", noColon: true } as any,
      { type: "paragraph", text: " ", spacing: 1 },
      { type: "text_line", label: "بالصف", fieldId: "class_name", noColon: true } as any,
      { type: "paragraph", text: " ", spacing: 3 },
      { type: "paragraph", text: "السلام عليكم ورحمة الله وبركاته", align: "center", spacing: 4 },
      { type: "text_pair",
        right: { label: "نأمل منكم الحضور إلى المدرسة في يوم", fieldId: "visit_day", noColon: true },
        left: { label: "الموافق", fieldId: "visit_date", noColon: true },
      } as any,
      { type: "paragraph", text: " ", spacing: 1 },
      { type: "text_line", label: "لمقابلة مدير/مديرة المدرسة، وذلك بهدف", fieldId: "visit_purpose", noColon: true } as any,
      { type: "paragraph", text: " ", spacing: 4 },
      { type: "paragraph", text: ".شاكرين لكم تعاونكم معنا لتحقيق مصلحة الطالب", align: "center", spacing: 4 },
    ],
    parentReplyLayout: [
      { type: "paragraph", text: " ", spacing: 4 },
      { type: "paragraph", text: ":رد ولي الأمر", bold: true, spacing: 2 },
      { type: "paragraph", text: ".[ ] أقر بالعلم، وسأحضر في الموعد المحدد", spacing: 2 },
      { type: "text_pair",
        right: { label: "[ ] أقر بالعلم، وأرغب بتغيير الموعد )خلال نفس الأسبوع(، وذلك في يوم", fieldId: "alt_day", noColon: true },
        left: { label: "الموافق", fieldId: "alt_date", noColon: true },
      } as any,
      { type: "paragraph", text: " ", spacing: 2 },
      { type: "signature_columns", columns: [
        { title: "", nameFieldId: "parent_name", sigFieldId: "parent_sig", dateFieldId: "parent_date" },
      ] } as any,
    ],
    signatureLabels: ["مدير/مديرة المدرسة"],
    whatsappEnabled: true,
    whatsappTemplate:
      "المكرم ولي أمر الطالب/ {student_name}\n\nالسلام عليكم ورحمة الله وبركاته\n\nنأمل منكم الحضور إلى المدرسة في يوم/ {visit_day} الموافق/ {visit_date} لمقابلة مدير/مديرة المدرسة بهدف تحقيق مصلحة الطالب.\n\nالإدارة المدرسية",
    fields: [
      ...commonAutoFields,
      { id: "visit_day", label: "يوم الزيارة", type: "text", placeholder: "مثال: الأحد" },
      { id: "visit_date", label: "تاريخ الزيارة", type: "date" },
      { id: "visit_purpose", label: "هدف الزيارة", type: "text", placeholder: "تحقيق مصلحة الطالب/الطالبة" },
      { id: "alt_day", label: "اليوم البديل (إن طُلب تغيير)", type: "text", placeholder: "مثال: الثلاثاء" },
      { id: "alt_date", label: "التاريخ البديل", type: "date" },
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
    witnessPickerEnabled: true,
    suppressDefaultTitle: true,
    tableLayout: [
      { type: "paragraph", text: "سري", bold: true, align: "center", spacing: 4 },
      { type: "paragraph", text: "محضر ضبط واقعة", bold: true, align: "center", spacing: 8 },
      { type: "text_line", label: "اسم الطالب/ الطالبة", fieldId: "student_name" } as any,
      { type: "text_pair", right: { label: "المرحلة", fieldId: "stage" }, left: { label: "الصف", fieldId: "class_name" } } as any,
      { type: "text_pair", right: { label: "المشكلة السلوكية", fieldId: "behavior_issue" }, left: { label: "درجتها", fieldId: "issue_degree" } } as any,
      { type: "paragraph", text: "نوع المشاهدة المضبوطة :", spacing: 3 },
      { type: "checkbox_row", options: ["صور", "مقاطع فيديو", "محادثات"], trailingLabel: "أخرى", trailingFieldId: "evidence_other" } as any,
      { type: "text_line", label: "مكان ضبط الواقعة", fieldId: "incident_location" } as any,
      { type: "paragraph", text: "شهود الواقعة :", spacing: 3 },
      {
        type: "grid",
        columns: ["م", "الاسم", "الوظيفة", "العمل المسند إليه", "التوقيع"],
        columnFlex: [0.6, 3, 2, 2, 2],
        rows: [
          ["1", "", "", "", ""], ["2", "", "", "", ""], ["3", "", "", "", ""],
          ["4", "", "", "", ""], ["5", "", "", "", ""], ["6", "", "", "", ""], ["7", "", "", "", ""],
        ],
        minRowHeight: 12,
      },
      { type: "paragraph", text: " ", spacing: 6 },
      { type: "signature_columns", columns: [
        { title: "الطالب/الطالبة", nameFieldId: "s_name", sigFieldId: "s_sig", dateFieldId: "s_date" },
        { title: "ولي الأمر", nameFieldId: "p_name", sigFieldId: "p_sig", dateFieldId: "p_date" },
        { title: "مدير/مديرة المدرسة", nameFieldId: "d_name", sigFieldId: "d_sig", dateFieldId: "d_date" },
      ] } as any,
    ],
    signatureLabels: [],
    adminAlertEnabled: true,
    adminAlertTemplate:
      "⚠️ تنبيه إداري: تم رصد واقعة تتطلب تدخلاً عاجلاً.\nالطالب: {student_name}\nالتفاصيل في المرفق/المنصة.\n\nالإدارة المدرسية",
    fields: [
      ...commonAutoFields,
      { id: "stage", label: "المرحلة", type: "text" },
      { id: "behavior_issue", label: "المشكلة السلوكية", type: "text" },
      { id: "issue_degree", label: "درجة المشكلة", type: "combobox", suggestions: ["الدرجة الأولى", "الدرجة الثانية", "الدرجة الثالثة", "الدرجة الرابعة", "الدرجة الخامسة"] },
      { id: "evidence_other", label: "نوع المشاهدة الأخرى", type: "text" },
      { id: "incident_location", label: "مكان ضبط الواقعة", type: "text" },
      { id: "s_name", label: "اسم الطالب", type: "text" },
      { id: "s_sig", label: "توقيع الطالب", type: "text" },
      { id: "s_date", label: "تاريخ الطالب", type: "date" },
      { id: "p_name", label: "اسم ولي الأمر", type: "text" },
      { id: "p_sig", label: "توقيع ولي الأمر", type: "text" },
      { id: "p_date", label: "تاريخ ولي الأمر", type: "date" },
      { id: "d_name", label: "اسم مدير المدرسة", type: "text" },
      { id: "d_sig", label: "توقيع مدير المدرسة", type: "text" },
      { id: "d_date", label: "تاريخ مدير المدرسة", type: "date" },
    ],
  },
  {
    id: "committee_meeting",
    title: "محضر اجتماع لجنة التوجيه الطلابي",
    category: "confidential",
    icon: "🏛️",
    description: "محضر اجتماع لجنة التوجيه الطلابي لدراسة حالة طالب — سري (مطابق ص70)",
    parentHidden: false,
    confidentialWatermark: true,
    requiresStamp: true,
    tableLayout: [
      { type: "block", label: "عناصر الاجتماع", fieldId: "meeting_elements", minHeight: 16 },
      { type: "block", label: "وصف المشكلة السلوكية", fieldId: "behavior_desc", minHeight: 16 },
      { type: "block", label: "تصنيف المشكلة السلوكية درجة ونوعاً", fieldId: "issue_classification", minHeight: 16 },
      { type: "block", label: "قرارات اللجنة", fieldId: "decisions", minHeight: 26 },
      { type: "paragraph", text: "أعضاء لجنة التوجيه الطلابي :", spacing: 3 },
      {
        type: "grid",
        columns: ["م", "اسم العضو المشارك", "الوظيفة", "العمل المسند إليه", "التوقيع"],
        columnFlex: [0.6, 2.5, 3.5, 2, 1.5],
        rows: [
          ["1", "", "وكيل/وكيلة المدرسة لشؤون الطلبة", "رئيس/رئيسة", ""],
          ["2", "", "وكيل/وكيلة المدرسة للشؤون التعليمية", "عضو", ""],
          ["3", "", "الموجه الطلابي/الموجهة الطلابية", "مقرر/مقررة", ""],
          ["4", "", "معلم متميز/ معلمة متميزة", "عضو", ""],
          ["5", "", "معلم متميز/ معلمة متميزة", "عضو", ""],
          ["6", "", "معلم متميز/ معلمة متميزة", "عضو", ""],
        ],
        minRowHeight: 14,
      },
    ],
    bodyTemplate:
      "محضر اجتماع لجنة التوجيه الطلابي\n\n⚠️ سري للغاية\n\nإنه في يوم/ {meeting_day} الموافق/ {date} عقدت لجنة التوجيه الطلابي اجتماعها رقم ({meeting_no}) لدراسة حالة الطالب/ {student_name} المقيد في فصل/ {class_name}.\n\nالحاضرون:\n• قائد المدرسة: {m1_name}\n• وكيل شؤون الطلاب: {m2_name}\n• المرشد الطلابي: {m3_name}\n• معلم المادة: {m4_name}\n• رائد الفصل: {m5_name}\n• ولي الأمر: {m6_name}\n\nجدول الأعمال:\n{agenda}\n\nملخص المناقشة:\n{discussion_summary}\n\nتوصيات وقرارات اللجنة:\n{decisions}\n\nالسجل المدني: {national_id}",
    signatureLabels: ["مدير/مديرة المدرسة"],
    fields: [
      ...commonAutoFields,
      { id: "meeting_elements", label: "عناصر الاجتماع", type: "textarea" },
      { id: "behavior_desc", label: "وصف المشكلة السلوكية", type: "textarea" },
      { id: "issue_classification", label: "تصنيف المشكلة السلوكية درجة ونوعاً", type: "textarea" },
      { id: "decisions", label: "قرارات اللجنة", type: "textarea" },
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
  // ====== CONFIDENTIAL FORM #14 — بلاغ عالية الخطورة (مطابق ص70) ======
  {
    id: "high_risk_report",
    title: "نموذج إبلاغ عن حالة عالية الخطورة",
    category: "confidential",
    icon: "🔴",
    description: "بلاغ حالة عالية الخطورة — سري للغاية (مطابق الصورة)",
    parentHidden: true,
    confidentialWatermark: true,
    suppressDefaultTitle: true,
    tableLayout: [
      { type: "paragraph", text: ")سري للغاية(", align: "center", bold: false, fontSize: 12, spacing: 4 },
      { type: "paragraph", text: "نموذج إبلاغ عن حالة عالية الخطورة", align: "center", bold: true, fontSize: 14, spacing: 10 },
      { type: "text_line", label: "اسم الطالب / الطالبة", fieldId: "student_name" },
      { type: "text_line", label: "الصف الدراسي", fieldId: "class_name" },
      { type: "block", label: "وصف الحالة", fieldId: "case_desc", minHeight: 22 },
      { type: "text_line", label: "اسم راصد الحالة", fieldId: "observer_name" },
      { type: "text_pair", left: { label: "وقت الرصد", fieldId: "observe_time" }, right: { label: "تاريخ الرصد", fieldId: "observe_date" } },
      { type: "paragraph", text: "الإجراءات المتخذة مع الحالة :", bold: true, spacing: 4 },
      { type: "paragraph", text: "[ ] تبليغ إدارة التعليم.", spacing: 3 },
      { type: "paragraph", text: "[ ] تبليغ الجهات الأمنية.", spacing: 3 },
      { type: "paragraph", text: "[ ] تبليغ الحماية من العنف الأسري وحماية الطفل.", spacing: 3 },
      { type: "paragraph", text: "[ ] تبليغ وزارة الصحة.", spacing: 3 },
      { type: "paragraph", text: "[ ] التواصل مع الأسرة لإخطارها بوضع الحالة.", spacing: 3 },
      { type: "paragraph", text: "[ ] عقد اجتماع طارئ للجنة التوجيه الطلابي لدراسة الحالة ووضع خطة لمعالجتها بالتكامل مع الجهات ذات العلاقة.", spacing: 3 },
      { type: "paragraph", text: "[ ] رفع بلاغ عن الحالة في الأنظمة التقنية الخاصة بالبلاغات.", spacing: 6 },
    ],
    bodyTemplate:
      "نموذج إبلاغ عن حالة عالية الخطورة (سري للغاية)\n\nاسم الطالب/الطالبة: {student_name}\nالصف الدراسي: {class_name}\n\nوصف الحالة: {case_desc}\n\nاسم راصد الحالة: {observer_name}\nتاريخ الرصد: {observe_date}     وقت الرصد: {observe_time}",
    signatureLabels: ["مدير/مديرة المدرسة"],
    adminAlertEnabled: true,
    adminAlertTemplate:
      "🔴 تنبيه عالي الخطورة: تم رصد حالة تتطلب تدخلاً إدارياً عاجلاً.\nالطالب: {student_name}\nالتفاصيل في المنصة.\n\nالإدارة المدرسية",
    fields: [
      ...commonAutoFields,
      { id: "case_desc", label: "وصف الحالة", type: "textarea", placeholder: "اذكر تفاصيل الحالة..." },
      { id: "observer_name", label: "اسم راصد الحالة", type: "text" },
      { id: "observe_date", label: "تاريخ الرصد", type: "date" },
      { id: "observe_time", label: "وقت الرصد", type: "text", placeholder: "مثال: 10:00 ص" },
    ],
  },
  // ====== نموذج إجراءات الغياب بعذر (مطابق ص73) ======
  {
    id: "excused_absence",
    title: "نموذج إجراءات الغياب بعذر",
    category: "general",
    icon: "📗",
    description: "إجراءات تصاعدية حسب أيام الغياب (مطابق الصورة)",
    requiresStamp: true,
    tableLayout: [
      { type: "text_line", label: "اسم الطالب/ الطالبة", fieldId: "student_name" },
      { type: "text_pair", left: { label: "الصف", fieldId: "class_name" }, right: { label: "المرحلة", fieldId: "stage" } },
      { type: "paragraph", text: "", spacing: 4 },
      {
        type: "escalation",
        title: "",
        columns: ["عدد أيام الغياب", "الإجراء المتخذ", "تاريخ الإجراء", "توقيع الطالب", "توقيع ولي الأمر"],
        columnFlex: [1.1, 2.6, 1.3, 1.3, 1.3],
        rows: [
          { label: "٣ أيام", fieldIds: [] },
          { label: "٥ أيام", fieldIds: [] },
          { label: "١٠ أيام", fieldIds: [] },
        ],
      },
    ],
    bodyTemplate:
      "نموذج إجراءات الغياب بعذر\n\nاسم الطالب/الطالبة: {student_name}\nالمرحلة: {stage}     الصف: {class_name}\n\n— جدول الإجراءات التصاعدية حسب عدد أيام الغياب —\n• ٣ أيام\n• ٥ أيام\n• ١٠ أيام\n\nالتاريخ: {date}",
    signatureLabels: ["مدير/مديرة المدرسة"],
    fields: [
      ...commonAutoFields,
      { id: "stage", label: "المرحلة", type: "text" },
    ],
  },
  // ====== نموذج إجراءات الغياب بدون عذر (مطابق ص74) ======
  {
    id: "unexcused_absence",
    title: "نموذج إجراءات الغياب بدون عذر",
    category: "general",
    icon: "📕",
    description: "إجراءات تصاعدية مع حسم درجات المواظبة (مطابق الصورة)",
    requiresStamp: true,
    tableLayout: [
      { type: "text_line", label: "اسم الطالب/ الطالبة", fieldId: "student_name" },
      { type: "text_pair", left: { label: "الصف", fieldId: "class_name" }, right: { label: "المرحلة", fieldId: "stage" } },
      { type: "paragraph", text: "", spacing: 4 },
      {
        type: "escalation",
        title: "",
        columns: ["عدد أيام الغياب", "الإجراء المتخذ", "تاريخ الإجراء", "توقيع الطالب", "توقيع ولي الأمر", "عدد درجات المواظبة المحسومة"],
        columnFlex: [1.0, 2.4, 1.2, 1.2, 1.2, 1.4],
        rows: [
          { label: "٣ أيام", fieldIds: [] },
          { label: "٣ أيام متصلة", fieldIds: [] },
          { label: "٥ أيام", fieldIds: [] },
          { label: "١٠ أيام", fieldIds: [] },
        ],
      },
    ],
    bodyTemplate:
      "نموذج إجراءات الغياب بدون عذر\n\nاسم الطالب/الطالبة: {student_name}\nالمرحلة: {stage}     الصف: {class_name}\n\n— جدول الإجراءات التصاعدية وحسم درجات المواظبة —\n• ٣ أيام\n• ٣ أيام متصلة\n• ٥ أيام\n• ١٠ أيام\n\nالتاريخ: {date}",
    signatureLabels: ["مدير/مديرة المدرسة"],
    fields: [
      ...commonAutoFields,
      { id: "stage", label: "المرحلة", type: "text" },
    ],
  },
  // ====== CONFIDENTIAL — نموذج إبلاغ عن حالة إيذاء (مطابق ص71) ======
  {
    id: "abuse_report",
    title: "نموذج إبلاغ عن حالة إيذاء لمركز البلاغات بوزارة الموارد البشرية والتنمية الاجتماعية",
    category: "confidential",
    icon: "🆘",
    description: "بلاغ لمركز البلاغات بوزارة الموارد البشرية والتنمية الاجتماعية (مطابق الصورة)",
    parentHidden: true,
    confidentialWatermark: true,
    requiresStamp: true,
    suppressDefaultTitle: true,
    stampOnRight: true,
    stampLabel: "الختم المدرسي:",
    tableLayout: [
      { type: "paragraph", text: ")سري للغاية(", align: "center", bold: false, fontSize: 12, spacing: 4 },
      { type: "paragraph", text: "نموذج إبلاغ عن حالة إيذاء لمركز البلاغات بوزارة الموارد البشرية والتنمية الاجتماعية", align: "center", bold: true, fontSize: 13, spacing: 10 },
      { type: "text_triple", cells: [
        { label: "اليوم", fieldId: "report_day" },
        { label: "الساعة", fieldId: "report_time" },
        { label: "التاريخ", fieldId: "date" },
      ] },
      { type: "paragraph", text: "", spacing: 3 },
      { type: "section", title: "بيانات الحالة المتعرضة للعنف" },
      { type: "row", cells: [{ label: "الاسم", fieldId: "victim_name" }, { label: "العمر", fieldId: "victim_age" }] },
      { type: "row", cells: [{ label: "الحالة الاجتماعية", fieldId: "victim_marital" }, { label: "الجنس", fieldId: "victim_gender" }] },
      { type: "row", cells: [{ label: "رقم السجل المدني", fieldId: "victim_id" }, { label: "الجنسية", fieldId: "victim_nationality" }] },
      { type: "row", cells: [{ label: "رقم الهاتف", fieldId: "victim_phone" }, { label: "رقم الجوال", fieldId: "victim_mobile" }] },
      { type: "row", cells: [{ label: "العنوان", fieldId: "victim_address", flex: 1 }] },
      { type: "section", title: "اسم الجهة المبلغة" },
      { type: "row", cells: [{ label: "اسم المبلغ", fieldId: "reporter_name" }, { label: "رقم السجل المدني", fieldId: "reporter_id" }] },
      { type: "row", cells: [
        { label: "الجنسية", fieldId: "reporter_nationality", minHeight: 26 },
        { label: "رقم الهاتف", fieldId: "reporter_phone", minHeight: 26 },
        { label: "رقم الجوال", fieldId: "reporter_mobile", minHeight: 26 },
      ] },
      { type: "row", cells: [{ label: "العنوان", fieldId: "reporter_address" }] },
      { type: "paragraph", text: "", spacing: 3 },
      { type: "block", label: "ملخص المشكلة", fieldId: "problem_summary", minHeight: 18 },
      { type: "block", label: "أبرز الإجراءات المتخذة", fieldId: "actions_taken", minHeight: 18 },
    ],
    bodyTemplate:
      "نموذج إبلاغ عن حالة إيذاء\nلمركز البلاغات بوزارة الموارد البشرية والتنمية الاجتماعية\n\n(سري للغاية)\n\nاليوم: {report_day}     الساعة: {report_time}     التاريخ: {date}\n\n— بيانات الحالة المتعرضة للعنف —\nالاسم: {victim_name}     العمر: {victim_age}\nالحالة الاجتماعية: {victim_marital}     الجنس: {victim_gender}\nرقم السجل المدني: {victim_id}     الجنسية: {victim_nationality}\nرقم الهاتف: {victim_phone}     رقم الجوال: {victim_mobile}\nالعنوان: {victim_address}\n\n— اسم الجهة المبلغة —\nاسم المبلغ: {reporter_name}     رقم السجل المدني: {reporter_id}\nالجنسية: {reporter_nationality}     رقم الهاتف: {reporter_phone}     رقم الجوال: {reporter_mobile}\nالعنوان: {reporter_address}\n\nملخص المشكلة:\n{problem_summary}\n\nأبرز الإجراءات المتخذة:\n{actions_taken}",
    signatureLabels: ["مدير/مديرة المدرسة"],
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
      { id: "victim_address", label: "العنوان", type: "text" },
      { id: "reporter_name", label: "اسم المبلِّغ", type: "text" },
      { id: "reporter_id", label: "رقم سجل المبلِّغ", type: "text" },
      { id: "reporter_nationality", label: "جنسية المبلِّغ", type: "text" },
      { id: "reporter_phone", label: "هاتف المبلِّغ", type: "text" },
      { id: "reporter_mobile", label: "جوال المبلِّغ", type: "text" },
      { id: "reporter_address", label: "عنوان المبلِّغ", type: "text" },
      { id: "problem_summary", label: "ملخص المشكلة", type: "textarea" },
      { id: "actions_taken", label: "أبرز الإجراءات المتخذة", type: "textarea" },
    ],
  },
  // ====== نموذج تعهد الالتزام بالحضور (مطابق ص75) ======
  {
    id: "attendance_pledge",
    title: "تعهد الالتزام بالحضور",
    category: "general",
    icon: "📆",
    description: "تعهد الالتزام بالحضور — مطابق الصورة",
    requiresStamp: true,
    tableLayout: [
      { type: "paragraph", text: "", spacing: 6 },
      { type: "text_line", label: "أنا الطالب/الطالبة", fieldId: "student_name", noColon: true },
      { type: "text_line", label: "بالصف", fieldId: "class_name", noColon: true },
      { type: "paragraph", text: "أني تغيبت عن الحضور للمدرسة بدون عذر لمدة {absence_days} أيام، بتاريخ {absence_date}", spacing: 4 },
      { type: "paragraph", text: "وأتعهد بالالتزام بالخطة التربوية والعلاجية المقدمة لتحسين الحضور، وعلى ذلك جرى التوقيع.", spacing: 16 },
      {
        type: "signature_columns",
        columns: [
          { title: "الطالب/الطالبة" },
          { title: "ولي الأمر" },
          { title: "مدير/مديرة المدرسة" },
        ],
      },
    ],
    bodyTemplate:
      "تعهد الالتزام بالحضور\n\nأنا الطالب/الطالبة {student_name}\nبالصف {class_name}\n\nأني تغيبت عن الحضور للمدرسة بدون عذر لمدة {absence_days} أيام، بتاريخ {absence_date}\n\nوأتعهد بالالتزام بالخطة التربوية والعلاجية المقدمة لتحسين الحضور، وعلى ذلك جرى التوقيع.",
    signatureLabels: [],
    fields: [
      ...commonAutoFields,
      { id: "absence_days", label: "عدد أيام الغياب", type: "text" },
      { id: "absence_date", label: "تاريخ آخر غياب", type: "date" },
    ],
  },
];
