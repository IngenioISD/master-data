import { useAuth } from "@/lib/auth";

export interface Permisos {
  puede_ver: boolean;
  puede_crear: boolean;
  puede_editar: boolean;
  puede_eliminar: boolean;
}

/**
 * Roles con CRUD completo sobre Datos Maestros.
 * El resto de roles son sólo lectura.
 */
const CRUD_ROLES = new Set<string>([
  "administracion",
  "jefe_obra",
  "jefe_produccion",
]);

function extractRol(claims: Record<string, unknown>): string | undefined {
  const candidates = [claims.rol_id, (claims as any).rol, (claims as any).rol_nombre, (claims as any).rol_slug];
  for (const c of candidates) {
    if (typeof c === "string" && c.length > 0) return c;
  }
  return undefined;
}

export function usePermisos() {
  const { claims, loading } = useAuth();
  const rol = extractRol(claims as Record<string, unknown>);
  const canCrud = !!rol && CRUD_ROLES.has(rol);

  const permisos: Permisos = {
    puede_ver: true,
    puede_crear: canCrud,
    puede_editar: canCrud,
    puede_eliminar: canCrud,
  };

  return { permisos, isLoading: loading, error: null as Error | null };
}
