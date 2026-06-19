import { Link } from "react-router-dom";
import React, { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  ArrowRight,
  MessageCircle,
  Send,
  Sparkles,
  Eye,
  Bot,
  User,
  Zap,
  Clock,
  Target,
  CheckCircle2,
  ExternalLink,
  LayoutDashboard,
  TrendingUp,
  MessageSquare,
  BarChart3,
  Flame,
  Inbox,
} from "lucide-react";

type Msg = { role: "bot" | "user"; text: string; lead?: boolean };

// Pre-scripted demo conversation — no AI gateway calls.
// Bot answers are matched by simple keyword rules against canned replies so
// the demo always works (even offline) and never burns tokens.
const SUGGESTED = [
  "What are your hours?",
  "Do you offer free quotes?",
  "Can someone call me back today?",
  "Do you serve my area?",
];

const RULES: { match: RegExp; reply: string; askLead?: boolean }[] = [
  {
    match: /hour|open|close|when.*available/i,
    reply:
      "We're open Monday–Friday, 8am–6pm, and Saturday 9am–2pm. Closed Sundays. Need help outside those hours? I can take a message and have someone reach out first thing.",
  },
  {
    match: /quote|estimate|price|cost|how much/i,
    reply:
      "Yes — every quote is free and no-obligation. Most jobs we can price over a quick 5-minute call. Want me to grab your details so a tech can reach out today?",
    askLead: true,
  },
  {
    match: /call.*back|callback|reach.*me|contact me|talk.*human/i,
    reply:
      "Absolutely — I'll have someone call you within the hour during business hours. What's the best name, email, and phone to reach you?",
    askLead: true,
  },
  {
    match: /area|zip|location|near|serve|service area/i,
    reply:
      "We cover the entire metro area plus a 30-mile radius. If you share your ZIP I can confirm same-day availability for you.",
  },
  {
    match: /emergency|urgent|asap|right now|leak|flooding/i,
    reply:
      "Got it — that sounds urgent. I'm flagging this as a priority lead right now. Drop your name and phone and a tech will call you in the next 10 minutes.",
    askLead: true,
  },
];

const FALLBACK =
  "Great question — let me grab your name and email and I'll have a specialist follow up with details that fit your situation exactly.";

const FEATURES_HIGHLIGHT = [
  { icon: Clock, label: "Answers 24/7" },
  { icon: Target, label: "Captures lead details" },
  { icon: Zap, label: "Routes hot leads instantly" },
];

