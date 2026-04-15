import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/hooks/use-theme";
import { CalendarTypeProvider } from "@/hooks/useCalendarType";
import { AcademicWeekProvider } from "@/hooks/useAcademicWeek";
import { HonorRollProvider } from "@/contexts/HonorRollContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import DashboardLayout from "@/components/DashboardLayout";
import NotificationOptIn from "@/components/NotificationOptIn";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";
import { lazy, Suspense } from "react";
import { useDynamicFavicon } from "@/hooks/useDynamicFavicon";

// Eagerly start fetching critical pages so they're ready before auth resolves
const loginImport = import("@/pages/LoginPage");
const dashboardImport = import("@/pages/DashboardPage");
const gradesImport = import("@/pages/GradesPage");
const attendanceImport = import("@/pages/AttendancePage");
const studentsImport = import("@/pages/StudentsPage");
const studentDashboardImport = import("@/pages/StudentDashboard");

const LoginPage = lazy(() => loginImport);
const DashboardPage = lazy(() => dashboardImport);
const GradesPage = lazy(() => gradesImport);
const AttendancePage = lazy(() => attendanceImport);
const StudentsPage = lazy(() => studentsImport);
const StudentDashboard = lazy(() => studentDashboardImport);
const ReportsPage = lazy(() => import("@/pages/ReportsPage"));
const NotificationsPage = lazy(() => import("@/pages/NotificationsPage"));
const SettingsPage = lazy(() => import("@/pages/SettingsPage"));
const ResourceLibraryPage = lazy(() => import("@/pages/ResourceLibraryPage"));
const StudentLoginsPage = lazy(() => import("@/pages/StudentLoginsPage"));
const ActivitiesPage = lazy(() => import("@/pages/ActivitiesPage"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const InstallPage = lazy(() => import("@/pages/InstallPage"));
const SharedViewPage = lazy(() => import("@/pages/SharedViewPage"));
const FormsPage = lazy(() => import("@/pages/FormsPage"));

const queryClient = new QueryClient();

const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

const App = () => {
  useDynamicFavicon();
  return (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <CalendarTypeProvider>
        <AcademicWeekProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AuthProvider>
              <HonorRollProvider>
                <NotificationOptIn />
                <PWAInstallPrompt />
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/install" element={<InstallPage />} />
                    <Route path="/student" element={<StudentDashboard />} />
                    <Route path="/shared/:token" element={<SharedViewPage />} />
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                    <Route
                      element={
                        <ProtectedRoute>
                          <DashboardLayout />
                        </ProtectedRoute>
                      }
                    >
                      <Route path="/dashboard" element={<DashboardPage />} />
                      <Route path="/students" element={<ProtectedRoute allowedRoles={["admin"]}><StudentsPage /></ProtectedRoute>} />
                      <Route path="/attendance" element={<AttendancePage />} />
                      <Route path="/grades" element={<GradesPage />} />
                      <Route path="/reports" element={<ReportsPage />} />
                      <Route path="/notifications" element={<NotificationsPage />} />
                      <Route path="/settings" element={<SettingsPage />} />
                      <Route path="/library" element={<ResourceLibraryPage />} />
                      <Route path="/activities" element={<ActivitiesPage />} />
                      <Route path="/student-logins" element={<ProtectedRoute allowedRoles={["admin"]}><StudentLoginsPage /></ProtectedRoute>} />
                      <Route path="/forms" element={<FormsPage />} />
                    </Route>
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </HonorRollProvider>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
        </AcademicWeekProvider>
      </CalendarTypeProvider>
    </ThemeProvider>
  </QueryClientProvider>
  );
};

export default App;
