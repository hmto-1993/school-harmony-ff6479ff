import { format } from "date-fns";

interface CategoryInfo {
  id: string;
  name: string;
  weight: number;
  max_score: number;
  class_id: string;
  category_group: string;
}

interface SummaryRow {
  student_id: string;
  full_name: string;
  manualScores: Record<string, number>;
}

export const calcSubtotal = (scores: Record<string, number>, cats: CategoryInfo[]) => {
  let score = 0, max = 0;
  cats.forEach(cat => { max += Number(cat.max_score); score += scores[cat.id] ?? 0; });
  return { score, max };
};

export function buildSummaryTableHTML(
  students: SummaryRow[],
  categories: CategoryInfo[],
  selectedPeriod: number,
) {
  const classworkCats = categories.filter(c => c.category_group === 'classwork');
  const examCats = categories.filter(c => c.category_group === 'exams');
  const otherCats = categories.filter(c => c.category_group !== 'classwork' && c.category_group !== 'exams');
  const hasClasswork = classworkCats.length > 0;
  const hasExams = examCats.length > 0;

  return `
    <table>
      <thead>
        <tr>
          <th rowspan="2" style="width:30px;">#</th>
          <th rowspan="2" style="width:20%;">الطالب</th>
          ${hasClasswork ? `<th colspan="${classworkCats.length + 1}" class="subtotal-header">المهام الادائية والمشاركة والتفاعل</th>` : ""}
          ${hasExams ? `<th colspan="${examCats.length + 1}" class="subtotal-header">الاختبارات</th>` : ""}
          ${otherCats.map(cat => `<th rowspan="2">${cat.name}<br><span style="font-size:9px;color:#64748b;">من ${Number(cat.max_score)}</span></th>`).join("")}
          <th rowspan="2">المجموع</th>
        </tr>
        <tr>
          ${hasClasswork ? classworkCats.map(c => `<th>${c.name}<br><span style="font-size:9px;color:#64748b;">من ${Number(c.max_score)}</span></th>`).join("") + `<th class="subtotal-header">الإجمالي</th>` : ""}
          ${hasExams ? examCats.map(c => `<th>${c.name}<br><span style="font-size:9px;color:#64748b;">من ${Number(c.max_score)}</span></th>`).join("") + `<th class="subtotal-header">المجموع</th>` : ""}
        </tr>
      </thead>
      <tbody>
        ${students.map((sg, i) => {
          const cwSub = calcSubtotal(sg.manualScores, classworkCats);
          const exSub = calcSubtotal(sg.manualScores, examCats);
          const allSub = calcSubtotal(sg.manualScores, categories);
          return `
            <tr>
              <td>${i + 1}</td>
              <td>${sg.full_name}</td>
              ${hasClasswork ? classworkCats.map(c => `<td>${sg.manualScores[c.id] ?? 0}</td>`).join("") + `<td class="subtotal-cell">${cwSub.score} / ${cwSub.max}</td>` : ""}
              ${hasExams ? examCats.map(c => `<td>${sg.manualScores[c.id] ?? 0}</td>`).join("") + `<td class="subtotal-cell">${exSub.score} / ${exSub.max}</td>` : ""}
              ${otherCats.map(c => `<td>${sg.manualScores[c.id] ?? 0}</td>`).join("")}
              <td class="subtotal-cell">${allSub.score} / ${allSub.max}</td>
            </tr>
          `;
        }).join("")}
      </tbody>
    </table>
  `;
}

export function getSummaryPrintOptions(
  className: string,
  students: SummaryRow[],
  categories: CategoryInfo[],
  selectedPeriod: number,
) {
  return {
    orientation: "landscape" as const,
    title: `التقييم النهائي — ${className}`,
    subtitle: `${selectedPeriod === 1 ? "الفترة الأولى" : "الفترة الثانية"} — ${format(new Date(), "yyyy/MM/dd")}`,
    reportType: "grades" as const,
    tableHTML: buildSummaryTableHTML(students, categories, selectedPeriod),
  };
}
