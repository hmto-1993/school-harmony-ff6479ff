import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { ClassOption, CategoryOption, GradeEntry } from "./noor-types";

export function useNoorData() {
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState("1");

  useEffect(() => {
    supabase.from("classes").select("id, name, grade, section").then(({ data }) => {
      setClasses(data || []);
    });
  }, []);

  useEffect(() => {
    if (selectedClass) {
      setSelectedCategory("");
      setSelectedCategories([]);
      supabase
        .from("grade_categories")
        .select("id, name, max_score")
        .eq("class_id", selectedClass)
        .order("sort_order")
        .then(({ data }) => {
          setCategories(data || []);
        });
    } else {
      setCategories([]);
    }
  }, [selectedClass]);

  const toggleCategory = (categoryId: string) => {
    setSelectedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const selectAllCategories = () => {
    if (selectedCategories.length === categories.length) {
      setSelectedCategories([]);
    } else {
      setSelectedCategories(categories.map(c => c.id));
    }
  };

  const fetchMultiCategoryGradeData = async (): Promise<GradeEntry[]> => {
    const { data: students } = await supabase
      .from("students")
      .select("id, full_name, national_id")
      .eq("class_id", selectedClass)
      .order("full_name");

    if (!students || students.length === 0) return [];

    const selectedCats = categories.filter(c => selectedCategories.includes(c.id));

    const { data: grades } = await supabase
      .from("grades")
      .select("student_id, score, category_id")
      .eq("period", Number(selectedPeriod))
      .in("category_id", selectedCategories)
      .in("student_id", students.map(s => s.id));

    const gradeMap = new Map<string, Map<string, number | null>>();
    (grades || []).forEach(g => {
      if (!gradeMap.has(g.student_id)) gradeMap.set(g.student_id, new Map());
      gradeMap.get(g.student_id)!.set(g.category_id, g.score);
    });

    return students.map(s => ({
      name: s.full_name,
      nationalId: s.national_id || "غير مسجل",
      scores: selectedCats.map(cat => ({
        categoryName: cat.name,
        maxScore: cat.max_score,
        score: gradeMap.get(s.id)?.get(cat.id) ?? null,
      })),
    }));
  };

  return {
    classes, categories,
    selectedClass, setSelectedClass,
    selectedCategory, setSelectedCategory,
    selectedCategories, setSelectedCategories,
    selectedPeriod, setSelectedPeriod,
    toggleCategory, selectAllCategories,
    fetchMultiCategoryGradeData,
  };
}
