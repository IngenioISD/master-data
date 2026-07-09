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
import { ContactosManager } from "@/components/contactos-manager";
import { DireccionFiscalFields, type DireccionFiscal } from "@/components/direccion-fiscal-fields";
import { usePermisos } from "@/lib/permisos";


export const Route = createFileRoute("/_authenticated/propiedad/$id")({
  head: () => ({ meta: [{ title: "Propiedad · Datos Maestros" }] }),
  component: PropiedadDetail,
});

function PropiedadDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const { permisos } = usePermisos();


  const { data, isLoading } = useQuery({
    queryKey: ["propiedad", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("propiedad")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const [form, setForm] = useState<{ nombre_legal: string; nombre_comercial: string; nif: string } & DireccionFiscal>({
    nombre_legal: "",
    nombre_comercial: "",
    nif: "",
    via: "",
    numero: "",
    cp: "",
    municipio: "",
    provincia: "",
    pais: "España",
  });

  useEffect(() => {
    if (data) {
      setForm({
        nombre_legal: data.nombre_legal ?? "",
        nombre_comercial: data.nombre_comercial ?? "",
        nif: data.nif ?? "",
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
      const { error } = await supabase
        .from("propiedad")
        .update({
          nombre_legal: form.nombre_legal,
          nombre_comercial: form.nombre_comercial,
          nif: form.nif,
          via: form.via,
          numero: form.numero,
          cp: form.cp,
          municipio: form.municipio,
          provincia: form.provincia,
          pais: form.pais,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Cambios guardados");
      qc.invalidateQueries({ queryKey: ["propiedad", id] });
      qc.invalidateQueries({ queryKey: ["propiedades"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <div className="text-sm text-muted-foreground">Cargando…</div>;
  if (!data) return <div className="text-sm text-muted-foreground">No encontrada.</div>;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link to="/propiedad"><ArrowLeft className="mr-2 h-4 w-4" /> Volver</Link>
          </Button>
          <h1 className="text-xl font-bold">{form.nombre_comercial || form.nombre_legal}</h1>
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
            <div className="space-y-1.5 sm:col-span-3">
              <Label>Nombre comercial</Label>
              <Input value={form.nombre_comercial} onChange={(e) => setForm({ ...form, nombre_comercial: e.target.value })} />
            </div>
          </div>
          <DireccionFiscalFields value={form} onChange={(d) => setForm({ ...form, ...d })} />
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <ContactosManager table="propiedad_contactos" fkColumn="propiedad_id" fkValue={id} />
        </CardContent>
      </Card>
    </div>
  );
}
