import { LayoutDashboard, Settings, Users, LogOut, Bot, Shield, MessageSquare, Eye, Code, LifeBuoy, Sparkles, Database, Brain } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganization } from "@/hooks/useOrganization";
import { OrgSwitcher } from "@/components/OrgSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";
import { supabase } from "@/integrations/supabase/client";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

const allNavItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard, roles: ["owner", "member"] },
  { title: "Bot Settings", url: "/bot-settings", icon: Settings, roles: ["owner"] },
  { title: "Leads", url: "/leads", icon: Users, roles: ["owner", "member"] },
  { title: "Conversations", url: "/conversations", icon: MessageSquare, roles: ["owner", "member"] },
  { title: "Intelligence", url: "/intelligence", icon: Brain, roles: ["owner", "member"] },
  { title: "AI Playground", url: "/playground", icon: Sparkles, roles: ["owner", "member"] },
  { title: "RAG Debugger", url: "/rag-debugger", icon: Database, roles: ["owner"] },
  { title: "Widget Preview", url: "/preview", icon: Eye, roles: ["owner"] },
  { title: "Install", url: "/install", icon: Code, roles: ["owner"] },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { signOut, user } = useAuth();
  const { currentRole } = useOrganization();

  const { data: isAdmin } = useQuery({
    queryKey: ["is-admin", user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
      return !!data;
    },
    enabled: !!user,
  });

  const navItems = allNavItems.filter(
    (item) => !currentRole || item.roles.includes(currentRole)
  );

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-3 py-3">
        <div className="flex items-center gap-2 mb-2">
          <Bot className="h-5 w-5 shrink-0" />
          {!collapsed && <span className="font-semibold text-sm">MaximumAI</span>}
        </div>
        {!collapsed && <OrgSwitcher />}
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className="hover:bg-muted/50"
                      activeClassName="bg-muted text-primary font-medium"
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              {isAdmin && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to="/super-admin"
                      className="hover:bg-muted/50"
                      activeClassName="bg-muted text-primary font-medium"
                    >
                      <Shield className="mr-2 h-4 w-4" />
                      {!collapsed && <span>Super Admin</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="gap-1">
        <ThemeToggle collapsed={collapsed} />
        <Button variant="ghost" size="sm" asChild className="w-full justify-start gap-2">
          <a href="mailto:support@maximumaiconsulting.com">
            <LifeBuoy className="h-4 w-4" />
            {!collapsed && <span>Support</span>}
          </a>
        </Button>
        <Button variant="ghost" size="sm" onClick={signOut} className="w-full justify-start gap-2">
          <LogOut className="h-4 w-4" />
          {!collapsed && <span>Sign Out</span>}
        </Button>
        <div className="flex items-center justify-center gap-2 px-2 pt-1">
          {!collapsed && (
            <>
              <NavLink to="/terms" className="text-[10px] text-muted-foreground hover:text-foreground transition-colors">Terms</NavLink>
              <span className="text-[10px] text-muted-foreground">·</span>
              <NavLink to="/privacy" className="text-[10px] text-muted-foreground hover:text-foreground transition-colors">Privacy</NavLink>
            </>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
