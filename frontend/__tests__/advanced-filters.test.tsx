import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { AdvancedFilters } from '@/components/dashboard/AdvancedFilters'
import api from '@/lib/api'

// Mock do módulo api
jest.mock('@/lib/api', () => ({
  get: jest.fn(),
}))

const mockDistritos = [
  { id: '1', nome: 'Distrito Central' },
  { id: '2', nome: 'Distrito Sul' },
  { id: '3', nome: 'Distrito Norte' },
]

const mockIgrejas = [
  { id: '1', nome: 'Igreja Central', distrito_id: '1' },
  { id: '2', nome: 'Igreja Sul A', distrito_id: '2' },
  { id: '3', nome: 'Igreja Sul B', distrito_id: '2' },
  { id: '4', nome: 'Igreja Norte', distrito_id: '3' },
]

const mockFilters = {
  dataInicio: undefined,
  dataFim: undefined,
  distritoId: undefined,
  igrejaId: undefined,
}

const mockOnFiltersChange = jest.fn()
const mockOnClearFilters = jest.fn()

describe('AdvancedFilters', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(api.get as jest.Mock).mockImplementation((url) => {
      if (url === '/distritos') {
        return Promise.resolve({ data: mockDistritos })
      }
      if (url === '/igrejas') {
        return Promise.resolve({ data: mockIgrejas })
      }
      return Promise.resolve({ data: [] })
    })
  })

  it('deve renderizar o componente com título correto', async () => {
    await act(async () => {
      render(
        <AdvancedFilters
          filters={mockFilters}
          onFiltersChange={mockOnFiltersChange}
          onClearFilters={mockOnClearFilters}
        />
      )
    })

    await waitFor(() => {
      expect(screen.getByText('Filtros Avançados')).toBeInTheDocument()
    })
  })

  it('deve começar recolhido por padrão', () => {
    render(
      <AdvancedFilters
        filters={mockFilters}
        onFiltersChange={mockOnFiltersChange}
        onClearFilters={mockOnClearFilters}
      />
    )

    expect(screen.queryByLabelText(/Data Início/i)).not.toBeInTheDocument()
  })

  it('deve expandir ao clicar em "Expandir"', async () => {
    render(
      <AdvancedFilters
        filters={mockFilters}
        onFiltersChange={mockOnFiltersChange}
        onClearFilters={mockOnClearFilters}
      />
    )

    const expandButton = screen.getByText('Expandir')
    fireEvent.click(expandButton)

    await waitFor(() => {
      expect(screen.getByLabelText(/Data Início/i)).toBeInTheDocument()
    })
  })

  it('deve recolher ao clicar em "Recolher"', async () => {
    render(
      <AdvancedFilters
        filters={mockFilters}
        onFiltersChange={mockOnFiltersChange}
        onClearFilters={mockOnClearFilters}
      />
    )

    // Expandir
    const expandButton = screen.getByText('Expandir')
    fireEvent.click(expandButton)

    // Aguardar expandir
    await waitFor(() => {
      expect(screen.getByLabelText(/Data Início/i)).toBeInTheDocument()
    })

    // Recolher
    const collapseButton = screen.getByText('Recolher')
    fireEvent.click(collapseButton)

    await waitFor(() => {
      expect(screen.queryByLabelText(/Data Início/i)).not.toBeInTheDocument()
    })
  })

  it('deve carregar distritos ao montar componente', async () => {
    render(
      <AdvancedFilters
        filters={mockFilters}
        onFiltersChange={mockOnFiltersChange}
        onClearFilters={mockOnClearFilters}
      />
    )

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/distritos')
    })
  })

  it('deve carregar igrejas ao montar componente', async () => {
    render(
      <AdvancedFilters
        filters={mockFilters}
        onFiltersChange={mockOnFiltersChange}
        onClearFilters={mockOnClearFilters}
      />
    )

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/igrejas')
    })
  })

  it('deve mostrar badge "Ativos" quando há filtros aplicados', () => {
    const filtersWithData = {
      dataInicio: '2025-01-01',
      dataFim: undefined,
      distritoId: undefined,
      igrejaId: undefined,
    }

    render(
      <AdvancedFilters
        filters={filtersWithData}
        onFiltersChange={mockOnFiltersChange}
        onClearFilters={mockOnClearFilters}
      />
    )

    expect(screen.getByText('Ativos')).toBeInTheDocument()
  })

  it('não deve mostrar badge "Ativos" quando não há filtros', () => {
    render(
      <AdvancedFilters
        filters={mockFilters}
        onFiltersChange={mockOnFiltersChange}
        onClearFilters={mockOnClearFilters}
      />
    )

    expect(screen.queryByText('Ativos')).not.toBeInTheDocument()
  })

  it('deve chamar onFiltersChange ao alterar data início', async () => {
    render(
      <AdvancedFilters
        filters={mockFilters}
        onFiltersChange={mockOnFiltersChange}
        onClearFilters={mockOnClearFilters}
      />
    )

    // Expandir filtros
    fireEvent.click(screen.getByText('Expandir'))

    await waitFor(() => {
      const dataInicioInput = screen.getByLabelText(/Data Início/i)
      fireEvent.change(dataInicioInput, { target: { value: '2025-01-01' } })
    })

    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      ...mockFilters,
      dataInicio: '2025-01-01',
    })
  })

  it.skip('deve chamar onFiltersChange ao alterar distrito', async () => {
    render(
      <AdvancedFilters
        filters={mockFilters}
        onFiltersChange={mockOnFiltersChange}
        onClearFilters={mockOnClearFilters}
      />
    )

    // Expandir filtros
    fireEvent.click(screen.getByText('Expandir'))

    // Aguardar o campo estar disponível
    const distritoSelect = await screen.findByLabelText(/Distrito/i)

    // Alterar o valor
    fireEvent.change(distritoSelect, { target: { value: '1' } })

    // Verificar que callback foi chamado com distritoId
    await waitFor(() => {
      expect(mockOnFiltersChange).toHaveBeenCalled()
      const calls = mockOnFiltersChange.mock.calls
      const hasDistritoCall = calls.some(call => call[0].distritoId === '1')
      expect(hasDistritoCall).toBe(true)
    })
  })

  it('deve limpar seleção de igreja ao mudar distrito', async () => {
    const filtersWithIgreja = {
      ...mockFilters,
      distritoId: '1',
      igrejaId: '1',
    }

    render(
      <AdvancedFilters
        filters={filtersWithIgreja}
        onFiltersChange={mockOnFiltersChange}
        onClearFilters={mockOnClearFilters}
      />
    )

    // Expandir filtros
    fireEvent.click(screen.getByText('Expandir'))

    await waitFor(() => {
      const distritoSelect = screen.getByLabelText(/Distrito/i)
      fireEvent.change(distritoSelect, { target: { value: '2' } })
    })

    // Verificar que callback foi chamado
    expect(mockOnFiltersChange).toHaveBeenCalled()

    // Verificar que igreja foi limpa ao mudar distrito
    const lastCall = mockOnFiltersChange.mock.calls[mockOnFiltersChange.mock.calls.length - 1][0]
    expect(lastCall.igrejaId).toBeUndefined()
  })

  it('deve mostrar botão "Limpar Filtros" quando há filtros ativos', () => {
    const filtersWithData = {
      dataInicio: '2025-01-01',
      dataFim: undefined,
      distritoId: undefined,
      igrejaId: undefined,
    }

    render(
      <AdvancedFilters
        filters={filtersWithData}
        onFiltersChange={mockOnFiltersChange}
        onClearFilters={mockOnClearFilters}
      />
    )

    expect(screen.getByText('Limpar Filtros')).toBeInTheDocument()
  })

  it('não deve mostrar botão "Limpar Filtros" quando não há filtros', () => {
    render(
      <AdvancedFilters
        filters={mockFilters}
        onFiltersChange={mockOnFiltersChange}
        onClearFilters={mockOnClearFilters}
      />
    )

    expect(screen.queryByText('Limpar Filtros')).not.toBeInTheDocument()
  })

  it('deve chamar onClearFilters ao clicar em "Limpar Filtros"', async () => {
    const filtersWithData = {
      dataInicio: '2025-01-01',
      dataFim: '2025-01-31',
      distritoId: '1',
      igrejaId: '1',
    }

    render(
      <AdvancedFilters
        filters={filtersWithData}
        onFiltersChange={mockOnFiltersChange}
        onClearFilters={mockOnClearFilters}
      />
    )

    const clearButton = screen.getByText('Limpar Filtros')
    fireEvent.click(clearButton)

    expect(mockOnClearFilters).toHaveBeenCalled()
  })

  it('deve definir min na data fim quando data início está selecionada', async () => {
    const filtersWithDataInicio = {
      ...mockFilters,
      dataInicio: '2025-01-01',
    }

    render(
      <AdvancedFilters
        filters={filtersWithDataInicio}
        onFiltersChange={mockOnFiltersChange}
        onClearFilters={mockOnClearFilters}
      />
    )

    // Expandir filtros
    fireEvent.click(screen.getByText('Expandir'))

    await waitFor(() => {
      const dataFimInput = screen.getByLabelText(/Data Fim/i) as HTMLInputElement
      expect(dataFimInput.min).toBe('2025-01-01')
    })
  })

  it('deve lidar com erro ao carregar distritos', async () => {
    ;(api.get as jest.Mock).mockRejectedValueOnce(new Error('Erro de rede'))

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

    render(
      <AdvancedFilters
        filters={mockFilters}
        onFiltersChange={mockOnFiltersChange}
        onClearFilters={mockOnClearFilters}
      />
    )

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalled()
    })

    consoleSpy.mockRestore()
  })

  it('deve renderizar todos os campos de filtro quando expandido', async () => {
    render(
      <AdvancedFilters
        filters={mockFilters}
        onFiltersChange={mockOnFiltersChange}
        onClearFilters={mockOnClearFilters}
      />
    )

    // Expandir
    fireEvent.click(screen.getByText('Expandir'))

    await waitFor(() => {
      expect(screen.getByLabelText(/Data Início/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Data Fim/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Distrito/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Igreja/i)).toBeInTheDocument()
    })
  })
})
