import { ReactNode } from "react";
import { Helmet } from "react-helmet-async";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Code2 } from "lucide-react";
import { useDeveloperMode } from "@/hooks/useDeveloperMode";

const SITE_URL = "https://maxaichatbotsandbox.lovable.app";

interface DashboardLayoutProps {
  children: ReactNode;
  /** Page-specific H1 and <title>. Required so each route ships unique metadata. */
  title: string;
  /** Page-specific meta description (50–160 chars). */
  description: string;
  /** Route path beginning with "/" — used for canonical/og:url. */
  path: string;
}

export function DashboardLayout({ children, title, description, path }: DashboardLayoutProps) {
  const [devMode, setDevMode] = useDeveloperMode();
  const canonical = `${SITE_URL}${path}`;
  return (
    <SidebarProvider>
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={canonical} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={canonical} />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
      </Helmet>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-14 flex items-center border-b border-border/10 px-4 gap-4 bg-background">
            <SidebarTrigger />
            <h1 className="text-lg font-semibold truncate">{title}</h1>
            <div className="ml-auto flex items-center gap-2">
              <Code2 className={`h-4 w-4 ${devMode ? "text-primary" : "text-muted-foreground"}`} />
              <Label htmlFor="developer-mode" className="text-xs text-muted-foreground cursor-pointer select-none hidden sm:inline">
                Developer Mode
              </Label>
              <Switch
                id="developer-mode"
                checked={devMode}
                onCheckedChange={setDevMode}
                aria-label="Toggle developer mode"
              />
            </div>
          </header>
          <main className="flex-1 p-6 bg-muted">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
