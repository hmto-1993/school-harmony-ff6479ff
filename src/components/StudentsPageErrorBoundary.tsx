import React from "react";

interface State { hasError: boolean; error: Error | null; }

export default class StudentsPageErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error("[StudentsPage crash]", error, info?.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 space-y-3 text-right" dir="rtl">
          <h2 className="text-xl font-bold text-destructive">تعذّر تحميل صفحة الطلاب</h2>
          <p className="text-sm text-muted-foreground">
            حدث خطأ أثناء عرض الصفحة. الرجاء إعادة تحميل التطبيق. إذا استمرت المشكلة، أبلغ الدعم بالرسالة التالية:
          </p>
          <pre className="text-xs bg-muted p-3 rounded-md overflow-auto max-h-64 whitespace-pre-wrap">
            {String(this.state.error?.message || this.state.error)}
          </pre>
          <button
            className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm"
            onClick={() => window.location.reload()}
          >
            إعادة المحاولة
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
