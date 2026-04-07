import { Button } from "@/components/ui/button";
import { GraduationCap, LogOut, Sun, Moon } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";

interface Props {
  isParent: boolean;
  schoolName: string;
  schoolLogoUrl: string;
  onSignOut: () => void;
}

export default function StudentDashboardHeader({ isParent, schoolName, schoolLogoUrl, onSignOut }: Props) {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl shadow-sm">
      <div className="container mx-auto flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          {schoolLogoUrl ? (
            <img src={schoolLogoUrl} alt="الشعار" className="h-10 w-10 rounded-xl object-cover shadow-md" />
          ) : (
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-md">
              <GraduationCap className="h-5 w-5 text-primary-foreground" />
            </div>
          )}
          <div>
            <h1 className="text-lg font-bold text-foreground">{isParent ? "بوابة ولي الأمر" : "لوحة الطالب"}</h1>
            {schoolName && <p className="text-xs text-muted-foreground">{schoolName}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={toggleTheme} className="rounded-xl border-border/60 hover:bg-muted">
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <Button variant="outline" size="sm" onClick={onSignOut} className="gap-2 rounded-xl border-border/60 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30">
            <LogOut className="h-4 w-4" />
            خروج
          </Button>
        </div>
      </div>
    </header>
  );
}
