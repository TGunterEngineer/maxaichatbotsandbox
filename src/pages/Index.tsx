import { DashboardLayout } from "@/components/DashboardLayout";
import Dashboard from "@/pages/Dashboard";

const Index = () => (
  <DashboardLayout
    title="MaximumAI Chatbot Dashboard"
    description="Live overview of chatbot conversations, captured leads, and lead-funnel performance across your AI chatbot deployment."
    path="/"
  >
    <Dashboard />
  </DashboardLayout>
);

export default Index;
