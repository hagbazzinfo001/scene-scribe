import { NavLink, useLocation } from "react-router-dom";
import { 
  FolderOpen, 
  Settings, 
  LogOut, 
  Film,
  Plus,
  Users,
  Shield,
  FileText,
  Coins,
  Layout,
  Box,
  Crown
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useUserTier } from "@/hooks/useUserTier";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

const navigationItems = [
  { title: "Projects", url: "/dashboard", icon: FolderOpen, tier: 'free' },
  { title: "Script Breakdown", url: "/script-breakdown", icon: FileText, tier: 'free' },
  { title: "AI Assistant Chat", url: "/ai-chat", icon: Users, tier: 'free' },
  { title: "Audio Cleanup", url: "/audio-cleanup", icon: Film, tier: 'pro' },
  { title: "3D Mesh Generator", url: "/mesh-generator", icon: Box, tier: 'pro' },
  { title: "Motion Generator", url: "/motion-generator", icon: Film, tier: 'studio', studioOnly: true },
  { title: "Storyboard", url: "/storyboard", icon: Layout, tier: 'studio', studioOnly: true },
  { title: "VFX & Animation", url: "/vfx-animation", icon: Plus, tier: 'studio' },
  { title: "Buy Tokens", url: "/payment", icon: Coins, tier: 'free' },
  { title: "Settings", url: "/settings", icon: Settings, tier: 'free' },
  { title: "Admin", url: "/admin", icon: Shield, tier: 'admin' },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { user, signOut } = useAuth();
  const { tier, getTierLabel, getTierColor, canAccessFeature, hasFullAccess } = useUserTier();
  const location = useLocation();
  const currentPath = location.pathname;

  // Check if user is admin
  const { data: userRoles } = useQuery({
    queryKey: ["user-roles", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const isAdmin = userRoles?.some((r) => r.role === "admin") ?? false;

  // Fetch user's projects
  const { data: projects = [] } = useQuery({
    queryKey: ['projects', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('updated_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const isActive = (path: string) => currentPath === path;

  const getNavClass = (path: string) => 
    isActive(path) 
      ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" 
      : "hover:bg-sidebar-accent/50";

  // Filter navigation items based on tier and admin status
  const filteredNavItems = navigationItems.filter(item => {
    if (item.tier === 'admin') return isAdmin || hasFullAccess;
    return true; // Show all items, but some will be locked
  });

  return (
    <Sidebar className={collapsed ? "w-14" : "w-64"} collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-2">
          <Film className="h-6 w-6 text-sidebar-primary" />
          {!collapsed && (
            <span className="font-semibold text-sidebar-foreground">
              NollyAI Studio
            </span>
          )}
        </div>
        {!collapsed && (
          <div className="mt-2">
            <Badge className={`${getTierColor()} text-xs`}>
              {hasFullAccess && <Crown className="h-3 w-3 mr-1" />}
              {getTierLabel()}
            </Badge>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredNavItems.map((item) => {
                const isLocked = item.studioOnly && !canAccessFeature(item.url.replace('/', '').replace('-', '-'));
                
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink 
                        to={item.url} 
                        className={`${getNavClass(item.url)} flex items-center justify-between`}
                      >
                        <div className="flex items-center gap-2">
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </div>
                        {item.studioOnly && !collapsed && (
                          <Badge variant="outline" className="text-[10px] px-1 py-0 text-primary border-primary/50">
                            Studio
                          </Badge>
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {projects.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Recent Projects</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {projects.slice(0, 5).map((project) => (
                  <SidebarMenuItem key={project.id}>
                    <SidebarMenuButton asChild>
                      <NavLink 
                        to={`/project/${project.id}`}
                        className={getNavClass(`/project/${project.id}`)}
                      >
                        <FolderOpen className="h-4 w-4" />
                        <span className="truncate">{project.name}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={signOut}>
                  <LogOut className="h-4 w-4" />
                  <span>Sign Out</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
