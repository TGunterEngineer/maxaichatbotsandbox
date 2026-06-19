---
name: Appointment scheduling
description: Path A SHIPPED — bot captures preferred_time + offers Cal.com (or any) booking link. Toggle in Bot Settings, default ON. Path B (per-org OAuth direct booking) deferred — Cal.com integration replaces the need for it.
type: feature
---

# Appointment Scheduling

## Path A — SHIPPED ✅
Two-tier flow: **booking link first, preferred-time fallback.**

**Plumbing:**
- `bot_configs.booking_link` (text, nullable) — any URL (Cal.com, Calendly, SavvyCal, TidyCal, etc.)
- `bot_configs.ask_for_preferred_time` (bool, default true) — fallback toggle
- `leads.preferred_time` (text, nullable) — captured value
- `chat/index.ts` system prompt:
  - If `booking_link` set → bot offers it once when hot lead discusses next steps
  - If lead skips/declines AND `ask_for_preferred_time` ON → bot asks for preferred day/time
- LEAD_NOTES JSON includes `preferred_time`; persisted on insert + update of leads
- Surfaced in: Leads table column, hot-lead email (`preferredTime` prop), Bot Settings

**Bot Settings → "Calendar Booking" card:**
- 3 quickstart buttons → Cal.com signup, calendar connect, event-type creation (open in new tabs)
- Booking link input + open-in-new-tab button
- Fallback "ask for preferred time" toggle

## Path B — Per-org OAuth direct booking (DEFERRED — likely never needed)
Cal.com handles the entire booking workflow (calendar sync, timezones, reminders, reschedules) without us writing OAuth or calendar APIs. Only revisit if a Premium client demands native in-chat booking without leaving the widget.
