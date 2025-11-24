'use client'

import { useState, useEffect } from 'react'
import { Filter, X, Calendar, MapPin, Church } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import api from '@/lib/api'

interface FilterState {
  dataInicio?: string
  dataFim?: string
  distritoId?: string
  igrejaId?: string
}

interface AdvancedFiltersProps {
  filters: FilterState
  onFiltersChange: (filters: FilterState) => void
  onClearFilters: () => void
}

interface Distrito {
  id: string
  nome: string
}

interface Igreja {
  id: string
  nome: string
  distrito_id: string
}

export function AdvancedFilters({ filters, onFiltersChange, onClearFilters }: AdvancedFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [distritos, setDistritos] = useState<Distrito[]>([])
  const [igrejas, setIgrejas] = useState<Igreja[]>([])
  const [igrejasFiltered, setIgrejasFiltered] = useState<Igreja[]>([])

  useEffect(() => {
    loadDistritos()
    loadIgrejas()
  }, [])

  useEffect(() => {
    // Filtrar igrejas quando distrito é selecionado
    if (filters.distritoId) {
      setIgrejasFiltered(igrejas.filter(i => i.distrito_id === filters.distritoId))
    } else {
      setIgrejasFiltered(igrejas)
    }
  }, [filters.distritoId, igrejas])

  async function loadDistritos() {
    try {
      const data = await api.get('/distritos').then(r => r.data)
      setDistritos(data)
    } catch (err) {
      console.error('Erro ao carregar distritos:', err)
    }
  }

  async function loadIgrejas() {
    try {
      const data = await api.get('/igrejas').then(r => r.data)
      setIgrejas(data)
      setIgrejasFiltered(data)
    } catch (err) {
      console.error('Erro ao carregar igrejas:', err)
    }
  }

  function handleFilterChange(key: keyof FilterState, value: string) {
    const newFilters = { ...filters, [key]: value || undefined }

    // Se mudou o distrito, limpar seleção de igreja
    if (key === 'distritoId') {
      newFilters.igrejaId = undefined
    }

    onFiltersChange(newFilters)
  }

  const hasActiveFilters = !!(
    filters.dataInicio ||
    filters.dataFim ||
    filters.distritoId ||
    filters.igrejaId
  )

  return (
    <Card>
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Filtros Avançados</h3>
              {hasActiveFilters && (
                <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                  Ativos
                </span>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? 'Recolher' : 'Expandir'}
            </Button>
          </div>

          {/* Filters */}
          {isExpanded && (
            <div className="grid gap-4 md:grid-cols-4">
              {/* Data Início */}
              <div className="space-y-2">
                <Label htmlFor="dataInicio" className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Data Início
                </Label>
                <input
                  id="dataInicio"
                  type="date"
                  value={filters.dataInicio || ''}
                  onChange={(e) => handleFilterChange('dataInicio', e.target.value)}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                />
              </div>

              {/* Data Fim */}
              <div className="space-y-2">
                <Label htmlFor="dataFim" className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Data Fim
                </Label>
                <input
                  id="dataFim"
                  type="date"
                  value={filters.dataFim || ''}
                  onChange={(e) => handleFilterChange('dataFim', e.target.value)}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  min={filters.dataInicio}
                />
              </div>

              {/* Distrito */}
              <div className="space-y-2">
                <Label htmlFor="distrito" className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  Distrito
                </Label>
                <select
                  id="distrito"
                  value={filters.distritoId || ''}
                  onChange={(e) => handleFilterChange('distritoId', e.target.value)}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                >
                  <option value="">Todos os distritos</option>
                  {distritos.map(distrito => (
                    <option key={distrito.id} value={distrito.id}>
                      {distrito.nome}
                    </option>
                  ))}
                </select>
              </div>

              {/* Igreja */}
              <div className="space-y-2">
                <Label htmlFor="igreja" className="flex items-center gap-1">
                  <Church className="h-3 w-3" />
                  Igreja
                </Label>
                <select
                  id="igreja"
                  value={filters.igrejaId || ''}
                  onChange={(e) => handleFilterChange('igrejaId', e.target.value)}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  disabled={igrejasFiltered.length === 0}
                >
                  <option value="">Todas as igrejas</option>
                  {igrejasFiltered.map(igreja => (
                    <option key={igreja.id} value={igreja.id}>
                      {igreja.nome}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={onClearFilters}
              >
                <X className="h-4 w-4 mr-2" />
                Limpar Filtros
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
