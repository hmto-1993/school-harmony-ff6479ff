import autoTable from "jspdf-autotable";
import { levelLabels, levelColors, getLevel } from "./pdf-constants";
import { ComprehensiveData } from "./pdf-types";
import { computeStudentAvg } from "./pdf-student-avg";

export function buildTopBottomPage(doc: any, data: ComprehensiveData, allStudentAvgs: any[], categories: any[], tableStyles: any, pageWidth: number) {
  doc.addPage("a4", "landscape");
  doc.setFontSize(14);
  doc.setFont("Amiri", "bold");
  doc.text("⭐ أفضل وأدنى 10 طلاب — الدرجات", pageWidth / 2, 15, { align: "center" });

  const top10 = allStudentAvgs.slice(0, 10);
  const bottom10 = allStudentAvgs.slice(-10).reverse();

  doc.setFontSize(11);
  doc.text("⭐ أفضل 10 طلاب", pageWidth - 14, 22, { align: "right" });
  autoTable(doc, {
    startY: 26,
    head: [["المعدل %", "الفصل", "الطالب", "#"]],
    body: top10.map((s: any, i: number) => [`${s.avg}%`, s.className, s.name, String(i + 1)]),
    ...tableStyles, headStyles: { ...tableStyles.headStyles, fillColor: [16, 185, 129] as [number, number, number] },
    margin: { left: pageWidth / 2 + 5 },
  });

  doc.setFontSize(11);
  doc.text("⚠ أدنى 10 طلاب", pageWidth / 2 - 10, 22, { align: "right" });
  autoTable(doc, {
    startY: 26,
    head: [["المعدل %", "الفصل", "الطالب", "#"]],
    body: bottom10.map((s: any, i: number) => [`${s.avg}%`, s.className, s.name, String(i + 1)]),
    ...tableStyles, headStyles: { ...tableStyles.headStyles, fillColor: [239, 68, 68] as [number, number, number] },
    margin: { right: pageWidth / 2 + 5 },
  });

  // Per-class top/bottom 5
  data.classes.forEach(cls => {
    const classAvgs = cls.students
      .map(s => ({ name: s.full_name, avg: computeStudentAvg(cls, s.id, categories) }))
      .filter(s => s.avg !== null) as { name: string; avg: number }[];
    classAvgs.sort((a, b) => b.avg - a.avg);
    if (classAvgs.length === 0) return;

    doc.addPage("a4", "landscape");
    doc.setFontSize(13);
    doc.setFont("Amiri", "bold");
    doc.text(`ترتيب الطلاب: ${cls.name}`, pageWidth / 2, 15, { align: "center" });

    const classCounts = [0, 0, 0, 0, 0];
    classAvgs.forEach(s => classCounts[getLevel(s.avg)]++);
    let mbx = 30;
    const mbw = pageWidth - 60;
    classCounts.forEach((count, li) => {
      if (count === 0) return;
      const bw = (count / classAvgs.length) * mbw;
      doc.setFillColor(...levelColors[li]);
      doc.roundedRect(mbx, 20, bw, 6, 1, 1, "F");
      if (bw > 12) {
        doc.setFontSize(6);
        doc.setFont("Amiri", "bold");
        doc.setTextColor(255, 255, 255);
        doc.text(`${levelLabels[li]} (${count})`, mbx + bw / 2, 24, { align: "center" });
        doc.setTextColor(0, 0, 0);
      }
      mbx += bw;
    });

    const classTop5 = classAvgs.slice(0, 5);
    const classBottom5 = classAvgs.slice(-5).reverse();

    doc.setFontSize(11);
    doc.text("⭐ أفضل 5", pageWidth - 14, 32, { align: "right" });
    autoTable(doc, {
      startY: 36, head: [["المعدل %", "الطالب", "#"]],
      body: classTop5.map((s, i) => [`${s.avg}%`, s.name, String(i + 1)]),
      ...tableStyles, headStyles: { ...tableStyles.headStyles, fillColor: [16, 185, 129] as [number, number, number] },
      margin: { left: pageWidth / 2 + 5 },
    });

    doc.setFontSize(11);
    doc.text("⚠ أدنى 5", pageWidth / 2 - 10, 32, { align: "right" });
    autoTable(doc, {
      startY: 36, head: [["المعدل %", "الطالب", "#"]],
      body: classBottom5.map((s, i) => [`${s.avg}%`, s.name, String(i + 1)]),
      ...tableStyles, headStyles: { ...tableStyles.headStyles, fillColor: [239, 68, 68] as [number, number, number] },
      margin: { right: pageWidth / 2 + 5 },
    });
  });
}
