import { createFileRoute, useNavigate } from "@tanstack/react-router";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { DireccionFiscalFields, type DireccionFiscal } from "@/components/direccion-fiscal-fields";

export const Route = createFileRoute("/_authenticated/propiedad")({
  head: () => ({ meta: [{ title: "Propiedad · Datos Maestros" }] }),
  component: PropiedadList,
});

interface PropiedadRow {
  id: string;
  nif: string;
  nombre_legal: string;
  nombre_comercial: string | null;
  municipio: string | null;
  provincia: string | null;
  pais: string | null;
  activo: boolean | null;
}

function PropiedadList() {
  const { clienteId } = useClienteId();
  const { permisos } = usePermisos();
  const [q, setQ] = useState("");
  const qc = useQueryClient();


  const { data = [], isLoading } = useQuery({
    queryKey: ["propiedades", clienteId, q],
    enabled: !!clienteId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clientes_propiedades")
        .select("activo, propiedad:propiedad_id(id, nombre_comercial, nif, nombre_legal, municipio, provincia, pais)")
        .eq("cliente_id", clienteId!);
      if (error) throw error;
      const rows = (data ?? [])
        .map((r: any) => ({ ...r.propiedad, activo: r.activo }))
        .filter((p: any) => p && p.id);
      if (!q) return rows;
      const s = q.toLowerCase();
      return rows.filter((p: any) =>
        (p.nombre_comercial ?? "").toLowerCase().includes(s) ||
        (p.nombre_legal ?? "").toLowerCase().includes(s) ||
        (p.nif ?? "").toLowerCase().includes(s)
      );
    },
  });


  const toggleActivo = useMutation({
    mutationFn: async ({ propiedadId, activo }: { propiedadId: string; activo: boolean }) => {
      const { error } = await supabase
        .from("clientes_propiedades")
        .update({ activo })
        .eq("propiedad_id", propiedadId)
        .eq("cliente_id", clienteId!);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["propiedades"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Propiedad</h1>
          <p className="text-sm text-muted-foreground">
            Propiedades vinculadas a tu cliente.
          </p>
        </div>
        {permisos.puede_crear && <NuevaPropiedadDialog />}
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre o NIF…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="pl-9"
        />
      </div>
      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre comercial</TableHead>
              <TableHead>Municipio</TableHead>
              <TableHead>NIF</TableHead>
              <TableHead>Activa</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Cargando…</TableCell></TableRow>
            )}
            {!isLoading && data.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Sin resultados</TableCell></TableRow>
            )}
            {data.map((p) => {
              return (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">
                    {p.nombre_comercial || p.nombre_legal}
                  </TableCell>
                  <TableCell>{p.municipio ?? ""}</TableCell>
                  <TableCell>{p.nif}</TableCell>
                  <TableCell>
                    <Switch
                      checked={!!p.activo}
                      onCheckedChange={(activo) => toggleActivo.mutate({ propiedadId: p.id, activo })}
                    />
                  </TableCell>

                  <TableCell className="text-right">
                    <Button asChild variant="ghost" size="sm">
                      <Link to="/propiedad/$id" params={{ id: p.id }}>Abrir</Link>
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

function NuevaPropiedadDialog() {
  const { clienteId } = useClienteId();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [nif, setNif] = useState("");
  const [existente, setExistente] = useState<{ id: string; nombre_legal: string; nombre_comercial: string | null } | null>(null);
  const [checked, setChecked] = useState(false);
  const [nombreLegal, setNombreLegal] = useState("");
  const [nombreComercial, setNombreComercial] = useState("");
  const [dir, setDir] = useState<DireccionFiscal>({ pais: "España" });
  const [submitting, setSubmitting] = useState(false);

  async function buscarPorNif() {
    setChecked(false);
    setExistente(null);
    if (!nif.trim()) return;
    const { data, error } = await supabase
      .from("propiedad")
      .select("id, nombre_legal, nombre_comercial")
      .eq("nif", nif.trim())
      .maybeSingle();
    if (error) {
      toast.error(error.message);
      return;
    }
    setChecked(true);
    setExistente(data ?? null);
  }

  async function vincular() {
    if (!existente || !clienteId) return;
    setSubmitting(true);
    const { error } = await supabase.from("clientes_propiedades").insert({
      cliente_id: clienteId,
      propiedad_id: existente.id,
      activo: true,
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Propiedad vinculada");
    qc.invalidateQueries({ queryKey: ["propiedades"] });
    reset();
  }

  async function crear() {
    if (!nif || !nombreLegal || !clienteId) return;
    setSubmitting(true);
    const { data: nueva, error } = await supabase
      .from("propiedad")
      .insert({
        nif: nif.trim(),
        nombre_legal: nombreLegal.trim(),
        nombre_comercial: (nombreComercial || nombreLegal).trim(),
      })
      .select("id")
      .single();
    if (error || !nueva) {
      setSubmitting(false);
      toast.error(error?.message ?? "Error creando propiedad");
      return;
    }
    const { error: linkErr } = await supabase.from("clientes_propiedades").insert({
      cliente_id: clienteId,
      propiedad_id: nueva.id,
      activo: true,
    });
    setSubmitting(false);
    if (linkErr) {
      toast.error(linkErr.message);
      return;
    }
    toast.success("Propiedad creada");
    qc.invalidateQueries({ queryKey: ["propiedades"] });
    reset();
  }

  function reset() {
    setOpen(false);
    setNif("");
    setExistente(null);
    setChecked(false);
    setNombreLegal("");
    setNombreComercial("");
    setDir({ pais: "España" });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : reset())}>
      <DialogTrigger asChild>
        <Button><Plus className="mr-2 h-4 w-4" /> Nueva propiedad</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nueva propiedad</DialogTitle>
          <DialogDescription>Busca primero por NIF para evitar duplicados.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex gap-2">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="nif">NIF</Label>
              <Input id="nif" value={nif} onChange={(e) => setNif(e.target.value)} />
            </div>
            <div className="flex items-end">
              <Button type="button" variant="outline" onClick={buscarPorNif}>Buscar</Button>
            </div>
          </div>
          {checked && existente && (
            <div className="rounded-md border bg-muted/40 p-3 text-sm">
              <p className="font-medium">{existente.nombre_comercial || existente.nombre_legal}</p>
              <p className="text-xs text-muted-foreground">Ya existe en el catálogo. Vinculala a tu cliente sin duplicar.</p>
              <Button className="mt-3" onClick={vincular} disabled={submitting}>Vincular a mi cliente</Button>
            </div>
          )}
          {checked && !existente && (
            <div className="space-y-4 border-t pt-4">
              <div className="space-y-1.5">
                <Label htmlFor="nl">Nombre legal *</Label>
                <Input id="nl" value={nombreLegal} onChange={(e) => setNombreLegal(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="nc">Nombre comercial</Label>
                <Input id="nc" placeholder={nombreLegal || "(igual que nombre legal si vacío)"} value={nombreComercial} onChange={(e) => setNombreComercial(e.target.value)} />
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
            <Button onClick={crear} disabled={!nombreLegal || submitting}>Crear propiedad</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
