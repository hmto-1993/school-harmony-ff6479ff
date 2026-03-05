import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface QuizColors {
  mcq: string;
  trueFalse: string;
  selected: string;
}

const DEFAULT_COLORS: QuizColors = { mcq: "#0ea5e9", trueFalse: "#f59e0b", selected: "#14b8a6" };

export const QUIZ_COLOR_OPTIONS = [
  { value: "#0ea5e9", label: "سماوي" },
  { value: "#8b5cf6", label: "بنفسجي" },
  { value: "#f59e0b", label: "كهرماني" },
  { value: "#14b8a6", label: "تيل" },
  { value: "#f43f5e", label: "وردي" },
  { value: "#10b981", label: "زمردي" },
  { value: "#6366f1", label: "نيلي" },
  { value: "#ec4899", label: "زهري" },
  { value: "#06b6d4", label: "سيان" },
  { value: "#f97316", label: "برتقالي" },
  { value: "#84cc16", label: "ليموني" },
  { value: "#a855f7", label: "أرجواني" },
];

const SETTING_KEYS = ["quiz_color_mcq", "quiz_color_tf", "quiz_color_selected"] as const;

export function useQuizColors() {
  const [colors, setColors] = useState<QuizColors>(DEFAULT_COLORS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchColors = async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("id, value")
        .in("id", [...SETTING_KEYS]);

      const c = { ...DEFAULT_COLORS };
      (data || []).forEach((s: any) => {
        if (s.id === "quiz_color_mcq" && s.value) c.mcq = s.value;
        if (s.id === "quiz_color_tf" && s.value) c.trueFalse = s.value;
        if (s.id === "quiz_color_selected" && s.value) c.selected = s.value;
      });
      setColors(c);
      setLoading(false);
    };
    fetchColors();
  }, []);

  return { colors, loading };
}

/** Helper: returns inline style objects for a given hex color */
export function colorStyles(hex: string) {
  return {
    bg10: { backgroundColor: `${hex}1a` },
    bg15: { backgroundColor: `${hex}26` },
    border20: { borderColor: `${hex}33` },
    border30: { borderColor: `${hex}4d` },
    border40: { borderColor: `${hex}66` },
    borderSolid: { borderColor: hex },
    text: { color: hex },
    bgSolid: { backgroundColor: hex },
    shadow: { boxShadow: `0 4px 14px -3px ${hex}26` },
    bgBorder: { backgroundColor: `${hex}1a`, borderColor: `${hex}33` },
    bgBorderText: { backgroundColor: `${hex}1a`, borderColor: `${hex}66`, color: hex },
  };
}
