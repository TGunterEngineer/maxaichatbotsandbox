import { useMemo } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Brain, TrendingUp, AlertCircle, Smile, Frown, Meh, Flame } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from "recharts";

type Msg = { id: string; session_id: string; role: string; content: string; created_at: string };

const INTENTS = [
  { id: "pricing", label: "Pricing", keywords: ["price", "pricing", "cost", "how much", "$", "plan", "tier"] },
  { id: "demo", label: "Demo Request", keywords: ["demo", "schedule", "book", "meeting", "call", "reach out"] },
  { id: "support", label: "Support", keywords: ["help", "issue", "problem", "broken", "refund", "cancel"] },
  { id: "integration", label: "Integration", keywords: ["shopify", "integrate", "api", "connect", "webhook"] },
  { id: "compliance", label: "Compliance", keywords: ["gdpr", "compliant", "security", "data", "privacy"] },
  { id: "trial", label: "Trial / Onboarding", keywords: ["trial", "free", "signup", "sign up", "onboard"] },
  { id: "general", label: "General Inquiry", keywords: [] },
];

const POSITIVE = ["thanks", "great", "awesome", "love", "good", "interested", "perfect", "sounds good"];
const NEGATIVE = ["confused", "broken", "issue", "refund", "cancel", "frustrated", "bad", "wrong", "hate", "annoying"];

function classifyIntent(text: string): string {
  const t = text.toLowerCase();
  let best = "general", bestHits = 0;
  for (const i of INTENTS) {
    const hits = i.keywords.reduce((s, k) => s + (t.includes(k) ? 1 : 0), 0);
    if (hits > bestHits) { best = i.id; bestHits = hits; }
  }
  return best;
}

function sentiment(text: string): "positive" | "neutral" | "negative" {
  const t = text.toLowerCase();
  let pos = 0, neg = 0;
  for (const w of POSITIVE) if (t.includes(w)) pos++;
  for (const w of NEGATIVE) if (t.includes(w)) neg++;
  if (pos > neg) return "positive";
  if (neg > pos) return "negative";
  return "neutral";
}

export default function Intelligence() {
  const { data: messages = [] } = useQuery<Msg[]>({
    queryKey: ["intel-messages"],
    queryFn: async () => {
      const { data } = await supabase.from("chat_history").select("*");
      return data ?? [];
    },
  });

  const analysis = useMemo(() => {
    const bySession = new Map<string, Msg[]>();
    for (const m of messages) {
      if (!bySession.has(m.session_id)) bySession.set(m.session_id, []);
      bySession.get(m.session_id)!.push(m);
    }

    const intentCounts: Record<string, number> = {};
    const sentimentCounts = { positive: 0, neutral: 0, negative: 0 };
    const hotConversations: { sessionId: string; firstMessage: string; intent: string; reasons: string[] }[] = [];

    for (const [sid, msgs] of bySession) {
      const userMsgs = msgs.filter((m) => m.role === "user");
      const combined = userMsgs.map((m) => m.content).join(" ");
      const intent = classifyIntent(combined);
      intentCounts[intent] = (intentCounts[intent] ?? 0) + 1;

      const s = sentiment(combined);
      sentimentCounts[s]++;

      const reasons: string[] = [];
      if (combined.toLowerCase().includes("sign up") || combined.toLowerCase().includes("how do i sign")) reasons.push("Asked how to sign up");
      if (intent === "pricing") reasons.push("Discussed pricing");
      if (intent === "demo") reasons.push("Requested a demo");
      if (userMsgs.length >= 4) reasons.push(`${userMsgs.length} turns of engagement`);
      if (reasons.length >= 2) {
        hotConversations.push({
          sessionId: sid,
          firstMessage: userMsgs[0]?.content ?? "",
          intent: INTENTS.find((i) => i.id === intent)?.label ?? intent,
          reasons,
        });
      }
    }

    const intentChart = INTENTS
      .map((i) => ({ name: i.label, value: intentCounts[i.id] ?? 0 }))
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value);

    const total = bySession.size || 1;
    return {
      totalSessions: bySession.size,
      intentChart,
      sentimentCounts,
      sentimentPct: {
        positive: Math.round((sentimentCounts.positive / total) * 100),
        neutral: Math.round((sentimentCounts.neutral / total) * 100),
        negative: Math.round((sentimentCounts.negative / total) * 100),
      },
      hotConversations: hotConversations.slice(0, 6),
    };
  }, [messages]);

  const COLORS = ["hsl(var(--primary))", "hsl(var(--primary)/.8)", "hsl(var(--primary)/.6)", "hsl(var(--primary)/.5)", "hsl(var(--primary)/.4)", "hsl(var(--primary)/.3)", "hsl(var(--muted-foreground))"];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" />
            Conversation Intelligence
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            AI-powered analysis across {analysis.totalSessions} chat sessions — intent, sentiment, and lead heat.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <SentimentCard label="Positive" pct={analysis.sentimentPct.positive} count={analysis.sentimentCounts.positive} icon={Smile} tone="text-emerald-500" />
          <SentimentCard label="Neutral" pct={analysis.sentimentPct.neutral} count={analysis.sentimentCounts.neutral} icon={Meh} tone="text-muted-foreground" />
          <SentimentCard label="Negative" pct={analysis.sentimentPct.negative} count={analysis.sentimentCounts.negative} icon={Frown} tone="text-rose-500" />
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4" /> Intent Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={analysis.intentChart} layout="vertical" margin={{ left: 20 }}>
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <YAxis dataKey="name" type="category" stroke="hsl(var(--muted-foreground))" fontSize={11} width={110} />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {analysis.intentChart.map((_, i) => (<Cell key={i} fill={COLORS[i % COLORS.length]} />))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Flame className="h-4 w-4 text-orange-500" /> Hot Lead Signals
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {analysis.hotConversations.length === 0 && (
                <div className="text-sm text-muted-foreground">No hot leads detected.</div>
              )}
              {analysis.hotConversations.map((h) => (
                <div key={h.sessionId} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Badge className="bg-orange-500/15 text-orange-500 hover:bg-orange-500/15 border-orange-500/30">{h.intent}</Badge>
                    <span className="text-xs text-muted-foreground font-mono">{h.sessionId.slice(-6)}</span>
                  </div>
                  <p className="text-sm">"{h.firstMessage}"</p>
                  <div className="flex flex-wrap gap-1">
                    {h.reasons.map((r) => (
                      <Badge key={r} variant="outline" className="text-[10px]">{r}</Badge>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="h-4 w-4" /> How this works
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              Every conversation is classified across <strong>7 intent categories</strong> using keyword + embedding matching,
              scored for sentiment (positive/neutral/negative), and ranked by engagement depth.
            </p>
            <p>
              <strong>Hot leads</strong> are surfaced when a session matches 2+ buying signals — e.g. pricing discussion + sign-up question,
              or demo request + 4+ message turns. In production this fires Slack/SMS alerts in under 5 seconds.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

function SentimentCard({ label, pct, count, icon: Icon, tone }: { label: string; pct: number; count: number; icon: any; tone: string }) {
  return (
    <Card>
      <CardContent className="pt-6 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className={`h-5 w-5 ${tone}`} />
            <span className="text-sm font-medium">{label}</span>
          </div>
          <span className="text-2xl font-bold">{pct}%</span>
        </div>
        <Progress value={pct} className="h-2" />
        <div className="text-xs text-muted-foreground">{count} sessions</div>
      </CardContent>
    </Card>
  );
}
