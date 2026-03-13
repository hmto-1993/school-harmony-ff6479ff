import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { PrintHeaderConfig } from "@/components/settings/PrintHeaderEditor";
import PrintWatermark from "@/components/shared/PrintWatermark";
interface ClassStats {
  name: string;
  present: number;
  absent: number;
  late: number;
  total: number;
}

interface Props {
  totalStudents: number;
  totalClasses: number;
  todayPresent: number;
  todayAbsent: number;
  todayLate: number;
  todayNotRecorded: number;
  attendanceRate: number;
  classStats: ClassStats[];
  schoolName?: string;
}

export default function DashboardPrintView({
  totalStudents,
  totalClasses,
  todayPresent,
  todayAbsent,
  todayLate,
  todayNotRecorded,
  attendanceRate,
  classStats,
  schoolName = "نظام إدارة المدرسة",
}: Props) {
  const today = format(new Date(), "yyyy/MM/dd");
  const dayName = new Date().toLocaleDateString("ar-SA", { weekday: "long" });

  const [headerConfig, setHeaderConfig] = useState<PrintHeaderConfig | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("id", "print_header_config")
        .single();
      if (data?.value) {
        try {
          setHeaderConfig(JSON.parse(data.value));
        } catch {}
      }
    })();
  }, []);

  const statItems = [
    { label: "إجمالي الطلاب", value: totalStudents, color: "#3b82f6" },
    { label: "عدد الفصول", value: totalClasses, color: "#8b5cf6" },
    { label: "الحضور", value: todayPresent, color: "#10b981" },
    { label: "الغياب", value: todayAbsent, color: "#ef4444" },
    { label: "المتأخرون", value: todayLate, color: "#f59e0b" },
    { label: "نسبة الحضور", value: `${attendanceRate}%`, color: "#3b82f6" },
  ];

  return (
    <div
      className="print-area hidden print:block"
      dir="rtl"
      style={{
        fontFamily: "'IBM Plex Sans Arabic', sans-serif",
        color: "#1e293b",
        fontSize: "12px",
        lineHeight: 1.6,
      }}
      <PrintWatermark />
      {/* Header / Letterhead */}
      {headerConfig ? (
        <div
          style={{
            borderBottom: "3px solid #3b82f6",
            paddingBottom: "16px",
            marginBottom: "24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "16px",
          }}
        >
          {/* Right text */}
          <div style={{ flex: 1, textAlign: headerConfig.rightSection.align, fontSize: `${headerConfig.rightSection.fontSize}px`, lineHeight: 1.8, color: headerConfig.rightSection.color || "#1e293b" }}>
            {headerConfig.rightSection.lines.map((line, i) => (
              <p key={i} style={{ margin: 0, fontWeight: 600 }}>{line}</p>
            ))}
          </div>
          {/* Center images */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
            {headerConfig.centerSection.images.map((img, i) =>
              img ? (
                <img
                  key={i}
                  src={img}
                  alt=""
                  style={{
                    width: `${headerConfig.centerSection.imagesSizes[i] || 60}px`,
                    height: `${headerConfig.centerSection.imagesSizes[i] || 60}px`,
                    objectFit: "contain",
                  }}
                />
              ) : null
            )}
          </div>
          {/* Left text */}
          <div style={{ flex: 1, textAlign: headerConfig.leftSection.align, fontSize: `${headerConfig.leftSection.fontSize}px`, lineHeight: 1.8, color: headerConfig.leftSection.color || "#1e293b" }}>
            {headerConfig.leftSection.lines.map((line, i) => (
              <p key={i} style={{ margin: 0, fontWeight: 600 }}>{line}</p>
            ))}
          </div>
        </div>
      ) : (
        <div
          style={{
            borderBottom: "3px solid #3b82f6",
            paddingBottom: "16px",
            marginBottom: "24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <h1 style={{ fontSize: "22px", fontWeight: 700, margin: 0, color: "#1e293b" }}>
              {schoolName}
            </h1>
            <p style={{ fontSize: "14px", color: "#64748b", margin: "4px 0 0" }}>
              تقرير لوحة التحكم اليومي
            </p>
          </div>
          <div style={{ textAlign: "left" }}>
            <p style={{ fontSize: "13px", fontWeight: 600 }}>{dayName}</p>
            <p style={{ fontSize: "12px", color: "#64748b" }}>{today}</p>
          </div>
        </div>
      )}

      {/* Stat Cards Row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(6, 1fr)",
          gap: "10px",
          marginBottom: "24px",
        }}
      >
        {statItems.map((item) => (
          <div
            key={item.label}
            style={{
              border: "1px solid #e2e8f0",
              borderRadius: "10px",
              padding: "12px 8px",
              textAlign: "center",
              borderTop: `3px solid ${item.color}`,
            }}
          >
            <p style={{ fontSize: "20px", fontWeight: 800, color: item.color, margin: 0 }}>
              {item.value}
            </p>
            <p style={{ fontSize: "10px", color: "#64748b", margin: "4px 0 0" }}>{item.label}</p>
          </div>
        ))}
      </div>

      {/* Attendance Summary Box */}
      <div
        style={{
          border: "1px solid #e2e8f0",
          borderRadius: "10px",
          padding: "16px",
          marginBottom: "24px",
        }}
      >
        <h2 style={{ fontSize: "14px", fontWeight: 700, margin: "0 0 12px", color: "#1e293b" }}>
          📊 ملخص الحضور اليومي
        </h2>
        <div style={{ display: "flex", gap: "20px", alignItems: "center" }}>
          <div style={{ flex: 1 }}>
            <div
              style={{
                height: "12px",
                borderRadius: "6px",
                background: "#e2e8f0",
                overflow: "hidden",
                display: "flex",
              }}
            >
              {todayPresent > 0 && (
                <div
                  style={{
                    width: `${(todayPresent / totalStudents) * 100}%`,
                    background: "#10b981",
                    height: "100%",
                  }}
                />
              )}
              {todayLate > 0 && (
                <div
                  style={{
                    width: `${(todayLate / totalStudents) * 100}%`,
                    background: "#f59e0b",
                    height: "100%",
                  }}
                />
              )}
              {todayAbsent > 0 && (
                <div
                  style={{
                    width: `${(todayAbsent / totalStudents) * 100}%`,
                    background: "#ef4444",
                    height: "100%",
                  }}
                />
              )}
            </div>
            <div style={{ display: "flex", gap: "16px", marginTop: "8px", fontSize: "10px" }}>
              <span>🟢 حاضر: {todayPresent}</span>
              <span>🟡 متأخر: {todayLate}</span>
              <span>🔴 غائب: {todayAbsent}</span>
              <span>⚪ لم يُسجل: {todayNotRecorded}</span>
            </div>
          </div>
          <div
            style={{
              width: "70px",
              height: "70px",
              borderRadius: "50%",
              border: `4px solid ${attendanceRate >= 80 ? "#10b981" : attendanceRate >= 50 ? "#f59e0b" : "#ef4444"}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <span style={{ fontSize: "18px", fontWeight: 800 }}>{attendanceRate}%</span>
          </div>
        </div>
      </div>

      {/* Class Summary Table */}
      {classStats.length > 0 && (
        <div
          style={{
            border: "1px solid #e2e8f0",
            borderRadius: "10px",
            overflow: "hidden",
            marginBottom: "24px",
          }}
        >
          <div style={{ padding: "12px 16px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
            <h2 style={{ fontSize: "14px", fontWeight: 700, margin: 0, color: "#1e293b" }}>
              📋 ملخص الفصول
            </h2>
          </div>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "11px",
            }}
          >
            <thead>
              <tr style={{ background: "#f1f5f9" }}>
                <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: 600, color: "#64748b" }}>الفصل</th>
                <th style={{ padding: "10px 12px", textAlign: "center", fontWeight: 600, color: "#64748b" }}>الطلاب</th>
                <th style={{ padding: "10px 12px", textAlign: "center", fontWeight: 600, color: "#10b981" }}>حاضر</th>
                <th style={{ padding: "10px 12px", textAlign: "center", fontWeight: 600, color: "#ef4444" }}>غائب</th>
                <th style={{ padding: "10px 12px", textAlign: "center", fontWeight: 600, color: "#f59e0b" }}>متأخر</th>
                <th style={{ padding: "10px 12px", textAlign: "center", fontWeight: 600, color: "#64748b" }}>نسبة الحضور</th>
              </tr>
            </thead>
            <tbody>
              {classStats.map((cls, i) => {
                const rate = cls.total > 0 ? Math.round((cls.present / cls.total) * 100) : 0;
                return (
                  <tr key={cls.name} style={{ borderTop: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "10px 12px", fontWeight: 600 }}>{cls.name}</td>
                    <td style={{ padding: "10px 12px", textAlign: "center", color: "#64748b" }}>{cls.total}</td>
                    <td style={{ padding: "10px 12px", textAlign: "center", fontWeight: 700, color: "#10b981" }}>{cls.present}</td>
                    <td style={{ padding: "10px 12px", textAlign: "center", fontWeight: 700, color: "#ef4444" }}>{cls.absent}</td>
                    <td style={{ padding: "10px 12px", textAlign: "center", fontWeight: 700, color: "#f59e0b" }}>{cls.late}</td>
                    <td style={{ padding: "10px 12px", textAlign: "center" }}>
                      <span
                        style={{
                          fontWeight: 700,
                          color: rate >= 80 ? "#10b981" : rate >= 50 ? "#f59e0b" : "#ef4444",
                        }}
                      >
                        {rate}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer */}
      <div
        style={{
          borderTop: "2px solid #e2e8f0",
          paddingTop: "12px",
          display: "flex",
          justifyContent: "space-between",
          fontSize: "10px",
          color: "#94a3b8",
        }}
      >
        <span>تم إنشاء التقرير تلقائياً بتاريخ {today}</span>
        <span>{schoolName} — جميع الحقوق محفوظة</span>
      </div>
    </div>
  );
}
