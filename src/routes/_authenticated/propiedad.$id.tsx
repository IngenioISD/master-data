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
import { usePermisos } from "@/lib/permisos";

export const Route = createFileRoute("/_authenticated/propiedad/$id")({
  head: () => ({ meta: [{ title: "Propiedad · Datos Maestros" }] }),
  component: PropiedadDetail,
});

interface FormState {
  nombre_legal: string;
  nombre_comercial: string;
  nif: string;
  tipo_via: string;
  nombre_via: string;
  numero: string;
  codigo_postal: string;
  municipio: string;
  provincia: string;
  pais: string;
}

const EMPTY: FormState = {
  nombre_legal: "",
  nombre_comercial: "",
  nif: "",
  tipo_via: "",
  nombre_via: "",
  numero: "",
  codigo_postal: "",
  municipio: "",
  provincia: "",
  pais: "España",
};

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

  const [form, setForm] = useState<FormState>(EMPTY);

  useEffect(() => {
    if (data) {
      setForm({
        nombre_legal: data.nombre_legal ?? "",
        nombre_comercial: data.nombre_comercial ?? "",
        nif: data.nif ?? "",
        tipo_via: (data as any).tipo_via ?? "",
        nombre_via: (data as any).nombre_via ?? "",
        numero: (data as any).numero ?? "",
        codigo_postal: (data as any).codigo_postal ?? "",
        municipio: (data as any).municipio ?? "",
        provincia: (data as any).provincia ?? "",
        pais: (data as any).pais ?? "España",
      });
    }
  }, [data]);

  const set = <K extends keyof FormState>(k: K, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("propiedad")
        .update({
          nombre_legal: form.nombre_legal,
          nombre_comercial: form.nombre_comercial,
          nif: form.nif,
          tipo_via: form.tipo_via || null,
          nombre_via: form.nombre_via || null,
          numero: form.numero || null,
          codigo_postal: form.codigo_postal || null,
          municipio: form.municipio || null,
          provincia: form.provincia || null,
          pais: form.pais || null,
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

  const readOnly = !permisos.puede_editar;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link to="/propiedad"><ArrowLeft className="mr-2 h-4 w-4" /> Volver</Link>
          </Button>
          <h1 className="text-xl font-bold">{form.nombre_comercial || form.nombre_legal}</h1>
        </div>
        {permisos.puede_editar && (
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            <Save className="mr-2 h-4 w-4" /> Guardar
          </Button>
        )}
      </div>

      <Card>
        <CardHeader><CardTitle>Datos generales</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>NIF</Label>
              <Input value={form.nif} onChange={(e) => set("nif", e.target.value)} disabled={readOnly} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Nombre legal</Label>
              <Input value={form.nombre_legal} onChange={(e) => set("nombre_legal", e.target.value)} disabled={readOnly} />
            </div>
            <div className="space-y-1.5 sm:col-span-3">
              <Label>Nombre comercial</Label>
              <Input value={form.nombre_comercial} onChange={(e) => set("nombre_comercial", e.target.value)} disabled={readOnly} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-6 pt-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Tipo de vía</Label>
              <Input value={form.tipo_via} onChange={(e) => set("tipo_via", e.target.value)} disabled={readOnly} placeholder="Calle, Avenida…" />
            </div>
            <div className="space-y-1.5 sm:col-span-3">
              <Label>Nombre de la vía</Label>
              <Input value={form.nombre_via} onChange={(e) => set("nombre_via", e.target.value)} disabled={readOnly} />
            </div>
            <div className="space-y-1.5 sm:col-span-1">
              <Label>Número</Label>
              <Input value={form.numero} onChange={(e) => set("numero", e.target.value)} disabled={readOnly} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Código postal</Label>
              <Input value={form.codigo_postal} onChange={(e) => set("codigo_postal", e.target.value)} disabled={readOnly} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Municipio</Label>
              <Input value={form.municipio} onChange={(e) => set("municipio", e.target.value)} disabled={readOnly} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Provincia</Label>
              <Input value={form.provincia} onChange={(e) => set("provincia", e.target.value)} disabled={readOnly} />
            </div>
            <div className="space-y-1.5 sm:col-span-6">
              <Label>País</Label>
              <Input value={form.pais} onChange={(e) => set("pais", e.target.value)} disabled={readOnly} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Contactos</CardTitle></CardHeader>
        <CardContent>
          <ContactosManager
            table="propiedad_contactos"
            fkColumn="propiedad_id"
            fkValue={id}
            canCreate={permisos.puede_crear}
            canEdit={permisos.puede_editar}
            canDelete={permisos.puede_eliminar}
          />
        </CardContent>
      </Card>
    </div>
  );
}
