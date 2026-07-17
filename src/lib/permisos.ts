import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export interface Permisos {
  puede_ver: boolean;
  puede_crear: boolean;
  puede_editar: boolean;
  puede_eliminar: boolean;
}

const EMPTY: Permisos = {
  puede_ver: false,
  puede_crear: false,
  puede_editar: false,
  puede_eliminar: false,
};

const MODULO = "datos_maestros";

export function usePermisos() {
  const { claims, loading } = useAuth();
  const clienteId = (claims.empresa_id as string | undefined) ?? undefined;
  const rolId = (claims.rol_id as string | undefined) ?? undefined;

  const { data, isLoading, error } = useQuery({
    queryKey: ["rol_permisos", clienteId, rolId, MODULO],
    enabled: !!clienteId && !!rolId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rol_permisos")
        .select("puede_ver, puede_crear, puede_editar, puede_eliminar")
        .eq("cliente_id", clienteId!)
        .eq("rol_id", rolId!)
        .eq("modulo", MODULO)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const permisos: Permisos = data
    ? {
        puede_ver: !!data.puede_ver,
        puede_crear: !!data.puede_crear,
        puede_editar: !!data.puede_editar,
        puede_eliminar: !!data.puede_eliminar,
      }
    : EMPTY;

  return { permisos, isLoading: loading || isLoading, error: (error as Error) ?? null };
}
