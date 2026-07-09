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

/**
 * Fuente única de permisos para el módulo `datos_maestros`.
 * Consulta `rol_permisos` filtrando por cliente_id (empresa_id del JWT),
 * rol_id (rol_id del JWT) y modulo = 'datos_maestros'. Mismo patrón que
 * los módulos de Actas y Albaranes.
 */
export function usePermisos() {
  const { claims, user } = useAuth();
  const clienteId = claims.empresa_id as string | undefined;
  const rolId = claims.rol_id as string | undefined;

  const query = useQuery<Permisos>({
    queryKey: ["permisos-datos-maestros", clienteId, rolId, user?.id],
    enabled: !!user && !!clienteId && !!rolId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rol_permisos")
        .select("puede_ver, puede_crear, puede_editar, puede_eliminar")
        .eq("cliente_id", clienteId!)
        .eq("rol_id", rolId!)
        .eq("modulo", "datos_maestros")
        .maybeSingle();
      if (error) throw error;
      if (!data) return EMPTY;
      return {
        puede_ver: !!data.puede_ver,
        puede_crear: !!data.puede_crear,
        puede_editar: !!data.puede_editar,
        puede_eliminar: !!data.puede_eliminar,
      };
    },
  });

  return {
    permisos: query.data ?? EMPTY,
    isLoading: query.isLoading,
    error: query.error as Error | null,
  };
}
