import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { BookOpen, FileText, Atom, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

// Particle component for floating atoms effect
function FloatingParticles() {
  const particles = useMemo(
    () =>
      Array.from({ length: 40 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 3 + 1,
        duration: 3 + Math.random() * 4,
        delay: Math.random() * 3,
      })),
    []
  );

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full bg-neon/25"
          style={{
            width: `${p.size}px`,
            height: `${p.size}px`,
            top: `${p.y}%`,
            left: `${p.x}%`,
            animation: `glow-pulse ${p.duration}s ease-in-out infinite`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

export default function WelcomeHero() {
  const navigate = useNavigate();
  const [visible, setVisible] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check site_settings for hero visibility
    supabase
      .from("site_settings")
      .select("value")
      .eq("id", "show_hero_section")
      .single()
      .then(({ data }) => {
        if (data?.value === "false") setVisible(false);
      });

    // Check session dismiss
    if (sessionStorage.getItem("hero_dismissed") === "true") {
      setDismissed(true);
    }
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem("hero_dismissed", "true");
  };

  if (!visible || dismissed) return null;

  return (
    <div className="relative rounded-3xl overflow-hidden gradient-space print:hidden">
      <FloatingParticles />

      {/* Orbital rings */}
      <div className="absolute w-[500px] h-[500px] border border-neon/8 rounded-full top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-12" />
      <div className="absolute w-[400px] h-[400px] border border-gold/8 rounded-full top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-45" />
      <div className="absolute w-[300px] h-[300px] border border-neon/5 rounded-full top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-75" />

      {/* Glowing atom icon */}
      <div className="absolute top-6 left-6 opacity-10">
        <Atom className="h-32 w-32 text-neon animate-[spin_20s_linear_infinite]" />
      </div>

      {/* Dismiss button */}
      <button
        onClick={handleDismiss}
        className="absolute top-4 left-4 z-10 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white/60 hover:text-white transition-all"
      >
        <X className="h-4 w-4" />
      </button>

      {/* Content */}
      <div className="relative z-[1] px-6 py-10 sm:px-10 sm:py-14 text-center max-w-3xl mx-auto space-y-5">
        <h2
          className="text-2xl sm:text-3xl md:text-4xl font-bold font-display text-gold leading-relaxed tracking-wide"
          style={{ textShadow: "0 0 30px hsl(42 92% 55% / 0.3)" }}
        >
          مرحباً بك في عالم الفيزياء الذكي
        </h2>

        <p
          className="text-sm sm:text-base text-neon-glow/80 leading-loose max-w-xl mx-auto"
          style={{ textShadow: "0 0 15px hsl(168 100% 50% / 0.15)" }}
        >
          هنا حيث تتحول النظريات إلى تجارب، والمعرفة إلى إبداع.
          <br className="hidden sm:block" />
          استعد لاستكشاف أسرار الكون في منصتك التعليمية المتكاملة.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Button
            onClick={() => navigate("/grades")}
            className="rounded-xl h-11 px-6 font-bold gradient-primary text-primary-foreground btn-neon shadow-neon hover:opacity-90 transition-all gap-2"
          >
            <BookOpen className="h-4 w-4" />
            استكشف الفصول
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate("/library")}
            className="rounded-xl h-11 px-6 font-bold border-gold/40 text-gold hover:bg-gold/10 hover:border-gold/60 transition-all gap-2"
          >
            <FileText className="h-4 w-4" />
            أحدث الملفات
          </Button>
        </div>
      </div>
    </div>
  );
}
