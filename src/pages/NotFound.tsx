import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Home, ArrowRight, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4" dir="rtl">
      <div className="text-center max-w-md mx-auto animate-fade-in">
        {/* Animated 404 Number */}
        <div className="relative mb-8">
          <div className="text-[10rem] font-black leading-none bg-gradient-to-b from-primary via-accent to-primary/40 bg-clip-text text-transparent select-none">
            404
          </div>
          <div className="absolute inset-0 text-[10rem] font-black leading-none text-primary/5 blur-2xl select-none">
            404
          </div>
        </div>

        {/* Search Icon */}
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-primary/15 to-accent/15 dark:from-primary/20 dark:to-accent/20 mb-6 shadow-lg shadow-primary/10">
          <Search className="h-10 w-10 text-primary" />
        </div>

        <h2 className="text-2xl font-bold text-foreground mb-3">
          الصفحة غير موجودة
        </h2>
        <p className="text-muted-foreground mb-8 leading-relaxed">
          عذراً، لم نتمكن من العثور على الصفحة التي تبحث عنها.
          <br />
          ربما تم نقلها أو حذفها.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild size="lg" className="gradient-primary text-white rounded-2xl gap-2 shadow-lg hover:shadow-xl transition-all">
            <Link to="/dashboard">
              <Home className="h-5 w-5" />
              العودة للرئيسية
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="rounded-2xl gap-2">
            <a href="#" onClick={() => window.history.back()}>
              <ArrowRight className="h-5 w-5" />
              الصفحة السابقة
            </a>
          </Button>
        </div>

        {/* Decorative dots */}
        <div className="flex justify-center gap-2 mt-12">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-primary/20"
              style={{ animationDelay: `${i * 0.1}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default NotFound;
