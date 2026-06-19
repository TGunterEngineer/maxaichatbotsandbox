import { useOrganization } from "@/hooks/useOrganization";
import { DashboardLayout } from "@/components/DashboardLayout";
import Dashboard from "@/pages/Dashboard";
import { ChatWidget } from "@/components/ChatWidget";

const Index = () => {
  const { organizationId } = useOrganization();
  return (
    <DashboardLayout>
      <Dashboard />
      {organizationId && <ChatWidget organizationId={organizationId} />}
    </DashboardLayout>
  );
};

export default Index;
