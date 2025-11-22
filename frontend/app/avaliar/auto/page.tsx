'use client'

import { useEffect, useState } from 'react'
import { Star, AlertCircle, CheckCircle2, Church, Calendar, Clock } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { avaliacoesApi } from '@/lib/api'
import { formatDate, formatTime, getDayOfWeek } from '@/lib/utils'

export default function AvaliacaoAutoPage() {
  const [loading, setLoading] = useState(true)
  const [pregacao, setPregacao] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [comentario, setComentario] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    detectarPregacao()
  }, [])

  async function detectarPregacao() {
    try {
      setLoading(true)
      const data = await avaliacoesApi.detectarPregacao()
      setPregacao(data)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erro ao detectar pregação')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (rating === 0) {
      alert('Por favor, selecione uma nota')
      return
    }

    try {
      setSubmitting(true)
      await avaliacoesApi.criar({
        pregacao_id: pregacao.pregacao_id,
        pregador_id: pregacao.pregador.id,
        nota: rating,
        comentarios: comentario || null,
        anonimo: false
      })
      setSuccess(true)
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Erro ao enviar avaliação')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="text-center space-y-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
            <p className="text-muted-foreground">Detectando pregação...</p>
          </div>
        </div>
      </AppLayout>
    )
  }

  if (error) {
    return (
      <AppLayout>
        <Card className="mx-auto max-w-2xl">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="rounded-full bg-destructive/10 p-3">
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Nenhuma pregação encontrada</h3>
                <p className="text-sm text-muted-foreground mt-1">{error}</p>
              </div>
              <Button onClick={detectarPregacao}>
                Tentar Novamente
              </Button>
            </div>
          </CardContent>
        </Card>
      </AppLayout>
    )
  }

  if (success) {
    return (
      <AppLayout>
        <Card className="mx-auto max-w-2xl">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="rounded-full bg-green-100 p-3">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Avaliação enviada com sucesso!</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Obrigado por avaliar a pregação de {pregacao.pregador.nome_completo}
                </p>
              </div>
              <Button onClick={() => window.location.reload()}>
                Avaliar Outra Pregação
              </Button>
            </div>
          </CardContent>
        </Card>
      </AppLayout>
    )
  }

  if (!pregacao.pode_avaliar) {
    return (
      <AppLayout>
        <Card className="mx-auto max-w-2xl">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="rounded-full bg-yellow-100 p-3">
                <AlertCircle className="h-8 w-8 text-yellow-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Não é possível avaliar</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {pregacao.motivo_nao_pode_avaliar}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Informações da Pregação */}
        <Card>
          <CardHeader>
            <CardTitle>Avaliar Pregação</CardTitle>
            <CardDescription>
              Sua avaliação ajuda a melhorar a qualidade das pregações
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Pregador */}
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-primary/10 p-2">
                <Star className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pregador</p>
                <p className="text-lg font-semibold">{pregacao.pregador.nome_completo}</p>
              </div>
            </div>

            {/* Igreja */}
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-blue-100 p-2">
                <Church className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Igreja</p>
                <p className="text-lg font-semibold">{pregacao.igreja.nome}</p>
              </div>
            </div>

            {/* Data e Hora */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-green-100 p-2">
                  <Calendar className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Data</p>
                  <p className="font-medium">{formatDate(pregacao.data_pregacao)}</p>
                  <p className="text-sm text-muted-foreground">
                    {getDayOfWeek(pregacao.data_pregacao)}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="rounded-full bg-purple-100 p-2">
                  <Clock className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Horário</p>
                  <p className="font-medium">{formatTime(pregacao.horario_pregacao)}</p>
                  <p className="text-sm text-muted-foreground">{pregacao.nome_culto}</p>
                </div>
              </div>
            </div>

            {/* Temática */}
            {pregacao.tematica_titulo && (
              <div className="rounded-lg bg-muted p-3">
                <p className="text-sm font-medium text-muted-foreground">Temática</p>
                <p className="font-medium">{pregacao.tematica_titulo}</p>
              </div>
            )}

            {/* Prazo */}
            {pregacao.dias_restantes_avaliacao !== null && (
              <Badge variant="outline">
                {pregacao.dias_restantes_avaliacao} dias restantes para avaliar
              </Badge>
            )}
          </CardContent>
        </Card>

        {/* Formulário de Avaliação */}
        <Card>
          <CardHeader>
            <CardTitle>Sua Avaliação</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Rating Stars */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Nota Geral *
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="transition-transform hover:scale-110"
                    >
                      <Star
                        className={`h-10 w-10 ${
                          star <= (hoverRating || rating)
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>
                {rating > 0 && (
                  <p className="text-sm text-muted-foreground">
                    {rating === 1 && 'Ruim'}
                    {rating === 2 && 'Regular'}
                    {rating === 3 && 'Bom'}
                    {rating === 4 && 'Muito Bom'}
                    {rating === 5 && 'Excelente'}
                  </p>
                )}
              </div>

              {/* Comentário */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Comentário (Opcional)
                </label>
                <textarea
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-h-[100px]"
                  placeholder="Deixe um comentário sobre a pregação..."
                  value={comentario}
                  onChange={(e) => setComentario(e.target.value)}
                />
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full"
                disabled={submitting || rating === 0}
              >
                {submitting ? 'Enviando...' : 'Enviar Avaliação'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
