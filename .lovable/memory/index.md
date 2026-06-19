# Project Memory

## Core
Agency SaaS — multi-org chatbot platform with super admin.
Dark theme, emerald/cyan accents. bg #0a0a0f.
Lovable Cloud enabled. Auto-confirm OFF — users must verify email.
Brand: MaximumAI Consulting. Custom domain: chat.maximumaiconsulting.com (subdomain of Framer marketing site at maximumaiconsulting.com).
Plan limits ENFORCED at DB level via triggers: kb_sources count (enforce_kb_source_limit), user_organizations seats (enforce_seat_limit), bot_configs.multilingual_enabled (enforce_multilingual_feature). Conversation quota + KB char cap enforced in chat edge fn. Plan tier matrix lives in get_org_kb_limit/get_org_seat_limit/get_org_quota/org_has_feature.
All plans require a paid setup fee — NO free trial.
Platform admin role auto-assigned ONLY to admin@maximumaiconsulting.com (in handle_new_user). Everyone else = member.
Chat hardening live: KB cap by plan, sliding-window history (>20 msgs), origin binding via organizations.allowed_origins, per-(org,ip) rate limit (30/60s), AI usage logged to ai_usage_log, lead-notes JSON validated, EdgeRuntime.waitUntil for atomic persistence, prompt-injection guard in system prompt.
cleanup-conversations cron runs daily at 03:00 UTC, 30-day retention.
Pricing strategy: Founder card + 3 tiers (Essential/Growth/Premium) shown together on /pricing. Founder is the bargain anchor; 3 tiers create value contrast. Do NOT swap to founder-only.
Embed snippet on Onboarding hardcoded to https://chat.maximumaiconsulting.com — never use window.location.origin (would leak preview URLs to customers).

## Memories
- [Future: Lead email notifications](mem://features/lead-email-notifications) — Set up when user publishes with own domain
