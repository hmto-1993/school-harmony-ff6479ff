import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { ShieldAlert, RotateCcw, Users } from "lucide-react";
import type { FormTemplate } from "./form-templates";
import { useFormDialog } from "@/hooks/useFormDialog";
import StudentPicker from "./StudentPicker";
import FormFieldsRenderer from "./FormFieldsRenderer";
import { BulkExportActions, SingleExportActions } from "./FormExportActions";
import SignatureCanvas from "./SignatureCanvas";
import { cn } from "@/lib/utils";

interface Props {
  form: FormTemplate;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preSelectedStudentIds?: string[];
  initialFieldValues?: Record<string, string>;
}

export default function FormDialog({ form, open, onOpenChange, preSelectedStudentIds, initialFieldValues }: Props) {
  const state = useFormDialog({ form, open, onOpenChange, preSelectedStudentIds, initialFieldValues });
  const isConfidential = form.confidentialWatermark;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("max-w-lg max-h-[90vh] flex flex-col", isConfidential && "border-destructive/30")}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-2xl">{form.icon}</span>
            {form.title}
            {isConfidential && (
              <Badge variant="destructive" className="text-[10px] mr-auto">
                <ShieldAlert className="h-3 w-3 ml-1" /> سري
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>{form.description}</DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-4 py-2">
            {/* Multi-Select Mode Banner */}
            {state.isMultiMode && state.multiStudents.length > 1 && (
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  <p className="text-sm font-semibold text-primary">{state.multiStudents.length} طالب محدد</p>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
                  {state.multiStudents.map(s => (
                    <Badge key={s.id} variant="secondary" className="text-[10px]">{s.full_name}</Badge>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground">يمكنك تعبئة الحقول المشتركة ثم اختيار نوع التصدير أدناه</p>
              </div>
            )}

            {/* Student Picker (single mode) */}
            {!state.isMultiMode && (
              <StudentPicker
                students={state.students}
                classes={state.classes}
                filteredStudents={state.filteredStudents}
                selectedStudent={state.selectedStudent}
                showStudentList={state.showStudentList}
                searchQuery={state.searchQuery}
                filterClassId={state.filterClassId}
                onSelectStudent={state.handleSelectStudent}
                onShowList={() => { state.setShowStudentList(true); state.setSearchQuery(""); }}
                onSearchChange={state.setSearchQuery}
                onFilterChange={state.setFilterClassId}
              />
            )}

            {/* Witness picker */}
            {form.witnessPickerEnabled && (state.selectedStudentId || state.isMultiMode) && (
              <div className="space-y-2">
                <Label className="text-xs font-semibold flex items-center gap-1">
                  👥 اختيار الشهود
                  {state.selectedWitnesses.length > 0 && <Badge variant="secondary" className="text-[10px]">{state.selectedWitnesses.length}</Badge>}
                </Label>
                <Select value={state.witnessFilterClassId} onValueChange={state.setWitnessFilterClassId}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="كل الفصول" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">كل الفصول</SelectItem>
                    {state.classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <div className="border rounded-lg p-2 max-h-32 overflow-y-auto space-y-1">
                  {state.witnessOptions.length === 0 ? (
                    <p className="text-center text-xs text-muted-foreground py-3">لا يوجد طلاب</p>
                  ) : state.witnessOptions.slice(0, 50).map(s => {
                    const isSelected = state.selectedWitnesses.includes(s.id);
                    return (
                      <button key={s.id} type="button" onClick={() => state.toggleWitness(s.id)} className={`w-full text-right text-xs px-2 py-1.5 rounded transition-colors ${isSelected ? "bg-primary/10 text-primary font-semibold border border-primary/20" : "hover:bg-muted text-foreground"}`}>
                        {s.full_name} — {s.className}{isSelected && " ✓"}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Form fields */}
            <FormFieldsRenderer
              fields={form.fields}
              fieldValues={state.fieldValues}
              onFieldChange={state.handleFieldChange}
            />

            {/* Signature Canvas */}
            {(state.selectedStudentId || state.isMultiMode) && state.useLiveSignature && (
              <SignatureCanvas onSignatureChange={state.setSignatureDataUrl} />
            )}

            {/* Editable Body Text */}
            {state.defaultBodyText && (state.selectedStudentId || state.isMultiMode) && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                    نص النموذج
                    {state.isBodyEdited && <Badge variant="outline" className="text-[9px] h-4 px-1 border-primary/30 text-primary">معدّل</Badge>}
                  </Label>
                  {state.isBodyEdited && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground hover:text-primary" onClick={() => { state.setCustomBodyText(null); state.setIsEditingBody(false); }}>
                            <RotateCcw className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">استعادة النص الأصلي</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
                {state.isEditingBody ? (
                  <Textarea value={state.finalBodyText || ""} onChange={e => state.setCustomBodyText(e.target.value)} className={cn("min-h-[140px] text-sm leading-relaxed", isConfidential && "border-destructive/20")} dir="rtl" />
                ) : (
                  <div onClick={() => { if (!state.customBodyText) state.setCustomBodyText(state.defaultBodyText!); state.setIsEditingBody(true); }} className={cn("rounded-lg border p-3 text-sm leading-relaxed whitespace-pre-wrap text-foreground cursor-pointer transition-colors hover:border-primary/40 hover:bg-accent/30", isConfidential ? "bg-destructive/5 border-destructive/20" : "bg-muted/50")} title="انقر للتعديل">
                    {state.finalBodyText}
                    <p className="text-[10px] text-muted-foreground mt-2 opacity-60">📝 انقر لتعديل النص</p>
                  </div>
                )}
              </div>
            )}

            {/* Auto-filled fields */}
            {state.selectedStudentId && !state.isMultiMode && (
              <div className="grid grid-cols-2 gap-2">
                {form.fields.filter(f => f.type === "auto").map(f => (
                  <div key={f.id} className="space-y-0.5">
                    <Label className="text-[10px] text-muted-foreground">{f.label}</Label>
                    <div className="text-xs font-medium bg-muted rounded px-2 py-1.5 truncate">{state.fieldValues[f.id] || "—"}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2 flex-wrap">
          <Button variant="outline" onClick={() => onOpenChange(false)}>إلغاء</Button>

          {state.isMultiMode && state.multiStudents.length > 1 && (
            <BulkExportActions
              multiStudents={state.multiStudents}
              bulkExporting={state.bulkExporting}
              onBulkSeparate={state.handleBulkSeparate}
              onBulkMerged={state.handleBulkMerged}
            />
          )}

          {(!state.isMultiMode || state.multiStudents.length <= 1) && (
            <SingleExportActions
              form={form}
              selectedStudentId={state.selectedStudentId}
              exporting={state.exporting}
              sharing={state.sharing}
              onExport={state.handleExport}
              onWhatsApp={state.handleWhatsApp}
              onAdminAlert={state.handleAdminAlert}
              onSharePdf={state.handleSharePdf}
            />
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
