import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { ArrowLeft, Save, Plus, Trash2, Pencil, X } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useClienteId } from "@/lib/cliente";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DireccionFiscalFields, type DireccionFiscal } from "@/components/direccion-fiscal-fields";
import { BuscarOCrearCombobox } from "@/components/buscar-o-crear-combobox";
import { usePermisos } from "@/lib/permisos";

const ESTADOS = [
  { value: "en_estudio", label: "En estudio" },
  { value: "adjudicado", label: "Adjudicado" },
  { value: "perdido", label: "Perdido" },
  { value: "finalizado", label: "Finalizado" },
] as const;

const estadoLabel = (v: string | null | undefined) =>
  ESTADOS.find((e) => e.value === v)?.label ?? v ?? "";

export const Route = createFileRoute("/_authenticated/proyectos/$id")({
  head: () => ({ meta: [{ title: "Proyecto · Datos Maestros" }] }),
  component: ProyectoDetail,
});

function ProyectoDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const { permisos } = usePermisos();

  const { data, isLoading } = useQuery({
    queryKey: ["proyecto", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("proyectos").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const [nombre, setNombre] = useState("");
  const [tipoObra, setTipoObra] = useState("");
  const [codigoEstudios, setCodigoEstudios] = useState("");
  const [propiedadId, setPropiedadId] = useState<string | null>(null);
  const [adjudicarOpen, setAdjudicarOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);

  const resetForm = () => {
    if (!data) return;
    setNombre(data.nombre ?? "");
    setTipoObra(data.tipo_obra ?? "");
    setCodigoEstudios(data.codigo_estudios ?? "");
    setPropiedadId(data.propiedad_id ?? null);
  };

  useEffect(() => {
    if (data) {
      setNombre(data.nombre ?? "");
      setTipoObra(data.tipo_obra ?? "");
      setCodigoEstudios(data.codigo_estudios ?? "");
      setPropiedadId(data.propiedad_id ?? null);
    }
  }, [data]);


  const { data: tipos = [] } = useQuery({
    queryKey: ["catalogo", "tipo_obra"],
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

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("proyectos")
        .update({
          nombre,
          tipo_obra: tipoObra,
          propiedad_id: propiedadId,
          codigo_estudios: data?.estado === "en_estudio" ? (codigoEstudios || null) : data?.codigo_estudios ?? null,
        })
        .eq("id", id);
      if (error) throw error;
    },

    onSuccess: () => {
      toast.success("Cambios guardados");
      setEditMode(false);
      qc.invalidateQueries({ queryKey: ["proyecto", id] });
      qc.invalidateQueries({ queryKey: ["proyectos"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const cambiarEstado = useMutation({
    mutationFn: async (nuevo: string) => {
      const { error } = await supabase.from("proyectos").update({ estado: nuevo }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["proyecto", id] });
      qc.invalidateQueries({ queryKey: ["proyectos"] });
      toast.success("Estado actualizado");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <div className="text-sm text-muted-foreground">Cargando…</div>;
  if (!data) return <div className="text-sm text-muted-foreground">No encontrado.</div>;

  const canEdit = permisos.puede_editar;
  const editing = canEdit && editMode;

  const tipoObraLabel = tipos.find((t) => t.codigo === tipoObra)?.etiqueta || tipoObra;

  const Field = ({ label, value, colSpan = "" }: { label: string; value: string; colSpan?: string }) => (
    <div className={`space-y-1 ${colSpan}`}>
      <Label className="text-muted-foreground">{label}</Label>
      <p className="text-sm">{value || <span className="text-muted-foreground">—</span>}</p>
    </div>
  );

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link to="/proyectos">
              <ArrowLeft className="mr-2 h-4 w-4" /> Volver
            </Link>
          </Button>
          <h1 className="text-xl font-bold">{nombre}</h1>
          {data.estado && <Badge variant="outline">{estadoLabel(data.estado)}</Badge>}
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Datos generales del proyecto</CardTitle>
          {canEdit && !editing && (
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="icon" variant="ghost" onClick={() => setEditMode(true)} aria-label="Editar">
                    <Pencil className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Editar</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          {editing && (
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  resetForm();
                  setEditMode(false);
                }}
              >
                <X className="mr-2 h-4 w-4" /> Cancelar
              </Button>
              <Button size="sm" onClick={() => save.mutate()} disabled={save.isPending}>
                <Save className="mr-2 h-4 w-4" /> Guardar
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {editing ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Nombre</Label>
                <Input value={nombre} onChange={(e) => setNombre(e.target.value)} />
              </div>
              {data.estado === "en_estudio" && (
                <div className="space-y-1.5">
                  <Label>Código de estudios</Label>
                  <Input value={codigoEstudios} onChange={(e) => setCodigoEstudios(e.target.value)} />
                </div>
              )}
              <div className="space-y-1.5">
                <Label>Tipo de obra</Label>
                <Select value={tipoObra} onValueChange={setTipoObra}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {tipos.map((t) => (
                      <SelectItem key={t.id} value={t.codigo}>
                        {t.etiqueta || t.codigo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label>Propiedad</Label>
                <PropiedadPicker value={propiedadId} onChange={setPropiedadId} />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Nombre" value={nombre} />
              {data.estado === "en_estudio" && (
                <Field label="Código de estudios" value={codigoEstudios} />
              )}
              <Field label="Tipo de obra" value={tipoObraLabel} />
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-muted-foreground">Propiedad</Label>
                <PropiedadReadOnly propiedadId={propiedadId} />
              </div>
            </div>

          )}

          {data.estado === "adjudicado" && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 border-t pt-4">
              <Field label="Código" value={data.codigo_obra ?? ""} />
              <Field
                label="Fecha adjudicación"
                value={
                  data.fecha_adjudicacion
                    ? new Date(data.fecha_adjudicacion).toLocaleDateString("es-ES").replaceAll("/", "-")
                    : ""
                }
              />
              <Field label="Duración (meses)" value={String(data.plazo_ejecucion_meses ?? "")} />
            </div>
          )}

          <div className="flex items-center gap-3 border-t pt-4">
            <Label className="m-0">Estado:</Label>
            {editing ? (
              <Select
                value={data.estado ?? "en_estudio"}
                onValueChange={(v) => {
                  if (v === "adjudicado" && data.estado !== "adjudicado") {
                    setAdjudicarOpen(true);
                  } else {
                    cambiarEstado.mutate(v);
                  }
                }}
              >
                <SelectTrigger className="w-56">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ESTADOS.map((e) => (
                    <SelectItem key={e.value} value={e.value}>
                      {e.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Badge variant="outline">{estadoLabel(data.estado)}</Badge>
            )}
          </div>
        </CardContent>
      </Card>


      <AdjudicarDialog
        open={adjudicarOpen}
        onOpenChange={setAdjudicarOpen}
        proyectoId={id}
        initial={data}
        onDone={() => {
          setAdjudicarOpen(false);
          qc.invalidateQueries({ queryKey: ["proyecto", id] });
          qc.invalidateQueries({ queryKey: ["proyectos"] });
        }}
      />

    </div>
  );
}

function PropiedadReadOnly({ propiedadId }: { propiedadId: string | null }) {
  const { clienteId } = useClienteId();
  const { data } = useQuery({
    queryKey: ["propiedad-readonly", clienteId, propiedadId],
    enabled: !!propiedadId && !!clienteId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("propiedad")
        .select("id, nombre_legal, clientes_propiedades!inner(cliente_id, nombre_comercial)")
        .eq("id", propiedadId!)
        .eq("clientes_propiedades.cliente_id", clienteId!)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const cp = Array.isArray(data.clientes_propiedades) ? data.clientes_propiedades[0] : data.clientes_propiedades;
      return { label: (cp?.nombre_comercial as string | null) || data.nombre_legal };
    },
  });
  return (
    <p className="text-sm">
      {data?.label || <span className="text-muted-foreground">—</span>}
    </p>
  );
}

function PropiedadPicker({ value, onChange }: { value: string | null; onChange: (v: string) => void }) {
  const { clienteId } = useClienteId();

  const { data: selectedInfo } = useQuery({
    queryKey: ["propiedad-picker-selected", clienteId, value],
    enabled: !!value && !!clienteId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("propiedad")
        .select("id, nombre_legal, clientes_propiedades!inner(cliente_id, nombre_comercial)")
        .eq("id", value!)
        .eq("clientes_propiedades.cliente_id", clienteId!)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const cp = Array.isArray(data.clientes_propiedades) ? data.clientes_propiedades[0] : data.clientes_propiedades;
      return { label: (cp?.nombre_comercial as string | null) || data.nombre_legal };
    },
  });

  return (
    <BuscarOCrearCombobox
      placeholder="Buscar propiedad…"
      queryKey={["propiedad-picker", clienteId]}
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
          return {
            id: p.id,
            nif: p.nif,
            nombre_legal: p.nombre_legal,
            nombre_comercial: (cp?.nombre_comercial as string | null) ?? null,
          };
        });
      }}
      getLabel={(p) => p.nombre_comercial || p.nombre_legal}
      getSubLabel={(p) => p.nif}
      getValue={(p) => p.id}
      value={value}
      selectedLabel={selectedInfo?.label ?? null}
      onSelect={(p) => onChange(p.id)}
    />
  );
}

function AdjudicarDialog({
  open,
  onOpenChange,
  proyectoId,
  initial,
  onDone,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  proyectoId: string;
  initial?: Record<string, unknown> | null;
  onDone: () => void;
}) {
  const [codigo, setCodigo] = useState("");
  const [fecha, setFecha] = useState("");
  const [meses, setMeses] = useState<string>("");
  const [dir, setDir] = useState<DireccionFiscal>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    const d = (initial ?? {}) as Record<string, unknown>;
    const str = (v: unknown) => (v == null ? "" : String(v));
    setCodigo(str(d.codigo_obra));
    setFecha(str(d.fecha_adjudicacion));
    setMeses(d.plazo_ejecucion_meses == null ? "" : String(d.plazo_ejecucion_meses));
    setDir({
      via: (d.nombre_via as string | null) ?? (d.via as string | null) ?? "",
      numero: (d.numero as string | null) ?? "",
      cp: (d.codigo_postal as string | null) ?? (d.cp as string | null) ?? "",
      municipio: (d.municipio as string | null) ?? "",
      provincia: (d.provincia as string | null) ?? "",
    });
  }, [open, initial]);

  async function confirmar() {
    if (!codigo || !fecha || !meses || !dir.municipio || !dir.provincia) {
      toast.error("Faltan campos obligatorios para adjudicar.");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase
      .from("proyectos")
      .update({
        estado: "adjudicado",
        codigo_obra: codigo,
        fecha_adjudicacion: fecha,
        plazo_ejecucion_meses: Number(meses),
        nombre_via: dir.via,
        numero: dir.numero,
        codigo_postal: dir.cp,

        municipio: dir.municipio,
        provincia: dir.provincia,
      })
      .eq("id", proyectoId);
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Proyecto adjudicado");
    onDone();
  }


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Adjudicar proyecto</DialogTitle>
          <DialogDescription>Para pasar el proyecto a Adjudicado necesitas completar estos datos.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label>Código *</Label>
            <Input value={codigo} onChange={(e) => setCodigo(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Fecha de adjudicación *</Label>
            <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Duración (meses) *</Label>
            <Input type="number" min="1" value={meses} onChange={(e) => setMeses(e.target.value)} />
          </div>
        </div>
        <div className="space-y-2 border-t pt-3">
          <Label className="text-sm font-medium">Dirección de la obra *</Label>
          <DireccionFiscalFields value={dir} onChange={setDir} requiredKeys={["municipio", "provincia"]} hidePais />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={confirmar} disabled={submitting}>
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface PPRow {
  id: string;
  proveedor_id: string;
  activo: boolean | null;
  proveedor_subcontrata: { nombre_legal: string; nif: string; tipo_proveedor: string | null } | null;
}

function ProveedoresAsignados({
  proyectoId,
  canCreate = true,
  canEdit = true,
  canDelete = true,
}: {
  proyectoId: string;
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
}) {
  const { claims } = useAuth();
  const clienteId = claims.cliente_id as string | undefined;
  const qc = useQueryClient();
  const queryKey = ["proyecto-proveedores", proyectoId] as const;

  const { data = [], isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("proyecto_proveedores")
        .select("id, proveedor_id, activo, proveedor_subcontrata(nombre_legal, nif, tipo_proveedor)")
        .eq("proyecto_id", proyectoId);
      if (error) throw error;
      return (data ?? []) as unknown as PPRow[];
    },
  });

  const asignar = useMutation({
    mutationFn: async (proveedorId: string) => {
      const { error } = await supabase.from("proyecto_proveedores").insert({
        proyecto_id: proyectoId,
        proveedor_id: proveedorId,
        activo: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
      toast.success("Proveedor asignado");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggle = useMutation({
    mutationFn: async ({ id, activo }: { id: string; activo: boolean }) => {
      const { error } = await supabase.from("proyecto_proveedores").update({ activo }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey }),
    onError: (e: Error) => toast.error(e.message),
  });

  const eliminar = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("proyecto_proveedores").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
      toast.success("Eliminado");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-3">
      {canCreate && (
        <div className="max-w-md">
          <BuscarOCrearCombobox
            placeholder="Asignar proveedor (busca por nombre o NIF)…"
            queryKey={["proveedor-search", clienteId]}
            search={async (term) => {
              if (!clienteId) return [];
              let qb = supabase
                .from("proveedor_subcontrata")
                .select("id, nif, nombre_legal, cliente_proveedores!inner(cliente_id)")
                .eq("cliente_proveedores.cliente_id", clienteId);
              if (term) qb = qb.or(`nombre_legal.ilike.%${term}%,nif.ilike.%${term}%`);
              const { data, error } = await qb.limit(20);
              if (error) throw error;
              return (data ?? []) as { id: string; nif: string; nombre_legal: string }[];
            }}
            getLabel={(p) => p.nombre_legal}
            getSubLabel={(p) => p.nif}
            getValue={(p) => p.id}
            onSelect={(p) => asignar.mutate(p.id)}
            createLabel="Crear desde Proveedores"
            onCreateNew={() => toast.info("Crea el proveedor desde la sección Proveedores y vuelve aquí.")}
          />
        </div>
      )}

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Proveedor</TableHead>
              <TableHead>NIF</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Activo</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  Cargando…
                </TableCell>
              </TableRow>
            )}
            {!isLoading && data.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  Sin proveedores asignados
                </TableCell>
              </TableRow>
            )}
            {data.map((pp) => (
              <TableRow key={pp.id}>
                <TableCell className="font-medium">{pp.proveedor_subcontrata?.nombre_legal}</TableCell>
                <TableCell>{pp.proveedor_subcontrata?.nif}</TableCell>
                <TableCell>
                  {pp.proveedor_subcontrata?.tipo_proveedor && (
                    <Badge variant="secondary">{pp.proveedor_subcontrata.tipo_proveedor}</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <Switch
                    checked={!!pp.activo}
                    disabled={!canEdit}
                    onCheckedChange={(activo) => toggle.mutate({ id: pp.id, activo })}
                  />
                </TableCell>
                <TableCell className="text-right">
                  {canDelete && (
                    <Button size="icon" variant="ghost" onClick={() => eliminar.mutate(pp.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
