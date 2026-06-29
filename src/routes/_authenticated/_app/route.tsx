import {
  createFileRoute,
  Outlet,
  Link,
  useRouterState,
  useNavigate,
} from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Building2, FolderKanban, Truck, LogOut } from "lucide-react";
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
  SidebarProvider,
  SidebarTrigger,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/_app")({
  component: AppLayout,
});

const NAV = [
  { title: "Propiedad", url: "/propiedad", icon: Building2 },
  { title: "Proyectos", url: "/proyectos", icon: FolderKanban },
  { title: "Proveedores", url: "/proveedores", icon: Truck },
] as const;

function useCanAccess() {
  const { claims, user } = useAuth();
  const rolId = claims.rol_id as string | undefined;
  return useQuery({
    queryKey: ["acceso-datos-maestros", rolId, user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!rolId) return false;
      const { data, error } = await supabase
        .from("cliente_roles")
        .select("puede_gestionar_datos_maestros")
        .eq("id", rolId)
        .maybeSingle();
      if (error) throw error;
      return !!data?.puede_gestionar_datos_maestros;
    },
  });
}

function AppLayout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { data: canAccess, isLoading, error } = useCanAccess();

  async function handleSignOut() {
    await signOut();
    navigate({ to: "/auth", replace: true });
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Comprobando permisos…
      </div>
    );
  }

  if (error || !canAccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-md text-center">
          <div className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-primary-foreground">
            <span className="text-lg font-bold tracking-tight">Datos Maestros</span>
            <span className="inline-block h-2 w-2 rounded-full bg-accent" />
          </div>
          <h1 className="mt-8 text-xl font-semibold text-foreground">
            No tienes acceso a esta aplicación
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Tu rol actual no incluye permisos para gestionar Datos Maestros.
            Habla con el administrador de tu empresa si necesitas acceso.
          </p>
          {user?.email && (
            <p className="mt-1 text-xs text-muted-foreground">Sesión: {user.email}</p>
          )}
          <Button variant="outline" className="mt-6" onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" /> Cerrar sesión
          </Button>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex flex-1 flex-col">
          <header className="flex h-14 items-center justify-between border-b bg-card px-4">
            <div className="flex items-center gap-2">
              <SidebarTrigger />
              <span className="text-sm font-semibold text-foreground">Datos Maestros</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="hidden text-xs text-muted-foreground sm:inline">
                {user?.email}
              </span>
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" /> Salir
              </Button>
            </div>
          </header>
          <main className="flex-1 p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isActive = (url: string) => pathname === url || pathname.startsWith(url + "/");
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-accent" />
          <span className="text-sm font-bold tracking-tight text-sidebar-foreground">
            Datos Maestros
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Maestros</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
                    <Link to={item.url} className="flex items-center gap-2">
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <div className="px-2 py-2 text-[10px] uppercase tracking-wider text-sidebar-foreground/60">
          Ingenio
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
