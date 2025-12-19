"use client";

import * as React from "react";
import { useState, useCallback, useEffect } from "react";
import { Check, ChevronsUpDown, Loader2, Search } from "lucide-react";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { api } from "@/lib/api";

interface Distrito {
  id: number;
  nome: string;
}

interface DistritoListResponse {
  items: Distrito[];
  total: number;
}

interface DistritoComboboxProps {
  value: number | null;
  onValueChange: (value: number | null) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function DistritoCombobox({
  value,
  onValueChange,
  placeholder = "Selecione o distrito",
  className,
  disabled = false,
}: DistritoComboboxProps) {
  const [open, setOpen] = useState(false);
  const [distritos, setDistritos] = useState<Distrito[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDistrito, setSelectedDistrito] = useState<Distrito | null>(null);

  // Buscar distritos iniciais ou por pesquisa
  const fetchDistritos = useCallback(async (search: string = "") => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("search", search);
      params.append("limit", "50");
      
      const data = await api.get<DistritoListResponse>(
        `/api/v1/distritos/pesquisar?${params.toString()}`
      );
      setDistritos(data.items);
    } catch (err) {
      console.error("Erro ao carregar distritos:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Carregar distritos quando o popover abre
  useEffect(() => {
    if (open) {
      fetchDistritos(searchTerm);
    }
  }, [open, fetchDistritos]);

  // Debounce na pesquisa
  useEffect(() => {
    if (!open) return;
    
    const timer = setTimeout(() => {
      fetchDistritos(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm, fetchDistritos, open]);

  // Carregar distrito selecionado pelo valor
  useEffect(() => {
    if (value && !selectedDistrito) {
      const found = distritos.find((d) => d.id === value);
      if (found) {
        setSelectedDistrito(found);
      } else {
        // Buscar o distrito específico
        api
          .get<DistritoListResponse>(`/api/v1/distritos/pesquisar?search=&limit=100`)
          .then((data) => {
            const distrito = data.items.find((d) => d.id === value);
            if (distrito) {
              setSelectedDistrito(distrito);
            }
          })
          .catch(console.error);
      }
    } else if (!value) {
      setSelectedDistrito(null);
    }
  }, [value, distritos, selectedDistrito]);

  const handleSelect = (distrito: Distrito) => {
    setSelectedDistrito(distrito);
    onValueChange(distrito.id);
    setOpen(false);
    setSearchTerm("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className)}
          disabled={disabled}
        >
          {selectedDistrito ? selectedDistrito.nome : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Pesquisar distrito..."
            value={searchTerm}
            onValueChange={setSearchTerm}
          />
          <CommandList>
            {loading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="ml-2 text-sm text-muted-foreground">
                  Carregando...
                </span>
              </div>
            ) : distritos.length === 0 ? (
              <CommandEmpty>Nenhum distrito encontrado.</CommandEmpty>
            ) : (
              <CommandGroup>
                {distritos.map((distrito) => (
                  <CommandItem
                    key={distrito.id}
                    value={distrito.id.toString()}
                    onSelect={() => handleSelect(distrito)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === distrito.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {distrito.nome}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
