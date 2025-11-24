import { render, screen } from '@testing-library/react'
import { AnalyticsCharts } from '@/components/charts/AnalyticsCharts'

// Mock dos componentes do Chart.js
jest.mock('react-chartjs-2', () => ({
  Line: () => <div data-testid="line-chart">Line Chart</div>,
  Bar: () => <div data-testid="bar-chart">Bar Chart</div>,
  Pie: () => <div data-testid="pie-chart">Pie Chart</div>,
}))

// Mock do Chart.js register
jest.mock('chart.js', () => ({
  Chart: {
    register: jest.fn(),
  },
  CategoryScale: {},
  LinearScale: {},
  PointElement: {},
  LineElement: {},
  BarElement: {},
  ArcElement: {},
  Title: {},
  Tooltip: {},
  Legend: {},
  Filler: {},
}))

const mockStats = [
  {
    id: '1',
    nome: 'Associação Central',
    sigla: 'ACE',
    total_distritos: 5,
    total_igrejas: 20,
    total_membros: 500,
    total_pregacoes: 100,
    media_avaliacoes: 4.5,
  },
  {
    id: '2',
    nome: 'Associação Sul',
    sigla: 'ASU',
    total_distritos: 3,
    total_igrejas: 15,
    total_membros: 300,
    total_pregacoes: 80,
    media_avaliacoes: 4.2,
  },
  {
    id: '3',
    nome: 'Associação Norte',
    sigla: 'ANO',
    total_distritos: 4,
    total_igrejas: 18,
    total_membros: 400,
    total_pregacoes: 90,
    media_avaliacoes: 4.7,
  },
]

describe('AnalyticsCharts', () => {
  it('deve renderizar todos os três gráficos quando há dados', () => {
    render(<AnalyticsCharts stats={mockStats} periodo="30" />)

    expect(screen.getByTestId('line-chart')).toBeInTheDocument()
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument()
    expect(screen.getByTestId('pie-chart')).toBeInTheDocument()
  })

  it('deve renderizar títulos corretos dos gráficos', () => {
    render(<AnalyticsCharts stats={mockStats} periodo="30" />)

    expect(screen.getByText('Tendência de Pregações')).toBeInTheDocument()
    expect(screen.getByText('Pregações por Associação')).toBeInTheDocument()
    expect(screen.getByText('Distribuição de Membros')).toBeInTheDocument()
  })

  it('deve renderizar descrições corretas dos gráficos', () => {
    render(<AnalyticsCharts stats={mockStats} periodo="30" />)

    expect(screen.getByText('Evolução das pregações ao longo do período selecionado')).toBeInTheDocument()
    expect(screen.getByText('Comparação do total de pregações entre associações')).toBeInTheDocument()
    expect(screen.getByText('Proporção de membros por associação')).toBeInTheDocument()
  })

  it('não deve renderizar nada quando stats está vazio', () => {
    const { container } = render(<AnalyticsCharts stats={[]} periodo="30" />)
    expect(container.firstChild).toBeNull()
  })

  it('deve ter estrutura de grid responsivo', () => {
    const { container } = render(<AnalyticsCharts stats={mockStats} periodo="30" />)

    // Verificar que há um grid com classe md:grid-cols-2
    const gridElement = container.querySelector('.md\\:grid-cols-2')
    expect(gridElement).toBeInTheDocument()
  })

  it('deve renderizar ícones corretos para cada gráfico', () => {
    render(<AnalyticsCharts stats={mockStats} periodo="30" />)

    // Verificar presença de ícones (através das classes lucide-react)
    const icons = document.querySelectorAll('svg')
    expect(icons.length).toBeGreaterThan(0)
  })

  it('deve adaptar dados baseado no período de 7 dias', () => {
    render(<AnalyticsCharts stats={mockStats} periodo="7" />)

    // Deve renderizar gráfico de linha mesmo com período curto
    expect(screen.getByTestId('line-chart')).toBeInTheDocument()
  })

  it('deve adaptar dados baseado no período de 365 dias', () => {
    render(<AnalyticsCharts stats={mockStats} periodo="365" />)

    // Deve renderizar todos os gráficos
    expect(screen.getByTestId('line-chart')).toBeInTheDocument()
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument()
    expect(screen.getByTestId('pie-chart')).toBeInTheDocument()
  })

  it('deve processar stats com siglas opcionais', () => {
    const statsWithoutSigla = [
      {
        id: '1',
        nome: 'Associação Teste',
        total_distritos: 2,
        total_igrejas: 10,
        total_membros: 200,
        total_pregacoes: 50,
      },
    ]

    render(<AnalyticsCharts stats={statsWithoutSigla} periodo="30" />)

    expect(screen.getByTestId('bar-chart')).toBeInTheDocument()
  })

  it('deve lidar com múltiplas associações (mais de 3)', () => {
    const manyStats = [
      ...mockStats,
      {
        id: '4',
        nome: 'Associação Leste',
        sigla: 'ALE',
        total_distritos: 2,
        total_igrejas: 12,
        total_membros: 250,
        total_pregacoes: 60,
      },
    ]

    render(<AnalyticsCharts stats={manyStats} periodo="30" />)

    // Todos os gráficos devem renderizar
    expect(screen.getByTestId('line-chart')).toBeInTheDocument()
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument()
    expect(screen.getByTestId('pie-chart')).toBeInTheDocument()
  })
})
