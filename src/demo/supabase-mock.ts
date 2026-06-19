// ============================================================
// DEMO MODE — In-memory mock of @/integrations/supabase/client
// Aliased in vite.config.ts so every `supabase.*` call hits this.
// No network calls, no real backend, no auth required.
// ============================================================

const ORG_ID = "demo-org-0001";
const USER_ID = "demo-user-0001";
const USER_EMAIL = "demo@maximumai.dev";

// --------- random utilities ---------
function uid(prefix = "id"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function daysAgo(d: number, hourJitter = true): string {
  const date = new Date();
  date.setDate(date.getDate() - d);
  if (hourJitter) {
    date.setHours(randomInt(8, 21), randomInt(0, 59), randomInt(0, 59), 0);
  }
  return date.toISOString();
}

// --------- seeded sample content ---------
const FIRST_NAMES = ["Sarah", "Mike", "Alex", "Jordan", "Riley", "Sam", "Casey", "Taylor", "Morgan", "Chris", "Pat", "Dana", "Avery", "Quinn", "Jamie", "Drew", "Reese", "Skyler"];
const LAST_NAMES = ["Chen", "Patel", "Garcia", "Smith", "Johnson", "Lee", "Brown", "Davis", "Wilson", "Anderson", "Martinez", "Lopez", "Taylor", "Thomas", "Moore", "Jackson"];
const DOMAINS = ["gmail.com", "hotmail.com", "outlook.com", "yahoo.com", "fastmail.com", "proton.me"];
const VISITOR_OPENERS = [
  "Hey, do you offer same-day delivery?",
  "What's your pricing for small teams?",
  "Can I book a demo this week?",
  "I'm comparing your product to competitors — what makes you different?",
  "Do you integrate with Shopify?",
  "Is there a free trial?",
  "How does onboarding work?",
  "What payment methods do you accept?",
  "I'm interested in the Pro plan, can someone reach out?",
  "Are you GDPR compliant?",
  "Can I get a refund if it's not a fit?",
  "Do you support multi-language stores?",
  "What's the difference between Starter and Growth?",
  "Quick question — are you open on Sundays?",
];
const BOT_REPLIES = [
  "Great question! Same-day delivery is available within 10 miles of our warehouse for orders placed before 2pm.",
  "Our small team plan starts at $49/month and includes up to 5 seats with unlimited conversations.",
  "Absolutely — I can grab your email and our team will reach out to schedule a demo.",
  "We focus on speed-to-value: most customers are live in under an hour, no engineer required.",
  "Yes — native Shopify integration with one-click install from the app store.",
  "Yep! 14-day free trial, no credit card required. Want me to send you the signup link?",
  "Onboarding takes about 30 minutes — we'll walk you through setup on a kickoff call.",
  "We accept all major credit cards, Apple Pay, Google Pay, and invoicing for annual plans.",
  "Sounds good! What's the best email to have someone follow up at?",
  "Yes, we're fully GDPR compliant with EU data residency available on Business plans.",
];
const SOURCES = ["chatbot", "widget", "chatbot", "widget", "import"];
const PREFERRED_TIMES = ["Morning", "Afternoon", "Evening", "Anytime", null, null];

function randomEmail(): string {
  const first = pick(FIRST_NAMES).toLowerCase();
  const last = pick(LAST_NAMES).toLowerCase();
  return `${first}.${last}${randomInt(1, 99)}@${pick(DOMAINS)}`;
}

// --------- in-memory tables ---------
const db = {
  organizations: [
    {
      id: ORG_ID,
      name: "Acme Coffee Co.",
      primary_color: "#10b981",
      logo_url: null,
      plan_tier: "pro",
      plan_status: "active",
      allowed_origins: ["https://acmecoffee.example.com"],
      created_at: daysAgo(120, false),
    },
  ] as any[],
  user_organizations: [
    {
      organization_id: ORG_ID,
      user_id: USER_ID,
      role: "owner",
      organizations: null as any, // populated below
    },
  ] as any[],
  profiles: [
    {
      id: uid("prof"),
      user_id: USER_ID,
      email: USER_EMAIL,
      full_name: "Demo Owner",
      avatar_url: null,
      created_at: daysAgo(120, false),
    },
  ] as any[],
  bot_configs: [
    {
      id: uid("cfg"),
      organization_id: ORG_ID,
      bot_name: "BaristaBot",
      welcome_message: "Hi! ☕ I'm BaristaBot — ask me about our menu, hours, or wholesale pricing.",
      system_prompt: "You are a friendly assistant for Acme Coffee Co. Help visitors with menu questions, store hours, and wholesale inquiries. Capture their email if they want to be contacted.",
      primary_knowledge: "Acme Coffee Co. — single-origin roasters since 2015. Stores in Portland, Seattle, and SF. Wholesale orders ship within 48 hours. Free delivery on orders over $50.",
      tone: "Friendly",
      webhook_url: "",
      ask_for_preferred_time: true,
      booking_link: "https://cal.com/acmecoffee/intro",
      is_active: true,
      multilingual_enabled: true,
      sms_alert_phone: "+1 555 0142",
      business_hours_enabled: true,
      business_hours_timezone: "America/Los_Angeles",
      business_hours_start: "07:00",
      business_hours_end: "19:00",
      business_hours_days: [1, 2, 3, 4, 5, 6],
      after_hours_message: "We're closed right now — leave your email and we'll get back to you in the morning!",
      support_email: "hello@acmecoffee.example.com",
      created_at: daysAgo(90, false),
      updated_at: daysAgo(2, false),
    },
  ] as any[],
  kb_sources: [] as any[],
  leads: [] as any[],
  chat_history: [] as any[],
  subscriptions: [
    {
      id: uid("sub"),
      organization_id: ORG_ID,
      status: "active",
      plan_tier: "pro",
      current_period_end: daysAgo(-18, false),
    },
  ] as any[],
  admin_prospects: [] as any[],
  email_send_log: [] as any[],
  founder_pending_checkouts: [] as any[],
};

// link join data
db.user_organizations[0].organizations = db.organizations[0];

// --------- seed knowledge base sources ---------
db.kb_sources = [
  {
    id: uid("kb"), organization_id: ORG_ID, kind: "website",
    label: "acmecoffee.example.com", url: "https://acmecoffee.example.com",
    file_path: null, content: null, char_count: 18430,
    auto_sync: true, last_synced_at: daysAgo(1), last_error: null,
    created_at: daysAgo(60),
  },
  {
    id: uid("kb"), organization_id: ORG_ID, kind: "website",
    label: "Wholesale FAQ", url: "https://acmecoffee.example.com/wholesale/faq",
    file_path: null, content: null, char_count: 6210,
    auto_sync: true, last_synced_at: daysAgo(1), last_error: null,
    created_at: daysAgo(45),
  },
  {
    id: uid("kb"), organization_id: ORG_ID, kind: "file",
    label: "menu-2026.pdf", url: null,
    file_path: "kb/menu-2026.pdf", content: null, char_count: 3120,
    auto_sync: false, last_synced_at: daysAgo(7), last_error: null,
    created_at: daysAgo(20),
  },
  {
    id: uid("kb"), organization_id: ORG_ID, kind: "file",
    label: "brand-voice.md", url: null,
    file_path: "kb/brand-voice.md", content: null, char_count: 1840,
    auto_sync: false, last_synced_at: daysAgo(14), last_error: null,
    created_at: daysAgo(14),
  },
];

// --------- seed chat sessions + leads ---------
function seedConversations() {
  const SESSION_COUNT = 47;
  for (let i = 0; i < SESSION_COUNT; i++) {
    const sessionId = uid("sess");
    const dayOffset = randomInt(0, 29);
    const start = new Date();
    start.setDate(start.getDate() - dayOffset);
    start.setHours(randomInt(8, 20), randomInt(0, 59), 0, 0);

    const turnCount = randomInt(1, 7);
    const opener = pick(VISITOR_OPENERS);

    for (let t = 0; t < turnCount; t++) {
      const t1 = new Date(start.getTime() + t * randomInt(20_000, 120_000));
      db.chat_history.push({
        id: uid("msg"),
        organization_id: ORG_ID,
        session_id: sessionId,
        role: "user",
        content: t === 0 ? opener : pick([
          "Got it, thanks.",
          "Could you tell me more?",
          "What about the price?",
          "Sounds good — how do I sign up?",
          "Hmm, okay.",
          "Can you email me details?",
        ]),
        created_at: t1.toISOString(),
      });
      const t2 = new Date(t1.getTime() + randomInt(2000, 9000));
      db.chat_history.push({
        id: uid("msg"),
        organization_id: ORG_ID,
        session_id: sessionId,
        role: "assistant",
        content: pick(BOT_REPLIES),
        created_at: t2.toISOString(),
      });
    }

    // ~45% of sessions become leads
    const isLead = Math.random() < 0.45;
    if (isLead) {
      const email = randomEmail();
      const isHot = Math.random() < 0.3;
      db.leads.push({
        id: uid("lead"),
        organization_id: ORG_ID,
        email,
        session_id: sessionId,
        source: pick(SOURCES),
        preferred_time: pick(PREFERRED_TIMES),
        lead_notes: isHot
          ? JSON.stringify({ tags: ["[HOT]"], summary: "Asked about pricing, ready to buy this week." })
          : JSON.stringify({ tags: [], summary: "General inquiry." }),
        created_at: new Date(start.getTime() + turnCount * 60_000).toISOString(),
      });
    }
  }
  // sort everything for nicer demo output
  db.chat_history.sort((a, b) => a.created_at.localeCompare(b.created_at));
  db.leads.sort((a, b) => b.created_at.localeCompare(a.created_at));
}
seedConversations();

// --------- chainable query builder ---------
type Resolved = { data: any; error: any; count?: number | null };

class QB implements PromiseLike<Resolved> {
  private table: string;
  private op: "select" | "insert" | "update" | "delete" | "upsert" = "select";
  private headOnly = false;
  private wantsCount = false;
  private orderBy: { col: string; asc: boolean } | null = null;
  private limitN: number | null = null;
  private rangeFrom: number | null = null;
  private rangeTo: number | null = null;
  private filters: Array<(row: any) => boolean> = [];
  private payload: any = null;
  private joinKey: string | null = null;

  constructor(table: string) {
    this.table = table;
  }

  // ---- write ops ----
  insert(values: any) {
    this.op = "insert";
    this.payload = Array.isArray(values) ? values : [values];
    return this;
  }
  update(values: any) {
    this.op = "update";
    this.payload = values;
    return this;
  }
  upsert(values: any) {
    this.op = "upsert";
    this.payload = Array.isArray(values) ? values : [values];
    return this;
  }
  delete() {
    this.op = "delete";
    return this;
  }

  // ---- select ----
  select(cols?: string, opts?: { count?: string; head?: boolean }) {
    if (opts?.head) this.headOnly = true;
    if (opts?.count) this.wantsCount = true;
    if (cols && cols.includes("organizations(")) this.joinKey = "organizations";
    return this;
  }

  // ---- filters ----
  eq(col: string, val: any) { this.filters.push((r) => r?.[col] === val); return this; }
  neq(col: string, val: any) { this.filters.push((r) => r?.[col] !== val); return this; }
  gt(col: string, val: any) { this.filters.push((r) => r?.[col] > val); return this; }
  gte(col: string, val: any) { this.filters.push((r) => r?.[col] >= val); return this; }
  lt(col: string, val: any) { this.filters.push((r) => r?.[col] < val); return this; }
  lte(col: string, val: any) { this.filters.push((r) => r?.[col] <= val); return this; }
  in(col: string, vals: any[]) { this.filters.push((r) => vals.includes(r?.[col])); return this; }
  is(col: string, val: any) { this.filters.push((r) => r?.[col] === val); return this; }
  not(_col: string, _op: string, _val: any) { return this; }
  or(_expr: string) { return this; }
  contains(_col: string, _val: any) { return this; }
  ilike(col: string, pattern: string) {
    const needle = pattern.replace(/%/g, "").toLowerCase();
    this.filters.push((r) => String(r?.[col] ?? "").toLowerCase().includes(needle));
    return this;
  }
  like(col: string, pattern: string) { return this.ilike(col, pattern); }
  match(_obj: Record<string, any>) { return this; }

  // ---- ordering / paging ----
  order(col: string, opts?: { ascending?: boolean }) {
    this.orderBy = { col, asc: opts?.ascending !== false };
    return this;
  }
  limit(n: number) { this.limitN = n; return this; }
  range(from: number, to: number) { this.rangeFrom = from; this.rangeTo = to; return this; }

  // ---- terminators (also implement thenable) ----
  single() { return this._resolve(true, false); }
  maybeSingle() { return this._resolve(true, true); }

  then<T1 = Resolved, T2 = never>(
    onFulfilled?: ((v: Resolved) => T1 | PromiseLike<T1>) | null,
    onRejected?: ((e: any) => T2 | PromiseLike<T2>) | null,
  ): PromiseLike<T1 | T2> {
    return this._resolve(false, false).then(onFulfilled as any, onRejected as any);
  }

  private async _resolve(asSingle: boolean, maybe: boolean): Promise<Resolved> {
    // simulate light async
    await new Promise((r) => setTimeout(r, 30));

    const tbl: any[] = (db as any)[this.table] ?? [];

    if (this.op === "insert" || this.op === "upsert") {
      const now = new Date().toISOString();
      const inserted = this.payload.map((p: any) => ({
        id: uid(this.table.slice(0, 3)),
        created_at: now,
        updated_at: now,
        ...p,
      }));
      tbl.push(...inserted);
      const data = asSingle ? inserted[0] : inserted;
      return { data, error: null };
    }

    if (this.op === "update") {
      const now = new Date().toISOString();
      let updated = 0;
      for (const row of tbl) {
        if (this.filters.every((f) => f(row))) {
          Object.assign(row, this.payload, { updated_at: now });
          updated++;
        }
      }
      return { data: null, error: null, count: updated };
    }

    if (this.op === "delete") {
      const keep: any[] = [];
      let removed = 0;
      for (const row of tbl) {
        if (this.filters.every((f) => f(row))) removed++;
        else keep.push(row);
      }
      (db as any)[this.table] = keep;
      return { data: null, error: null, count: removed };
    }

    // SELECT
    let rows = tbl.filter((r) => this.filters.every((f) => f(r)));

    if (this.orderBy) {
      const { col, asc } = this.orderBy;
      rows = [...rows].sort((a, b) => {
        const av = a?.[col]; const bv = b?.[col];
        if (av === bv) return 0;
        const cmp = av > bv ? 1 : -1;
        return asc ? cmp : -cmp;
      });
    }

    const totalCount = rows.length;

    if (this.rangeFrom !== null && this.rangeTo !== null) {
      rows = rows.slice(this.rangeFrom, this.rangeTo + 1);
    }
    if (this.limitN !== null) rows = rows.slice(0, this.limitN);

    // attach join data
    if (this.joinKey === "organizations") {
      rows = rows.map((r) => ({
        ...r,
        organizations: db.organizations.find((o) => o.id === r.organization_id) ?? null,
      }));
    }

    if (this.headOnly) {
      return { data: null, error: null, count: totalCount };
    }

    if (asSingle) {
      const first = rows[0] ?? null;
      if (!first && !maybe) {
        return { data: null, error: { message: "No rows", code: "PGRST116" } };
      }
      return { data: first, error: null };
    }

    return { data: rows, error: null, count: this.wantsCount ? totalCount : undefined };
  }
}

// --------- RPC handlers ---------
async function rpc(name: string, args: any = {}): Promise<{ data: any; error: any }> {
  await new Promise((r) => setTimeout(r, 30));

  switch (name) {
    case "has_role":
      // admin = true so super-admin pages are reachable in the demo
      return { data: true, error: null };

    case "get_bot_webhook_secret":
      return { data: "whsec_demo_8f4a92c1e7b3", error: null };

    case "rotate_bot_webhook_secret":
      return { data: "whsec_demo_" + Math.random().toString(36).slice(2, 14), error: null };

    case "get_org_quota":
      return {
        data: { conversation_limit: 5000, kb_char_limit: 250_000, seat_limit: 10 },
        error: null,
      };

    case "get_org_usage":
      return {
        data: {
          conversations_used: 247,
          messages_used: 1862,
          kb_chars_used: 29_600,
          seats_used: 2,
        },
        error: null,
      };

    case "get_founder_spots":
      return { data: { spots_remaining: 4 }, error: null };

    case "delete_organization":
      return { data: null, error: null };

    case "get_session_summaries": {
      // Aggregate chat_history into per-session summaries
      const byOrg = db.chat_history.filter((m) => m.organization_id === args._org_id);
      const sessions = new Map<string, any>();
      for (const m of byOrg) {
        const s = sessions.get(m.session_id);
        if (!s) {
          sessions.set(m.session_id, {
            session_id: m.session_id,
            message_count: 1,
            first_message_at: m.created_at,
            last_message_at: m.created_at,
            first_message_content: m.role === "user" ? m.content : null,
            associated_lead_email: null,
            total_count: 0,
          });
        } else {
          s.message_count++;
          if (m.created_at < s.first_message_at) s.first_message_at = m.created_at;
          if (m.created_at > s.last_message_at) s.last_message_at = m.created_at;
          if (!s.first_message_content && m.role === "user") s.first_message_content = m.content;
        }
      }
      for (const lead of db.leads) {
        const s = sessions.get(lead.session_id);
        if (s) s.associated_lead_email = lead.email;
      }
      const all = Array.from(sessions.values()).sort((a, b) =>
        b.last_message_at.localeCompare(a.last_message_at),
      );
      const total = all.length;
      const limit = args._limit ?? 20;
      const offset = args._offset ?? 0;
      const page = all.slice(offset, offset + limit).map((s) => ({ ...s, total_count: total }));
      return { data: page, error: null };
    }

    default:
      return { data: null, error: null };
  }
}

// --------- Functions.invoke ---------
async function invoke(name: string, _opts: any = {}): Promise<{ data: any; error: any }> {
  await new Promise((r) => setTimeout(r, 200));
  if (name === "enrich-google-business") {
    return {
      data: {
        name: "Acme Coffee Co.",
        address: "1450 NW Glisan St, Portland, OR",
        phone: "+1 503 555 0142",
        website: "https://acmecoffee.example.com",
        hours: "Mon–Sat 7am–7pm, Sun 8am–4pm",
      },
      error: null,
    };
  }
  if (name === "parse-file") {
    return { data: { content: "Demo parsed content (offline mode).", char_count: 1200 }, error: null };
  }
  if (name === "rescrape-source") {
    return { data: { ok: true, char_count: randomInt(2000, 18000) }, error: null };
  }
  return { data: { ok: true }, error: null };
}

// --------- Auth shim (always signed-in demo user) ---------
const fakeUser = {
  id: USER_ID,
  email: USER_EMAIL,
  app_metadata: {},
  user_metadata: { full_name: "Demo Owner" },
  aud: "authenticated",
  created_at: daysAgo(120, false),
};
const fakeSession = {
  access_token: "demo.access.token",
  refresh_token: "demo.refresh.token",
  expires_at: Math.floor(Date.now() / 1000) + 60 * 60 * 24,
  expires_in: 60 * 60 * 24,
  token_type: "bearer",
  user: fakeUser,
};

const auth = {
  async getSession() {
    return { data: { session: fakeSession }, error: null };
  },
  async getUser() {
    return { data: { user: fakeUser }, error: null };
  },
  onAuthStateChange(cb: (event: string, session: any) => void) {
    // Fire SIGNED_IN immediately so AuthProvider hydrates with the demo user.
    setTimeout(() => cb("SIGNED_IN", fakeSession), 0);
    return { data: { subscription: { unsubscribe() {} } } };
  },
  async signOut() {
    return { error: null };
  },
  async signInWithPassword() {
    return { data: { user: fakeUser, session: fakeSession }, error: null };
  },
  async signUp() {
    return { data: { user: fakeUser, session: fakeSession }, error: null };
  },
};

// --------- Storage shim ---------
const storage = {
  from(_bucket: string) {
    return {
      async upload(path: string, _file: any) {
        return { data: { path }, error: null };
      },
      async remove(_paths: string[]) {
        return { data: null, error: null };
      },
      getPublicUrl(path: string) {
        return { data: { publicUrl: `https://demo.local/${path}` } };
      },
    };
  },
};

// --------- exported supabase client ---------
export const supabase: any = {
  auth,
  storage,
  functions: { invoke },
  rpc,
  from(table: string) {
    return new QB(table);
  },
  channel(_name: string) {
    return {
      on() { return this; },
      subscribe() { return this; },
      unsubscribe() {},
    };
  },
  removeChannel(_c: any) {},
};
