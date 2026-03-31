import { useState, useCallback } from "react";

const STORAGE_KEY = "dashboard-widget-order";
const LOCK_KEY = "dashboard-widgets-locked";

export const DEFAULT_ORDER = [
  "smartSummary",
  "attendanceAndComparison",
  "widgetGrid",
  "timetableWidgets",
  "honorRoll",
  "performanceDashboard",
];

export function useDashboardOrder() {
  const [order, setOrder] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as string[];
        // Ensure all default widgets are present
        const merged = parsed.filter((id) => DEFAULT_ORDER.includes(id));
        DEFAULT_ORDER.forEach((id) => {
          if (!merged.includes(id)) merged.push(id);
        });
        return merged;
      }
    } catch {}
    return DEFAULT_ORDER;
  });

  const [locked, setLocked] = useState(() => {
    try {
      return localStorage.getItem(LOCK_KEY) !== "false";
    } catch {
      return true;
    }
  });

  const [draggedId, setDraggedId] = useState<string | null>(null);

  const toggleLock = useCallback(() => {
    setLocked((prev) => {
      const next = !prev;
      localStorage.setItem(LOCK_KEY, String(next));
      return next;
    });
  }, []);

  const handleDragStart = useCallback((id: string) => {
    setDraggedId(id);
  }, []);

  const handleDragOver = useCallback(
    (e: React.DragEvent, targetId: string) => {
      e.preventDefault();
      if (!draggedId || draggedId === targetId) return;

      setOrder((prev) => {
        const newOrder = [...prev];
        const fromIdx = newOrder.indexOf(draggedId);
        const toIdx = newOrder.indexOf(targetId);
        if (fromIdx === -1 || toIdx === -1) return prev;
        newOrder.splice(fromIdx, 1);
        newOrder.splice(toIdx, 0, draggedId);
        return newOrder;
      });
    },
    [draggedId]
  );

  const handleDragEnd = useCallback(() => {
    setDraggedId(null);
    setOrder((current) => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
      return current;
    });
  }, []);

  const resetOrder = useCallback(() => {
    setOrder(DEFAULT_ORDER);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_ORDER));
  }, []);

  return {
    order,
    locked,
    draggedId,
    toggleLock,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    resetOrder,
  };
}
