import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useFormFavorites() {
  const { user } = useAuth();
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const fetchFavorites = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("form_favorites" as any)
      .select("form_id")
      .eq("user_id", user.id);
    setFavoriteIds(new Set((data as any[] || []).map((d: any) => d.form_id)));
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchFavorites(); }, [fetchFavorites]);

  const toggleFavorite = useCallback(async (formId: string) => {
    if (!user) return;
    if (favoriteIds.has(formId)) {
      setFavoriteIds(prev => { const s = new Set(prev); s.delete(formId); return s; });
      await supabase.from("form_favorites" as any).delete().eq("user_id", user.id).eq("form_id", formId);
    } else {
      setFavoriteIds(prev => new Set(prev).add(formId));
      await supabase.from("form_favorites" as any).insert({ user_id: user.id, form_id: formId } as any);
    }
  }, [user, favoriteIds]);

  const isFavorite = useCallback((formId: string) => favoriteIds.has(formId), [favoriteIds]);

  return { favoriteIds, isFavorite, toggleFavorite, loading };
}
