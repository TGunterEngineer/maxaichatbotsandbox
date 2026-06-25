import { DashboardLayout } from "@/components/DashboardLayout";
import Conversations from "@/pages/Conversations";

export default function ConversationsPage() {
  return (
    <DashboardLayout
      title="Chatbot Conversations"
      description="Browse complete transcripts of every visitor conversation with your AI chatbot, including session timing and lead outcomes."
      path="/conversations"
    >
      <Conversations />
    </DashboardLayout>
  );
}
