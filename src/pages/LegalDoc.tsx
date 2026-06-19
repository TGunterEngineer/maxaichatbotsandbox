import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ShieldCheck, ScrollText, Mail, Lock, Globe2, FileText, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";

type Section = {
  id: string;
  title: string;
  body: React.ReactNode;
};

const lastUpdated = new Date().toLocaleDateString(undefined, {
  year: "numeric",
  month: "long",
  day: "numeric",
});

/* ---------------------------------------------------------------- */
/*  Privacy                                                         */
/* ---------------------------------------------------------------- */
const privacySections: Section[] = [
  {
    id: "who-we-are",
    title: "1. Who we are",
    body: (
      <>
        <p>
          MaximumAI Consulting ("we", "us", "our") provides AI chatbot software and services
          that our clients embed on their own websites. This Privacy Policy explains how we
          handle data collected through our platform at chat.maximumaiconsulting.com.
        </p>
        <p className="mt-3">
          For data submitted by visitors to our clients' chatbots (chat messages and lead
          contact details), <strong className="text-white/90">we act as a data
          processor</strong> on behalf of our client (the data controller). For data about
          our own account holders, we act as a data controller. See section 14 for our DPA
          terms.
        </p>
        <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.04] p-4 text-sm">
          <p className="font-semibold text-white/90">Business identity (California disclosure)</p>
          <ul className="mt-2 space-y-1 text-white/70">
            <li><strong className="text-white/85">Legal entity:</strong> [LEGAL ENTITY NAME], a California [sole proprietorship / LLC / corporation]</li>
            <li><strong className="text-white/85">Doing business as:</strong> MaximumAI Consulting</li>
            <li><strong className="text-white/85">Business address:</strong> [STREET], [CITY], CA [ZIP], USA</li>
            <li><strong className="text-white/85">Contact:</strong> <a className="text-emerald-300 underline-offset-4 hover:underline" href="mailto:support@maximumaiconsulting.com">support@maximumaiconsulting.com</a></li>
            <li><strong className="text-white/85">Privacy / data requests:</strong> <a className="text-emerald-300 underline-offset-4 hover:underline" href="mailto:privacy@maximumaiconsulting.com">privacy@maximumaiconsulting.com</a></li>
          </ul>
          <p className="mt-3 text-xs text-white/50">
            Replace bracketed fields with your registered entity name, structure, and California business address before publishing.
          </p>
        </div>
      </>
    ),
  },
  {
    id: "data-we-collect",
    title: "2. Data we collect",
    body: (
      <ul className="space-y-2 list-disc pl-5">
        <li><strong className="text-white/90">Account data</strong> — name, email, business name, hashed password, organization role.</li>
        <li><strong className="text-white/90">Chat conversations</strong> — messages exchanged with chatbots you operate, session IDs, timestamps, originating IP (rate-limit only, not stored long-term).</li>
        <li><strong className="text-white/90">Lead information</strong> — contact details (name, email, phone, preferred time, free-text notes) shared by visitors with your bot.</li>
        <li><strong className="text-white/90">Knowledge base content</strong> — text, URLs, and uploaded documents you provide to train your bot.</li>
        <li><strong className="text-white/90">Usage data</strong> — message counts, lead counts, AI token usage per billing period.</li>
        <li><strong className="text-white/90">Payment data</strong> — handled by Stripe; we receive only the customer ID, plan tier, and subscription status. We never see or store full card numbers.</li>
        <li><strong className="text-white/90">Email logs</strong> — delivery status of transactional emails (e.g. lead alerts, password resets).</li>
        <li><strong className="text-white/90">Cookies</strong> — see section 6.</li>
      </ul>
    ),
  },
  {
    id: "how-we-use",
    title: "3. How we use it",
    body: (
      <ul className="space-y-2 list-disc pl-5">
        <li>Operate the chatbot service and deliver responses to website visitors.</li>
        <li>Notify you of new leads and conversations.</li>
        <li>Bill you for usage and prevent abuse (rate limiting, fraud detection).</li>
        <li>Send transactional emails (account, billing, security).</li>
        <li>Improve our product in aggregate (anonymized analytics, never sold).</li>
      </ul>
    ),
  },
  {
    id: "legal-basis",
    title: "4. Legal basis (GDPR)",
    body: (
      <ul className="space-y-2 list-disc pl-5">
        <li><strong className="text-white/90">Contract</strong> — operating the Service you signed up for.</li>
        <li><strong className="text-white/90">Legal obligation</strong> — tax records, fraud prevention, lawful requests.</li>
        <li><strong className="text-white/90">Legitimate interests</strong> — security, abuse prevention, product improvement (balanced against your rights).</li>
        <li><strong className="text-white/90">Consent</strong> — only where required (e.g. optional marketing emails). You may withdraw consent at any time.</li>
      </ul>
    ),
  },
  {
    id: "sharing",
    title: "5. Sharing & sub-processors",
    body: (
      <>
        <p>
          We share data only with the infrastructure providers required to run the Service.
          We do not sell your data and do not use chat content for advertising or to train
          third-party AI models.
        </p>
        <p className="mt-3 text-white/80">Current sub-processors:</p>
        <ul className="space-y-2 list-disc pl-5 mt-2">
          <li><strong className="text-white/90">Supabase</strong> — hosting, database, authentication, file storage (United States).</li>
          <li><strong className="text-white/90">Stripe</strong> — payment processing (United States, Ireland).</li>
          <li><strong className="text-white/90">Lovable AI Gateway</strong> — LLM inference routing to Google & OpenAI models (United States, EU).</li>
          <li><strong className="text-white/90">Email infrastructure provider</strong> — transactional email delivery via notify.social.maximumaiconsulting.com (United States).</li>
          <li><strong className="text-white/90">Cloudflare</strong> — DNS and CDN (global).</li>
        </ul>
        <p className="mt-3 text-sm text-white/60">
          We will give you reasonable notice before adding or replacing a sub-processor that
          materially affects your data.
        </p>
      </>
    ),
  },
  {
    id: "cookies",
    title: "6. Cookies & tracking",
    body: (
      <>
        <p>
          Our dashboard uses essential cookies for authentication and session management
          (Supabase auth tokens). These cannot be disabled without breaking the Service.
        </p>
        <p className="mt-3">
          Our embedded chat widget uses a single in-memory session ID per browser tab and
          does not set tracking cookies. We do not use third-party advertising trackers,
          analytics pixels, or behavioural profiling.
        </p>
      </>
    ),
  },
  {
    id: "ai-processing",
    title: "7. Automated processing & AI",
    body: (
      <p>
        Our chatbot generates responses using large language models (currently Google Gemini
        and OpenAI GPT, accessed via Lovable AI Gateway). Visitor messages are sent to these
        providers for the sole purpose of generating a reply and are not retained by them
        for training. Responses are automated; no individual decision producing legal or
        similarly significant effects on a visitor is made by the bot. Visitors should not
        rely on the bot for legal, medical, financial, or safety advice.
      </p>
    ),
  },
  {
    id: "your-rights",
    title: "8. Your rights (GDPR / UK GDPR / CCPA / CPRA)",
    body: (
      <>
        <p>You have the right to:</p>
        <ul className="space-y-2 list-disc pl-5 mt-3">
          <li>Access the personal data we hold about you.</li>
          <li>Correct inaccurate data.</li>
          <li>Request deletion ("right to be forgotten").</li>
          <li>Export your data in a machine-readable format (portability).</li>
          <li>Restrict or object to certain processing.</li>
          <li>Withdraw consent where consent is the legal basis.</li>
        </ul>
        <p className="mt-4 font-semibold text-white/90">California residents (CCPA / CPRA — Cal. Civ. Code §1798.100 et seq.)</p>
        <ul className="space-y-2 list-disc pl-5 mt-2">
          <li><strong className="text-white/90">Right to know</strong> — the categories and specific pieces of personal information we collect, the sources, the business purposes, and the categories of third parties we share with.</li>
          <li><strong className="text-white/90">Right to delete</strong> — request deletion of personal information we collected from you, subject to statutory exceptions.</li>
          <li><strong className="text-white/90">Right to correct</strong> inaccurate personal information.</li>
          <li><strong className="text-white/90">Right to opt out of "sale" or "sharing"</strong> — we do not sell or share personal information for cross-context behavioural advertising. No "Do Not Sell or Share My Personal Information" link is required because no sale or sharing occurs.</li>
          <li><strong className="text-white/90">Right to limit use of sensitive personal information</strong> — we do not use sensitive PI for purposes beyond those permitted under CPRA §1798.121.</li>
          <li><strong className="text-white/90">Right to non-discrimination</strong> for exercising any CCPA/CPRA right.</li>
          <li><strong className="text-white/90">Right to an authorized agent</strong> — you may designate an agent to submit requests on your behalf, subject to verification.</li>
          <li>
            <strong className="text-white/90">"Notice at Collection"</strong> — categories of PI collected: identifiers, commercial information, internet/network activity, geolocation (approximate, from IP), professional information, and inferences. Purposes: providing the Service, billing, security, and support. Retention: per section 9 below. We do <strong className="text-white/90">not</strong> sell or share PI and do <strong className="text-white/90">not</strong> use sensitive PI for inferring characteristics.
          </li>
        </ul>
        <p className="mt-4 font-semibold text-white/90">California "Shine the Light" (Cal. Civ. Code §1798.83)</p>
        <p className="mt-2">
          California residents may request, once per calendar year, a list of the categories of personal information we disclosed to third parties for those third parties' direct marketing purposes during the prior calendar year. <strong className="text-white/90">We do not disclose personal information to third parties for their direct marketing purposes.</strong> Requests: <a className="text-emerald-300 underline-offset-4 hover:underline" href="mailto:privacy@maximumaiconsulting.com">privacy@maximumaiconsulting.com</a> with subject "Shine the Light Request".
        </p>
        <p className="mt-4 font-semibold text-white/90">Minors — California "Online Eraser" right (Cal. Bus. &amp; Prof. Code §22581)</p>
        <p className="mt-2">
          California residents under 18 who are registered users may request removal of content or information they posted on the Service by emailing <a className="text-emerald-300 underline-offset-4 hover:underline" href="mailto:privacy@maximumaiconsulting.com">privacy@maximumaiconsulting.com</a>. Removal does not ensure complete or comprehensive removal where, for example, content has been republished by third parties or where retention is required by law.
        </p>
        <p className="mt-4 font-semibold text-white/90">CalOPPA &amp; "Do Not Track" signals</p>
        <p className="mt-2">
          In compliance with the California Online Privacy Protection Act (Cal. Bus. &amp; Prof. Code §22575 et seq.): we disclose the categories of PI collected and the third parties with whom we share it (above and section 5), our process for notifying users of material changes (section 15), and the effective date of this policy (top of page). Because there is no consistent industry standard for "Do Not Track" (DNT) browser signals, <strong className="text-white/90">our Service does not currently respond to DNT signals</strong>. We do not track users across third-party websites for advertising purposes.
        </p>
        <p className="mt-4">
          Exercise any right by emailing{" "}
          <a className="text-emerald-300 underline-offset-4 hover:underline" href="mailto:privacy@maximumaiconsulting.com">
            privacy@maximumaiconsulting.com
          </a>
          . We will respond within 30 days (GDPR) or 45 days (CCPA / CPRA), with one 45-day extension where reasonably necessary.
        </p>
        <p className="mt-3">
          You also have the right to lodge a complaint with your local data protection
          supervisory authority (e.g. the ICO in the UK, your national DPA in the EU, or
          the California Attorney General's office in the US).
        </p>
      </>
    ),
  },
  {
    id: "retention",
    title: "9. Data retention",
    body: (
      <ul className="space-y-2 list-disc pl-5">
        <li><strong className="text-white/90">Chat conversations</strong> — purged after 30 days (automated daily cleanup).</li>
        <li><strong className="text-white/90">Leads</strong> — retained for the lifetime of your account; deletable on request.</li>
        <li><strong className="text-white/90">Account & billing records</strong> — retained for up to 7 years after account closure to meet tax and accounting obligations.</li>
        <li><strong className="text-white/90">Email send logs</strong> — 90 days.</li>
        <li><strong className="text-white/90">Backups</strong> — rotated within 60 days.</li>
        <li>Cancelled accounts have all live data purged within 30 days of cancellation, except where retention is legally required.</li>
      </ul>
    ),
  },
  {
    id: "security",
    title: "10. Security & breach notification",
    body: (
      <>
        <p>
          <strong className="text-white/90">Reasonable security (Cal. Civ. Code §1798.81.5).</strong> We implement and maintain reasonable security procedures and practices appropriate to the nature of the personal information we handle. These include TLS 1.2+ encryption in transit, AES-256 encryption at rest, PostgreSQL Row-Level Security policies isolating each organization, bcrypt-hashed passwords, email verification, rate limiting, least-privilege access, audit logging, and routine vulnerability review. No system is 100% secure.
        </p>
        <p className="mt-3">
          <strong className="text-white/90">Breach notification (Cal. Civ. Code §1798.82 &amp; GDPR Art. 33–34).</strong> If we discover a breach of the security of the system that resulted in, or is reasonably believed to have resulted in, the unauthorized acquisition of unencrypted personal information of a California resident, we will notify the affected resident in the most expedient time possible and without unreasonable delay, consistent with the legitimate needs of law enforcement and any measures necessary to determine the scope and restore reasonable integrity. Notice will be provided by email to the address on file (or by substitute notice as permitted by §1798.82(j)) and will describe the incident, the categories of information involved, and the steps taken or recommended in response. Where GDPR applies, we will additionally notify the relevant supervisory authority within 72 hours of becoming aware.
        </p>
      </>
    ),
  },
  {
    id: "international",
    title: "11. International data transfers",
    body: (
      <p>
        Your data may be processed in the United States and other countries where our
        sub-processors operate. For transfers from the EEA, UK, or Switzerland, we rely on
        the European Commission's Standard Contractual Clauses (SCCs) and the UK
        International Data Transfer Addendum. A copy is available on request.
      </p>
    ),
  },
  {
    id: "client-obligations",
    title: "12. Notice to website visitors (controller obligation)",
    body: (
      <p>
        If you embed our chat widget on your site, <strong className="text-white/90">you
        are the data controller</strong> for the visitors who interact with it. You are
        responsible for informing your visitors that an AI chatbot is in use, what data is
        collected, and your own legal basis for collecting it (typically via your own
        privacy notice). We provide the processing infrastructure; you provide the notice.
      </p>
    ),
  },
  {
    id: "children",
    title: "13. Children",
    body: (
      <p>
        The Service is not directed to children under 16; we do not knowingly collect
        their personal data. If you believe a child has provided us data, contact{" "}
        <a className="text-emerald-300 underline-offset-4 hover:underline" href="mailto:privacy@maximumaiconsulting.com">
          privacy@maximumaiconsulting.com
        </a>{" "}
        and we will delete it.
      </p>
    ),
  },
  {
    id: "dpa",
    title: "14. Data Processing Addendum (DPA)",
    body: (
      <p>
        For customers subject to GDPR, UK GDPR, or CCPA, this Privacy Policy together with
        the Terms of Service constitute our standard Data Processing Addendum. Key terms:
        we process visitor and lead data only on documented instructions from you (the
        controller); maintain confidentiality, security, and sub-processor controls
        described above; assist with data subject requests and DPIAs as reasonably
        required; and delete or return personal data on termination. A counter-signed DPA
        is available on request to{" "}
        <a className="text-emerald-300 underline-offset-4 hover:underline" href="mailto:privacy@maximumaiconsulting.com">
          privacy@maximumaiconsulting.com
        </a>
        .
      </p>
    ),
  },
  {
    id: "changes-privacy",
    title: "15. Changes",
    body: <p>We will post material changes here and notify account holders by email at least 14 days before they take effect.</p>,
  },
  {
    id: "ca-1789-3",
    title: "16. California consumer complaint notice (Cal. Civ. Code §1789.3)",
    body: (
      <>
        <p>
          Under California Civil Code §1789.3, California users of an online service are entitled to the following specific consumer rights notice:
        </p>
        <p className="mt-3">
          The provider of this Service is identified in section 1 above (Business identity). If you have a complaint regarding the Service, or to receive further information regarding use of the Service, please contact us at{" "}
          <a className="text-emerald-300 underline-offset-4 hover:underline" href="mailto:support@maximumaiconsulting.com">
            support@maximumaiconsulting.com
          </a>
          .
        </p>
        <p className="mt-3">
          California residents may also reach the Complaint Assistance Unit of the Division of Consumer Services of the California Department of Consumer Affairs in writing at <strong className="text-white/90">1625 North Market Blvd., Suite N 112, Sacramento, CA 95834</strong>, or by telephone at <strong className="text-white/90">(800) 952-5210</strong> or <strong className="text-white/90">(916) 445-1254</strong> (TDD <strong className="text-white/90">(800) 326-2297</strong>).
        </p>
      </>
    ),
  },
  {
    id: "contact-privacy",
    title: "17. Contact",
    body: (
      <p>
        Privacy questions, DPA requests, or rights exercises:{" "}
        <a className="text-emerald-300 underline-offset-4 hover:underline" href="mailto:privacy@maximumaiconsulting.com">
          privacy@maximumaiconsulting.com
        </a>
        . Postal address available on request.
      </p>
    ),
  },
];

