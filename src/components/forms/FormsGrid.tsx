import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formTemplates, categoryLabels, type FormTemplate } from "./form-templates";
import { useCustomForms, convertToFormTemplate, type CustomSection } from "@/hooks/useCustomForms";
import { useFormFavorites } from "@/hooks/useFormFavorites";
import CreateSectionDialog from "./CreateSectionDialog";
import CreateCustomFormDialog from "./CreateCustomFormDialog";
import { Plus, Trash2, FolderPlus, Star } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Props {
  onSelect: (form: FormTemplate) => void;
}

const categories = ["general", "behavior", "confidential"] as const;

function FavoriteButton({ formId, isFavorite, onToggle }: { formId: string; isFavorite: boolean; onToggle: (id: string) => void }) {
  return (
    <button
      className={cn(
        "p-1 rounded-full transition-all",
        isFavorite
          ? "text-yellow-500 hover:text-yellow-600"
          : "text-muted-foreground/40 hover:text-yellow-400 opacity-0 group-hover:opacity-100"
      )}
      onClick={(e) => { e.stopPropagation(); onToggle(formId); }}
      title={isFavorite ? "إزالة من المفضلة" : "إضافة للمفضلة"}
    >
      <Star className={cn("h-4 w-4", isFavorite && "fill-current")} />
    </button>
  );
}

