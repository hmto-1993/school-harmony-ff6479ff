import { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { LucideIcon } from "lucide-react";

interface CollapsibleSettingsCardProps {
  icon: LucideIcon;
  iconGradient: string;
  iconShadow?: string;
  title: string;
  description: string;
  children: ReactNode;
  className?: string;
}

export default function CollapsibleSettingsCard({
  icon: Icon,
  iconGradient,
  iconShadow = "",
  title,
  description,
  children,
  className = "",
}: CollapsibleSettingsCardProps) {
  return (
    <Collapsible>
      <Card className={`border-0 shadow-lg backdrop-blur-sm bg-card/80 overflow-hidden ${className}`}>
        <CollapsibleTrigger className="w-full group">
          <div className="flex items-center justify-between p-5 hover:bg-muted/30 transition-colors duration-200">
            <div className="flex items-center gap-3">
              <div className={`flex items-center justify-center h-11 w-11 rounded-xl bg-gradient-to-br ${iconGradient} ${iconShadow} text-white`}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="text-right">
                <h3 className="text-base font-bold text-foreground">{title}</h3>
                <p className="text-xs text-muted-foreground">{description}</p>
              </div>
            </div>
            <ChevronDown className="h-5 w-5 text-muted-foreground transition-transform duration-300 group-data-[state=open]:rotate-180" />
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="px-5 pb-5 pt-0">
            {children}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
