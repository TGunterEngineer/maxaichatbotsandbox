# MAXAI Chatbot Sandbox — Architecture & Data Schema

Welcome to the **MAXAI Chatbot Sandbox** (`maxaichatbotsandbox`). This repository serves as a frontend preview and architectural blueprint showcasing an enterprise-ready, context-aware Retrieval-Augmented Generation (RAG) conversational chatbot engine built for automated lead generation and conversion tracking.

---

## 🔬 System Architecture Flowchart

The following high-level visual ASCII text flowchart maps out the core data layer, multi-tenant isolation layout, and RAG routing workflows driving the platform:
TODO: Document your project here
+-----------------------------------+
                      |         [ ORGANIZATIONS ]         |
                      |  - id (UUID, PK)                  |
                      |  - plan_tier / trial_ends_at      |
                      |  - allowed_origins (CORS Array)   |
                      +-----------------------------------+
                                        │
           ┌────────────────────────────┼────────────────────────────┐
           ▼ (1:1)                      ▼ (1:N)                      ▼ (1:N)
+-----------------------+    +-----------------------+    +-----------------------+
|    [ BOT_CONFIGS ]    |    |     [ KB_SOURCES ]    |    |      [ LEADS ]        |
| - id (UUID, PK)       |    | - id (UUID, PK)       |    | - id (UUID, PK)       |
| - system_prompt       |    | - kind (File/URL/Text)|    | - email / phone       |
| - tone / booking_link |    | - char_count / content|    | - preferred_time      |
+-----------------------+    +-----------------------+    +-----------------------+
            │                                                            ▲
            ▼ (Applies to)                                               │ (Captures)
+-----------------------+                                                │
|   [ CHAT_HISTORY ]    | ───────────────────────────────────────────────┘
| - id (UUID, PK)       |
| - session_id (TEXT)   | ───► [ CHAT_SUMMARIES ] (Asynchronous Context Compression)
| - role / content      | ───► [ AI_USAGE_LOG ]   (Token Consumption & Financial Audit)
+-----------------------+ ───► [ CHAT_RATE_LIMITS](DDoS/API Security Firewall)