/* ---------------------------------------------------------------- */
/*  Terms                                                           */
/* ---------------------------------------------------------------- */
const termsSections: Section[] = [
  {
    id: "agreement",
    title: "1. Agreement",
    body: (
      <p>
        By creating an account or using the MaximumAI Consulting platform ("Service"), you
        agree to these Terms of Service. If you do not agree, do not use the Service.
      </p>
    ),
  },
  {
    id: "service-description",
    title: "2. The Service",
    body: (
      <p>
        We provide an AI chatbot platform that lets you train a chatbot on your website
        content, embed it on your site, and capture leads. We may add, change, or remove
        features at any time.
      </p>
    ),
  },
  {
    id: "account",
    title: "3. Your account",
    body: (
      <ul className="space-y-2 list-disc pl-5">
        <li>You must provide accurate information and keep your password secure.</li>
        <li>You are responsible for all activity under your account.</li>
        <li>One person or business per account unless agreed otherwise in writing.</li>
      </ul>
    ),
  },
  {
    id: "acceptable-use",
    title: "4. Acceptable use",
    body: (
      <>
        <p>You agree NOT to use the Service to:</p>
        <ul className="space-y-2 list-disc pl-5 mt-3">
          <li>Send spam, harass users, or impersonate others.</li>
          <li>Train the bot on content you do not own or have permission to use.</li>
          <li>Attempt to bypass usage quotas, reverse-engineer the platform, or harm other users.</li>
          <li>Operate in industries that violate applicable law (e.g. illegal goods, fraud).</li>
          <li>Share your bot widget for use on websites you do not control.</li>
        </ul>
        <p className="mt-3">We may suspend or terminate accounts that violate these rules, without refund.</p>
      </>
    ),
  },
  {
    id: "billing",
    title: "5. Plans, billing & refunds",
    body: (
      <ul className="space-y-2 list-disc pl-5">
        <li>Subscriptions renew automatically until you cancel.</li>
        <li>Setup fees are non-refundable once onboarding work has begun.</li>
        <li>Monthly fees are non-refundable for partial months.</li>
        <li>You can cancel anytime — access continues through the end of your paid period.</li>
        <li>We may change pricing with 30 days' notice. Founder-tier pricing is locked for the lifetime of the active subscription.</li>
        <li>Failed payments may pause your bot after a 7-day grace period.</li>
      </ul>
    ),
  },
  {
    id: "usage-limits",
    title: "6. Usage limits",
    body: (
      <p>
        Each plan includes monthly conversation and lead quotas. When a quota is reached,
        new conversations or leads may be blocked until the next billing cycle or until
        you upgrade. We reserve the right to throttle or pause accounts that abuse the
        Service.
      </p>
    ),
  },
  {
    id: "your-content",
    title: "7. Your content",
    body: (
      <p>
        You retain ownership of all website content, knowledge base material, chat
        transcripts, and lead data you provide or collect through the Service. You grant
        us a limited license to process this content solely to operate the Service for
        you. We do not sell your data or use chat content to train third-party models.
      </p>
    ),
  },
  {
    id: "ai-disclaimer",
    title: "8. AI output disclaimer",
    body: (
      <p>
        The chatbot generates responses using large language models. Output may
        occasionally be inaccurate, incomplete, or out of date. You are responsible for
        reviewing and validating any information the bot provides to your visitors. Do
        not rely on the bot for legal, medical, financial, or safety advice.
      </p>
    ),
  },
  {
    id: "availability",
    title: "9. Service availability",
    body: (
      <p>
        We aim for high availability but do not guarantee uninterrupted service. Planned
        maintenance, third-party provider outages (Supabase, Stripe, LLM providers), or
        force majeure events may cause downtime. The Service is provided "as is" without
        warranties of any kind.
      </p>
    ),
  },
  {
    id: "liability",
    title: "10. Limitation of liability",
    body: (
      <p>
        To the maximum extent permitted by law, our total liability for any claim relating
        to the Service is limited to the fees you paid us in the 3 months preceding the
        event giving rise to the claim. We are not liable for indirect, incidental, or
        consequential damages, including lost profits or lost leads.
      </p>
    ),
  },
  {
    id: "termination",
    title: "11. Termination",
    body: (
      <p>
        You may cancel anytime from your billing dashboard. We may terminate accounts for
        violations of these Terms, non-payment, or extended inactivity. Upon termination,
        your data is purged within 30 days per our{" "}
        <Link to="/privacy" className="text-emerald-300 underline-offset-4 hover:underline">
          Privacy Policy
        </Link>
        .
      </p>
    ),
  },
  {
    id: "indemnification",
    title: "12. Indemnification",
    body: (
      <p>
        You agree to indemnify, defend, and hold harmless MaximumAI Consulting, its
        officers, employees, and agents from any claim, loss, damage, liability, or expense
        (including reasonable attorneys' fees) arising out of or related to: (a) your use
        of the Service; (b) your violation of these Terms; (c) your violation of any third-
        party right (including intellectual property or privacy rights) — for example,
        deploying our widget on a site without proper visitor notice, or training the bot
        on content you do not own; or (d) any content or data you submit through the
        Service.
      </p>
    ),
  },
  {
    id: "dmca",
    title: "13. DMCA & intellectual property infringement",
    body: (
      <>
        <p>
          We respect intellectual property rights. If you believe content accessible
          through the Service infringes your copyright, send a DMCA notice to{" "}
          <a className="text-emerald-300 underline-offset-4 hover:underline" href="mailto:legal@maximumaiconsulting.com">
            legal@maximumaiconsulting.com
          </a>{" "}
          including: (a) your physical or electronic signature; (b) identification of the
          copyrighted work; (c) the URL or location of the infringing material; (d) your
          contact information; (e) a good-faith statement that the use is unauthorized;
          and (f) a statement under penalty of perjury that the information is accurate.
        </p>
        <p className="mt-3">
          We will respond to valid notices and may suspend repeat infringers' accounts.
        </p>
      </>
    ),
  },
  {
    id: "force-majeure",
    title: "14. Force majeure",
    body: (
      <p>
        Neither party is liable for any failure or delay in performance caused by events
        beyond reasonable control, including acts of God, war, terrorism, pandemic,
        government action, internet or utility outages, third-party provider failures
        (including Supabase, Stripe, or LLM providers), cyber attacks, or labor disputes.
      </p>
    ),
  },
  {
    id: "export-sanctions",
    title: "15. Export controls & sanctions",
    body: (
      <p>
        You represent that you are not located in, under the control of, or a national or
        resident of any country subject to comprehensive U.S. sanctions (currently Cuba,
        Iran, North Korea, Syria, Crimea, and the so-called Donetsk/Luhansk regions), and
        that you are not on any U.S. government restricted-party list (OFAC SDN, BIS Entity
        List, etc.). You will not export, re-export, or use the Service in violation of
        applicable export-control laws.
      </p>
    ),
  },
  {
    id: "governing-law",
    title: "16. Governing law, venue & dispute resolution",
    body: (
      <>
        <p>
          <strong className="text-white/90">Governing law.</strong> These Terms are governed by the laws of the State of California, USA, without regard to conflict-of-laws principles. The United Nations Convention on Contracts for the International Sale of Goods does not apply.
        </p>
        <p className="mt-3">
          <strong className="text-white/90">Exclusive venue.</strong> Subject to the binding arbitration provision below, the parties consent to the exclusive jurisdiction and venue of the state and federal courts located in <strong className="text-white/90">San Francisco County, California</strong> for any action not subject to arbitration (including actions to compel arbitration or for injunctive relief).
        </p>
        <p className="mt-3">
          <strong className="text-white/90">Informal resolution first.</strong> Before filing any claim, you agree to contact us at{" "}
          <a className="text-emerald-300 underline-offset-4 hover:underline" href="mailto:legal@maximumaiconsulting.com">
            legal@maximumaiconsulting.com
          </a>{" "}
          and attempt to resolve the dispute in good faith for at least 30 days.
        </p>
        <p className="mt-3">
          <strong className="text-white/90">Binding arbitration (JAMS).</strong> Any unresolved dispute, claim, or controversy arising out of or relating to these Terms or the Service will be settled by <strong className="text-white/90">final and binding arbitration administered by JAMS</strong> in accordance with the JAMS Streamlined Arbitration Rules &amp; Procedures (for claims under USD $250,000) or the JAMS Comprehensive Arbitration Rules &amp; Procedures (for larger claims), then in effect. The arbitration will be conducted in English by a single neutral arbitrator in <strong className="text-white/90">San Francisco County, California</strong>, or remotely by video at the consumer's election. Judgment on the award may be entered in any court of competent jurisdiction. Either party may seek temporary injunctive relief in court for intellectual-property infringement or unauthorized use of the Service without waiving arbitration. The Federal Arbitration Act governs the interpretation and enforcement of this arbitration agreement.
        </p>
        <p className="mt-3">
          <strong className="text-white/90">Class-action waiver.</strong> Disputes will be resolved on an individual basis only. You and we each waive the right to participate in a class action, class arbitration, mass arbitration, or any other representative or consolidated proceeding. The arbitrator may not consolidate claims or preside over any form of representative proceeding. If this class-action waiver is found unenforceable, the entire arbitration provision is null and void as to the affected claim, which will then proceed in court subject to the venue clause above.
        </p>
        <p className="mt-3">
          <strong className="text-white/90">30-day right to opt out of arbitration.</strong> You have the right to opt out of and not be bound by the arbitration and class-action waiver provisions by sending written notice of your decision to opt out to{" "}
          <a className="text-emerald-300 underline-offset-4 hover:underline" href="mailto:legal@maximumaiconsulting.com">
            legal@maximumaiconsulting.com
          </a>{" "}
          with the subject line "Arbitration Opt-Out" within <strong className="text-white/90">30 days</strong> of first accepting these Terms (or, if these Terms are materially amended, within 30 days of the amendment's effective date). The notice must include your full name, the email address on your account, and a clear statement that you wish to opt out. Opting out has no other effect on your relationship with us.
        </p>
        <p className="mt-3">
          <strong className="text-white/90">Costs.</strong> JAMS filing, administrative, and arbitrator fees will be paid in accordance with the JAMS rules and the JAMS Consumer Minimum Standards (where applicable). Each party bears its own attorneys' fees unless the arbitrator awards them as permitted by law.
        </p>
        <p className="mt-3 text-sm text-white/60">
          If you reside in the EU, UK, or another jurisdiction whose mandatory consumer law overrides arbitration, the courts of your country of residence will have jurisdiction and your local law applies to the extent legally required.
        </p>
      </>
    ),
  },
  {
    id: "miscellaneous",
    title: "17. Miscellaneous",
    body: (
      <ul className="space-y-2 list-disc pl-5">
        <li><strong className="text-white/90">Entire agreement.</strong> These Terms together with the Privacy Policy constitute the entire agreement between you and us regarding the Service and supersede prior agreements.</li>
        <li><strong className="text-white/90">Severability.</strong> If any provision is held unenforceable, the remaining provisions remain in full force.</li>
        <li><strong className="text-white/90">No waiver.</strong> Failure to enforce a provision is not a waiver of future enforcement.</li>
        <li><strong className="text-white/90">Assignment.</strong> You may not assign these Terms without our consent. We may assign in connection with a merger, acquisition, or sale of assets.</li>
        <li><strong className="text-white/90">No agency.</strong> No partnership, joint venture, or employment relationship is created.</li>
        <li><strong className="text-white/90">Notices.</strong> Notices to us must be sent to legal@maximumaiconsulting.com. Notices to you may be sent to the email on your account.</li>
      </ul>
    ),
  },
  {
    id: "changes-terms",
    title: "18. Changes to these terms",
    body: (
      <p>
        We may update these Terms from time to time. Material changes will be notified via
        email or in-app notice at least 14 days before taking effect. Continued use after
        changes take effect means you accept the updated Terms. Pricing changes affecting
        existing customers require 30 days' notice; founder-tier pricing is locked for the
        lifetime of the active subscription as stated in section 5.
      </p>
    ),
  },
  {
    id: "contact-terms",
    title: "19. Contact",
    body: (
      <p>
        Questions about these Terms?{" "}
        <a className="text-emerald-300 underline-offset-4 hover:underline" href="mailto:legal@maximumaiconsulting.com">
          legal@maximumaiconsulting.com
        </a>
        .
      </p>
    ),
  },
];

/* ---------------------------------------------------------------- */
/*  Refunds & Cancellations                                         */
/* ---------------------------------------------------------------- */
const refundsSections: Section[] = [
  {
    id: "overview",
    title: "1. Overview",
    body: (
      <>
        <p>
          This Refund & Cancellation Policy explains how billing, cancellations, and refunds work
          for MaximumAI Consulting subscriptions and one-time setup fees. It forms part of, and
          should be read together with, our{" "}
          <Link to="/terms" className="text-emerald-300 underline-offset-4 hover:underline">
            Terms of Service
          </Link>
          .
        </p>
        <p className="mt-3">
          By purchasing a plan you confirm you have read and agree to this policy.
        </p>
      </>
    ),
  },
  {
    id: "no-free-trial",
    title: "2. No free trial — paid setup required",
    body: (
      <p>
        All plans require a one-time, non-refundable setup fee plus a recurring subscription
        (monthly or annual). We do not offer a free trial. The setup fee covers custom bot
        configuration, knowledge base ingestion, branding, and onboarding work performed by
        our team before your bot goes live.
      </p>
    ),
  },
  {
    id: "setup-fees",
    title: "3. Setup fees (one-time, non-refundable)",
    body: (
      <>
        <p>
          Setup fees are <strong className="text-white/90">non-refundable</strong> once paid,
          because work begins immediately upon purchase (account provisioning, bot training,
          knowledge base ingestion, and dedicated onboarding time).
        </p>
        <p className="mt-3">
          <strong className="text-white/90">Exception:</strong> if we are unable to deliver a
          working bot within 14 days of purchase due to a fault on our side (and not due to
          missing materials or non-response from you), you may request a full refund of the
          setup fee by emailing{" "}
          <a className="text-emerald-300 underline-offset-4 hover:underline" href="mailto:billing@maximumaiconsulting.com">
            billing@maximumaiconsulting.com
          </a>
          .
        </p>
      </>
    ),
  },
  {
    id: "monthly-subscriptions",
    title: "4. Monthly subscriptions",
    body: (
      <ul className="space-y-2 list-disc pl-5">
        <li>Billed in advance on the same day each month.</li>
        <li>You may cancel at any time. Cancellation stops future renewals.</li>
        <li>
          <strong className="text-white/90">No partial refunds</strong> for the current
          billing period — your bot remains active through the end of the period you've already
          paid for.
        </li>
        <li>No refunds for unused conversations, leads, or seats within a billing period.</li>
      </ul>
    ),
  },
  {
    id: "annual-subscriptions",
    title: "5. Annual subscriptions",
    body: (
      <>
        <p>
          Annual plans are billed upfront and reflect a discount in exchange for the longer
          commitment. They are <strong className="text-white/90">non-refundable</strong> after
          the 14-day window described in section 6.
        </p>
        <p className="mt-3">
          You may cancel auto-renewal at any time; service continues until the end of the
          paid annual term.
        </p>
      </>
    ),
  },
  {
    id: "ca-arl",
    title: "6. California Automatic Renewal Law disclosures (Cal. Bus. & Prof. Code §17600 et seq.)",
    body: (
      <>
        <p>
          For California residents, the following automatic renewal disclosures apply to any subscription you purchase. These terms also appear in clear and conspicuous form during checkout and in your purchase confirmation email.
        </p>
        <ul className="space-y-2 list-disc pl-5 mt-3">
          <li><strong className="text-white/90">Automatic renewal.</strong> Your subscription will automatically renew at the end of each billing period (monthly or annual, as selected at checkout) and your payment method on file will be charged the then-current renewal price <strong className="text-white/90">until you cancel</strong>.</li>
          <li><strong className="text-white/90">Renewal price.</strong> The renewal price equals the recurring price displayed on the pricing page and on your purchase confirmation. If we change the renewal price, we will provide notice as required by §17602(c) at least 7 and not more than 30 days before the price change takes effect, with instructions on how to cancel.</li>
          <li><strong className="text-white/90">Length of renewal term.</strong> Monthly plans renew in one-month terms; annual plans renew in twelve-month terms.</li>
          <li><strong className="text-white/90">How to cancel.</strong> You may cancel at any time, before the next billing date, through (a) the in-app customer portal at Account → Billing → "Manage subscription"; or (b) by emailing <a className="text-emerald-300 underline-offset-4 hover:underline" href="mailto:billing@maximumaiconsulting.com">billing@maximumaiconsulting.com</a>. California residents who accepted an automatic renewal offer online may cancel <strong className="text-white/90">exclusively online</strong> without further obligation, in line with §17602(c)(3).</li>
          <li><strong className="text-white/90">Acknowledgment after purchase.</strong> Following each purchase, we send an email confirmation containing the automatic renewal terms, cancellation policy, and a link to the cancellation portal, as required by §17602(b).</li>
          <li><strong className="text-white/90">Free trial / promotional offers.</strong> We do not currently offer free trials. If we introduce a promotional or discounted introductory offer in the future, we will give California residents the additional notice required by §17602(b)(3) before the offer converts to a paid recurring charge.</li>
          <li><strong className="text-white/90">Refunds for unauthorized renewals.</strong> If we charge an automatic renewal in a manner that does not comply with §17600 et seq., the charge is considered an unconditional gift and you may request a full refund by emailing <a className="text-emerald-300 underline-offset-4 hover:underline" href="mailto:billing@maximumaiconsulting.com">billing@maximumaiconsulting.com</a>.</li>
        </ul>
      </>
    ),
  },
  {
    id: "money-back-guarantee",
    title: "7. 14-day money-back guarantee (subscription only)",
    body: (
      <>
        <p>
          If you are not satisfied with the recurring subscription, you may request a refund of
          the most recent <strong className="text-white/90">subscription charge</strong> (monthly
          or annual) within <strong className="text-white/90">14 days</strong> of the initial
          purchase by emailing{" "}
          <a className="text-emerald-300 underline-offset-4 hover:underline" href="mailto:billing@maximumaiconsulting.com">
            billing@maximumaiconsulting.com
          </a>
          .
        </p>
        <p className="mt-3">
          The 14-day guarantee applies once per customer, to first-time subscriptions only, and
          does <strong className="text-white/90">not</strong> cover the one-time setup fee
          (see section 3). Renewals, reactivations, and plan changes are not eligible.
        </p>
      </>
    ),
  },
  {
    id: "how-to-cancel",
    title: "8. How to cancel",
    body: (
      <ul className="space-y-2 list-disc pl-5">
        <li>
          Open your account → <strong className="text-white/90">Billing</strong>, then click
          "Manage subscription" to open the customer portal where you can cancel auto-renewal,
          update payment methods, and download invoices.
        </li>
        <li>
          Or email{" "}
          <a className="text-emerald-300 underline-offset-4 hover:underline" href="mailto:billing@maximumaiconsulting.com">
            billing@maximumaiconsulting.com
          </a>{" "}
          from the email address on file and we will cancel within one business day.
        </li>
        <li>You will receive an email confirmation when cancellation is processed.</li>
      </ul>
    ),
  },
  {
    id: "what-happens-on-cancel",
    title: "9. What happens when you cancel",
    body: (
      <ul className="space-y-2 list-disc pl-5">
        <li>Your bot continues to work through the end of the current paid billing period.</li>
        <li>At period end, the embedded chat widget will stop responding on your site.</li>
        <li>
          You retain access to export leads and conversations for{" "}
          <strong className="text-white/90">30 days</strong> after cancellation. After that,
          your data is permanently deleted in line with our{" "}
          <Link to="/privacy" className="text-emerald-300 underline-offset-4 hover:underline">
            Privacy Policy
          </Link>{" "}
          (section 9).
        </li>
        <li>You can re-subscribe at any time, but a new setup fee may apply if your account has been deleted.</li>
      </ul>
    ),
  },
  {
    id: "plan-changes",
    title: "10. Upgrades, downgrades & plan changes",
    body: (
      <ul className="space-y-2 list-disc pl-5">
        <li>
          <strong className="text-white/90">Upgrades</strong> take effect immediately. We pro-rate
          the difference and charge it on your next invoice (or immediately, depending on the change).
        </li>
        <li>
          <strong className="text-white/90">Downgrades</strong> take effect at the start of the
          next billing period. No refund is issued for the difference in the current period.
        </li>
        <li>
          Switching from monthly to annual takes effect immediately and resets the billing date.
          Switching from annual to monthly takes effect at the end of the annual term.
        </li>
      </ul>
    ),
  },
  {
    id: "failed-payments",
    title: "11. Failed payments & past-due accounts",
    body: (
      <ul className="space-y-2 list-disc pl-5">
        <li>If a renewal payment fails, Stripe automatically retries up to 3 times over ~7 days.</li>
        <li>You will receive email notifications for each failed attempt.</li>
        <li>
          If all retries fail, your subscription is canceled and the chat widget will stop
          responding. Your data remains accessible for the 30-day retention window.
        </li>
        <li>You can reactivate at any time by updating your payment method in the customer portal.</li>
      </ul>
    ),
  },
  {
    id: "chargebacks",
    title: "12. Chargebacks & disputes",
    body: (
      <p>
        If you have a billing concern, please contact{" "}
        <a className="text-emerald-300 underline-offset-4 hover:underline" href="mailto:billing@maximumaiconsulting.com">
          billing@maximumaiconsulting.com
        </a>{" "}
        before initiating a chargeback. We respond within one business day and will work with
        you to resolve the issue. Chargebacks filed without first contacting us may result in
        immediate suspension of service and may be disputed with evidence of work delivered.
      </p>
    ),
  },
  {
    id: "refund-method",
    title: "13. How refunds are issued",
    body: (
      <ul className="space-y-2 list-disc pl-5">
        <li>Approved refunds are returned to the original payment method via Stripe.</li>
        <li>Refunds typically appear in your account within 5–10 business days, depending on your bank.</li>
        <li>Currency is converted at the rate Stripe applied to the original charge; we do not cover FX losses.</li>
      </ul>
    ),
  },
  {
    id: "consumer-rights",
    title: "14. Statutory consumer rights",
    body: (
      <p>
        Nothing in this policy limits any non-waivable consumer rights you have under the laws
        of your jurisdiction (including, where applicable, the EU Consumer Rights Directive,
        UK Consumer Rights Act, or California Consumer Protection statutes). Where mandatory
        local law provides greater rights than this policy, those rights apply.
      </p>
    ),
  },
  {
    id: "changes-refunds",
    title: "15. Changes to this policy",
    body: (
      <p>
        We may update this policy from time to time. Material changes will be notified via
        email or in-app notice at least 14 days before taking effect. Changes do not apply
        retroactively to purchases made before the change takes effect.
      </p>
    ),
  },
  {
    id: "contact-refunds",
    title: "16. Contact",
    body: (
      <p>
        Billing, cancellation, and refund requests:{" "}
        <a className="text-emerald-300 underline-offset-4 hover:underline" href="mailto:billing@maximumaiconsulting.com">
          billing@maximumaiconsulting.com
        </a>
        .
      </p>
    ),
  },
];

/* ---------------------------------------------------------------- */
/*  Sub-components                                                  */
/* ---------------------------------------------------------------- */
function SectionList({ sections }: { sections: Section[] }) {
  return (
    <div className="space-y-6">
      {sections.map((s) => (
        <section
          key={s.id}
          id={s.id}
          className="scroll-mt-24 rounded-lg border border-white/10 bg-white/[0.03] p-6 transition-colors hover:bg-white/[0.05]"
        >
          <h2 className="text-xl font-semibold tracking-tight text-white mb-3">{s.title}</h2>
          <div className="text-white/70 leading-relaxed">{s.body}</div>
        </section>
      ))}
    </div>
  );
}

function TableOfContents({
  sections,
  activeId,
}: {
  sections: Section[];
  activeId: string | null;
}) {
  return (
    <nav aria-label="Table of contents" className="space-y-1 text-sm">
      {sections.map((s) => (
        <a
          key={s.id}
          href={`#${s.id}`}
          className={`block rounded-md px-3 py-2 transition-colors ${
            activeId === s.id
              ? "bg-emerald-400/10 text-emerald-300 font-medium"
              : "text-white/60 hover:bg-white/5 hover:text-white"
          }`}
        >
          {s.title}
        </a>
      ))}
    </nav>
  );
}

/* ---------------------------------------------------------------- */
/*  Page                                                            */
/* ---------------------------------------------------------------- */
export default function LegalDoc({ defaultTab = "privacy" }: { defaultTab?: "privacy" | "terms" | "refunds" }) {
  const [tab, setTab] = useState<"privacy" | "terms" | "refunds">(defaultTab);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sections = useMemo(
    () =>
      tab === "privacy"
        ? privacySections
        : tab === "terms"
        ? termsSections
        : refundsSections,
    [tab]
  );

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-96px 0px -60% 0px", threshold: [0, 1] }
    );
    sections.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [sections]);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white/90">
      {/* Hero */}
      <header className="relative overflow-hidden border-b border-white/5 bg-gradient-to-b from-emerald-500/[0.08] via-[#0a0a0f] to-[#0a0a0f]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.18),transparent_60%)]" />
        <div className="relative max-w-6xl mx-auto px-6 pt-10 pb-14">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>

          <div className="mt-8 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-white/70 backdrop-blur">
                <FileText className="h-3.5 w-3.5" />
                Legal
              </div>
              <h1 className="mt-4 text-4xl md:text-5xl font-semibold tracking-tight text-white">
                Privacy, Terms & Refund Policy
              </h1>
              <p className="mt-3 text-white/60">
                How we collect, use, and protect your data — the terms that govern your use of
                MaximumAI Consulting — and our refund and cancellation policy.
              </p>
              <p className="mt-2 text-xs text-white/40">Last updated: {lastUpdated}</p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button
                asChild
                variant="outline"
                size="sm"
                className="border-white/15 bg-white/[0.03] text-white hover:bg-white/[0.08]"
              >
                <a href="mailto:support@maximumaiconsulting.com">
                  <Mail className="h-4 w-4" />
                  Contact Legal
                </a>
              </Button>
            </div>
          </div>

          {/* Trust strip */}
          <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { icon: Lock, label: "Encrypted in transit & at rest" },
              { icon: ShieldCheck, label: "GDPR & CCPA aligned" },
              { icon: Globe2, label: "We never sell your data" },
            ].map(({ icon: Icon, label }) => (
              <Card
                key={label}
                className="flex items-center gap-3 px-4 py-3 border-white/10 bg-white/[0.03] backdrop-blur"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-400/10 text-emerald-300">
                  <Icon className="h-4 w-4" />
                </div>
                <span className="text-sm text-white/85">{label}</span>
              </Card>
            ))}
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="max-w-6xl mx-auto px-6 py-12">
        <Tabs value={tab} onValueChange={(v) => setTab(v as "privacy" | "terms" | "refunds")}>
          <TabsList className="mb-8 bg-white/[0.04] border border-white/10">
            <TabsTrigger
              value="privacy"
              className="gap-2 data-[state=active]:bg-emerald-400/10 data-[state=active]:text-emerald-300"
            >
              <ShieldCheck className="h-4 w-4" />
              Privacy Policy
            </TabsTrigger>
            <TabsTrigger
              value="terms"
              className="gap-2 data-[state=active]:bg-emerald-400/10 data-[state=active]:text-emerald-300"
            >
              <ScrollText className="h-4 w-4" />
              Terms of Service
            </TabsTrigger>
            <TabsTrigger
              value="refunds"
              className="gap-2 data-[state=active]:bg-emerald-400/10 data-[state=active]:text-emerald-300"
            >
              <RefreshCcw className="h-4 w-4" />
              Refunds & Cancellations
            </TabsTrigger>
          </TabsList>

          <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-10">
            {/* TOC */}
            <aside className="hidden lg:block">
              <div className="sticky top-24">
                <p className="px-3 pb-2 text-xs font-medium uppercase tracking-wider text-white/40">
                  On this page
                </p>
                <TableOfContents sections={sections} activeId={activeId} />
              </div>
            </aside>

            {/* Content */}
            <div>
              <TabsContent value="privacy" className="mt-0">
                <SectionList sections={privacySections} />
              </TabsContent>
              <TabsContent value="terms" className="mt-0">
                <SectionList sections={termsSections} />
              </TabsContent>
              <TabsContent value="refunds" className="mt-0">
                <SectionList sections={refundsSections} />
              </TabsContent>

              <Separator className="my-12 bg-white/10" />

              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-6 text-center">
                <p className="text-sm text-white/60">
                  Have a question about this document? We're happy to help.
                </p>
                <Button
                  asChild
                  className="mt-4 bg-gradient-to-r from-emerald-400 to-cyan-400 text-[#0a0a0f] hover:opacity-90"
                >
                  <a href="mailto:support@maximumaiconsulting.com">
                    <Mail className="h-4 w-4" />
                    support@maximumaiconsulting.com
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </Tabs>
      </div>

      <footer className="border-t border-white/5 py-8 text-center text-sm text-white/40">
        <div>© {new Date().getFullYear()} MaximumAI Consulting. All rights reserved.</div>
        <div className="mt-2 space-x-4">
          <Link to="/privacy" className="hover:text-white/70 underline-offset-4 hover:underline">
            Privacy Policy
          </Link>
          <Link to="/terms" className="hover:text-white/70 underline-offset-4 hover:underline">
            Terms of Service
          </Link>
          <Link to="/refunds" className="hover:text-white/70 underline-offset-4 hover:underline">
            Refunds & Cancellations
          </Link>
        </div>
      </footer>
    </div>
  );
}
