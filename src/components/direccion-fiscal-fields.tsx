import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface DireccionFiscal {
  via?: string | null;
  numero?: string | null;
  cp?: string | null;
  municipio?: string | null;
  provincia?: string | null;
  pais?: string | null;
}

interface Props {
  value: DireccionFiscal;
  onChange: (v: DireccionFiscal) => void;
  required?: boolean;
}

export function DireccionFiscalFields({ value, onChange, required = false }: Props) {
  const set = <K extends keyof DireccionFiscal>(k: K, v: string) =>
    onChange({ ...value, [k]: v });
  const tag = required ? " *" : "";
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-6">
      <div className="space-y-1.5 sm:col-span-4">
        <Label htmlFor="via">Vía{tag}</Label>
        <Input id="via" value={value.via ?? ""} onChange={(e) => set("via", e.target.value)} required={required} />
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="numero">Número{tag}</Label>
        <Input id="numero" value={value.numero ?? ""} onChange={(e) => set("numero", e.target.value)} required={required} />
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="cp">CP{tag}</Label>
        <Input id="cp" value={value.cp ?? ""} onChange={(e) => set("cp", e.target.value)} required={required} />
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="municipio">Municipio{tag}</Label>
        <Input id="municipio" value={value.municipio ?? ""} onChange={(e) => set("municipio", e.target.value)} required={required} />
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="provincia">Provincia{tag}</Label>
        <Input id="provincia" value={value.provincia ?? ""} onChange={(e) => set("provincia", e.target.value)} required={required} />
      </div>
      <div className="space-y-1.5 sm:col-span-6">
        <Label htmlFor="pais">País{tag}</Label>
        <Input id="pais" value={value.pais ?? "España"} onChange={(e) => set("pais", e.target.value)} required={required} />
      </div>
    </div>
  );
}
