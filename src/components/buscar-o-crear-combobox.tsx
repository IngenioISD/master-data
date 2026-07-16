import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface Props<T> {
  placeholder?: string;
  queryKey: readonly unknown[];
  search: (term: string) => Promise<T[]>;
  getLabel: (item: T) => string;
  getSubLabel?: (item: T) => string;
  getValue: (item: T) => string;
  value?: string | null;
  selectedLabel?: string | null;
  onSelect: (item: T) => void;
  onCreateNew?: (term: string) => void;
  createLabel?: string;
}

export function BuscarOCrearCombobox<T>({
  placeholder = "Buscar…",
  queryKey,
  search,
  getLabel,
  getSubLabel,
  getValue,
  value,
  selectedLabel,
  onSelect,
  onCreateNew,
  createLabel = "Crear nuevo",
}: Props<T>) {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");

  const { data = [], isFetching } = useQuery({
    queryKey: [...queryKey, term],
    queryFn: () => search(term),
    enabled: open,
  });

  const selected = data.find((d) => getValue(d) === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          className="w-full justify-between"
        >
          {selected ? getLabel(selected) : selectedLabel ? selectedLabel : value ? (placeholder) : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={placeholder}
            value={term}
            onValueChange={setTerm}
          />
          <CommandList>
            {isFetching && <div className="p-2 text-xs text-muted-foreground">Buscando…</div>}
            <CommandEmpty>Sin resultados.</CommandEmpty>
            <CommandGroup>
              {data.map((item) => (
                <CommandItem
                  key={getValue(item)}
                  value={getValue(item)}
                  onSelect={() => {
                    onSelect(item);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === getValue(item) ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <div className="flex flex-col">
                    <span>{getLabel(item)}</span>
                    {getSubLabel && (
                      <span className="text-xs text-muted-foreground">{getSubLabel(item)}</span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
            {onCreateNew && (
              <CommandGroup>
                <CommandItem
                  onSelect={() => {
                    onCreateNew(term);
                    setOpen(false);
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {createLabel}
                  {term && <span className="ml-1 text-muted-foreground">"{term}"</span>}
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
