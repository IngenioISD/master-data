import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Pencil, X, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

interface Contacto {
  id?: string;
  nombre: string;
  apellido_1: string | null;
  apellido_2: string | null;
  departamento: string | null;
  telefono: string | null;
  email: string | null;
}

const DEPARTAMENTOS = ["Administración", "Ventas", "Dirección", "Operaciones", "Otro"] as const;

interface Props {
  table: "propiedad_contactos" | "proveedor_contactos";
  fkColumn: "propiedad_id" | "proveedor_id";
  fkValue: string;
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
}

export function ContactosManager({
  table,
  fkColumn,
  fkValue,
  canCreate = true,
  canEdit = true,
  canDelete = true,
}: Props) {

  const qc = useQueryClient();
  const queryKey = [table, fkValue] as const;

  const { data: contactos = [], isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from(table)
        .select("*")
        .eq(fkColumn, fkValue)
        .order("nombre", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Contacto[];
    },
  });

  const [editing, setEditing] = useState<Contacto | null>(null);

  const upsert = useMutation({
    mutationFn: async (c: Contacto) => {
      if (c.id) {
        const { error } = await supabase.from(table).update({
          nombre: c.nombre,
          apellido_1: c.apellido_1,
          apellido_2: c.apellido_2,
          departamento: c.departamento,
          telefono: c.telefono,
          email: c.email,
        }).eq("id", c.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from(table).insert({
          [fkColumn]: fkValue,
          nombre: c.nombre,
          apellido_1: c.apellido_1,
          apellido_2: c.apellido_2,
          departamento: c.departamento,
          telefono: c.telefono,
          email: c.email,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
      setEditing(null);
      toast.success("Contacto guardado");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(table).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
      toast.success("Contacto eliminado");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Contactos</h3>
        {canCreate && (
          <Button
            size="sm"
            onClick={() =>
              setEditing({
                nombre: "",
                apellidos: "",
                departamento: "Administración",
                telefono: "",
                email: "",
              })
            }
          >
            <Plus className="mr-2 h-4 w-4" /> Añadir contacto
          </Button>
        )}

      </div>
      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Departamento</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="w-24"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                  Cargando…
                </TableCell>
              </TableRow>
            )}
            {!isLoading && contactos.length === 0 && !editing && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                  Sin contactos
                </TableCell>
              </TableRow>
            )}
            {contactos.map((c) =>
              editing?.id === c.id ? (
                <ContactoEditRow key={c.id} value={editing!} onChange={(v) => setEditing(v)} onCancel={() => setEditing(null)} onSave={() => editing && upsert.mutate(editing)} />
              ) : (
                <TableRow key={c.id}>
                  <TableCell>
                    {c.nombre} {c.apellidos ?? ""}
                  </TableCell>
                  <TableCell>{c.departamento}</TableCell>
                  <TableCell>{c.telefono}</TableCell>
                  <TableCell>{c.email}</TableCell>
                  <TableCell className="text-right">
                    {canEdit && (
                      <Button size="icon" variant="ghost" onClick={() => setEditing(c)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                    {canDelete && (
                      <Button size="icon" variant="ghost" onClick={() => c.id && remove.mutate(c.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>

                </TableRow>
              ),
            )}
            {editing && !editing.id && (
              <ContactoEditRow value={editing} onChange={setEditing} onCancel={() => setEditing(null)} onSave={() => upsert.mutate(editing)} />
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function ContactoEditRow({
  value,
  onChange,
  onCancel,
  onSave,
}: {
  value: Contacto;
  onChange: (c: Contacto) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  return (
    <TableRow>
      <TableCell>
        <div className="flex gap-2">
          <Input
            placeholder="Nombre"
            value={value.nombre}
            onChange={(e) => onChange({ ...value, nombre: e.target.value })}
          />
          <Input
            placeholder="Apellidos"
            value={value.apellidos ?? ""}
            onChange={(e) => onChange({ ...value, apellidos: e.target.value })}
          />
        </div>
      </TableCell>
      <TableCell>
        <Select
          value={value.departamento ?? ""}
          onValueChange={(v) => onChange({ ...value, departamento: v })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Departamento" />
          </SelectTrigger>
          <SelectContent>
            {DEPARTAMENTOS.map((d) => (
              <SelectItem key={d} value={d}>
                {d}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        <Input
          value={value.telefono ?? ""}
          onChange={(e) => onChange({ ...value, telefono: e.target.value })}
        />
      </TableCell>
      <TableCell>
        <Input
          type="email"
          value={value.email ?? ""}
          onChange={(e) => onChange({ ...value, email: e.target.value })}
        />
      </TableCell>
      <TableCell className="text-right">
        <Button size="icon" variant="ghost" onClick={onSave} disabled={!value.nombre}>
          <Save className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="ghost" onClick={onCancel}>
          <X className="h-4 w-4" />
        </Button>
      </TableCell>
    </TableRow>
  );
}
