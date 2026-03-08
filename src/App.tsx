import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/hooks/use-theme";
import { CalendarTypeProvider } from "@/hooks/useCalendarType";
import ProtectedRoute from "@/components/ProtectedRoute";
import DashboardLayout from "@/components/DashboardLayout";
import NotificationOptIn from "@/components/NotificationOptIn";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";
import { lazy, Suspense } from "react";

// Lazy-loaded pages
const LoginPage = lazy(() => import("@/pages/LoginPage"));
const DashboardPage = lazy(() => import("@/pages/DashboardPage"));
const StudentsPage = lazy(() => import("@/pages/StudentsPage"));
const AttendancePage = lazy(() => import("@/pages/AttendancePage"));
const GradesPage = lazy(() => import("@/pages/GradesPage"));
const ReportsPage = lazy(() => import("@/pages/ReportsPage"));
const NotificationsPage = lazy(() => import("@/pages/NotificationsPage"));
const SettingsPage = lazy(() => import("@/pages/SettingsPage"));
const StudentDashboard = lazy(() => import("@/pages/StudentDashboard"));
const ResourceLibraryPage = lazy(() => import("@/pages/ResourceLibraryPage"));
const StudentLoginsPage = lazy(() => import("@/pages/StudentLoginsPage"));
const ActivitiesPage = lazy(() => import("@/pages/ActivitiesPage"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const InstallPage = lazy(() => import("@/pages/InstallPage"));

const queryClient = new QueryClient();

const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <CalendarTypeProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AuthProvider>
              <NotificationOptIn />
              <PWAInstallPrompt />
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/install" element={<InstallPage />} />
                  <Route path="/student" element={<StudentDashboard />} />
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
                  </Route>
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </CalendarTypeProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
