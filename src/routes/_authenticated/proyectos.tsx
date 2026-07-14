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

export const Route = createFileRoute("/_authenticated/proyectos")({
  head: () => ({ meta: [{ title: "Proyectos · Datos Maestros" }] }),
  component: ProyectosList,
});

const ESTADOS = ["En estudio", "Adjudicado", "Perdido", "Finalizado"] as const;

const estadoColor: Record<string, string> = {
  "En estudio": "bg-secondary text-secondary-foreground",
  "Adjudicado": "bg-accent text-accent-foreground",
  "Perdido": "bg-destructive/15 text-destructive",
  "Finalizado": "bg-primary/10 text-primary",
};

interface Row {
  id: string;
  nombre: string;
  codigo: string | null;
  estado: string | null;
  tipo_obra: string | null;
}

function ProyectosList() {
  const { permisos } = usePermisos();
  const clienteId = useClienteId();

  const [q, setQ] = useState("");
  const [estado, setEstado] = useState<string>("__all");

  const { data = [], isLoading } = useQuery({
    queryKey: ["proyectos", clienteId, q, estado],
    enabled: !!clienteId,
    queryFn: async () => {
      let qb = supabase
        .from("proyectos")
        .select("id, nombre, codigo, estado, tipo_obra")
        .eq("cliente_id", clienteId!);
      if (q) qb = qb.or(`nombre.ilike.%${q}%,codigo.ilike.%${q}%`);
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
            <Button key={e} size="sm" variant={estado === e ? "default" : "outline"} onClick={() => setEstado(e)}>{e}</Button>
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
                <TableCell>{p.codigo ?? "—"}</TableCell>
                <TableCell>{p.tipo_obra ?? "—"}</TableCell>
                <TableCell>{p.estado && <Badge className={estadoColor[p.estado]}>{p.estado}</Badge>}</TableCell>
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
  const clienteId = useClienteId();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [nombre, setNombre] = useState("");
  const [propiedadId, setPropiedadId] = useState<string | null>(null);
  const [tipoObra, setTipoObra] = useState<string>("");

  const { data: tipos = [] } = useQuery({
    queryKey: ["catalogo", "tipo_obra"],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("catalogo")
        .select("id, valor, etiqueta")
        .eq("categoria", "tipo_obra")
        .order("etiqueta");
      if (error) throw error;
      return (data ?? []) as { id: string; valor: string; etiqueta: string | null }[];
    },
  });

  const crear = useMutation({
    mutationFn: async () => {
      if (!nombre || !propiedadId || !tipoObra || !clienteId) {
        throw new Error("Completa los campos obligatorios");
      }
      const { error } = await supabase.from("proyectos").insert({
        nombre, cliente_id: clienteId, propiedad_id: propiedadId,
        tipo_obra: tipoObra, estado: "En estudio",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Proyecto creado");
      qc.invalidateQueries({ queryKey: ["proyectos"] });
      setOpen(false); setNombre(""); setPropiedadId(null); setTipoObra("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="mr-2 h-4 w-4" /> Nuevo proyecto</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Nuevo proyecto</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nombre *</Label>
            <Input value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Propiedad *</Label>
            <BuscarOCrearCombobox
              placeholder="Buscar propiedad por nombre o NIF…"
              queryKey={["propiedad-search", clienteId]}
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
              value={propiedadId}
              onSelect={(p) => setPropiedadId(p.id)}
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
                  <SelectItem key={t.id} value={t.valor}>{t.etiqueta || t.valor}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={() => crear.mutate()} disabled={crear.isPending}>Crear</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
