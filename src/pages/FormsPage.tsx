import { useState } from "react";
import FormsGrid from "@/components/forms/FormsGrid";
import FormDialog from "@/components/forms/FormDialog";
import type { FormTemplate } from "@/components/forms/form-templates";

export default function FormsPage() {
  const [selectedForm, setSelectedForm] = useState<FormTemplate | null>(null);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">مركز النماذج والخطابات الرسمية</h1>
        <p className="text-sm text-muted-foreground mt-1">إنشاء وتصدير النماذج الرسمية بتعبئة تلقائية لبيانات الطلاب</p>
      </div>

      <FormsGrid onSelect={setSelectedForm} />

      {selectedForm && (
        <FormDialog
          form={selectedForm}
          open={!!selectedForm}
          onOpenChange={(open) => { if (!open) setSelectedForm(null); }}
        />
      )}
    </div>
  );
}
