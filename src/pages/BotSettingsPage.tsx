import { DashboardLayout } from "@/components/DashboardLayout";
import BotSettings from "@/pages/BotSettings";

export default function BotSettingsPage() {
  return (
    <DashboardLayout
      title="Chatbot Configuration"
      description="Configure your AI chatbot's persona, system prompt, business hours, lead-capture rules, and integration secrets."
      path="/bot-settings"
    >
      <BotSettings />
    </DashboardLayout>
  );
}
