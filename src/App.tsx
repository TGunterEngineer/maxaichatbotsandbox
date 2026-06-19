import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import { ProtectedRoute } from "./components/ProtectedRoute";

const BotSettingsPage = lazy(() => import("./pages/BotSettingsPage"));
const LeadsPage = lazy(() => import("./pages/LeadsPage"));
const ConversationsPage = lazy(() => import("./pages/ConversationsPage"));
const PreviewPage = lazy(() => import("./pages/PreviewPage"));
const InstallPage = lazy(() => import("./pages/InstallPage"));
const SuperAdmin = lazy(() => import("./pages/SuperAdmin"));
const SuperAdminEmails = lazy(() => import("./pages/SuperAdminEmails"));
const SuperAdminProspects = lazy(() => import("./pages/SuperAdminProspects"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const Demo = lazy(() => import("./pages/Demo"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Terms = lazy(() => import("./pages/Terms"));
const Unsubscribe = lazy(() => import("./pages/Unsubscribe"));

const queryClient = new QueryClient();

const RouteFallback = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      storageKey="maximumai-theme"
    >
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Suspense fallback={<RouteFallback />}>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/bot-settings" element={<ProtectedRoute><BotSettingsPage /></ProtectedRoute>} />
                <Route path="/leads" element={<ProtectedRoute><LeadsPage /></ProtectedRoute>} />
                <Route path="/conversations" element={<ProtectedRoute><ConversationsPage /></ProtectedRoute>} />
                <Route path="/preview" element={<ProtectedRoute><PreviewPage /></ProtectedRoute>} />
                <Route path="/install" element={<ProtectedRoute><InstallPage /></ProtectedRoute>} />
                <Route path="/super-admin" element={<ProtectedRoute><SuperAdmin /></ProtectedRoute>} />
                <Route path="/super-admin/emails" element={<ProtectedRoute><SuperAdminEmails /></ProtectedRoute>} />
                <Route path="/super-admin/prospects" element={<ProtectedRoute><SuperAdminProspects /></ProtectedRoute>} />
                <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
                <Route path="/demo" element={<Demo />} />

                <Route path="/privacy" element={<Privacy />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/unsubscribe" element={<Unsubscribe />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
