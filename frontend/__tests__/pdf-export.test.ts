import { exportarAtividadesPDF } from '@/lib/pdf-export'

// Mock do jsPDF
const mockSave = jest.fn()
const mockText = jest.fn()
const mockSetFont = jest.fn()
const mockSetFontSize = jest.fn()
const mockSetTextColor = jest.fn()
const mockSetPage = jest.fn()

jest.mock('jspdf', () => {
  return jest.fn().mockImplementation(() => ({
    setFont: mockSetFont,
    setFontSize: mockSetFontSize,
    setTextColor: mockSetTextColor,
    text: mockText,
    save: mockSave,
    setPage: mockSetPage,
    internal: {
      getNumberOfPages: () => 1,
      pageSize: {
        width: 210,
        height: 297,
      },
    },
  }))
})

// Mock do jspdf-autotable
jest.mock('jspdf-autotable', () => jest.fn())

const mockAtividades = [
  {
    id: '1',
    acao: 'criar',
    tipo_entidade: 'usuario',
    detalhes: 'Novo usuário criado',
    ip_address: '192.168.1.1',
    created_at: '2025-01-15T10:30:00Z',
  },
  {
    id: '2',
    acao: 'editar',
    tipo_entidade: 'igreja',
    detalhes: 'Igreja editada',
    ip_address: '192.168.1.2',
    created_at: '2025-01-15T11:00:00Z',
  },
  {
    id: '3',
    acao: 'excluir',
    tipo_entidade: 'pregacao',
    ip_address: '192.168.1.3',
    created_at: '2025-01-15T12:00:00Z',
  },
]

