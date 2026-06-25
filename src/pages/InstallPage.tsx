import { DashboardLayout } from "@/components/DashboardLayout";
import Install from "./Install";

export default function InstallPage() {
  return (
    <DashboardLayout
      title="Install the Chatbot Widget"
      description="One-line install snippet plus platform-specific instructions for adding the MaximumAI chat widget to your website."
      path="/install"
    >
      <Install />
    </DashboardLayout>
  );
}
