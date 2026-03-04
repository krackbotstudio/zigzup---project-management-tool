import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "./components/AppLayout";
import Dashboard from "@/pages/Dashboard";
import Boards from "@/pages/Boards";
import BoardPage from "@/pages/BoardPage";
import Calendar from "@/pages/Calendar";
import Notifications from "@/pages/Notifications";
import Settings from "@/pages/Settings";
import AIAssistant from "@/pages/AIAssistant";
import Automations from "@/pages/Automations";
import DemoRecorder from "@/pages/DemoRecorder";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import NotFound from "@/pages/NotFound";
import Landing from "@/pages/Landing";
import Privacy from "@/pages/Privacy";
import Terms from "@/pages/Terms";
import Contact from "@/pages/Contact";
import Donate from "@/pages/Donate";
import InvitePage from "@/pages/InvitePage";

import { ProjectProvider } from "./context/ProjectContext";
import { ThemeProvider } from "./context/ThemeContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { SettingsProvider } from "./context/SettingsContext";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground font-medium animate-pulse">Loading workspace...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

const App = () => (
  <ThemeProvider>
    <AuthProvider>
      <SettingsProvider>
        <ProjectProvider>
          <QueryClientProvider client={queryClient}>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <Routes>
                  {/* Public Routes */}
                  <Route path="/" element={<Landing />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/signup" element={<Signup />} />
                  <Route path="/privacy" element={<Privacy />} />
                  <Route path="/terms" element={<Terms />} />
                  <Route path="/contact" element={<Contact />} />
                  <Route path="/donate" element={<Donate />} />
                  <Route path="/invite" element={<InvitePage />} />

                  {/* Protected Routes */}
                  <Route element={
                    <ProtectedRoute>
                      <AppLayout />
                    </ProtectedRoute>
                  }>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/board/:boardId" element={<BoardPage />} />
                    <Route path="/boards" element={<Boards />} />
                    <Route path="/calendar" element={<Calendar />} />
                    <Route path="/notifications" element={<Notifications />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/ai-assistant" element={<AIAssistant />} />
                    <Route path="/automations" element={<Automations />} />
                    <Route path="/demo-recorder" element={<DemoRecorder />} />
                  </Route>

                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
            </TooltipProvider>
          </QueryClientProvider>
        </ProjectProvider>
      </SettingsProvider>
    </AuthProvider>
  </ThemeProvider>
);

export default App;