describe('exportarAtividadesPDF', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('deve exportar PDF com todas as atividades', () => {
    exportarAtividadesPDF(mockAtividades, 'João Silva', 'todos')

    // Verificar que o PDF foi salvo
    expect(mockSave).toHaveBeenCalled()
  })

  it('deve configurar fonte corretamente', () => {
    exportarAtividadesPDF(mockAtividades, 'João Silva', 'todos')

    expect(mockSetFont).toHaveBeenCalledWith('helvetica')
  })

  it('deve definir tamanhos de fonte apropriados', () => {
    exportarAtividadesPDF(mockAtividades, 'João Silva', 'todos')

    // Verificar que diferentes tamanhos foram usados (título, subtítulo, texto)
    expect(mockSetFontSize).toHaveBeenCalledWith(20) // Título principal
    expect(mockSetFontSize).toHaveBeenCalledWith(16) // Subtítulo
    expect(mockSetFontSize).toHaveBeenCalledWith(10) // Informações
  })

  it('deve incluir nome do usuário no PDF', () => {
    exportarAtividadesPDF(mockAtividades, 'Maria Santos', 'todos')

    // Verificar que o nome foi adicionado ao PDF
    expect(mockText).toHaveBeenCalledWith(
      expect.stringContaining('Maria Santos'),
      expect.any(Number),
      expect.any(Number)
    )
  })

  it('deve incluir total de registros no PDF', () => {
    exportarAtividadesPDF(mockAtividades, 'João Silva', 'todos')

    expect(mockText).toHaveBeenCalledWith(
      expect.stringContaining('Total de registros: 3'),
      expect.any(Number),
      expect.any(Number)
    )
  })

  it('deve incluir filtro quando especificado', () => {
    exportarAtividadesPDF(mockAtividades, 'João Silva', 'criar')

    expect(mockText).toHaveBeenCalledWith(
      expect.stringContaining('Filtro:'),
      expect.any(Number),
      expect.any(Number)
    )
  })

  it('não deve incluir filtro quando é "todos"', () => {
    exportarAtividadesPDF(mockAtividades, 'João Silva', 'todos')

    const filterCalls = (mockText as jest.Mock).mock.calls.filter(call =>
      call[0].includes('Filtro:')
    )
    expect(filterCalls.length).toBe(0)
  })

  it('deve gerar nome de arquivo com formato correto', () => {
    exportarAtividadesPDF(mockAtividades, 'João Silva', 'todos')

    expect(mockSave).toHaveBeenCalledWith(
      expect.stringMatching(/^atividades_João_Silva_\d{4}-\d{2}-\d{2}\.pdf$/)
    )
  })

  it('deve substituir espaços no nome do arquivo', () => {
    exportarAtividadesPDF(mockAtividades, 'Maria dos Santos', 'todos')

    expect(mockSave).toHaveBeenCalledWith(
      expect.stringMatching(/^atividades_Maria_dos_Santos_/)
    )
  })

  it('deve lidar com lista vazia de atividades', () => {
    exportarAtividadesPDF([], 'João Silva', 'todos')

    expect(mockSave).toHaveBeenCalled()
    expect(mockText).toHaveBeenCalledWith(
      expect.stringContaining('Total de registros: 0'),
      expect.any(Number),
      expect.any(Number)
    )
  })

  it('deve processar atividades sem IP address', () => {
    const atividadesSemIP = [
      {
        id: '1',
        acao: 'login',
        tipo_entidade: 'usuario',
        created_at: '2025-01-15T10:00:00Z',
      },
    ]

    expect(() => {
      exportarAtividadesPDF(atividadesSemIP as any, 'João Silva', 'todos')
    }).not.toThrow()
  })

  it('deve processar diferentes tipos de ações', () => {
    const todasAcoes = [
      { id: '1', acao: 'criar', tipo_entidade: 'usuario', created_at: '2025-01-15T10:00:00Z' },
      { id: '2', acao: 'editar', tipo_entidade: 'igreja', created_at: '2025-01-15T10:00:00Z' },
      { id: '3', acao: 'excluir', tipo_entidade: 'distrito', created_at: '2025-01-15T10:00:00Z' },
      { id: '4', acao: 'login', tipo_entidade: 'usuario', created_at: '2025-01-15T10:00:00Z' },
      { id: '5', acao: 'logout', tipo_entidade: 'usuario', created_at: '2025-01-15T10:00:00Z' },
    ]

    expect(() => {
      exportarAtividadesPDF(todasAcoes as any, 'João Silva', 'todos')
    }).not.toThrow()

    expect(mockSave).toHaveBeenCalled()
  })

  it('deve processar diferentes tipos de entidades', () => {
    const todasEntidades = [
      { id: '1', acao: 'criar', tipo_entidade: 'usuario', created_at: '2025-01-15T10:00:00Z' },
      { id: '2', acao: 'criar', tipo_entidade: 'igreja', created_at: '2025-01-15T10:00:00Z' },
      { id: '3', acao: 'criar', tipo_entidade: 'distrito', created_at: '2025-01-15T10:00:00Z' },
      { id: '4', acao: 'criar', tipo_entidade: 'associacao', created_at: '2025-01-15T10:00:00Z' },
      { id: '5', acao: 'criar', tipo_entidade: 'pregacao', created_at: '2025-01-15T10:00:00Z' },
      { id: '6', acao: 'criar', tipo_entidade: 'tematica', created_at: '2025-01-15T10:00:00Z' },
      { id: '7', acao: 'criar', tipo_entidade: 'escala', created_at: '2025-01-15T10:00:00Z' },
    ]

    expect(() => {
      exportarAtividadesPDF(todasEntidades as any, 'João Silva', 'todos')
    }).not.toThrow()
  })

  it('deve incluir detalhes quando disponíveis', () => {
    const atividadesComDetalhes = [
      {
        id: '1',
        acao: 'criar',
        tipo_entidade: 'usuario',
        detalhes: 'Detalhes importantes',
        created_at: '2025-01-15T10:00:00Z',
      },
    ]

    exportarAtividadesPDF(atividadesComDetalhes as any, 'João Silva', 'todos')

    expect(mockSave).toHaveBeenCalled()
  })
})