export default function FormsGrid({ onSelect }: Props) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const { sections, templates, addSection, deleteSection, addTemplate, deleteTemplate } = useCustomForms();
  const { isFavorite, toggleFavorite, favoriteIds } = useFormFavorites();

  const [showSectionDialog, setShowSectionDialog] = useState(false);
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [activeSection, setActiveSection] = useState<CustomSection | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ type: "section" | "form"; id: string; title: string } | null>(null);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  // Build favorite forms list
  const favoriteFormsList: FormTemplate[] = [];
  if (favoriteIds.size > 0) {
    formTemplates.forEach(f => { if (favoriteIds.has(f.id)) favoriteFormsList.push(f); });
    templates.forEach(tmpl => {
      const section = sections.find(s => s.id === tmpl.section_id);
      if (section && favoriteIds.has(`custom_${tmpl.id}`)) {
        favoriteFormsList.push(convertToFormTemplate(tmpl, section));
      }
    });
  }

  const filtered = showFavoritesOnly
    ? favoriteFormsList.filter(f => !f.id.startsWith("custom_"))
    : activeCategory
      ? formTemplates.filter((f) => f.category === activeCategory)
      : formTemplates;

  const handleCreateForm = (section: CustomSection) => {
    setActiveSection(section);
    setShowFormDialog(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.type === "section") await deleteSection(deleteTarget.id);
      else await deleteTemplate(deleteTarget.id);
      toast.success("تم الحذف بنجاح");
    } catch { toast.error("فشل الحذف"); }
    setDeleteTarget(null);
  };

  return (
    <div className="space-y-4">
      {/* Category filters */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => { setActiveCategory(null); setShowFavoritesOnly(false); }}
          className={cn(
            "px-4 py-1.5 rounded-full text-sm font-medium transition-all border",
            !activeCategory && !showFavoritesOnly
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-card text-muted-foreground border-border hover:bg-secondary"
          )}
        >
          الكل ({formTemplates.length})
        </button>

        {/* Favorites filter */}
        {favoriteIds.size > 0 && (
          <button
            onClick={() => { setShowFavoritesOnly(!showFavoritesOnly); setActiveCategory(null); }}
            className={cn(
              "px-4 py-1.5 rounded-full text-sm font-medium transition-all border flex items-center gap-1.5",
              showFavoritesOnly
                ? "bg-yellow-500 text-white border-yellow-500"
                : "bg-card text-muted-foreground border-border hover:bg-secondary"
            )}
          >
            <Star className={cn("h-3.5 w-3.5", showFavoritesOnly && "fill-current")} />
            المفضلة ({favoriteFormsList.length})
          </button>
        )}

        {categories.map((cat) => {
          const info = categoryLabels[cat];
          const count = formTemplates.filter((f) => f.category === cat).length;
          return (
            <button
              key={cat}
              onClick={() => { setActiveCategory(activeCategory === cat ? null : cat); setShowFavoritesOnly(false); }}
              className={cn(
                "px-4 py-1.5 rounded-full text-sm font-medium transition-all border",
                activeCategory === cat
                  ? "text-primary-foreground border-transparent"
                  : "bg-card text-muted-foreground border-border hover:bg-secondary"
              )}
              style={activeCategory === cat ? { backgroundColor: info.color, borderColor: info.color } : {}}
            >
              {info.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Built-in Cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map((form) => {
          const catInfo = categoryLabels[form.category];
          return (
            <Card
              key={form.id}
              className={cn(
                "cursor-pointer group hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 border-2",
                form.confidentialWatermark
                  ? "border-destructive/20 hover:border-destructive/40 bg-destructive/[0.02]"
                  : "border-transparent hover:border-primary/30"
              )}
              onClick={() => onSelect(form)}
            >
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <span className="text-3xl">{form.icon}</span>
                  <div className="flex items-center gap-1">
                    <FavoriteButton formId={form.id} isFavorite={isFavorite(form.id)} onToggle={toggleFavorite} />
                    {form.confidentialWatermark && (
                      <Badge variant="destructive" className="text-[9px] px-1.5">سري</Badge>
                    )}
                    <Badge
                      variant="outline"
                      className="text-[10px] font-semibold"
                      style={{ borderColor: catInfo.color, color: catInfo.color }}
                    >
                      {catInfo.label}
                    </Badge>
                  </div>
                </div>
                <h3 className={cn(
                  "font-bold text-sm transition-colors leading-tight",
                  form.confidentialWatermark
                    ? "text-destructive group-hover:text-destructive/80"
                    : "text-foreground group-hover:text-primary"
                )}>
                  {form.title}
                </h3>
                <p className="text-xs text-muted-foreground line-clamp-2">{form.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Custom Sections */}
      {(!showFavoritesOnly ? sections : sections.filter(s => templates.some(t => t.section_id === s.id && favoriteIds.has(`custom_${t.id}`)))).map((section) => {
        const sectionTemplates = templates.filter(t => t.section_id === section.id && (!showFavoritesOnly || favoriteIds.has(`custom_${t.id}`)));
        return (
          <div key={section.id} className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">{section.icon}</span>
              <h2 className="text-lg font-bold" style={{ color: section.color }}>{section.title}</h2>
              <Badge variant="outline" className="text-[10px]" style={{ borderColor: section.color, color: section.color }}>
                مخصص ({sectionTemplates.length})
              </Badge>
              <div className="flex-1" />
              {!showFavoritesOnly && (
                <>
                  <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => handleCreateForm(section)}>
                    <Plus className="h-3 w-3" /> نموذج جديد
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive"
                    onClick={() => setDeleteTarget({ type: "section", id: section.id, title: section.title })}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </>
              )}
            </div>

            {sectionTemplates.length === 0 && !showFavoritesOnly ? (
              <div className="border-2 border-dashed rounded-xl p-8 text-center">
                <p className="text-sm text-muted-foreground">لا توجد نماذج في هذا القسم بعد</p>
                <Button variant="outline" size="sm" className="mt-3 gap-1 text-xs" onClick={() => handleCreateForm(section)}>
                  <Plus className="h-3 w-3" /> إنشاء نموذج
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {sectionTemplates.map((tmpl) => {
                  const formTemplate = convertToFormTemplate(tmpl, section);
                  const customFormId = `custom_${tmpl.id}`;
                  return (
                    <Card
                      key={tmpl.id}
                      className="cursor-pointer group hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 border-2 border-transparent hover:border-primary/30 relative"
                      onClick={() => onSelect(formTemplate)}
                    >
                      <CardContent className="p-4 space-y-2">
                        <div className="flex items-start justify-between">
                          <span className="text-3xl">{tmpl.icon}</span>
                          <div className="flex items-center gap-1">
                            <FavoriteButton formId={customFormId} isFavorite={isFavorite(customFormId)} onToggle={toggleFavorite} />
                            <Badge variant="outline" className="text-[10px] font-semibold" style={{ borderColor: section.color, color: section.color }}>
                              مخصص
                            </Badge>
                          </div>
                        </div>
                        <h3 className="font-bold text-sm transition-colors leading-tight text-foreground group-hover:text-primary">
                          {tmpl.title}
                        </h3>
                        <p className="text-xs text-muted-foreground line-clamp-2">{tmpl.description || "نموذج مخصص"}</p>
                      </CardContent>
                      {!showFavoritesOnly && (
                        <button
                          className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full hover:bg-destructive/10 text-destructive"
                          onClick={(e) => { e.stopPropagation(); setDeleteTarget({ type: "form", id: tmpl.id, title: tmpl.title }); }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* Favorites empty state */}
      {showFavoritesOnly && favoriteFormsList.length === 0 && (
        <div className="border-2 border-dashed rounded-xl p-12 text-center">
          <Star className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">لا توجد نماذج في المفضلة بعد</p>
          <p className="text-xs text-muted-foreground/60 mt-1">اضغط على نجمة ⭐ بجوار أي نموذج لإضافته للمفضلة</p>
        </div>
      )}

      {/* Add Section Button */}
      {!showFavoritesOnly && (
        <Card
          className="cursor-pointer border-2 border-dashed border-primary/20 hover:border-primary/50 transition-all group"
          onClick={() => setShowSectionDialog(true)}
        >
          <CardContent className="p-6 flex flex-col items-center justify-center gap-2 text-muted-foreground group-hover:text-primary">
            <FolderPlus className="h-8 w-8" />
            <p className="text-sm font-semibold">إضافة بطاقة جديدة</p>
            <p className="text-[11px]">أنشئ قسماً جديداً لنماذجك المخصصة</p>
          </CardContent>
        </Card>
      )}

      {/* Dialogs */}
      <CreateSectionDialog open={showSectionDialog} onOpenChange={setShowSectionDialog} onSubmit={addSection} />

      {activeSection && (
        <CreateCustomFormDialog
          open={showFormDialog}
          onOpenChange={setShowFormDialog}
          sectionTitle={activeSection.title}
          onSubmit={(data) => addTemplate(activeSection.id, data as any)}
        />
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف "{deleteTarget?.title}"؟
              {deleteTarget?.type === "section" && " سيتم حذف جميع النماذج داخل هذا القسم."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
