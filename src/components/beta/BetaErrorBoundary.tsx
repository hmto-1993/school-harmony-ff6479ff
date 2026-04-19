import { Component, ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

interface Props { children: ReactNode; featureName?: string; }
interface State { hasError: boolean; }

/** Isolates beta feature crashes from the rest of the app. */
export class BetaErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(err: unknown) {
    console.error("[BetaErrorBoundary]", this.props.featureName, err);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-xl border-2 border-dashed border-amber-500/40 bg-amber-500/5 p-4 text-sm text-amber-700 dark:text-amber-400 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>تعطّلت ميزة تجريبية مؤقتاً ({this.props.featureName ?? "Beta"}). باقي النظام يعمل بشكل طبيعي.</span>
        </div>
      );
    }
    return this.props.children;
  }
}
