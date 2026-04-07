import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, FileSpreadsheet, Zap } from "lucide-react";
import { useNoorData } from "./noor/useNoorData";
import NoorExcelTab from "./noor/NoorExcelTab";
import NoorAutoTab from "./noor/NoorAutoTab";

export default function NoorExportDialog() {
  const [open, setOpen] = useState(false);
  const noor = useNoorData();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <FileSpreadsheet className="h-4 w-4" />
          تصدير لنظام نور
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            تصدير درجات لنظام نور
          </DialogTitle>
          <DialogDescription>
            صدّر ملف Excel أو أنشئ كود إدخال تلقائي لصفحة نور
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="excel" dir="rtl">
          <TabsList className="w-full">
            <TabsTrigger value="excel" className="flex-1 gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              ملف Excel
            </TabsTrigger>
            <TabsTrigger value="auto" className="flex-1 gap-2">
              <Zap className="h-4 w-4" />
              إدخال تلقائي
            </TabsTrigger>
          </TabsList>

          <TabsContent value="excel">
            <NoorExcelTab
              classes={noor.classes}
              categories={noor.categories}
              selectedClass={noor.selectedClass}
              setSelectedClass={noor.setSelectedClass}
              selectedCategory={noor.selectedCategory}
              setSelectedCategory={noor.setSelectedCategory}
              selectedPeriod={noor.selectedPeriod}
              setSelectedPeriod={noor.setSelectedPeriod}
            />
          </TabsContent>

          <TabsContent value="auto">
            <NoorAutoTab
              classes={noor.classes}
              categories={noor.categories}
              selectedClass={noor.selectedClass}
              setSelectedClass={noor.setSelectedClass}
              selectedCategories={noor.selectedCategories}
              toggleCategory={noor.toggleCategory}
              selectAllCategories={noor.selectAllCategories}
              selectedPeriod={noor.selectedPeriod}
              setSelectedPeriod={noor.setSelectedPeriod}
              fetchMultiCategoryGradeData={noor.fetchMultiCategoryGradeData}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
