import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Settings2, Loader2, BarChart3 } from "lucide-react";
import FormsGrid from "@/components/forms/FormsGrid";
import FormDialog from "@/components/forms/FormDialog";
import FormsStatsCards from "@/components/forms/FormsStatsCards";
import FormsStudentList from "@/components/forms/FormsStudentList";
import FormIdentitySettings from "@/components/settings/FormIdentitySettings";
import { useFormsPageData } from "@/hooks/useFormsPageData";
import type { FormTemplate } from "@/components/forms/form-templates";

export default function FormsPage() {
  const data = useFormsPageData();
  const [selectedForm, setSelectedForm] = useState<FormTemplate | null>(null);
  const [showIdentitySettings, setShowIdentitySettings] = useState(false);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">مركز ألفا الإداري المدمج</h1>
          <p className="text-sm text-muted-foreground mt-1">إدارة النماذج الرسمية • {data.allStudents.length} طالب</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={data.selectedClassId} onValueChange={data.setSelectedClassId}>
            <SelectTrigger className="w-[140px] text-xs h-9">
              <SelectValue placeholder="كل الفصول" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الفصول</SelectItem>
              {data.classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="gap-1 text-xs h-9" onClick={() => setShowIdentitySettings(true)}>
            <Settings2 className="h-3.5 w-3.5" /> إعدادات الهوية
          </Button>
          <Button
            size="sm" variant="outline" className="gap-1 text-xs h-9"
            onClick={data.handleClassReport}
            disabled={data.generatingReport || data.selectedClassId === "all"}
          >
            {data.generatingReport ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <BarChart3 className="h-3.5 w-3.5" />}
            تقرير الفصل
          </Button>
        </div>
      </div>

      {/* Stats */}
      <FormsStatsCards stats={data.stats} />

      {/* Forms Grid */}
      <FormsGrid onSelect={setSelectedForm} />

      {/* Student List */}
      <FormsStudentList
        classes={data.classes}
        filteredStudents={data.filteredStudents}
        selectedStudentIds={data.selectedStudentIds}
        studentSearch={data.studentSearch}
        studentClassFilter={data.studentClassFilter}
        onToggleStudent={data.toggleStudent}
        onToggleAll={data.toggleAll}
        onClearSelection={() => data.setSelectedStudentIds([])}
        onSearchChange={data.setStudentSearch}
        onClassFilterChange={data.setStudentClassFilter}
      />

      {/* Form Dialog */}
      {selectedForm && (
        <FormDialog
          form={selectedForm}
          open={!!selectedForm}
          onOpenChange={open => { if (!open) setSelectedForm(null); }}
          preSelectedStudentIds={data.selectedStudentIds}
        />
      )}

      {/* Identity Settings Dialog */}
      <Dialog open={showIdentitySettings} onOpenChange={setShowIdentitySettings}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5 text-primary" /> إعدادات هوية النماذج
            </DialogTitle>
          </DialogHeader>
          <FormIdentitySettings />
        </DialogContent>
      </Dialog>
    </div>
  );
}
