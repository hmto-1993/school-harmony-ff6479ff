import { useState } from "react";
import type { ParentVisibility, PdfHeader } from "@/components/student-dashboard/constants";
import { buildStudentDashboardPdf } from "@/lib/student-dashboard-pdf";

export function useStudentPdfExport(
  student: any,
  isParent: boolean,
  parentVis: ParentVisibility,
  schoolName: string,
  schoolLogoUrl: string,
  parentPdfHeader: PdfHeader,
) {
  const [exportingPdf, setExportingPdf] = useState(false);

  const handleExportPdf = async () => {
    if (!student) return;

    setExportingPdf(true);
    try {
      await buildStudentDashboardPdf({
        student,
        isParent,
        parentVis,
        schoolName,
        schoolLogoUrl,
        parentPdfHeader,
      });
    } catch (err) {
      console.error("PDF export error:", err);
    } finally {
      setExportingPdf(false);
    }
  };

  return { exportingPdf, handleExportPdf };
}
