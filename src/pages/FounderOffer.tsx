import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, Zap, MessageSquareText, Gauge } from "lucide-react";
import { FounderOfferCard } from "@/components/FounderOfferCard";

export default function FounderOffer() {
  useEffect(() => {
    document.title = "Founding Partner Offer — MaximumAI";
    const meta = document.querySelector('meta[name="description"]');
    const content =
      "Lifetime founder pricing for the first 10 businesses. 24/7 AI sales assistant with SMS hot-lead alerts.";
    if (meta) meta.setAttribute("content", content);
    else {
      const m = document.createElement("meta");
      m.name = "description";
      m.content = content;
      document.head.appendChild(m);
    }
  }, []);

  const scrollToCheckout = () => {
    document.getElementById("checkout")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <main className="min-h-screen bg-[#0a0a0f] text-white">
      {/* HERO */}
      <section className="relative overflow-hidden px-6 pt-20 pb-24 sm:pt-28">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.12),transparent_60%)]"
        />
        <div className="relative mx-auto max-w-4xl text-center">
          <div className="inline-flex items-center rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-300">
            [Limited Release: 10 Lifetime Partner Slots]
          </div>

          <h1 className="mt-8 text-balance text-4xl font-bold tracking-tight sm:text-6xl">
            The 24/7 AI Sales Assistant That{" "}
            <span className="bg-gradient-to-r from-emerald-300 to-cyan-300 bg-clip-text text-transparent">
              Never Breaks Character.
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/70">
            Stop letting high-intent website traffic slip through traditional email contact forms.
            Turn anonymous web clicks into instant hot-lead text alerts sent straight to your
            personal cell phone in under 90 seconds.
          </p>

          <Button
            onClick={scrollToCheckout}
            size="lg"
            className="mt-10 bg-gradient-to-r from-emerald-400 to-cyan-400 px-8 text-[#0a0a0f] hover:opacity-90"
          >
            Secure Your Lifetime Founder Slot Now
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </section>

      {/* PROBLEM */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-3xl rounded-2xl border border-white/10 bg-white/[0.02] p-10">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Your Website is Leaking Revenue. Here is the Math.
          </h2>
          <p className="mt-6 text-white/70 leading-relaxed">
            Most of your high-ticket traffic hits your website when your front desk is busy or
            clocked out. If an interested prospect has a quick question and their only option is
            a sterile contact form, they leave within 90 seconds, click your closest competitor,
            and book with whoever answers first. MaximumAI answers instantly, hooks their
            details, and alerts you via SMS immediately.
          </p>
        </div>
      </section>

      {/* FEATURES */}
      <section className="px-6 py-20">
        <div className="mx-auto grid max-w-5xl gap-6 sm:grid-cols-3">
          {[
            {
              icon: Zap,
              title: "60-Second Ingestion",
              body: "Automatically scrapes your existing website and Google Business profile to learn your hours, pricing, and services instantly.",
            },
            {
              icon: MessageSquareText,
              title: "Twilio Hot-Lead Alerts",
              body: "Bypasses slow email backlogs. Fires a text directly to your cell phone the second a visitor leaves their contact info.",
            },
            {
              icon: Gauge,
              title: "Edge-Streaming Widget",
              body: "Lightning-fast, zero-lag custom chat interface designed to protect your mobile load speeds and SEO.",
            },
          ].map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="rounded-xl border border-white/10 bg-white/[0.03] p-6 transition-colors hover:border-emerald-400/30"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-400/10 text-emerald-300">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-5 text-lg font-semibold">{title}</h3>
              <p className="mt-2 text-sm text-white/65 leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CHECKOUT */}
      <section id="checkout" className="px-6 pb-28 pt-12 scroll-mt-16">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Secure Your Competitive Edge. No Monthly Fees.
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-white/70">
            We are taking exactly 10 businesses as lifetime partners to stress-test our system
            concurrency before launching our public monthly tiers ($199/mo). Secure your slot
            below.
          </p>
        </div>

        <div className="mt-12">
          <FounderOfferCard />
        </div>
      </section>
    </main>
  );
}
