'use client'

import { useEffect, useState } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'
import { Line, Bar, Pie } from 'react-chartjs-2'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, BarChart3, PieChart } from 'lucide-react'

// Registrar componentes do Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

interface AssociacaoStats {
  id: string
  nome: string
  sigla?: string
  total_distritos: number
  total_igrejas: number
  total_membros: number
  total_pregacoes: number
  media_avaliacoes?: number
  crescimento_mensal?: number
}

interface AnalyticsChartsProps {
  stats: AssociacaoStats[]
  periodo: string
}

export function AnalyticsCharts({ stats, periodo }: AnalyticsChartsProps) {
  const [isDark, setIsDark] = useState(false)

  // Detectar tema dark mode
  useEffect(() => {
    const checkTheme = () => {
      setIsDark(document.documentElement.classList.contains('dark'))
    }

    checkTheme()

    // Observer para detectar mudanças no tema
    const observer = new MutationObserver(checkTheme)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    })

    return () => observer.disconnect()
  }, [])

  const textColor = isDark ? '#e5e7eb' : '#1f2937'
  const gridColor = isDark ? '#374151' : '#e5e7eb'
  const backgroundColors = [
    'rgba(59, 130, 246, 0.8)',   // blue
    'rgba(139, 92, 246, 0.8)',   // purple
    'rgba(236, 72, 153, 0.8)',   // pink
    'rgba(34, 197, 94, 0.8)',    // green
    'rgba(251, 146, 60, 0.8)',   // orange
    'rgba(244, 63, 94, 0.8)',    // red
  ]

  // Dados para gráfico de barras - Comparação de Pregações por Associação
  const barChartData = {
    labels: stats.map(s => s.sigla || s.nome.substring(0, 15)),
    datasets: [
      {
        label: 'Pregações',
        data: stats.map(s => s.total_pregacoes),
        backgroundColor: backgroundColors[0],
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 1,
      },
    ],
  }

  // Dados para gráfico de pizza - Distribuição de Membros
  const pieChartData = {
    labels: stats.map(s => s.sigla || s.nome.substring(0, 20)),
    datasets: [
      {
        label: 'Membros',
        data: stats.map(s => s.total_membros),
        backgroundColor: backgroundColors,
        borderColor: isDark ? '#1f2937' : '#ffffff',
        borderWidth: 2,
      },
    ],
  }

  // Dados para gráfico de linha - Tendência (simulado para demonstração)
  const generateTrendData = () => {
    const labels = []
    const dias = periodo === '7' ? 7 : periodo === '30' ? 30 : periodo === '90' ? 30 : 12
    const tipo = periodo === '365' ? 'mês' : 'dia'

    for (let i = dias - 1; i >= 0; i--) {
      if (tipo === 'mês') {
        const d = new Date()
        d.setMonth(d.getMonth() - i)
        labels.push(d.toLocaleDateString('pt-BR', { month: 'short' }))
      } else {
        const d = new Date()
        d.setDate(d.getDate() - i)
        labels.push(d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }))
      }
    }

    return {
      labels,
      datasets: stats.slice(0, 3).map((assoc, idx) => ({
        label: assoc.sigla || assoc.nome,
        data: Array.from({ length: dias }, () =>
          Math.floor(Math.random() * (assoc.total_pregacoes / dias * 2))
        ),
        borderColor: backgroundColors[idx],
        backgroundColor: backgroundColors[idx].replace('0.8', '0.1'),
        tension: 0.4,
        fill: true,
      })),
    }
  }

  const lineChartData = generateTrendData()

  const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: textColor,
        },
      },
    },
    scales: {
      x: {
        ticks: {
          color: textColor,
        },
        grid: {
          color: gridColor,
        },
      },
      y: {
        ticks: {
          color: textColor,
        },
        grid: {
          color: gridColor,
        },
      },
    },
  }

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          color: textColor,
        },
      },
    },
  }

  if (stats.length === 0) {
    return null
  }

  return (
    <div className="space-y-6">
      {/* Gráfico de Linha - Tendência de Pregações */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <CardTitle>Tendência de Pregações</CardTitle>
          </div>
          <CardDescription>
            Evolução das pregações ao longo do período selecionado
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div style={{ height: '300px' }}>
            <Line data={lineChartData} options={commonOptions} />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Gráfico de Barras - Comparação de Pregações */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              <CardTitle>Pregações por Associação</CardTitle>
            </div>
            <CardDescription>
              Comparação do total de pregações entre associações
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div style={{ height: '300px' }}>
              <Bar data={barChartData} options={commonOptions} />
            </div>
          </CardContent>
        </Card>

        {/* Gráfico de Pizza - Distribuição de Membros */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <PieChart className="h-5 w-5 text-primary" />
              <CardTitle>Distribuição de Membros</CardTitle>
            </div>
            <CardDescription>
              Proporção de membros por associação
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div style={{ height: '300px' }}>
              <Pie data={pieChartData} options={pieOptions} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
