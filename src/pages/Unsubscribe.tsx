import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

type State = "loading" | "valid" | "already" | "invalid" | "submitting" | "success" | "error";

export default function Unsubscribe() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [state, setState] = useState<State>("loading");

  useEffect(() => {
    if (!token) {
      setState("invalid");
      return;
    }
    (async () => {
      try {
        const res = await fetch(
          `${SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${encodeURIComponent(token)}`,
          { headers: { apikey: SUPABASE_ANON_KEY } }
        );
        const data = await res.json();
        if (data.valid) setState("valid");
        else if (data.reason === "already_unsubscribed") setState("already");
        else setState("invalid");
      } catch {
        setState("invalid");
      }
    })();
  }, [token]);

  const confirm = async () => {
    if (!token) return;
    setState("submitting");
    try {
      const res = await fetch(
        `${SUPABASE_URL}/functions/v1/handle-email-unsubscribe`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY },
          body: JSON.stringify({ token }),
        }
      );
      const data = await res.json();
      if (data.success) setState("success");
      else if (data.reason === "already_unsubscribed") setState("already");
      else setState("error");
    } catch {
      setState("error");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle>Email preferences</CardTitle>
          <CardDescription>Manage notifications from MaximumAI</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {state === "loading" && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Validating link…
            </div>
          )}
          {state === "valid" && (
            <>
              <p className="text-sm text-muted-foreground">
                Click below to unsubscribe from lead notification emails.
              </p>
              <Button onClick={confirm} className="w-full">Confirm unsubscribe</Button>
            </>
          )}
          {state === "submitting" && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Processing…
            </div>
          )}
          {state === "success" && (
            <div className="flex items-start gap-2 text-primary">
              <CheckCircle2 className="h-5 w-5 mt-0.5" />
              <div>
                <p className="font-medium">You've been unsubscribed.</p>
                <p className="text-sm text-muted-foreground">You won't receive these emails anymore.</p>
              </div>
            </div>
          )}
          {state === "already" && (
            <div className="flex items-start gap-2 text-muted-foreground">
              <CheckCircle2 className="h-5 w-5 mt-0.5" />
              <p>You're already unsubscribed.</p>
            </div>
          )}
          {(state === "invalid" || state === "error") && (
            <div className="flex items-start gap-2 text-destructive">
              <XCircle className="h-5 w-5 mt-0.5" />
              <p>This link is invalid or has expired.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
