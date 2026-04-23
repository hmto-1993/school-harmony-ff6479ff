import { cn } from "@/lib/utils";

interface BrandNameProps {
  name: string;
  className?: string;
  goldWord?: string;
}

/**
 * يعرض اسم المنصة بتدرج رمادي/أسود فخم مع تلوين كلمة محددة بالذهبي المطفي.
 * مثال: "منصة المتميز التعليمية" → "التعليمية" بالذهبي.
 */
export default function BrandName({ name, className, goldWord = "التعليمية" }: BrandNameProps) {
  if (!name) return null;
  const parts = name.split(goldWord);
  const hasGold = parts.length > 1;

  return (
    <span className={cn("inline-flex items-baseline gap-1.5 font-extrabold tracking-tight", className)}>
      {hasGold ? (
        <>
          <span className="bg-gradient-to-b from-foreground via-foreground/85 to-foreground/55 bg-clip-text text-transparent dark:from-white dark:via-white/85 dark:to-white/50">
            {parts[0].trim()}
          </span>
          <span
            className="bg-gradient-to-b from-[hsl(42,55%,55%)] via-[hsl(40,50%,45%)] to-[hsl(38,45%,38%)] bg-clip-text text-transparent drop-shadow-[0_1px_0_rgba(0,0,0,0.04)]"
          >
            {goldWord}
          </span>
          {parts[1] && (
            <span className="bg-gradient-to-b from-foreground via-foreground/85 to-foreground/55 bg-clip-text text-transparent dark:from-white dark:via-white/85 dark:to-white/50">
              {parts[1].trim()}
            </span>
          )}
        </>
      ) : (
        <span className="bg-gradient-to-b from-foreground via-foreground/85 to-foreground/55 bg-clip-text text-transparent dark:from-white dark:via-white/85 dark:to-white/50">
          {name}
        </span>
      )}
    </span>
  );
}
