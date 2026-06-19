import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

const BotSettingsPage = lazy(() => import("./pages/BotSettingsPage"));
const LeadsPage = lazy(() => import("./pages/LeadsPage"));
const ConversationsPage = lazy(() => import("./pages/ConversationsPage"));
const PreviewPage = lazy(() => import("./pages/PreviewPage"));
const InstallPage = lazy(() => import("./pages/InstallPage"));
const Playground = lazy(() => import("./pages/Playground"));
const RagDebugger = lazy(() => import("./pages/RagDebugger"));
const Intelligence = lazy(() => import("./pages/Intelligence"));
const SuperAdmin = lazy(() => import("./pages/SuperAdmin"));
const SuperAdminEmails = lazy(() => import("./pages/SuperAdminEmails"));
const SuperAdminProspects = lazy(() => import("./pages/SuperAdminProspects"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Terms = lazy(() => import("./pages/Terms"));

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
      defaultTheme="dark"
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
                <Route path="/bot-settings" element={<BotSettingsPage />} />
                <Route path="/leads" element={<LeadsPage />} />
                <Route path="/conversations" element={<ConversationsPage />} />
                <Route path="/preview" element={<PreviewPage />} />
                <Route path="/install" element={<InstallPage />} />
                <Route path="/playground" element={<Playground />} />
                <Route path="/rag-debugger" element={<RagDebugger />} />
                <Route path="/intelligence" element={<Intelligence />} />
                <Route path="/super-admin" element={<SuperAdmin />} />
                <Route path="/super-admin/emails" element={<SuperAdminEmails />} />
                <Route path="/super-admin/prospects" element={<SuperAdminProspects />} />

                {/* Legacy routes — redirect to dashboard in demo mode */}
                <Route path="/auth" element={<Navigate to="/" replace />} />
                <Route path="/onboarding" element={<Navigate to="/" replace />} />
                <Route path="/demo" element={<Navigate to="/" replace />} />

                <Route path="/privacy" element={<Privacy />} />
                <Route path="/terms" element={<Terms />} />
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
