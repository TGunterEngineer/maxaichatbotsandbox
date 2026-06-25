import { DashboardLayout } from "@/components/DashboardLayout";
import Preview from "@/pages/Preview";

export default function PreviewPage() {
  return (
    <DashboardLayout
      title="Live Chatbot Preview"
      description="Preview your AI chatbot exactly as visitors will experience it on your site, with the current persona and knowledge base."
      path="/preview"
    >
      <Preview />
    </DashboardLayout>
  );
}
