import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Unlink, Pencil, X, Save, Link2, Search } from "lucide-react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface Contacto {
  id: string;
  nombre: string;
  apellido_1: string | null;
  apellido_2: string | null;
  departamento: string | null;
  telefono: string | null;
  email: string | null;
}

interface ContactoForm {
  id?: string;
  nombre: string;
  apellido_1: string;
  apellido_2: string;
  departamento: string;
  telefono: string;
  email: string;
}

const DEPARTAMENTOS = ["Administración", "Ventas", "Dirección", "Operaciones", "Otro"] as const;

const EMPTY_FORM: ContactoForm = {
  nombre: "",
  apellido_1: "",
  apellido_2: "",
  departamento: "Administración",
  telefono: "",
  email: "",
};

interface Props {
  propiedadId: string;
  clienteId: string;
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
}

export function PropiedadContactosManager({
  propiedadId,
  clienteId,
  canCreate = true,
  canEdit = true,
  canDelete = true,
}: Props) {
  const qc = useQueryClient();
  const queryKey = ["cliente_propiedad_contactos", clienteId, propiedadId] as const;

  const { data: contactos = [], isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cliente_propiedad_contactos")
        .select(
          "contacto_id, contacto:contacto_id(id, nombre, apellido_1, apellido_2, departamento, telefono, email)",
        )
        .eq("cliente_id", clienteId)
        .eq("propiedad_id", propiedadId);
      if (error) throw error;
      const list = (data ?? [])
        .map((r: any) => r.contacto)
        .filter(Boolean) as Contacto[];
      return list.sort((a, b) => a.nombre.localeCompare(b.nombre));
    },
  });

  const [editing, setEditing] = useState<ContactoForm | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const updateContacto = useMutation({
    mutationFn: async (c: ContactoForm) => {
      if (!c.id) return;
      const { error } = await supabase
        .from("propiedad_contactos")
        .update({
          nombre: c.nombre,
          apellido_1: c.apellido_1 || null,
          apellido_2: c.apellido_2 || null,
          departamento: c.departamento || null,
          telefono: c.telefono || null,
          email: c.email || null,
        })
        .eq("id", c.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
      setEditing(null);
      toast.success("Contacto actualizado");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const unlink = useMutation({
    mutationFn: async (contactoId: string) => {
      const { error } = await supabase
        .from("cliente_propiedad_contactos")
        .delete()
        .eq("cliente_id", clienteId)
        .eq("propiedad_id", propiedadId)
        .eq("contacto_id", contactoId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
      toast.success("Contacto desvinculado");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Contactos</h3>
        {canCreate && (
          <Button size="sm" onClick={() => setDialogOpen(true)}>
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
            {!isLoading && contactos.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                  Sin contactos
                </TableCell>
              </TableRow>
            )}
            {contactos.map((c) =>
              editing?.id === c.id ? (
                <ContactoEditRow
                  key={c.id}
                  value={editing}
                  onChange={setEditing}
                  onCancel={() => setEditing(null)}
                  onSave={() => editing && updateContacto.mutate(editing)}
                />
              ) : (
                <TableRow key={c.id}>
                  <TableCell>
                    {c.nombre} {c.apellido_1 ?? ""} {c.apellido_2 ?? ""}
                  </TableCell>
                  <TableCell>{c.departamento}</TableCell>
                  <TableCell>{c.telefono}</TableCell>
                  <TableCell>{c.email}</TableCell>
                  <TableCell className="text-right">
                    <TooltipProvider delayDuration={200}>
                      {canEdit && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              aria-label="Editar"
                              onClick={() =>
                                setEditing({
                                  id: c.id,
                                  nombre: c.nombre,
                                  apellido_1: c.apellido_1 ?? "",
                                  apellido_2: c.apellido_2 ?? "",
                                  departamento: c.departamento ?? "Administración",
                                  telefono: c.telefono ?? "",
                                  email: c.email ?? "",
                                })
                              }
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Editar</TooltipContent>
                        </Tooltip>
                      )}
                      {canDelete && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              aria-label="Desvincular"
                              onClick={() => unlink.mutate(c.id)}
                            >
                              <Unlink className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Desvincular</TooltipContent>
                        </Tooltip>
                      )}
                    </TooltipProvider>
                  </TableCell>

                </TableRow>
              ),
            )}
          </TableBody>
        </Table>
      </div>

      {dialogOpen && (
        <AddContactoDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          propiedadId={propiedadId}
          clienteId={clienteId}
          existingIds={new Set(contactos.map((c) => c.id))}
          onDone={() => {
            qc.invalidateQueries({ queryKey });
            setDialogOpen(false);
          }}
        />
      )}
    </div>
  );
}

function ContactoEditRow({
  value,
  onChange,
  onCancel,
  onSave,
}: {
  value: ContactoForm;
  onChange: (c: ContactoForm) => void;
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
            placeholder="Apellido 1"
            value={value.apellido_1}
            onChange={(e) => onChange({ ...value, apellido_1: e.target.value })}
          />
          <Input
            placeholder="Apellido 2"
            value={value.apellido_2}
            onChange={(e) => onChange({ ...value, apellido_2: e.target.value })}
          />
        </div>
      </TableCell>
      <TableCell>
        <Select
          value={value.departamento}
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
          value={value.telefono}
          onChange={(e) => onChange({ ...value, telefono: e.target.value })}
        />
      </TableCell>
      <TableCell>
        <Input
          type="email"
          value={value.email}
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

function AddContactoDialog({
  open,
  onOpenChange,
  propiedadId,
  clienteId,
  existingIds,
  onDone,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  propiedadId: string;
  clienteId: string;
  existingIds: Set<string>;
  onDone: () => void;
}) {
  const [term, setTerm] = useState("");
  const [mode, setMode] = useState<"search" | "create">("search");
  const [form, setForm] = useState<ContactoForm>(EMPTY_FORM);

  const { data: results = [], isFetching } = useQuery({
    queryKey: ["propiedad_contactos_search", propiedadId, term],
    enabled: mode === "search",
    queryFn: async () => {
      let q = supabase
        .from("propiedad_contactos")
        .select("id, nombre, apellido_1, apellido_2, departamento, telefono, email")
        .eq("propiedad_id", propiedadId)
        .order("nombre", { ascending: true })
        .limit(20);
      if (term.trim()) {
        const t = `%${term.trim()}%`;
        q = q.or(`nombre.ilike.${t},apellido_1.ilike.${t},email.ilike.${t}`);
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Contacto[];
    },
  });

  const link = useMutation({
    mutationFn: async (contactoId: string) => {
      const { error } = await supabase.from("cliente_propiedad_contactos").insert({
        cliente_id: clienteId,
        propiedad_id: propiedadId,
        contacto_id: contactoId,
        activo: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Contacto vinculado");
      onDone();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const createAndLink = useMutation({
    mutationFn: async (c: ContactoForm) => {
      const { data, error } = await supabase
        .from("propiedad_contactos")
        .insert({
          propiedad_id: propiedadId,
          nombre: c.nombre,
          apellido_1: c.apellido_1 || null,
          apellido_2: c.apellido_2 || null,
          departamento: c.departamento || null,
          telefono: c.telefono || null,
          email: c.email || null,
        })
        .select("id")
        .single();
      if (error) throw error;
      const { error: e2 } = await supabase.from("cliente_propiedad_contactos").insert({
        cliente_id: clienteId,
        propiedad_id: propiedadId,
        contacto_id: data!.id,
        activo: true,
      });
      if (e2) throw e2;
    },
    onSuccess: () => {
      toast.success("Contacto creado y vinculado");
      onDone();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {mode === "search" ? "Añadir contacto" : "Crear nuevo contacto"}
          </DialogTitle>
        </DialogHeader>

        {mode === "search" ? (
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                autoFocus
                placeholder="Buscar por nombre o email…"
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <div className="max-h-72 overflow-auto rounded-md border">
              {isFetching && (
                <div className="p-3 text-sm text-muted-foreground">Buscando…</div>
              )}
              {!isFetching && results.length === 0 && (
                <div className="p-3 text-sm text-muted-foreground">
                  Ningún contacto encontrado en el catálogo.
                </div>
              )}
              {results.map((c) => {
                const already = existingIds.has(c.id);
                return (
                  <div
                    key={c.id}
                    className="flex items-center justify-between border-b px-3 py-2 last:border-b-0"
                  >
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">
                        {c.nombre} {c.apellido_1 ?? ""} {c.apellido_2 ?? ""}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {c.departamento ?? "—"} · {c.email ?? "sin email"}
                      </span>
                    </div>
                    {already ? (
                      <span className="rounded-full border border-border bg-muted px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                        Agregado
                      </span>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={link.isPending}
                        onClick={() => link.mutate(c.id)}
                      >
                        <Link2 className="mr-2 h-4 w-4" />
                        Agregar
                      </Button>
                    )}
                  </div>

                );
              })}
            </div>
            <DialogFooter className="flex justify-between sm:justify-between">
              <Button
                variant="ghost"
                onClick={() => {
                  setForm({ ...EMPTY_FORM, nombre: term });
                  setMode("create");
                }}
              >
                <Plus className="mr-2 h-4 w-4" /> Crear nuevo contacto
              </Button>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Nombre</Label>
                <Input
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Apellido 1</Label>
                <Input
                  value={form.apellido_1}
                  onChange={(e) => setForm({ ...form, apellido_1: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Apellido 2</Label>
                <Input
                  value={form.apellido_2}
                  onChange={(e) => setForm({ ...form, apellido_2: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Departamento</Label>
                <Select
                  value={form.departamento}
                  onValueChange={(v) => setForm({ ...form, departamento: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DEPARTAMENTOS.map((d) => (
                      <SelectItem key={d} value={d}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Teléfono</Label>
                <Input
                  value={form.telefono}
                  onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter className="flex justify-between sm:justify-between">
              <Button variant="ghost" onClick={() => setMode("search")}>
                Volver a buscar
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={() => createAndLink.mutate(form)}
                  disabled={!form.nombre || createAndLink.isPending}
                >
                  Crear y vincular
                </Button>
              </div>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
