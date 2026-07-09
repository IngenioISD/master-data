import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ContactosManager } from "@/components/contactos-manager";
import { DireccionFiscalFields, type DireccionFiscal } from "@/components/direccion-fiscal-fields";
import { usePermisos } from "@/lib/permisos";


const TIPOS = ["Material", "Servicios", "Mixto"] as const;

export const Route = createFileRoute("/_authenticated/proveedores/$id")({
  head: () => ({ meta: [{ title: "Proveedor · Datos Maestros" }] }),
  component: ProveedorDetail,
});

function ProveedorDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const { permisos } = usePermisos();

  const { data, isLoading } = useQuery({
    queryKey: ["proveedor", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("proveedor_subcontrata")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const [form, setForm] = useState<{ nombre_legal: string; nif: string; tipo_proveedor: string } & DireccionFiscal>({
    nombre_legal: "", nif: "", tipo_proveedor: "Material",
    via: "", numero: "", cp: "", municipio: "", provincia: "", pais: "España",
  });

  useEffect(() => {
    if (data) {
      setForm({
        nombre_legal: data.nombre_legal ?? "",
        nif: data.nif ?? "",
        tipo_proveedor: data.tipo_proveedor ?? "Material",
        via: data.via ?? "",
        numero: data.numero ?? "",
        cp: data.cp ?? "",
        municipio: data.municipio ?? "",
        provincia: data.provincia ?? "",
        pais: data.pais ?? "España",
      });
    }
  }, [data]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("proveedor_subcontrata").update({
        nombre_legal: form.nombre_legal, nif: form.nif, tipo_proveedor: form.tipo_proveedor,
        via: form.via, numero: form.numero, cp: form.cp,
        municipio: form.municipio, provincia: form.provincia, pais: form.pais,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Cambios guardados");
      qc.invalidateQueries({ queryKey: ["proveedor", id] });
      qc.invalidateQueries({ queryKey: ["proveedores"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <div className="text-sm text-muted-foreground">Cargando…</div>;
  if (!data) return <div className="text-sm text-muted-foreground">No encontrado.</div>;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link to="/proveedores"><ArrowLeft className="mr-2 h-4 w-4" /> Volver</Link>
          </Button>
          <h1 className="text-xl font-bold">{form.nombre_legal}</h1>
        </div>
        <Button onClick={() => save.mutate()} disabled={save.isPending}>
          <Save className="mr-2 h-4 w-4" /> Guardar
        </Button>
      </div>
      <Card>
        <CardHeader><CardTitle>Datos fiscales</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>NIF</Label>
              <Input value={form.nif} onChange={(e) => setForm({ ...form, nif: e.target.value })} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Nombre legal</Label>
              <Input value={form.nombre_legal} onChange={(e) => setForm({ ...form, nombre_legal: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Tipo de proveedor</Label>
              <Select value={form.tipo_proveedor} onValueChange={(v) => setForm({ ...form, tipo_proveedor: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIPOS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DireccionFiscalFields value={form} onChange={(d) => setForm({ ...form, ...d })} />
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <ContactosManager table="proveedor_contactos" fkColumn="proveedor_id" fkValue={id} />
        </CardContent>
      </Card>
    </div>
  );
}
