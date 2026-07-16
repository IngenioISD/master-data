import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { ArrowLeft, Pencil, Save, X } from "lucide-react";

import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PropiedadContactosManager } from "@/components/propiedad-contactos-manager";
import { usePermisos } from "@/lib/permisos";
import { useClienteId } from "@/lib/cliente";

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
  const { clienteId } = useClienteId();

  const { data, isLoading } = useQuery({
    queryKey: ["propiedad", clienteId, id],
    enabled: !!clienteId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clientes_propiedades")
        .select("propiedad:propiedad_id(id, nombre_comercial, nombre_legal, nif, tipo_via, nombre_via, numero, codigo_postal, municipio, provincia, pais)")
        .eq("cliente_id", clienteId!)
        .eq("propiedad_id", id)
        .maybeSingle();
      if (error) throw error;
      return (data as any)?.propiedad ?? null;
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
      setEditMode(false);
      qc.invalidateQueries({ queryKey: ["propiedad", id] });
      qc.invalidateQueries({ queryKey: ["propiedades"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const [editMode, setEditMode] = useState(false);

  if (isLoading) return <div className="text-sm text-muted-foreground">Cargando…</div>;
  if (!data) return <div className="text-sm text-muted-foreground">No encontrada.</div>;

  const canEdit = permisos.puede_editar;
  const editing = canEdit && editMode;

  const resetForm = () => {
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
  };

  const Field = ({ label, value, colSpan = "" }: { label: string; value: string; colSpan?: string }) => (
    <div className={`space-y-1 ${colSpan}`}>
      <Label className="text-muted-foreground">{label}</Label>
      <p className="text-sm">{value || <span className="text-muted-foreground">—</span>}</p>
    </div>
  );

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link to="/propiedad"><ArrowLeft className="mr-2 h-4 w-4" /> Volver</Link>
          </Button>
          <h1 className="text-xl font-bold">{form.nombre_comercial || form.nombre_legal}</h1>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Datos generales</CardTitle>
          {canEdit && !editing && (
            <Button size="icon" variant="ghost" onClick={() => setEditMode(true)} aria-label="Editar">
              <Pencil className="h-4 w-4" />
            </Button>
          )}
          {editing && (
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => { resetForm(); setEditMode(false); }}>
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
            <>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label>NIF</Label>
                  <Input value={form.nif} onChange={(e) => set("nif", e.target.value)} />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Nombre legal</Label>
                  <Input value={form.nombre_legal} onChange={(e) => set("nombre_legal", e.target.value)} />
                </div>
                <div className="space-y-1.5 sm:col-span-3">
                  <Label>Nombre comercial</Label>
                  <Input value={form.nombre_comercial} onChange={(e) => set("nombre_comercial", e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-6 pt-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Tipo de vía</Label>
                  <Input value={form.tipo_via} onChange={(e) => set("tipo_via", e.target.value)} placeholder="Calle, Avenida…" />
                </div>
                <div className="space-y-1.5 sm:col-span-3">
                  <Label>Nombre de la vía</Label>
                  <Input value={form.nombre_via} onChange={(e) => set("nombre_via", e.target.value)} />
                </div>
                <div className="space-y-1.5 sm:col-span-1">
                  <Label>Número</Label>
                  <Input value={form.numero} onChange={(e) => set("numero", e.target.value)} />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Código postal</Label>
                  <Input value={form.codigo_postal} onChange={(e) => set("codigo_postal", e.target.value)} />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Municipio</Label>
                  <Input value={form.municipio} onChange={(e) => set("municipio", e.target.value)} />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Provincia</Label>
                  <Input value={form.provincia} onChange={(e) => set("provincia", e.target.value)} />
                </div>
                <div className="space-y-1.5 sm:col-span-6">
                  <Label>País</Label>
                  <Input value={form.pais} onChange={(e) => set("pais", e.target.value)} />
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Field label="NIF" value={form.nif} />
                <Field label="Nombre legal" value={form.nombre_legal} colSpan="sm:col-span-2" />
                <Field label="Nombre comercial" value={form.nombre_comercial} colSpan="sm:col-span-3" />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-6 pt-2">
                <Field label="Tipo de vía" value={form.tipo_via} colSpan="sm:col-span-2" />
                <Field label="Nombre de la vía" value={form.nombre_via} colSpan="sm:col-span-3" />
                <Field label="Número" value={form.numero} colSpan="sm:col-span-1" />
                <Field label="Código postal" value={form.codigo_postal} colSpan="sm:col-span-2" />
                <Field label="Municipio" value={form.municipio} colSpan="sm:col-span-2" />
                <Field label="Provincia" value={form.provincia} colSpan="sm:col-span-2" />
                <Field label="País" value={form.pais} colSpan="sm:col-span-6" />
              </div>
            </>
          )}
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
