import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/DashboardLayout";
import BotSettings from "@/pages/BotSettings";
import Auth from "@/pages/Auth";

export default function BotSettingsPage() {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  if (!user) return <Auth />;
  return <DashboardLayout><BotSettings /></DashboardLayout>;
}
