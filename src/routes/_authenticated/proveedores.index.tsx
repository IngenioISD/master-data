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
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { DireccionFiscalFields, type DireccionFiscal } from "@/components/direccion-fiscal-fields";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/proveedores/")({
  head: () => ({ meta: [{ title: "Proveedores · Datos Maestros" }] }),
  component: ProveedoresList,
});

const TIPOS = ["Material", "Servicios", "Mixto"] as const;

interface Row {
  id: string;
  nif: string;
  nombre_legal: string;
  tipo_proveedor: string | null;
  municipio: string | null;
  cliente_proveedores: { activo: boolean | null; cliente_id: string }[];
}

function ProveedoresList() {
  const { permisos } = usePermisos();
  const { clienteId } = useClienteId();

  const [q, setQ] = useState("");
  const [tipo, setTipo] = useState<string>("__all");
  const qc = useQueryClient();

  const { data = [], isLoading } = useQuery({
    queryKey: ["proveedores", clienteId, q, tipo],
    enabled: !!clienteId,
    queryFn: async () => {
      let qb = supabase
        .from("proveedor_subcontrata")
        .select("id, nif, nombre_legal, nombre_comercial, tipo_proveedor, activo, municipio, cliente_proveedores!inner(cliente_id, activo)")
        .eq("cliente_proveedores.cliente_id", clienteId!);
      if (q) qb = qb.or(`nombre_legal.ilike.%${q}%,nif.ilike.%${q}%`);
      if (tipo !== "__all") qb = qb.eq("tipo_proveedor", tipo);
      const { data, error } = await qb.order("nombre_legal");
      if (error) throw error;
      return (data ?? []) as unknown as Row[];
    },
  });

  const toggle = useMutation({
    mutationFn: async ({ id, activo }: { id: string; activo: boolean }) => {
      const { error } = await supabase
        .from("cliente_proveedores")
        .update({ activo })
        .eq("proveedor_id", id)
        .eq("cliente_id", clienteId!);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["proveedores"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Proveedores</h1>
          <p className="text-sm text-muted-foreground">Proveedores vinculados a tu cliente.</p>
        </div>
        {permisos.puede_crear && <NuevoProveedorDialog />}
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar por nombre o NIF…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
        </div>
        <Select value={tipo} onValueChange={setTipo}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all">Todos los tipos</SelectItem>
            {TIPOS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>NIF</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Municipio</TableHead>
              {permisos.puede_editar && <TableHead>Activo</TableHead>}
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={permisos.puede_editar ? 6 : 5} className="text-center text-muted-foreground">Cargando…</TableCell></TableRow>}
            {!isLoading && data.length === 0 && <TableRow><TableCell colSpan={permisos.puede_editar ? 6 : 5} className="text-center text-muted-foreground">Sin resultados</TableCell></TableRow>}
            {data.map((p) => {
              const link = p.cliente_proveedores[0];
              return (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.nombre_legal}</TableCell>
                  <TableCell>{p.nif}</TableCell>
                  <TableCell>{p.tipo_proveedor && <Badge variant="secondary">{p.tipo_proveedor}</Badge>}</TableCell>
                  <TableCell>{p.municipio ?? "—"}</TableCell>
                  {permisos.puede_editar && (
                    <TableCell>
                      <Switch checked={!!link?.activo} onCheckedChange={(activo) => toggle.mutate({ id: p.id, activo })} />
                    </TableCell>
                  )}
                  <TableCell className="text-right">
                    <Button asChild variant="ghost" size="sm">
                      <Link to="/proveedores/$id" params={{ id: p.id }}>Abrir</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function NuevoProveedorDialog() {
  const { clienteId } = useClienteId();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [nif, setNif] = useState("");
  const [existente, setExistente] = useState<{ id: string; nombre_legal: string } | null>(null);
  const [checked, setChecked] = useState(false);
  const [nombreLegal, setNombreLegal] = useState("");
  const [tipoProveedor, setTipoProveedor] = useState<string>("Material");
  const [dir, setDir] = useState<DireccionFiscal>({ pais: "España" });
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setOpen(false);
    setNif(""); setExistente(null); setChecked(false);
    setNombreLegal(""); setTipoProveedor("Material"); setDir({ pais: "España" });
  }

  async function buscar() {
    setChecked(false); setExistente(null);
    if (!nif.trim()) return;
    const { data, error } = await supabase
      .from("proveedor_subcontrata")
      .select("id, nombre_legal")
      .eq("nif", nif.trim())
      .maybeSingle();
    if (error) return toast.error(error.message);
    setChecked(true);
    setExistente(data ?? null);
  }

  async function vincular() {
    if (!existente || !clienteId) return;
    setSubmitting(true);
    const { error } = await supabase.from("cliente_proveedores").insert({
      cliente_id: clienteId, proveedor_id: existente.id, activo: true,
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Proveedor vinculado");
    qc.invalidateQueries({ queryKey: ["proveedores"] });
    reset();
  }

  async function crear() {
    if (!nif || !nombreLegal || !clienteId) return;
    setSubmitting(true);
    const { data, error } = await supabase.from("proveedor_subcontrata").insert({
      nif: nif.trim(), nombre_legal: nombreLegal.trim(), tipo_proveedor: tipoProveedor,
      via: dir.via || null, numero: dir.numero || null, cp: dir.cp || null,
      municipio: dir.municipio || null, provincia: dir.provincia || null, pais: dir.pais || null,
    }).select("id").single();
    if (error || !data) {
      setSubmitting(false);
      return toast.error(error?.message ?? "Error");
    }
    const { error: e2 } = await supabase.from("cliente_proveedores").insert({
      cliente_id: clienteId, proveedor_id: data.id, activo: true,
    });
    setSubmitting(false);
    if (e2) return toast.error(e2.message);
    toast.success("Proveedor creado");
    qc.invalidateQueries({ queryKey: ["proveedores"] });
    reset();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : reset())}>
      <DialogTrigger asChild>
        <Button><Plus className="mr-2 h-4 w-4" /> Nuevo proveedor</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nuevo proveedor</DialogTitle>
          <DialogDescription>Busca primero por NIF para no duplicar.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex gap-2">
            <div className="flex-1 space-y-1.5">
              <Label>NIF</Label>
              <Input value={nif} onChange={(e) => setNif(e.target.value)} />
            </div>
            <div className="flex items-end">
              <Button variant="outline" onClick={buscar}>Buscar</Button>
            </div>
          </div>
          {checked && existente && (
            <div className="rounded-md border bg-muted/40 p-3 text-sm">
              <p className="font-medium">{existente.nombre_legal}</p>
              <p className="text-xs text-muted-foreground">Ya existe. Vincula sin duplicar.</p>
              <Button className="mt-3" onClick={vincular} disabled={submitting}>Vincular a mi cliente</Button>
            </div>
          )}
          {checked && !existente && (
            <div className="space-y-4 border-t pt-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Nombre legal *</Label>
                  <Input value={nombreLegal} onChange={(e) => setNombreLegal(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Tipo de proveedor *</Label>
                  <Select value={tipoProveedor} onValueChange={setTipoProveedor}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TIPOS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Collapsible>
                <CollapsibleTrigger asChild>
                  <Button type="button" variant="ghost" size="sm">Dirección fiscal (opcional)</Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-3">
                  <DireccionFiscalFields value={dir} onChange={setDir} />
                </CollapsibleContent>
              </Collapsible>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={reset}>Cancelar</Button>
          {checked && !existente && (
            <Button onClick={crear} disabled={!nombreLegal || submitting}>Crear proveedor</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
