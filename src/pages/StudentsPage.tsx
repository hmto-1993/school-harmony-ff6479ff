import { useAuth } from "@/contexts/AuthContext";
import { useTeacherPermissions } from "@/hooks/useTeacherPermissions";
import { useStudentsData } from "@/hooks/useStudentsData";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Upload, FileSpreadsheet, FileText, Lock } from "lucide-react";
import EmptyState from "@/components/EmptyState";
import AbsenceWarningSlip from "@/components/reports/AbsenceWarningSlip";
import StudentImportDialog from "@/components/student/StudentImportDialog";
import StudentFormDialog from "@/components/student/StudentFormDialog";
import StudentClassSummary from "@/components/student/StudentClassSummary";
import StudentTable from "@/components/student/StudentTable";
import StudentsPageErrorBoundary from "@/components/StudentsPageErrorBoundary";

export default function StudentsPage() {
  return (
    <StudentsPageErrorBoundary>
      <StudentsPageInner />
    </StudentsPageErrorBoundary>
  );
}

function StudentsPageInner() {
  const { role } = useAuth();
  const { perms, loaded: permsLoaded } = useTeacherPermissions();
  const data = useStudentsData();

  if (permsLoaded && !perms.can_view_students && !perms.read_only_mode && role !== "admin") {
    return <EmptyState icon={Lock} title="لا تملك صلاحية عرض الطلاب" description="تواصل مع المسؤول لتفعيل صلاحية عرض صفحة الطلاب" />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-l from-primary to-accent bg-clip-text text-transparent flex items-center gap-2">
            إدارة الطلاب
          </h1>
          <p className="text-muted-foreground">عرض وإدارة بيانات الطلاب</p>
        </div>
        {role === "admin" && !perms.read_only_mode && (
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="h-9 w-9" title="تصدير">
                  <Upload className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={data.exportExcel} className="gap-2 cursor-pointer">
                  <FileSpreadsheet className="h-4 w-4" />تصدير Excel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={data.exportPDF} className="gap-2 cursor-pointer">
                  <FileText className="h-4 w-4" />تصدير PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <StudentImportDialog
              open={data.importOpen} onOpenChange={data.setImportOpen} classes={data.classes}
              importClassId={data.importClassId} setImportClassId={data.setImportClassId}
              importRows={data.importRows} importing={data.importing} importDone={data.importDone}
              importStats={data.importStats} parsingPdf={data.parsingPdf} fileRef={data.fileRef}
              handleFileSelect={data.handleFileSelect} handleImport={data.handleImport} resetImport={data.resetImport}
            />

            <StudentFormDialog
              mode="add" open={data.dialogOpen} onOpenChange={data.setDialogOpen}
              form={data.form} setForm={data.setForm} onSubmit={data.handleAdd} classes={data.classes}
            />
          </div>
        )}
      </div>

      <StudentClassSummary
        classCounts={data.classCounts} classFilter={data.classFilter} setClassFilter={data.setClassFilter}
        totalStudents={data.students.length} selectedIds={data.selectedIds} isAdmin={role === "admin"}
      />

      <StudentTable
        filtered={data.filtered} students={data.students} classes={data.classes}
        search={data.search} setSearch={data.setSearch} classFilter={data.classFilter} setClassFilter={data.setClassFilter}
        exceededStudents={data.exceededStudents} role={role}
        selectedIds={data.selectedIds} setSelectedIds={data.setSelectedIds}
        toggleSelect={data.toggleSelect} toggleSelectAll={data.toggleSelectAll}
        bulkTransferClassId={data.bulkTransferClassId} setBulkTransferClassId={data.setBulkTransferClassId}
        bulkTransferring={data.bulkTransferring} handleBulkTransfer={data.handleBulkTransfer}
        bulkDeleting={data.bulkDeleting} bulkDeleteConfirmOpen={data.bulkDeleteConfirmOpen}
        setBulkDeleteConfirmOpen={data.setBulkDeleteConfirmOpen} handleBulkDelete={data.handleBulkDelete}
        openEdit={data.openEdit} loadingWarning={data.loadingWarning} openWarningSlip={data.openWarningSlip}
        readOnlyMode={perms.read_only_mode}
      />

      <StudentFormDialog
        mode="edit" open={data.editOpen} onOpenChange={data.setEditOpen}
        form={data.editForm} setForm={data.setEditForm} onSubmit={data.handleEdit} classes={data.classes}
      />

      {data.warningStudent && (
        <AbsenceWarningSlip
          open={data.warningOpen} onOpenChange={data.setWarningOpen}
          studentId={data.warningStudent.id} studentName={data.warningStudent.name}
          className={data.warningStudent.className} absenceRate={data.warningStudent.absenceRate}
          totalAbsent={data.warningStudent.totalAbsent} totalDays={data.warningStudent.totalDays}
        />
      )}
    </div>
  );
}
