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
  requiredKeys?: Array<keyof DireccionFiscal>;
}

export function DireccionFiscalFields({ value, onChange, required = false, requiredKeys }: Props) {
  const set = <K extends keyof DireccionFiscal>(k: K, v: string) =>
    onChange({ ...value, [k]: v });
  const isReq = (k: keyof DireccionFiscal) =>
    requiredKeys ? requiredKeys.includes(k) : required;
  const mark = (k: keyof DireccionFiscal) => (isReq(k) ? " *" : "");
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-6">
      <div className="space-y-1.5 sm:col-span-4">
        <Label htmlFor="via">Vía{mark("via")}</Label>
        <Input id="via" value={value.via ?? ""} onChange={(e) => set("via", e.target.value)} required={isReq("via")} />
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="numero">Número{mark("numero")}</Label>
        <Input id="numero" value={value.numero ?? ""} onChange={(e) => set("numero", e.target.value)} required={isReq("numero")} />
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="cp">CP{mark("cp")}</Label>
        <Input id="cp" value={value.cp ?? ""} onChange={(e) => set("cp", e.target.value)} required={isReq("cp")} />
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="municipio">Municipio{mark("municipio")}</Label>
        <Input id="municipio" value={value.municipio ?? ""} onChange={(e) => set("municipio", e.target.value)} required={isReq("municipio")} />
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="provincia">Provincia{mark("provincia")}</Label>
        <Input id="provincia" value={value.provincia ?? ""} onChange={(e) => set("provincia", e.target.value)} required={isReq("provincia")} />
      </div>
      <div className="space-y-1.5 sm:col-span-6">
        <Label htmlFor="pais">País{mark("pais")}</Label>
        <Input id="pais" value={value.pais ?? "España"} onChange={(e) => set("pais", e.target.value)} required={isReq("pais")} />
      </div>
    </div>
  );
}

