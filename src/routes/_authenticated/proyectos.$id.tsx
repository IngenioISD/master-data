import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { ArrowLeft, Save, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DireccionFiscalFields, type DireccionFiscal } from "@/components/direccion-fiscal-fields";
import { BuscarOCrearCombobox } from "@/components/buscar-o-crear-combobox";
import { usePermisos } from "@/lib/permisos";


const ESTADOS = ["En estudio", "Adjudicado", "Perdido", "Finalizado"] as const;

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
  const [propiedadId, setPropiedadId] = useState<string | null>(null);
  const [adjudicarOpen, setAdjudicarOpen] = useState(false);

  useEffect(() => {
    if (data) {
      setNombre(data.nombre ?? "");
      setTipoObra(data.tipo_obra ?? "");
      setPropiedadId(data.propiedad_id ?? null);
    }
  }, [data]);

  const { data: tipos = [] } = useQuery({
    queryKey: ["catalogo", "tipo_obra"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("catalogo").select("id, valor, etiqueta")
        .eq("categoria", "tipo_obra").order("etiqueta");
      if (error) throw error;
      return (data ?? []) as { id: string; valor: string; etiqueta: string | null }[];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("proyectos").update({
        nombre, tipo_obra: tipoObra, propiedad_id: propiedadId,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Cambios guardados");
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

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link to="/proyectos"><ArrowLeft className="mr-2 h-4 w-4" /> Volver</Link>
          </Button>
          <h1 className="text-xl font-bold">{nombre}</h1>
          {data.estado && <Badge variant="outline">{data.estado}</Badge>}
        </div>
        {permisos.puede_editar && (
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            <Save className="mr-2 h-4 w-4" /> Guardar
          </Button>
        )}

      </div>

      <Card>
        <CardHeader><CardTitle>General</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Nombre</Label>
              <Input value={nombre} onChange={(e) => setNombre(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Tipo de obra</Label>
              <Select value={tipoObra} onValueChange={setTipoObra}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {tipos.map((t) => <SelectItem key={t.id} value={t.valor}>{t.etiqueta || t.valor}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Propiedad</Label>
              <PropiedadPicker value={propiedadId} onChange={setPropiedadId} />
            </div>
            {data.estado === "Adjudicado" && (
              <>
                <div className="space-y-1.5">
                  <Label>Código</Label>
                  <Input value={data.codigo ?? ""} readOnly />
                </div>
                <div className="space-y-1.5">
                  <Label>Fecha adjudicación</Label>
                  <Input value={data.fecha_adjudicacion ?? ""} readOnly />
                </div>
                <div className="space-y-1.5">
                  <Label>Duración prevista (meses)</Label>
                  <Input value={data.duracion_prevista_meses ?? ""} readOnly />
                </div>
              </>
            )}
          </div>
          <div className="flex items-center gap-3 border-t pt-4">
            <Label className="m-0">Estado:</Label>
            <Select
              value={data.estado ?? "En estudio"}
              onValueChange={(v) => {
                if (v === "Adjudicado" && data.estado !== "Adjudicado") {
                  setAdjudicarOpen(true);
                } else {
                  cambiarEstado.mutate(v);
                }
              }}
            >
              <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ESTADOS.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Proveedores asignados</CardTitle></CardHeader>
        <CardContent>
          <ProveedoresAsignados proyectoId={id} />
        </CardContent>
      </Card>

      <AdjudicarDialog
        open={adjudicarOpen}
        onOpenChange={setAdjudicarOpen}
        proyectoId={id}
        onDone={() => {
          setAdjudicarOpen(false);
          qc.invalidateQueries({ queryKey: ["proyecto", id] });
          qc.invalidateQueries({ queryKey: ["proyectos"] });
        }}
      />
    </div>
  );
}

function PropiedadPicker({ value, onChange }: { value: string | null; onChange: (v: string) => void }) {
  const { claims } = useAuth();
  const clienteId = claims.cliente_id as string | undefined;
  return (
    <BuscarOCrearCombobox
      placeholder="Buscar propiedad…"
      queryKey={["propiedad-picker", clienteId]}
      search={async (term) => {
        if (!clienteId) return [];
        let qb = supabase
          .from("propiedad")
          .select("id, nif, nombre_legal, nombre_comercial, clientes_propiedades!inner(cliente_id)")
          .eq("clientes_propiedades.cliente_id", clienteId);
        if (term) qb = qb.or(`nombre_legal.ilike.%${term}%,nombre_comercial.ilike.%${term}%,nif.ilike.%${term}%`);
        const { data, error } = await qb.limit(20);
        if (error) throw error;
        return (data ?? []) as { id: string; nif: string; nombre_legal: string; nombre_comercial: string | null }[];
      }}
      getLabel={(p) => p.nombre_comercial || p.nombre_legal}
      getSubLabel={(p) => p.nif}
      getValue={(p) => p.id}
      value={value}
      onSelect={(p) => onChange(p.id)}
    />
  );
}

function AdjudicarDialog({
  open, onOpenChange, proyectoId, onDone,
}: {
  open: boolean; onOpenChange: (o: boolean) => void; proyectoId: string; onDone: () => void;
}) {
  const [codigo, setCodigo] = useState("");
  const [fecha, setFecha] = useState("");
  const [meses, setMeses] = useState<string>("");
  const [dir, setDir] = useState<DireccionFiscal>({ pais: "España" });
  const [submitting, setSubmitting] = useState(false);

  async function confirmar() {
    if (!codigo || !fecha || !meses || !dir.via || !dir.numero || !dir.cp || !dir.municipio || !dir.provincia) {
      toast.error("Faltan campos obligatorios para adjudicar.");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("proyectos").update({
      estado: "Adjudicado",
      codigo,
      fecha_adjudicacion: fecha,
      duracion_prevista_meses: Number(meses),
      via: dir.via, numero: dir.numero, cp: dir.cp,
      municipio: dir.municipio, provincia: dir.provincia, pais: dir.pais,
    }).eq("id", proyectoId);
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Proyecto adjudicado");
    onDone();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Adjudicar proyecto</DialogTitle>
          <DialogDescription>
            Para pasar el proyecto a Adjudicado necesitas completar estos datos.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label>Código *</Label>
            <Input value={codigo} onChange={(e) => setCodigo(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Fecha adjudicación *</Label>
            <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Duración prevista (meses) *</Label>
            <Input type="number" min="1" value={meses} onChange={(e) => setMeses(e.target.value)} />
          </div>
        </div>
        <div className="space-y-2 border-t pt-3">
          <Label className="text-sm font-medium">Dirección de la obra *</Label>
          <DireccionFiscalFields value={dir} onChange={setDir} required />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={confirmar} disabled={submitting}>Confirmar adjudicación</Button>
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

function ProveedoresAsignados({ proyectoId }: { proyectoId: string }) {
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
        proyecto_id: proyectoId, proveedor_id: proveedorId, activo: true,
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey }); toast.success("Proveedor asignado"); },
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
    onSuccess: () => { qc.invalidateQueries({ queryKey }); toast.success("Eliminado"); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-3">
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
            {isLoading && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Cargando…</TableCell></TableRow>}
            {!isLoading && data.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Sin proveedores asignados</TableCell></TableRow>}
            {data.map((pp) => (
              <TableRow key={pp.id}>
                <TableCell className="font-medium">{pp.proveedor_subcontrata?.nombre_legal}</TableCell>
                <TableCell>{pp.proveedor_subcontrata?.nif}</TableCell>
                <TableCell>{pp.proveedor_subcontrata?.tipo_proveedor && <Badge variant="secondary">{pp.proveedor_subcontrata.tipo_proveedor}</Badge>}</TableCell>
                <TableCell><Switch checked={!!pp.activo} onCheckedChange={(activo) => toggle.mutate({ id: pp.id, activo })} /></TableCell>
                <TableCell className="text-right">
                  <Button size="icon" variant="ghost" onClick={() => eliminar.mutate(pp.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
