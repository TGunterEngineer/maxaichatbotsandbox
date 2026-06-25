import { useEffect, useRef, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Square, Zap, Clock, Coins } from "lucide-react";

const MODELS = [
  { id: "gpt-5.5", label: "GPT-5.5", speed: 1.0, costPer1k: 0.012 },
  { id: "gpt-5-mini", label: "GPT-5 Mini", speed: 0.6, costPer1k: 0.003 },
  { id: "gemini-3-pro", label: "Gemini 3 Pro", speed: 0.85, costPer1k: 0.010 },
  { id: "gemini-3-flash", label: "Gemini 3 Flash", speed: 0.35, costPer1k: 0.0008 },
  { id: "claude-4.5-sonnet", label: "Claude 4.5 Sonnet", speed: 0.9, costPer1k: 0.011 },
];

const PRESETS = [
  {
    name: "Friendly Barista",
    system: "You are BaristaBot, a warm and concise assistant for Acme Coffee Co. Help with menu, hours, wholesale.",
    prompt: "What's the difference between your single-origin Ethiopian and Colombian beans?",
  },
  {
    name: "Sales Qualifier",
    system: "You qualify inbound leads. Ask company size, budget range, and timeline in a friendly way.",
    prompt: "Hi, we're looking for a chatbot for our 40-person SaaS startup.",
  },
  {
    name: "Strict JSON",
    system: "You extract structured data. Always respond with valid JSON only. No prose.",
    prompt: "Extract name, email, and intent from: 'Hey, I'm Sarah Chen (sarah@acme.io), want a demo next week.'",
  },
];

// Deterministic-ish simulated stream
function buildResponse(prompt: string, temperature: number): string {
  const p = prompt.toLowerCase();
  if (p.includes("json") || p.includes("extract")) {
    return `\`\`\`json
{
  "name": "Sarah Chen",
  "email": "sarah@acme.io",
  "intent": "request_demo",
  "timeline": "next week",
  "confidence": 0.94
}
\`\`\`

Extracted 4 fields with high confidence. Ready to route to the sales pipeline.`;
  }
  if (p.includes("ethiopian") || p.includes("colombian") || p.includes("bean")) {
    return `Great question! Here's the quick breakdown:

**Ethiopian (Yirgacheffe)** — bright, floral, with notes of bergamot and citrus. Light roast, best as a pour-over.

**Colombian (Huila)** — balanced and smooth, with caramel and milk chocolate notes. Medium roast, plays well in espresso or drip.

If you like fruity and aromatic, go Ethiopian. If you want a crowd-pleaser, go Colombian. ${temperature > 0.7 ? "Honestly though, why not both? ☕" : ""}`;
  }
  if (p.includes("saas") || p.includes("chatbot") || p.includes("startup")) {
    return `Awesome — a 40-person SaaS team is right in our sweet spot. A few quick questions so I can point you to the right plan:

1. **Use case** — are you focused on lead capture, customer support, or both?
2. **Volume** — roughly how many website visitors per month?
3. **Timeline** — are you looking to launch in days, or evaluating for next quarter?

Once I have those, I can pull together pricing and a 15-minute demo with someone from our team.`;
  }
  return `That's an interesting prompt. ${temperature > 0.5 ? "Let me think creatively here..." : "Let me give you a focused answer."}

Based on what you've shared, I'd suggest breaking this down into three steps:
1. Define the goal clearly
2. Identify the constraints
3. Iterate on the smallest possible version first

Want me to go deeper on any of these?`;
}

export default function Playground() {
  const [system, setSystem] = useState(PRESETS[0].system);
  const [prompt, setPrompt] = useState(PRESETS[0].prompt);
  const [model, setModel] = useState(MODELS[0].id);
  const [temperature, setTemperature] = useState([0.7]);
  const [maxTokens, setMaxTokens] = useState([512]);
  const [streaming, setStreaming] = useState(false);
  const [output, setOutput] = useState("");
  const [stats, setStats] = useState<{ ms: number; tokens: number; cost: number } | null>(null);
  const abortRef = useRef(false);

  async function run() {
    if (streaming) {
      abortRef.current = true;
      return;
    }
    abortRef.current = false;
    setOutput("");
    setStats(null);
    setStreaming(true);

    const full = buildResponse(prompt, temperature[0]);
    const tokens = full.split(/(\s+)/);
    const m = MODELS.find((x) => x.id === model)!;
    const delay = Math.max(8, Math.floor(28 * m.speed));
    const start = performance.now();

    for (let i = 0; i < tokens.length; i++) {
      if (abortRef.current) break;
      await new Promise((r) => setTimeout(r, delay));
      setOutput((o) => o + tokens[i]);
    }

    const ms = performance.now() - start;
    const tokenCount = Math.ceil(full.length / 4);
    setStats({ ms, tokens: tokenCount, cost: (tokenCount / 1000) * m.costPer1k });
    setStreaming(false);
  }

  useEffect(() => () => { abortRef.current = true; }, []);

  return (
    <DashboardLayout
      title="Prompt Playground for AI Chatbots"
      description="Test system prompts, compare models, and tune temperature against simulated visitor questions in a side-by-side AI chatbot playground."
      path="/playground"
    >
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            AI Playground
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Test prompts, compare models, and tune parameters in real time.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">System Prompt</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={system}
                  onChange={(e) => setSystem(e.target.value)}
                  rows={3}
                  className="font-mono text-xs"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">User Prompt</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={4}
                />
                <Button onClick={run} className="w-full" size="lg">
                  {streaming ? (<><Square className="h-4 w-4 mr-2" /> Stop</>) : (<><Zap className="h-4 w-4 mr-2" /> Run</>)}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Response</CardTitle>
                  {stats && (
                    <div className="flex gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{stats.ms.toFixed(0)}ms</span>
                      <span>{stats.tokens} tok</span>
                      <span className="flex items-center gap-1"><Coins className="h-3 w-3" />${stats.cost.toFixed(5)}</span>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="min-h-[180px] whitespace-pre-wrap text-sm font-mono bg-muted/40 rounded-md p-3">
                  {output || <span className="text-muted-foreground italic">Output will stream here…</span>}
                  {streaming && <span className="inline-block w-2 h-4 bg-primary ml-0.5 animate-pulse" />}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm">Model</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <Select value={model} onValueChange={setModel}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MODELS.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        <div className="flex items-center justify-between gap-3 w-full">
                          <span>{m.label}</span>
                          <span className="text-xs text-muted-foreground">${m.costPer1k}/1k</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-xs">Temperature</Label>
                    <Badge variant="outline" className="text-xs">{temperature[0].toFixed(2)}</Badge>
                  </div>
                  <Slider value={temperature} onValueChange={setTemperature} min={0} max={1} step={0.05} />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-xs">Max tokens</Label>
                    <Badge variant="outline" className="text-xs">{maxTokens[0]}</Badge>
                  </div>
                  <Slider value={maxTokens} onValueChange={setMaxTokens} min={64} max={2048} step={64} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm">Presets</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {PRESETS.map((p) => (
                  <Button
                    key={p.name}
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => { setSystem(p.system); setPrompt(p.prompt); }}
                  >
                    {p.name}
                  </Button>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
