import { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Code2 } from "lucide-react";
import { useDeveloperMode } from "@/hooks/useDeveloperMode";

export function DashboardLayout({ children }: { children: ReactNode }) {
  const [devMode, setDevMode] = useDeveloperMode();
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-14 flex items-center border-b border-border/10 px-4 gap-4 bg-background">
            <SidebarTrigger />
            <h1 className="text-lg font-semibold">MaximumAI</h1>
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

