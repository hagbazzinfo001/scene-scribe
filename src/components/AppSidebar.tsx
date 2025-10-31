import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { 
  FolderOpen, 
  Settings, 
  LogOut, 
  Film,
  Plus,
  Users,
  Shield,
  FileText
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
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

const navigationItems = [
  { title: "Projects", url: "/dashboard", icon: FolderOpen },
  { title: "Script Breakdown", url: "/script-breakdown", icon: FileText },
  { title: "AI Assistant Chat", url: "/ai-chat", icon: Users },
  { title: "Audio Cleanup", url: "/audio-cleanup", icon: Film },
  { title: "VFX & Animation", url: "/vfx-animation", icon: Plus },
  { title: "Settings", url: "/settings", icon: Settings },
  { title: "Admin", url: "/admin", icon: Shield },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { user, signOut } = useAuth();
  const location = useLocation();
  const currentPath = location.pathname;

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

  return (
    <Sidebar className={collapsed ? "w-14" : "w-64"} collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-2">
          <Film className="h-6 w-6 text-sidebar-primary" />
          {!collapsed && (
            <span className="font-semibold text-sidebar-foreground">
              Nollywood AI
            </span>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      className={getNavClass(item.url)}
                    >
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
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
                        {!collapsed && (
                          <span className="truncate">{project.name}</span>
                        )}
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
                  {!collapsed && <span>Sign Out</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}