"use client";

import * as React from "react";
import { useState, useEffect, useMemo } from "react";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
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

interface Usuario {
  id: number;
  nome_completo: string;
  score_atual?: number;
}

interface UsuarioComboboxProps {
  value: number | null;
  onValueChange: (value: number | null) => void;
  usuarios: Usuario[];
  loading?: boolean;
  placeholder?: string;
  emptyText?: string;
  className?: string;
  disabled?: boolean;
}

export function UsuarioCombobox({
  value,
  onValueChange,
  usuarios,
  loading = false,
  placeholder = "Selecione...",
  emptyText = "Nenhum encontrado.",
  className,
  disabled = false,
}: UsuarioComboboxProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Filtrar usuários pelo termo de pesquisa
  const filteredUsuarios = useMemo(() => {
    if (!searchTerm) return usuarios;
    const term = searchTerm.toLowerCase();
    return usuarios.filter((u) => u.nome_completo.toLowerCase().includes(term));
  }, [usuarios, searchTerm]);

  // Encontrar usuário selecionado
  const selectedUsuario = useMemo(() => {
    return usuarios.find((u) => u.id === value) || null;
  }, [usuarios, value]);

  const handleSelect = (usuario: Usuario | null) => {
    onValueChange(usuario?.id || null);
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
          disabled={disabled || loading}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando...
            </span>
          ) : selectedUsuario ? (
            <span className="flex items-center gap-2 truncate">
              {selectedUsuario.nome_completo}
              {selectedUsuario.score_atual !== undefined && selectedUsuario.score_atual !== null && (
                <span className="text-xs text-muted-foreground">
                  (Score: {Number(selectedUsuario.score_atual).toFixed(1)})
                </span>
              )}
            </span>
          ) : (
            placeholder
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[350px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Pesquisar..."
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
            ) : filteredUsuarios.length === 0 ? (
              <CommandEmpty>{emptyText}</CommandEmpty>
            ) : (
              <CommandGroup>
                <CommandItem
                  value="none"
                  onSelect={() => handleSelect(null)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === null ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="text-muted-foreground">Nenhum (vago)</span>
                </CommandItem>
                {filteredUsuarios.map((usuario) => (
                  <CommandItem
                    key={usuario.id}
                    value={usuario.id.toString()}
                    onSelect={() => handleSelect(usuario)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === usuario.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex items-center gap-2 flex-1">
                      <span>{usuario.nome_completo}</span>
                      {usuario.score_atual !== undefined && usuario.score_atual !== null && (
                        <span className="text-xs text-muted-foreground ml-auto">
                          Score: {Number(usuario.score_atual).toFixed(1)}
                        </span>
                      )}
                    </div>
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
