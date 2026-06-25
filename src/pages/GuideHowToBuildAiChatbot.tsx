import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowLeft } from "lucide-react";

export default function GuideHowToBuildAiChatbot() {
  const canonical = "https://maxaichatbotsandbox.lovable.app/guides/how-to-build-ai-chatbot";
  const title = "How to Make an AI Chatbot for a Website (2026 Guide)";
  const description =
    "Step-by-step guide to building an AI chatbot for your website: training on your content, capturing leads, and installing the widget in under 10 minutes.";

  const howToJsonLd = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: title,
    description,
    totalTime: "PT10M",
    step: [
      { "@type": "HowToStep", name: "Define your bot's job", text: "Decide what questions your bot should answer and what action counts as a captured lead." },
      { "@type": "HowToStep", name: "Train it on your website", text: "Point the bot at your URL so it can scrape your pages and learn your business." },
      { "@type": "HowToStep", name: "Configure persona and lead capture", text: "Set the welcome message, tone, and which fields (name, email, phone) the bot should ask for." },
      { "@type": "HowToStep", name: "Test in a playground", text: "Run real questions through the bot, tune the system prompt, and inspect retrieved knowledge chunks." },
      { "@type": "HowToStep", name: "Install on your site", text: "Paste a single <script> tag into your site's HTML and the chat widget goes live." },
      { "@type": "HowToStep", name: "Measure and iterate", text: "Watch conversations, sentiment, and lead conversion. Update the knowledge base as your business changes." },
    ],
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "How much does an AI chatbot cost to run?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Inference is the main cost. At current LLM pricing, a small-business bot handling 500 conversations per month typically costs $5–$30 in API calls. Most platforms wrap this in a flat monthly fee.",
        },
      },
      {
        "@type": "Question",
        name: "Do I need to code to build one?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "No. Platforms like MaximumAI handle scraping, embedding, vector storage, and the embed widget for you. If you can paste a URL and copy a script tag, you can ship a chatbot.",
        },
      },
      {
        "@type": "Question",
        name: "What's the difference between a rule-based bot and an AI chatbot?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Rule-based bots follow scripted decision trees (\"press 1 for sales\"). AI chatbots understand free-form language and answer from your actual content. The latter handles the 80% of questions that don't fit your script.",
        },
      },
      {
        "@type": "Question",
        name: "Will it hallucinate?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Less than you'd think, when grounded in a focused knowledge base with a strict system prompt. Two safeguards: (1) tell the bot to say \"I don't know — let me connect you to a human\" when retrieval confidence is low, and (2) review transcripts weekly.",
        },
      },
    ],
  };


  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={canonical} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={canonical} />
        <meta property="og:type" content="article" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        <script type="application/ld+json">{JSON.stringify(howToJsonLd)}</script>
        <script type="application/ld+json">{JSON.stringify(faqJsonLd)}</script>
      </Helmet>
      <main className="mx-auto max-w-3xl px-6 py-12">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to dashboard
        </Link>


        <article className="prose prose-invert mt-6 max-w-none">
          <h1>How to Make an AI Chatbot for a Website (2026 Guide)</h1>
          <p className="lead">
            A practical, step-by-step tutorial for building and installing an AI chatbot on
            your website — trained on your own content, capturing qualified leads 24/7, and
            live in under 10 minutes. No machine-learning background required.
          </p>

          <h2>Why add an AI chatbot to your website?</h2>
          <p>
            Most visitors land on a website, can't find an answer in 10 seconds, and bounce.
            An AI chatbot closes that gap: it answers product questions instantly, qualifies
            intent, and hands hot leads to your sales team while you sleep. For service
            businesses (plumbers, dentists, agencies, coaches), it's the difference between
            capturing a 2 a.m. lead and losing it to a competitor whose site replied first.
          </p>

          <h2>What you'll need</h2>
          <ul>
            <li>A public website URL the bot can read</li>
            <li>An AI chatbot platform (this guide uses MaximumAI's architecture as the reference)</li>
            <li>5–10 minutes</li>
          </ul>

          <h2>Step 1 — Define your bot's job</h2>
          <p>
            Before writing a single prompt, decide what the bot exists to do. Two
            questions get you 80% of the way there:
          </p>
          <ol>
            <li><strong>What three questions do customers ask you every week?</strong> Those are your top intents.</li>
            <li><strong>What does a "qualified lead" look like?</strong> Name + email? A scheduled demo? Phone number plus job type?</li>
          </ol>
          <p>
            Write these down. They become the system prompt and the lead-capture
            form fields in step 3.
          </p>

          <h2>Step 2 — Train it on your website</h2>
          <p>
            Modern AI chatbots use <strong>RAG (retrieval-augmented generation)</strong>: instead of
            fine-tuning a model, you store your content as searchable chunks and let
            the LLM pull the right ones into context at query time. This is faster,
            cheaper, and easier to update than fine-tuning.
          </p>
          <p>The flow:</p>
          <ol>
            <li>Crawl your site (or upload PDFs, docs, FAQs).</li>
            <li>Split each page into ~500-word chunks.</li>
            <li>Embed each chunk with a model like <code>text-embedding-3-small</code>.</li>
            <li>Store the embeddings in a vector database (pgvector works fine).</li>
          </ol>
          <p>
            On MaximumAI, this is a single step: paste your URL, and the platform
            scrapes, chunks, embeds, and indexes everything automatically.
          </p>

          <h2>Step 3 — Configure persona and lead capture</h2>
          <p>The bot's <em>voice</em> matters as much as its accuracy. Set:</p>
          <ul>
            <li><strong>Welcome message</strong> — first impression, 1–2 sentences</li>
            <li><strong>Tone</strong> — friendly, formal, playful (match your brand)</li>
            <li><strong>Lead trigger</strong> — when the bot should ask for contact info (after a pricing question, after 3 messages, on intent words like "quote")</li>
            <li><strong>Required fields</strong> — usually name + email; phone for service businesses</li>
            <li><strong>Hand-off rule</strong> — what counts as "hot" and where it gets routed (Slack, email, CRM)</li>
          </ul>

          <h2>Step 4 — Test in a playground</h2>
          <p>
            Never ship a bot you haven't broken yourself. A good playground lets you:
          </p>
          <ul>
            <li>Run real customer questions and see streaming responses</li>
            <li>Tweak the system prompt and re-run the same question</li>
            <li>Inspect which knowledge chunks were retrieved (the "RAG debugger" view)</li>
            <li>Adjust temperature — lower for factual support, higher for sales conversation</li>
          </ul>
          <p>
            Spend 20 minutes here. You'll catch wrong answers, hallucinations, and tone
            issues before a single real customer sees them.
          </p>

          <h2>Step 5 — Install on your site (one line of code)</h2>
          <p>
            A modern chatbot platform gives you an embed snippet that looks like this:
          </p>
          <pre><code>{`<script src="https://your-platform.com/widget.js"
        data-bot-id="your-bot-id"
        async></script>`}</code></pre>
          <p>
            Paste it before the closing <code>&lt;/body&gt;</code> tag. WordPress, Shopify,
            Webflow, Squarespace, and custom HTML all accept it the same way. Refresh
            your site and the chat bubble appears in the corner.
          </p>

          <h2>Step 6 — Measure and iterate</h2>
          <p>
            The first week is data collection. Watch:
          </p>
          <ul>
            <li><strong>Conversation volume</strong> — are people using it?</li>
            <li><strong>Top intents</strong> — what are they actually asking?</li>
            <li><strong>Sentiment</strong> — when does the bot frustrate users?</li>
            <li><strong>Lead conversion</strong> — what percent of conversations capture contact info?</li>
            <li><strong>Unanswered questions</strong> — gaps in your knowledge base</li>
          </ul>
          <p>
            Every Friday, add the top 3 unanswered questions to your knowledge base.
            The bot gets noticeably smarter in 30 days.
          </p>

          <h2>Common mistakes to avoid</h2>
          <ul>
            <li><strong>No system prompt guardrails.</strong> Tell the bot what it <em>won't</em> answer (legal advice, competitor pricing, anything off-topic). Otherwise it will.</li>
            <li><strong>Asking for lead info too early.</strong> Let the bot prove value first; then qualify.</li>
            <li><strong>Ignoring the conversation log.</strong> The transcripts are the highest-signal product research you'll ever get.</li>
            <li><strong>Never updating the knowledge base.</strong> Your business changes; your bot's brain has to keep up.</li>
          </ul>

          <h2>FAQ</h2>
          <h3>How much does an AI chatbot cost to run?</h3>
          <p>
            Inference is the main cost. At current LLM pricing, a small-business bot
            handling 500 conversations/month typically costs $5–$30 in API calls. Most
            platforms wrap this in a flat monthly fee.
          </p>
          <h3>Do I need to code to build one?</h3>
          <p>
            No. Platforms like MaximumAI handle scraping, embedding, vector storage,
            and the embed widget for you. If you can paste a URL and copy a script
            tag, you can ship a chatbot.
          </p>
          <h3>What's the difference between a rule-based bot and an AI chatbot?</h3>
          <p>
            Rule-based bots follow scripted decision trees ("press 1 for sales"). AI
            chatbots understand free-form language and answer from your actual
            content. The latter handles the 80% of questions that don't fit your
            script.
          </p>
          <h3>Will it hallucinate?</h3>
          <p>
            Less than you'd think, when grounded in a focused knowledge base with a
            strict system prompt. Two safeguards: (1) tell the bot to say "I don't
            know — let me connect you to a human" when retrieval confidence is low,
            (2) review transcripts weekly.
          </p>

          <h2>Ready to build one?</h2>
          <p>
            Explore the interactive demo in the sidebar — the <Link to="/playground">Playground</Link>,
            {" "}<Link to="/rag-debugger">RAG Debugger</Link>, and
            {" "}<Link to="/intelligence">Conversation Intelligence</Link> pages show every
            step of this guide running on live (simulated) data.
          </p>
        </article>
      </main>
    </div>
  );
}

