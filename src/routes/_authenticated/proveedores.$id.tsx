import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { ArrowLeft, Save, Pencil, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ContactosManager } from "@/components/contactos-manager";
import { DireccionFiscalFields, type DireccionFiscal } from "@/components/direccion-fiscal-fields";
import { usePermisos } from "@/lib/permisos";

const TIPOS = ["Material", "Servicios", "Mixto"] as const;

export const Route = createFileRoute("/_authenticated/proveedores/$id")({
  head: () => ({ meta: [{ title: "Proveedor · Datos Maestros" }] }),
  component: ProveedorDetail,
});

interface FormState extends DireccionFiscal {
  nombre_legal: string;
  nombre_comercial: string;
  nif: string;
  tipo_proveedor: string;
  tipo_via: string;
}

const EMPTY: FormState = {
  nombre_legal: "",
  nombre_comercial: "",
  nif: "",
  tipo_proveedor: "Material",
  tipo_via: "",
  via: "",
  numero: "",
  cp: "",
  municipio: "",
  provincia: "",
  pais: "España",
};

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

  const [form, setForm] = useState<FormState>(EMPTY);
  const [editMode, setEditMode] = useState(false);

  const fromData = (d: any): FormState => ({
    nombre_legal: d.nombre_legal ?? "",
    nombre_comercial: d.nombre_comercial ?? "",
    nif: d.nif ?? "",
    tipo_proveedor: d.tipo_proveedor ?? "",
    tipo_via: d.tipo_via ?? "",
    via: d.nombre_via ?? "",
    numero: d.numero ?? "",
    cp: d.codigo_postal ?? "",
    municipio: d.municipio ?? "",
    provincia: d.provincia ?? "",
    pais: d.pais ?? "España",
  });

  useEffect(() => {
    if (data) setForm(fromData(data));
  }, [data]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("proveedor_subcontrata")
        .update({
          nombre_legal: form.nombre_legal,
          nombre_comercial: form.nombre_comercial || null,
          nif: form.nif,
          tipo_proveedor: form.tipo_proveedor,
          tipo_via: form.tipo_via || null,
          nombre_via: form.via,
          numero: form.numero,
          codigo_postal: form.cp,
          municipio: form.municipio,
          provincia: form.provincia,
          pais: form.pais,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Cambios guardados");
      setEditMode(false);
      qc.invalidateQueries({ queryKey: ["proveedor", id] });
      qc.invalidateQueries({ queryKey: ["proveedores"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <div className="text-sm text-muted-foreground">Cargando…</div>;
  if (!data) return <div className="text-sm text-muted-foreground">No encontrado.</div>;

  const canEdit = permisos.puede_editar;
  const editing = canEdit && editMode;

  const resetForm = () => setForm(fromData(data));

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
            <Link to="/proveedores">
              <ArrowLeft className="mr-2 h-4 w-4" /> Volver
            </Link>
          </Button>
          <h1 className="text-xl font-bold">{form.nombre_comercial || form.nombre_legal}</h1>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Datos fiscales</CardTitle>
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
            <>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label>NIF</Label>
                  <Input
                    value={form.nif}
                    onChange={(e) => setForm({ ...form, nif: e.target.value.toUpperCase() })}
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Nombre legal</Label>
                  <Input
                    value={form.nombre_legal}
                    onChange={(e) => setForm({ ...form, nombre_legal: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-3">
                  <Label>Nombre comercial</Label>
                  <Input
                    value={form.nombre_comercial}
                    onChange={(e) => setForm({ ...form, nombre_comercial: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Tipo de proveedor</Label>
                  <Select
                    value={form.tipo_proveedor || undefined}
                    onValueChange={(v) => setForm({ ...form, tipo_proveedor: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona…" />
                    </SelectTrigger>
                    <SelectContent>
                      {TIPOS.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="pt-6 mt-6 border-t border-transparent">
                <h3 className="text-sm font-semibold mb-4">Domicilio fiscal</h3>
                <DireccionFiscalFields value={form} onChange={(d) => setForm({ ...form, ...d })} />
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Field label="NIF" value={form.nif} />
                <Field label="Nombre legal" value={form.nombre_legal} colSpan="sm:col-span-2" />
                <Field label="Nombre comercial" value={form.nombre_comercial} colSpan="sm:col-span-3" />
                <Field label="Tipo de proveedor" value={form.tipo_proveedor} />
              </div>
              <div className="pt-6 mt-6 border-t border-transparent">
                <h3 className="text-sm font-semibold mb-4">Domicilio fiscal</h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-6">
                  <Field label="Vía" value={form.via ?? ""} colSpan="sm:col-span-4" />
                  <Field label="Número" value={form.numero ?? ""} colSpan="sm:col-span-2" />
                  <Field label="CP" value={form.cp ?? ""} colSpan="sm:col-span-2" />
                  <Field label="Municipio" value={form.municipio ?? ""} colSpan="sm:col-span-2" />
                  <Field label="Provincia" value={form.provincia ?? ""} colSpan="sm:col-span-2" />
                  <Field label="País" value={form.pais ?? ""} colSpan="sm:col-span-6" />
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <ContactosManager
            table="proveedor_contactos"
            fkColumn="proveedor_id"
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
