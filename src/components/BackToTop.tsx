import { ArrowUp } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export default function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Try main first (dashboard layout), fallback to window
    const main = document.querySelector("main");
    const target = main && main.scrollHeight > main.clientHeight ? main : null;

    const onScroll = () => {
      const scrollTop = target ? target.scrollTop : (window.scrollY || document.documentElement.scrollTop);
      setVisible(scrollTop > 300);
    };

    const el = target || window;
    el.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToTop = () => {
    const main = document.querySelector("main");
    if (main && main.scrollTop > 0) {
      main.scrollTo({ top: 0, behavior: "smooth" });
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <button
      onClick={scrollToTop}
      aria-label="العودة للأعلى"
      className={cn(
        "fixed bottom-6 left-6 z-50 h-11 w-11 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center transition-all duration-300 hover:bg-primary/90 hover:shadow-xl active:scale-95",
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
      )}
    >
      <ArrowUp className="h-5 w-5" />
    </button>
  );
}
