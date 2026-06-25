import { useMemo, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Database, Search, FileText, Globe } from "lucide-react";

// Simulated knowledge base chunks (would come from real vector DB)
const CHUNKS = [
  { id: "c1", source: "acmecoffee.example.com", kind: "website", text: "Acme Coffee Co. has been roasting single-origin beans in the Pacific Northwest since 2015. Our flagship stores are in Portland, Seattle, and San Francisco." },
  { id: "c2", source: "acmecoffee.example.com", kind: "website", text: "Store hours: Monday through Saturday 7am to 7pm, Sunday 8am to 4pm. All locations offer free wifi and outdoor seating." },
  { id: "c3", source: "Wholesale FAQ", kind: "website", text: "Wholesale orders ship within 48 hours of confirmation. Minimum order is 5 lbs. Free delivery on orders over $50 within the continental US." },
  { id: "c4", source: "Wholesale FAQ", kind: "website", text: "We offer net-30 terms for wholesale partners after the first three paid orders. Contact wholesale@acmecoffee.example.com to set up an account." },
  { id: "c5", source: "menu-2026.pdf", kind: "file", text: "Espresso drinks: single shot $3, double $4, cortado $4.50, cappuccino $5, latte $5.50. Add an extra shot for $1." },
  { id: "c6", source: "menu-2026.pdf", kind: "file", text: "Brewed coffee: small $3, medium $3.75, large $4.50. Cold brew $5. Nitro cold brew $6. Pour-over $6 (Ethiopian or Colombian)." },
  { id: "c7", source: "menu-2026.pdf", kind: "file", text: "Pastries: croissant $4, almond croissant $5, scone $3.50, muffin $3.50. Gluten-free options available daily." },
  { id: "c8", source: "brand-voice.md", kind: "file", text: "Brand voice is warm, knowledgeable, and never pretentious. We talk about coffee the way a good friend would — with enthusiasm but without jargon." },
  { id: "c9", source: "brand-voice.md", kind: "file", text: "Avoid words like 'artisanal', 'curated', or 'crafted'. Prefer plain language. Always thank customers and offer a clear next step." },
  { id: "c10", source: "acmecoffee.example.com", kind: "website", text: "We're GDPR compliant and never sell customer data. Our loyalty program is opt-in and stores only your email and order history." },
];

