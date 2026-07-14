import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

/**
 * Devuelve el cliente_id del usuario autenticado leyéndolo de
 * usuarios_cliente (vinculado por user_id al usuario del JWT).
 */
export function useClienteId() {
  const { user } = useAuth();
  const userId = user?.id;
  const query = useQuery({
    queryKey: ["usuarios_cliente_cliente_id", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("usuarios_cliente")
        .select("cliente_id")
        .eq("user_id", userId!)
        .maybeSingle();
      console.log("userId:", userId, "data:", data, "error:", error);
      if (error) throw error;
      return (data?.cliente_id as string | undefined) ?? null;
    },
  });
  return {
    clienteId: query.data ?? undefined,
    isLoading: query.isLoading,
    error: query.error as Error | null,
  };
}
