import { Calendar, Home, PlaySquare, Settings, Puzzle, Layers } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import Image from "next/image";

const items = [
  { title: "Dashboard", url: "/dashboard", icon: Home },
  { title: "Schedule", url: "#", icon: Calendar },
  { title: "Simulation", url: "/simulation", icon: PlaySquare },
  { title: "Task Simulation", url: "/simulation-new", icon: Layers },
  { title: "Plugins", url: "/plugins", icon: Puzzle },
  { title: "Settings", url: "#", icon: Settings },
];

export function AppSidebar() {
  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 p-2">
          <Image src="/agrios_logo.png" alt="AgriOS" width={28} height={28} />
          <span className="font-semibold text-sm group-data-[collapsible=icon]:hidden">
            AgriOS
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Application</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <a href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