// Tokenize + cosine similarity over bag-of-words. Real but small.
function tokens(s: string): string[] {
  return s.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").split(/\s+/).filter((w) => w.length > 2);
}
function vec(s: string): Map<string, number> {
  const m = new Map<string, number>();
  for (const t of tokens(s)) m.set(t, (m.get(t) ?? 0) + 1);
  return m;
}
function cosine(a: Map<string, number>, b: Map<string, number>): number {
  let dot = 0, na = 0, nb = 0;
  for (const [k, v] of a) { na += v * v; if (b.has(k)) dot += v * b.get(k)!; }
  for (const v of b.values()) nb += v * v;
  if (!na || !nb) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

const SAMPLE_QUERIES = [
  "What are your store hours?",
  "How much is a latte?",
  "Do you offer wholesale pricing?",
  "Are you GDPR compliant?",
];

export default function RagDebugger() {
  const [query, setQuery] = useState("What are your store hours?");
  const [submitted, setSubmitted] = useState("What are your store hours?");
  const [topK, setTopK] = useState(4);

  const results = useMemo(() => {
    const qv = vec(submitted);
    const scored = CHUNKS.map((c) => ({
      ...c,
      score: cosine(qv, vec(c.text)),
    }));
    scored.sort((a, b) => b.score - a.score);
    return scored;
  }, [submitted]);

  const retrieved = results.slice(0, topK);
  const maxScore = results[0]?.score ?? 1;

  return (
    <DashboardLayout
      title="RAG Knowledge-Base Debugger"
      description="Inspect retrieval-augmented generation in action: see which knowledge-base chunks your AI chatbot pulls for each visitor query and why."
      path="/rag-debugger"
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Database className="h-6 w-6 text-primary" />
            RAG Debugger
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Inspect which knowledge-base chunks get retrieved for any query, with live similarity scores.
          </p>
        </div>

        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && setSubmitted(query)}
                  placeholder="Ask anything…"
                  className="pl-9"
                />
              </div>
              <Button onClick={() => setSubmitted(query)}>Retrieve</Button>
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-xs text-muted-foreground">Try:</span>
              {SAMPLE_QUERIES.map((q) => (
                <Button key={q} variant="outline" size="sm" className="h-7 text-xs"
                  onClick={() => { setQuery(q); setSubmitted(q); }}>
                  {q}
                </Button>
              ))}
              <div className="ml-auto flex items-center gap-2">
                <span className="text-xs text-muted-foreground">top-k</span>
                {[3, 4, 5, 8].map((k) => (
                  <Button key={k} variant={topK === k ? "default" : "outline"} size="sm"
                    className="h-7 w-9 text-xs" onClick={() => setTopK(k)}>{k}</Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Retrieved chunks ({retrieved.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {retrieved.map((c, i) => {
                const pct = (c.score / Math.max(maxScore, 0.001)) * 100;
                return (
                  <div key={c.id} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-xs">
                        <Badge variant="secondary">#{i + 1}</Badge>
                        {c.kind === "file"
                          ? <FileText className="h-3 w-3 text-muted-foreground" />
                          : <Globe className="h-3 w-3 text-muted-foreground" />}
                        <span className="text-muted-foreground">{c.source}</span>
                      </div>
                      <Badge variant={c.score > 0.3 ? "default" : "outline"} className="font-mono text-xs">
                        {c.score.toFixed(3)}
                      </Badge>
                    </div>
                    <Progress value={pct} className="h-1.5" />
                    <p className="text-sm leading-relaxed">{c.text}</p>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Generated answer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted/40 rounded-md p-3 text-sm">
                <div className="text-xs text-muted-foreground mb-1">Augmented prompt</div>
                <div className="font-mono text-xs space-y-2">
                  <div><span className="text-primary">SYSTEM:</span> Answer using only the context below.</div>
                  <div><span className="text-primary">CONTEXT:</span></div>
                  {retrieved.map((c, i) => (
                    <div key={c.id} className="pl-3 border-l-2 border-primary/30">
                      [{i + 1}] {c.text.slice(0, 80)}…
                    </div>
                  ))}
                  <div><span className="text-primary">USER:</span> {submitted}</div>
                </div>
              </div>
              <div className="border rounded-md p-3 text-sm leading-relaxed">
                <div className="text-xs text-muted-foreground mb-1">Model response</div>
                {synthesizeAnswer(submitted, retrieved)}
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="border rounded p-2">
                  <div className="text-muted-foreground">Tokens in</div>
                  <div className="font-mono font-medium">{retrieved.reduce((s, c) => s + Math.ceil(c.text.length / 4), 0) + 40}</div>
                </div>
                <div className="border rounded p-2">
                  <div className="text-muted-foreground">Chunks</div>
                  <div className="font-mono font-medium">{retrieved.length} / {CHUNKS.length}</div>
                </div>
                <div className="border rounded p-2">
                  <div className="text-muted-foreground">Top score</div>
                  <div className="font-mono font-medium">{(retrieved[0]?.score ?? 0).toFixed(3)}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}

function synthesizeAnswer(q: string, chunks: { text: string }[]): string {
  const ql = q.toLowerCase();
  if (ql.includes("hour")) return "We're open Monday through Saturday from 7am to 7pm, and Sunday from 8am to 4pm. ☕";
  if (ql.includes("latte") || ql.includes("price") || ql.includes("cost") || ql.includes("much")) return "A latte is $5.50. You can add an extra shot for $1 if you'd like it stronger.";
  if (ql.includes("wholesale")) return "Yes! Wholesale orders ship within 48 hours, the minimum is 5 lbs, and shipping is free over $50. Net-30 terms are available after three paid orders.";
  if (ql.includes("gdpr") || ql.includes("data") || ql.includes("privacy")) return "Yes, we're fully GDPR compliant. We never sell customer data, and our loyalty program only stores your email and order history — and it's opt-in.";
  return chunks[0]?.text ?? "I don't have enough context to answer that confidently.";
}
