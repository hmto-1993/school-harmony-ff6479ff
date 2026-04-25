import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Users2 } from "lucide-react";

interface Props {
  current: number;
  total: number;
  active: boolean;
}

export default function BulkSendProgressCard({ current, total, active }: Props) {
  if (!active) return null;
  return (
    <Card className="border-0 shadow-lg bg-card/80 print:hidden">
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center gap-3">
          <Users2 className="h-5 w-5 text-primary" />
          <div className="flex-1 space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="font-medium">جارٍ الإرسال الجماعي...</span>
              <span className="text-muted-foreground">{current} / {total}</span>
            </div>
            <Progress value={(current / total) * 100} className="h-2" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
