import { DashboardLayout } from "@/components/DashboardLayout";
import Leads from "@/pages/Leads";

export default function LeadsPage() {
  return (
    <DashboardLayout
      title="Manage Your Captured Leads"
      description="Review every lead your AI chatbot has captured: contact info, intent notes, conversation source, and follow-up status."
      path="/leads"
    >
      <Leads />
    </DashboardLayout>
  );
}
