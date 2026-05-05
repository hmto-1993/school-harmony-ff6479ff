import type { AttendanceRow, GradeRow } from "@/hooks/useReportsData";

const STATUS_LABELS: Record<string, string> = {
  present: "حاضر",
  absent: "غائب",
  late: "متأخر",
  early_leave: "خروج مبكر",
  sick_leave: "إجازة مرضية",
};

interface AttendancePreviewProps {
  attendanceData: AttendanceRow[];
  attendanceSummary: { total: number; present: number; absent: number; late: number };
}

export function AttendancePreviewContent({ attendanceData, attendanceSummary }: AttendancePreviewProps) {
  const includeClass = attendanceData.some((r) => !!r.class_name);
  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px" }}>
        {[
          { label: "إجمالي السجلات", value: attendanceSummary.total, bg: "#f1f5f9", border: "#94a3b8", color: "#334155" },
          { label: "حاضر", value: attendanceSummary.present, bg: "#ecfdf5", border: "#34d399", color: "#059669" },
          { label: "غائب", value: attendanceSummary.absent, bg: "#fef2f2", border: "#fca5a5", color: "#dc2626" },
          { label: "متأخر", value: attendanceSummary.late, bg: "#fffbeb", border: "#fbbf24", color: "#d97706" },
        ].map((stat) => (
          <div
            key={stat.label}
            style={{
              border: `2px solid ${stat.border}`,
              borderRadius: "12px",
              padding: "14px 8px",
              textAlign: "center",
              backgroundColor: stat.bg,
            }}
          >
            <p style={{ fontSize: "22px", fontWeight: 700, color: stat.color, margin: 0, lineHeight: 1.2 }}>
              {stat.value}
            </p>
            <p style={{ fontSize: "11px", color: "#64748b", margin: "4px 0 0", fontWeight: 500 }}>
              {stat.label}
            </p>
          </div>
        ))}
      </div>
      <table style={{ width: "100%", fontSize: "13px", borderCollapse: "collapse", fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}>
        <thead>
          <tr style={{ borderBottom: "2px solid #e2e8f0" }}>
            <th style={{ textAlign: "right", padding: "10px 8px", fontWeight: 600, color: "#334155", backgroundColor: "#f8fafc" }}>اسم الطالب</th>
            {includeClass && <th style={{ textAlign: "right", padding: "10px 8px", fontWeight: 600, color: "#334155", backgroundColor: "#f8fafc" }}>الفصل</th>}
            <th style={{ textAlign: "right", padding: "10px 8px", fontWeight: 600, color: "#334155", backgroundColor: "#f8fafc" }}>التاريخ</th>
            <th style={{ textAlign: "right", padding: "10px 8px", fontWeight: 600, color: "#334155", backgroundColor: "#f8fafc" }}>الحالة</th>
            <th style={{ textAlign: "right", padding: "10px 8px", fontWeight: 600, color: "#334155", backgroundColor: "#f8fafc" }}>ملاحظات</th>
          </tr>
        </thead>
        <tbody>
          {attendanceData.map((row, i) => (
            <tr key={i} style={{ borderBottom: "1px solid #e2e8f0", backgroundColor: i % 2 === 0 ? "#ffffff" : "#f8fafc" }}>
              <td style={{ padding: "8px", fontWeight: 500, color: "#1e293b" }}>{row.student_name}</td>
              {includeClass && <td style={{ padding: "8px", color: "#64748b" }}>{row.class_name || "—"}</td>}
              <td style={{ padding: "8px", color: "#64748b" }}>{row.date}</td>
              <td style={{
                padding: "8px",
                fontWeight: 600,
                color: row.status === "present" ? "#059669" : row.status === "absent" ? "#dc2626" : row.status === "late" ? "#d97706" : row.status === "early_leave" ? "#2563eb" : row.status === "sick_leave" ? "#7c3aed" : "#1e293b",
                backgroundColor: row.status === "present" ? "#ecfdf5" : row.status === "absent" ? "#fef2f2" : row.status === "late" ? "#fffbeb" : row.status === "early_leave" ? "#eff6ff" : row.status === "sick_leave" ? "#f5f3ff" : "transparent",
                borderRadius: "6px",
              }}>{STATUS_LABELS[row.status] || row.status}</td>
              <td style={{ padding: "8px", color: "#64748b" }}>{row.notes || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

interface GradesPreviewProps {
  gradeData: GradeRow[];
  categoryNames: string[];
}

export function GradesPreviewContent({ gradeData, categoryNames }: GradesPreviewProps) {
  return (
    <table style={{ width: "100%", fontSize: "13px", borderCollapse: "collapse", fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}>
      <thead>
        <tr style={{ borderBottom: "2px solid #e2e8f0" }}>
          <th style={{ textAlign: "right", padding: "10px 8px", fontWeight: 600, color: "#334155", backgroundColor: "#f8fafc" }}>اسم الطالب</th>
          {categoryNames.map((name) => (
            <th key={name} style={{ textAlign: "center", padding: "10px 8px", fontWeight: 600, color: "#334155", backgroundColor: "#f8fafc" }}>{name}</th>
          ))}
          <th style={{ textAlign: "center", padding: "10px 8px", fontWeight: 600, color: "#1d4ed8", backgroundColor: "#eff6ff" }}>المجموع</th>
        </tr>
      </thead>
      <tbody>
        {gradeData.map((row, i) => (
          <tr key={i} style={{ borderBottom: "1px solid #e2e8f0", backgroundColor: i % 2 === 0 ? "#ffffff" : "#f8fafc" }}>
            <td style={{ padding: "8px", fontWeight: 500, color: "#1e293b" }}>{row.student_name}</td>
            {categoryNames.map((name) => (
              <td key={name} style={{ textAlign: "center", padding: "8px", color: "#475569" }}>{row.categories[name] ?? "—"}</td>
            ))}
            <td style={{ textAlign: "center", padding: "8px", fontWeight: 700, color: "#1d4ed8" }}>{row.total}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
