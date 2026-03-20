import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ClassItem {
  id: string;
  name: string;
}

export interface ClassItemFull {
  id: string;
  name: string;
  grade: string;
  section: string;
}

export function useClasses() {
  return useQuery({
    queryKey: ["classes"],
    queryFn: async () => {
      const { data } = await supabase.from("classes").select("id, name").order("name");
      return (data || []) as ClassItem[];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

export function useClassesFull() {
  return useQuery({
    queryKey: ["classes-full"],
    queryFn: async () => {
      const { data } = await supabase.from("classes").select("id, name, grade, section").order("name");
      return (data || []) as ClassItemFull[];
    },
    staleTime: 10 * 60 * 1000,
  });
}

export function useStudentCounts() {
  return useQuery({
    queryKey: ["student-counts"],
    queryFn: async () => {
      const { data } = await supabase.from("students").select("id, class_id");
      const counts: Record<string, number> = {};
      (data || []).forEach((s) => {
        if (s.class_id) counts[s.class_id] = (counts[s.class_id] || 0) + 1;
      });
      return counts;
    },
    staleTime: 5 * 60 * 1000,
  });
}
