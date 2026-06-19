import { ReactNode, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useAccessGate } from "@/hooks/useAccessGate";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

const RouteSpinner = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
  </div>
);

function AccessErrorCard({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => Promise<void> | void;
}) {
  const [retrying, setRetrying] = useState(false);
  const handleRetry = async () => {
    setRetrying(true);
    try {
      await onRetry();
    } finally {
      setRetrying(false);
    }
  };
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <Alert variant="destructive" className="max-w-md">
        <AlertTriangle className="h-5 w-5" />
        <AlertTitle>Authentication issue</AlertTitle>
        <AlertDescription className="space-y-4">
          <p>{message}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRetry}
            disabled={retrying}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${retrying ? "animate-spin" : ""}`} />
            {retrying ? "Retrying…" : "Retry Authentication"}
          </Button>
        </AlertDescription>
      </Alert>
    </div>
  );
}

/**
 * Gates a route behind authentication AND a paid subscription.
 *
 * - Not logged in              → /auth
 * - Logged in, no paid access  → /demo (only the demo + pricing are reachable)
 * - Logged in + paid           → renders children
 *
 * If the access gate fails or times out (7s), surfaces a retry card instead
 * of an indefinite spinner.
 */
export function ProtectedRoute({
  children,
  requireAuthOnly = false,
}: {
  children: ReactNode;
  requireAuthOnly?: boolean;
}) {
  const { user, loading: authLoading } = useAuth();
  const { hasPaidAccess, loading: gateLoading, hasError, errorMessage, retry } =
    useAccessGate();
  const location = useLocation();

  if (authLoading) return <RouteSpinner />;
  if (!user) {
    return <Navigate to="/auth" state={{ from: location.pathname }} replace />;
  }
  if (requireAuthOnly) return <>{children}</>;
  if (hasError) {
    return (
      <AccessErrorCard
        message={errorMessage ?? "Secure access verification timed out. Please refresh the page."}
        onRetry={retry}
      />
    );
  }
  if (gateLoading) return <RouteSpinner />;
  if (!hasPaidAccess) {
    return <Navigate to="/demo" replace />;
  }
  return <>{children}</>;
}
