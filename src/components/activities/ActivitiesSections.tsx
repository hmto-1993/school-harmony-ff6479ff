import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ClipboardList, FileUp, BarChart3, ChevronDown } from "lucide-react";
import QuizStatistics from "@/components/activities/QuizStatistics";
import ActivityCard from "@/components/activities/ActivityCard";
import type { Activity } from "@/hooks/useActivitiesData";

interface ActivitiesSectionsProps {
  filtered: Activity[];
  filterType: string;
  isViewOnly: boolean;
  onEdit: (activity: Activity) => void;
  onToggleVisibility: (id: string, current: boolean) => void;
  onToggleUploads: (activityId: string, classId: string, current: boolean) => void;
  onDelete: (id: string) => void;
  onViewResults: (activity: Activity, classId: string) => void;
}

export default function ActivitiesSections({
  filtered, filterType, isViewOnly, onEdit, onToggleVisibility, onToggleUploads, onDelete, onViewResults,
}: ActivitiesSectionsProps) {
  const quizActivities = filtered.filter(a => a.type === "quiz");
  const fileActivities = filtered.filter(a => a.type === "file");

  return (
    <div className="space-y-4">
      {/* Quiz Statistics */}
      {filtered.some(a => a.type === "quiz") && (
        <Collapsible defaultOpen>
          <Card className="border-0 shadow-lg rounded-2xl overflow-hidden bg-gradient-to-br from-violet-500/5 via-card to-purple-500/5">
            <CollapsibleTrigger className="w-full">
              <div className="flex items-center justify-between p-5 cursor-pointer hover:bg-muted/20 transition-colors group">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
                    <BarChart3 className="h-5 w-5 text-white" />
                  </div>
                  <div className="text-right">
                    <h2 className="text-lg font-bold text-foreground">إحصائيات الاختبارات</h2>
                    <p className="text-xs text-muted-foreground">تحليل الأداء ومعدلات النجاح</p>
                  </div>
                </div>
                <ChevronDown className="h-5 w-5 text-muted-foreground transition-transform duration-300 group-data-[state=open]:rotate-180" />
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="px-5 pb-5 pt-0">
                <QuizStatistics />
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* Quizzes Section */}
      {(filterType === "all" || filterType === "quiz") && quizActivities.length > 0 && (
        <Collapsible defaultOpen>
          <Card className="border-0 shadow-lg rounded-2xl overflow-hidden bg-gradient-to-br from-indigo-500/5 via-card to-violet-500/5">
            <CollapsibleTrigger className="w-full">
              <div className="flex items-center justify-between p-5 cursor-pointer hover:bg-muted/20 transition-colors group">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                    <ClipboardList className="h-5 w-5 text-white" />
                  </div>
                  <div className="text-right">
                    <h2 className="text-lg font-bold text-foreground">الاختبارات</h2>
                    <p className="text-xs text-muted-foreground">{quizActivities.length} اختبار</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-indigo-500/10 text-indigo-600 border-indigo-500/20 rounded-full text-xs font-bold px-3">
                    {quizActivities.length}
                  </Badge>
                  <ChevronDown className="h-5 w-5 text-muted-foreground transition-transform duration-300 group-data-[state=open]:rotate-180" />
                </div>
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="px-5 pb-5 pt-0 space-y-3">
                {quizActivities.map((activity, ai) => (
                  <ActivityCard key={activity.id} activity={activity} ai={ai} isViewOnly={isViewOnly}
                    onEdit={onEdit} onToggleVisibility={onToggleVisibility} onToggleUploads={onToggleUploads}
                    onDelete={onDelete} onViewResults={onViewResults} />
                ))}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* Files Section */}
      {(filterType === "all" || filterType === "file") && fileActivities.length > 0 && (
        <Collapsible defaultOpen>
          <Card className="border-0 shadow-lg rounded-2xl overflow-hidden bg-gradient-to-br from-sky-500/5 via-card to-blue-500/5">
            <CollapsibleTrigger className="w-full">
              <div className="flex items-center justify-between p-5 cursor-pointer hover:bg-muted/20 transition-colors group">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center shadow-lg shadow-sky-500/20">
                    <FileUp className="h-5 w-5 text-white" />
                  </div>
                  <div className="text-right">
                    <h2 className="text-lg font-bold text-foreground">الأنشطة والملفات</h2>
                    <p className="text-xs text-muted-foreground">{fileActivities.length} نشاط</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-sky-500/10 text-sky-600 border-sky-500/20 rounded-full text-xs font-bold px-3">
                    {fileActivities.length}
                  </Badge>
                  <ChevronDown className="h-5 w-5 text-muted-foreground transition-transform duration-300 group-data-[state=open]:rotate-180" />
                </div>
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="px-5 pb-5 pt-0 space-y-3">
                {fileActivities.map((activity, ai) => (
                  <ActivityCard key={activity.id} activity={activity} ai={ai} isViewOnly={isViewOnly}
                    onEdit={onEdit} onToggleVisibility={onToggleVisibility} onToggleUploads={onToggleUploads}
                    onDelete={onDelete} onViewResults={onViewResults} />
                ))}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}
    </div>
  );
}
