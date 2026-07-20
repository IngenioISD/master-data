import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useClienteId } from "@/lib/cliente";
import { usePermisos } from "@/lib/permisos";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { BuscarOCrearCombobox } from "@/components/buscar-o-crear-combobox";

export const Route = createFileRoute("/_authenticated/proyectos/")({
  head: () => ({ meta: [{ title: "Proyectos · Datos Maestros" }] }),
  component: ProyectosList,
});

const ESTADOS = [
  { value: "en_estudio", label: "En estudio" },
  { value: "adjudicado", label: "Adjudicado" },
  { value: "perdido", label: "Perdido" },
  { value: "finalizado", label: "Finalizado" },
] as const;

const estadoLabel = (v: string | null | undefined) =>
  ESTADOS.find((e) => e.value === v)?.label ?? v ?? "";

const estadoColor: Record<string, string> = {
  en_estudio: "bg-secondary text-secondary-foreground",
  adjudicado: "bg-accent text-accent-foreground",
  perdido: "bg-destructive/15 text-destructive",
  finalizado: "bg-primary/10 text-primary",
};

interface Row {
  id: string;
  nombre: string;
  codigo_obra: string | null;
  estado: string | null;
  tipo_obra: string | null;
}

function ProyectosList() {
  const { permisos } = usePermisos();
  const { clienteId } = useClienteId();

  const [q, setQ] = useState("");
  const [estado, setEstado] = useState<string>("__all");

  const { data = [], isLoading } = useQuery({
    queryKey: ["proyectos", clienteId, q, estado],
    enabled: !!clienteId,
    queryFn: async () => {
      let qb = supabase
        .from("proyectos")
        .select("id, nombre, codigo_obra, estado, tipo_obra")
        .eq("cliente_id", clienteId!);
      if (q) qb = qb.or(`nombre.ilike.%${q}%,codigo_obra.ilike.%${q}%`);
      if (estado !== "__all") qb = qb.eq("estado", estado);
      const { data, error } = await qb.order("nombre");
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Proyectos</h1>
          <p className="text-sm text-muted-foreground">Proyectos de tu cliente.</p>
        </div>
        {permisos.puede_crear && <NuevoProyectoDialog />}
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar por nombre o código…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
        </div>
        <div className="flex flex-wrap gap-1">
          <Button size="sm" variant={estado === "__all" ? "default" : "outline"} onClick={() => setEstado("__all")}>Todos</Button>
          {ESTADOS.map((e) => (
            <Button key={e.value} size="sm" variant={estado === e.value ? "default" : "outline"} onClick={() => setEstado(e.value)}>{e.label}</Button>
          ))}
        </div>
      </div>
      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Código</TableHead>
              <TableHead>Tipo de obra</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Cargando…</TableCell></TableRow>}
            {!isLoading && data.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Sin resultados</TableCell></TableRow>}
            {data.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.nombre}</TableCell>
                <TableCell>{p.codigo_obra ?? "—"}</TableCell>
                <TableCell>{p.tipo_obra ?? "—"}</TableCell>
                <TableCell>{p.estado && <Badge className={estadoColor[p.estado]}>{estadoLabel(p.estado)}</Badge>}</TableCell>
                <TableCell className="text-right">
                  <Button asChild variant="ghost" size="sm">
                    <Link to="/proyectos/$id" params={{ id: p.id }}>Abrir</Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function NuevoProyectoDialog() {
  const { clienteId } = useClienteId();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [nombre, setNombre] = useState("");
  const [propiedadId, setPropiedadId] = useState<string | null>(null);
  const [propiedadLabel, setPropiedadLabel] = useState<string | null>(null);
  const [tipoObra, setTipoObra] = useState<string>("");
  const [estadoNuevo, setEstadoNuevo] = useState<"en_estudio" | "adjudicado" | "">("");
  const [codigoEstudios, setCodigoEstudios] = useState("");
  const [codigoObra, setCodigoObra] = useState("");
  const [fechaAdjudicacion, setFechaAdjudicacion] = useState("");
  const [plazoMeses, setPlazoMeses] = useState("");
  const [dirObra, setDirObra] = useState<{
    via: string; numero: string; cp: string; municipio: string; provincia: string;
  }>({ via: "", numero: "", cp: "", municipio: "", provincia: "" });

  const reset = () => {
    setNombre(""); setPropiedadId(null); setPropiedadLabel(null); setTipoObra("");
    setEstadoNuevo(""); setCodigoEstudios(""); setCodigoObra("");
    setFechaAdjudicacion(""); setPlazoMeses("");
    setDirObra({ via: "", numero: "", cp: "", municipio: "", provincia: "" });
  };

  const { data: tipos = [] } = useQuery({
    queryKey: ["catalogo", "tipo_obra"],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("catalogo")
        .select("id, codigo, etiqueta")
        .eq("categoria", "tipo_obra")
        .order("etiqueta");
      if (error) throw error;
      return (data ?? []) as { id: string; codigo: string; etiqueta: string | null }[];
    },
  });

  const crear = useMutation({
    mutationFn: async () => {
      if (!nombre || !propiedadId || !tipoObra || !clienteId || !estadoNuevo) {
        throw new Error("Completa los campos obligatorios");
      }
      const payload: Record<string, unknown> = {
        nombre, cliente_id: clienteId, propiedad_id: propiedadId,
        tipo_obra: tipoObra, estado: estadoNuevo,
      };
      if (estadoNuevo === "en_estudio") {
        if (codigoEstudios) payload.codigo_estudios = codigoEstudios;
      } else {
        if (!codigoObra || !fechaAdjudicacion || !plazoMeses || !dirObra.municipio || !dirObra.provincia) {
          throw new Error("Completa los campos obligatorios de adjudicación");
        }
        payload.codigo_obra = codigoObra;
        payload.fecha_adjudicacion = fechaAdjudicacion;
        payload.plazo_ejecucion_meses = Number(plazoMeses);
        payload.nombre_via = dirObra.via || null;
        payload.numero = dirObra.numero || null;
        payload.codigo_postal = dirObra.cp || null;
        payload.municipio = dirObra.municipio;
        payload.provincia = dirObra.provincia;
      }
      const { error } = await supabase.from("proyectos").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Proyecto creado");
      qc.invalidateQueries({ queryKey: ["proyectos"] });
      setOpen(false); reset();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button><Plus className="mr-2 h-4 w-4" /> Nuevo proyecto</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Nuevo proyecto</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Estado *</Label>
            <Select value={estadoNuevo} onValueChange={(v) => setEstadoNuevo(v as "en_estudio" | "adjudicado")}>
              <SelectTrigger><SelectValue placeholder="Selecciona…" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="en_estudio">En estudio</SelectItem>
                <SelectItem value="adjudicado">Adjudicado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Nombre *</Label>
            <Input value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Propiedad *</Label>
            <BuscarOCrearCombobox
              placeholder="Buscar propiedad por nombre o NIF…"
              queryKey={["propiedad-search-nuevo", clienteId]}
              search={async (term) => {
                if (!clienteId) return [];
                let qb = supabase
                  .from("propiedad")
                  .select("id, nif, nombre_legal, clientes_propiedades!inner(cliente_id, nombre_comercial)")
                  .eq("clientes_propiedades.cliente_id", clienteId);
                if (term) qb = qb.or(`nombre_legal.ilike.%${term}%,nif.ilike.%${term}%`);
                const { data, error } = await qb.limit(20);
                if (error) throw error;
                return (data ?? []).map((p) => {
                  const cp = Array.isArray(p.clientes_propiedades) ? p.clientes_propiedades[0] : p.clientes_propiedades;
                  const nombre_comercial = (cp as { nombre_comercial?: string | null } | null)?.nombre_comercial ?? null;
                  return { id: p.id as string, nif: p.nif as string, nombre_legal: p.nombre_legal as string, nombre_comercial };
                });
              }}
              getLabel={(p) => p.nombre_comercial || p.nombre_legal}
              getSubLabel={(p) => p.nif}
              getValue={(p) => p.id}
              value={propiedadId}
              selectedLabel={propiedadLabel}
              onSelect={(p) => { setPropiedadId(p.id); setPropiedadLabel(p.nombre_comercial || p.nombre_legal); }}
            />
            <p className="text-xs text-muted-foreground">
              ¿No está? Créala primero desde la sección Propiedad.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label>Tipo de obra *</Label>
            <Select value={tipoObra} onValueChange={setTipoObra}>
              <SelectTrigger><SelectValue placeholder="Selecciona…" /></SelectTrigger>
              <SelectContent>
                {tipos.map((t) => (
                  <SelectItem key={t.id} value={t.codigo}>{t.etiqueta || t.codigo}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {estadoNuevo === "en_estudio" && (
            <div className="space-y-1.5">
              <Label>Código de estudios</Label>
              <Input value={codigoEstudios} onChange={(e) => setCodigoEstudios(e.target.value)} />
            </div>
          )}

          {estadoNuevo === "adjudicado" && (
            <div className="space-y-3 border-t pt-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label>Código de obra *</Label>
                  <Input value={codigoObra} onChange={(e) => setCodigoObra(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Fecha de adjudicación *</Label>
                  <Input type="date" value={fechaAdjudicacion} onChange={(e) => setFechaAdjudicacion(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Plazo (meses) *</Label>
                  <Input type="number" min="1" value={plazoMeses} onChange={(e) => setPlazoMeses(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Dirección de la obra *</Label>
                <DireccionFiscalFields value={dirObra} onChange={(v) => setDirObra({
                  via: v.via ?? "", numero: v.numero ?? "", cp: v.cp ?? "",
                  municipio: v.municipio ?? "", provincia: v.provincia ?? "",
                })} requiredKeys={["municipio", "provincia"]} hidePais />
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={() => crear.mutate()} disabled={crear.isPending}>Crear</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