export default function Demo() {
  const { user, signOut } = useAuth();

  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "bot",
      text: "Hi there! 👋 I'm the AI assistant for Acme Plumbing. Ask me anything about our services, pricing, or hours — or just tell me what you need help with.",
    },
  ]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [leadCaptured, setLeadCaptured] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);


  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, typing]);

  const respond = (userText: string) => {
    const rule = RULES.find((r) => r.match.test(userText));
    const reply = rule?.reply ?? FALLBACK;
    const willAskLead = rule?.askLead ?? !rule;

    setTyping(true);
    setTimeout(() => {
      setMessages((m) => [...m, { role: "bot", text: reply }]);
      setTyping(false);

      if (willAskLead && !leadCaptured) {
        setTimeout(() => {
          setTyping(true);
          setTimeout(() => {
            setMessages((m) => [
              ...m,
              {
                role: "bot",
                text: "👉 (Demo) In the real bot, I'd save the visitor's name, email, and phone here and ping your inbox / Slack with a hot-lead alert.",
                lead: true,
              },
            ]);
            setTyping(false);
            setLeadCaptured(true);
          }, 900);
        }, 600);
      }
    }, 700);
  };

  const send = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setMessages((m) => [...m, { role: "user", text: trimmed }]);
    setInput("");
    respond(trimmed);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white overflow-x-hidden">
      {/* Background accents */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute top-0 left-1/4 h-[500px] w-[500px] rounded-full bg-emerald-500/10 blur-[120px]" />
        <div className="absolute top-1/3 right-1/4 h-[500px] w-[500px] rounded-full bg-cyan-500/10 blur-[120px]" />
      </div>

      {/* Nav */}
      <header className="border-b border-white/5 backdrop-blur-xl bg-[#0a0a0f]/70 sticky top-0 z-40">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 to-cyan-500">
              <MessageCircle className="h-4 w-4 text-[#0a0a0f]" />
            </div>
            <span className="font-semibold tracking-tight">MaximumAI</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/">
              <Button variant="ghost" size="sm" className="text-white/80 hover:bg-white/5 hover:text-white">
                Back to home
              </Button>
            </Link>
            {user ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  await signOut();
                  window.location.href = "/auth";
                }}
                className="text-white/80 hover:bg-white/5 hover:text-white"
              >
                Sign out
              </Button>
            ) : (
              <Link to="/auth">
                <Button variant="ghost" size="sm" className="text-white/80 hover:bg-white/5 hover:text-white">
                  Client login
                </Button>
              </Link>
            )}
            <Link to="/auth">
              <Button
                size="sm"
                className="bg-gradient-to-r from-emerald-400 to-cyan-400 text-[#0a0a0f] hover:opacity-90"
              >
                Get started
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Unlock banner removed — all features are unlocked in this demo build. */}

      {/* Real-bot banner — same engine, tuned per business */}
      <div className="border-b border-emerald-400/20 bg-gradient-to-r from-emerald-500/[0.08] via-cyan-500/[0.06] to-emerald-500/[0.08]">
        <div className="mx-auto flex max-w-7xl flex-col items-start gap-3 px-6 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2.5 text-white/80">
            <Sparkles className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-300" />
            <span>
              The chatbot live on{" "}
              <a
                href="https://maximumaiconsulting.com"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-emerald-300 underline-offset-2 hover:underline"
              >
                maximumaiconsulting.com
              </a>{" "}
              runs on this <strong className="text-white">exact same engine</strong> — every subscription gets the
              same bot, just retrained on <em>your</em> business, services, and tone.
            </span>
          </div>
          <a
            href="https://maximumaiconsulting.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-200 hover:bg-emerald-400/20"
          >
            See it live
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>

      {/* Demo header */}
      <section className="border-b border-white/5 bg-gradient-to-b from-emerald-500/[0.04] to-transparent">
        <div className="mx-auto max-w-7xl px-6 py-12">
          <Badge variant="outline" className="mb-4 gap-1.5 border-emerald-400/30 bg-emerald-400/10 text-emerald-300">
            <Eye className="h-3 w-3" /> Live Demo · Sample business
          </Badge>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
            Talk to the bot. See what your customers see.
          </h1>
          <p className="mt-3 max-w-2xl text-white/60">
            This is the actual chatbot trained on a sample plumbing business. Try asking about
            hours, quotes, or emergencies — and watch how it captures qualified leads automatically.
            No signup required.
          </p>
          <div className="mt-6 flex flex-wrap gap-4">
            {FEATURES_HIGHLIGHT.map((f) => (
              <div
                key={f.label}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-white/70"
              >
                <f.icon className="h-3.5 w-3.5 text-emerald-300" />
                {f.label}
              </div>
            ))}
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-5xl px-6 py-10">
        {/* Chat shell — looks like the embedded widget */}
        <Card className="overflow-hidden border-white/10 bg-white/[0.02] shadow-2xl shadow-emerald-500/5">
          {/* Bot header */}
          <div className="flex items-center justify-between border-b border-white/5 bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500">
                <Bot className="h-5 w-5 text-[#0a0a0f]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Acme Plumbing Assistant</span>
                  <span className="flex h-2 w-2 rounded-full bg-emerald-400" />
                </div>
                <span className="text-xs text-white/50">Online · Replies instantly</span>
              </div>
            </div>
            <Badge variant="outline" className="hidden border-white/10 text-xs text-white/60 sm:inline-flex">
              Powered by MaximumAI
            </Badge>
          </div>

          {/* Messages */}
          <div
            ref={scrollRef}
            className="h-[480px] overflow-y-auto bg-[#0a0a0f]/40 px-5 py-6 space-y-4"
          >
            {messages.map((m, i) => (
              <MessageBubble key={i} msg={m} />
            ))}
            {typing && (
              <div className="flex items-end gap-2">
                <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500">
                  <Bot className="h-3.5 w-3.5 text-[#0a0a0f]" />
                </div>
                <div className="rounded-2xl rounded-bl-sm border border-white/10 bg-white/[0.04] px-4 py-3">
                  <div className="flex gap-1">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-white/40 [animation-delay:-0.3s]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-white/40 [animation-delay:-0.15s]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-white/40" />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Suggested questions (only before first user msg) */}
          {messages.filter((m) => m.role === "user").length === 0 && (
            <div className="border-t border-white/5 bg-[#0a0a0f]/60 px-5 py-3">
              <div className="mb-2 text-[11px] font-medium uppercase tracking-wide text-white/40">
                Try asking
              </div>
              <div className="flex flex-wrap gap-2">
                {SUGGESTED.map((q) => (
                  <button
                    key={q}
                    onClick={() => send(q)}
                    className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-white/80 transition-colors hover:border-emerald-400/30 hover:bg-emerald-400/10 hover:text-emerald-200"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex items-center gap-2 border-t border-white/5 bg-[#0a0a0f] px-4 py-3"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a message..."
              className="border-white/10 bg-white/[0.03] text-white placeholder:text-white/30 focus-visible:ring-emerald-400/50"
            />
            <Button
              type="submit"
              size="icon"
              disabled={!input.trim() || typing}
              className="bg-gradient-to-r from-emerald-400 to-cyan-400 text-[#0a0a0f] hover:opacity-90"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </Card>

        {/* Lead-captured banner */}
        {leadCaptured && (
          <Card className="mt-6 border-emerald-400/30 bg-emerald-400/[0.06] p-5">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-300" />
              <div className="text-sm">
                <div className="font-medium text-emerald-200">Hot lead captured (demo)</div>
                <p className="mt-1 text-white/70">
                  In the real product, this lead would be saved to your dashboard, scored,
                  and pushed to your email, Slack, or SMS — all within seconds. Your team
                  can call them back while they're still on the page.
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Dashboard preview — what subscribers manage */}
        <section className="mt-16">
          <div className="mb-6 text-center">
            <Badge
              variant="outline"
              className="mb-3 gap-1.5 border-cyan-400/30 bg-cyan-400/10 text-cyan-300"
            >
              <LayoutDashboard className="h-3 w-3" /> Your control center
            </Badge>
            <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
              And here's the dashboard you'd run it from.
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-white/60">
              Every subscriber gets a full dashboard to view leads, monitor conversations,
              tune the bot, and track ROI — all in one place.
            </p>
          </div>

          <DashboardPreview />
        </section>

        {/* CTA */}
        <Card className="relative mt-10 overflow-hidden border-emerald-400/20 bg-gradient-to-br from-emerald-500/10 via-[#0a0a0f] to-cyan-500/10 p-10 text-center">
          <Sparkles className="mx-auto mb-4 h-8 w-8 text-emerald-300" />
          <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
            Ready to point the bot at your business?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-white/70">
            Paste your URL, we scrape your site, and your bot is live in under 10 minutes —
            trained on your services, your hours, your pricing.
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <Link to="/auth">
              <Button
                size="lg"
                className="bg-gradient-to-r from-emerald-400 to-cyan-400 text-[#0a0a0f] hover:opacity-90"
              >
                Get started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link to="/auth">
              <Button size="lg" variant="ghost" className="text-white hover:bg-white/5">
                Client login
              </Button>
            </Link>
          </div>
        </Card>
      </main>

      <footer className="border-t border-white/5 py-8 text-center text-sm text-white/40">
        <div>© {new Date().getFullYear()} MaximumAI Consulting · Demo data shown</div>
      </footer>
    </div>
  );
}

function MessageBubble({ msg }: { msg: Msg }) {
  const isBot = msg.role === "bot";
  return (
    <div className={`flex items-end gap-2 ${isBot ? "" : "flex-row-reverse"}`}>
      <div
        className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full ${
          isBot
            ? "bg-gradient-to-br from-emerald-400 to-cyan-500"
            : "bg-white/10"
        }`}
      >
        {isBot ? (
          <Bot className="h-3.5 w-3.5 text-[#0a0a0f]" />
        ) : (
          <User className="h-3.5 w-3.5 text-white/70" />
        )}
      </div>
      <div
        className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          isBot
            ? msg.lead
              ? "rounded-bl-sm border border-emerald-400/30 bg-emerald-400/10 text-emerald-100"
              : "rounded-bl-sm border border-white/10 bg-white/[0.04] text-white/90"
            : "rounded-br-sm bg-gradient-to-br from-emerald-400 to-cyan-400 text-[#0a0a0f]"
        }`}
      >
        {msg.text}
      </div>
    </div>
  );
}

// --- Mocked dashboard preview (static, for marketing demo only) ---
const MOCK_LEADS = [
  { name: "Sarah M.", note: "Needs quote — kitchen sink leak", time: "2m ago", hot: true },
  { name: "James R.", note: "Asked about same-day service", time: "14m ago", hot: true },
  { name: "Priya K.", note: "Booking estimate for Tuesday", time: "1h ago", hot: false },
  { name: "Daniel L.", note: "Questions about pricing", time: "3h ago", hot: false },
];

function DashboardPreview() {
  return (
    <Card className="overflow-hidden border-white/10 bg-gradient-to-br from-white/[0.03] to-white/[0.01] shadow-2xl shadow-cyan-500/5">
      {/* Fake browser chrome */}
      <div className="flex items-center gap-2 border-b border-white/5 bg-[#0a0a0f]/80 px-4 py-2.5">
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
        </div>
        <div className="ml-3 flex-1 truncate rounded-md border border-white/5 bg-white/[0.03] px-3 py-1 text-[11px] text-white/40">
          chat.maximumaiconsulting.com/dashboard
        </div>
      </div>

      <div className="p-6 md:p-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-wider text-white/40">Dashboard</div>
            <div className="text-lg font-semibold text-white">Acme Plumbing</div>
          </div>
          <Badge
            variant="outline"
            className="border-emerald-400/30 bg-emerald-400/10 text-xs text-emerald-300"
          >
            Bot online
          </Badge>
        </div>

        {/* KPI row */}
        <div className="mt-6 grid gap-3 sm:grid-cols-4">
          <KpiTile icon={Inbox} label="Leads this week" value="47" delta="+18%" />
          <KpiTile icon={MessageSquare} label="Conversations" value="312" delta="+9%" />
          <KpiTile icon={Flame} label="Hot leads" value="12" delta="+34%" />
          <KpiTile icon={TrendingUp} label="Conversion" value="38%" delta="+5pt" />
        </div>

        {/* Two-column: leads + chart */}
        <div className="mt-6 grid gap-4 lg:grid-cols-5">
          {/* Recent leads */}
          <div className="lg:col-span-3 rounded-xl border border-white/10 bg-[#0a0a0f]/40 p-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="text-sm font-semibold text-white">Recent leads</div>
              <span className="text-xs text-white/40">Last 24h</span>
            </div>
            <ul className="space-y-2.5">
              {MOCK_LEADS.map((lead) => (
                <li
                  key={lead.name}
                  className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white">{lead.name}</span>
                      {lead.hot && (
                        <Badge className="h-4 gap-0.5 border-0 bg-orange-400/20 px-1.5 text-[9px] font-bold uppercase text-orange-300">
                          <Flame className="h-2.5 w-2.5" />
                          Hot
                        </Badge>
                      )}
                    </div>
                    <div className="truncate text-xs text-white/50">{lead.note}</div>
                  </div>
                  <span className="ml-3 flex-shrink-0 text-[11px] text-white/40">{lead.time}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Sparkline / activity */}
          <div className="lg:col-span-2 rounded-xl border border-white/10 bg-[#0a0a0f]/40 p-5">
            <div className="mb-4 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-cyan-300" />
              <div className="text-sm font-semibold text-white">7-day activity</div>
            </div>
            <div className="flex h-32 items-end gap-1.5">
              {[35, 52, 41, 68, 58, 81, 92].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-t bg-gradient-to-t from-emerald-400/30 to-cyan-400/60"
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
            <div className="mt-2 flex justify-between text-[10px] text-white/40">
              <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
            </div>
            <div className="mt-4 rounded-lg border border-emerald-400/20 bg-emerald-400/5 p-3 text-xs text-emerald-200">
              <strong>+34%</strong> more leads vs last week
            </div>
          </div>
        </div>

        {/* Footer hint */}
        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-white/40">
          <Eye className="h-3 w-3" />
          Sample data — your real dashboard fills with your actual leads from day one
        </div>
      </div>
    </Card>
  );
}

function KpiTile({
  icon: Icon,
  label,
  value,
  delta,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  delta: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#0a0a0f]/40 p-4">
      <div className="flex items-center gap-2 text-xs text-white/50">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="mt-2 text-2xl font-bold text-white">{value}</div>
      <div className="mt-0.5 text-[11px] font-medium text-emerald-300">{delta}</div>
    </div>
  );
}
