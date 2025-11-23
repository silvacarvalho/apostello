'use client'

import { useState, useEffect } from 'react'
import { Settings, Calendar, QrCode, Save, CheckCircle, AlertCircle } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { configuracoesApi } from '@/lib/api'

export default function ConfiguracoesPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Evaluation Period Settings
  const [periodoConfig, setPeriodoConfig] = useState({
    dias_antes_pregacao: 0,
    dias_depois_pregacao: 7,
    habilitado: true
  })

  // QR Code Settings
  const [qrcodeConfig, setQrcodeConfig] = useState({
    modo: 'CULTO' as 'CULTO' | 'PREGADOR',
    mensagem_customizada: '',
    incluir_logo: true
  })

  useEffect(() => {
    loadConfiguracoes()
  }, [])

  async function loadConfiguracoes() {
    try {
      setLoading(true)
      const [periodo, qrcode] = await Promise.all([
        configuracoesApi.obterPeriodoAvaliacao(),
        configuracoesApi.obterModoQRCode()
      ])

      if (periodo) setPeriodoConfig(periodo)
      if (qrcode) setQrcodeConfig(qrcode)
    } catch (err) {
      console.error('Erro ao carregar configurações:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleSavePeriodo() {
    try {
      setSaving(true)
      setSaveError(null)
      await configuracoesApi.atualizarPeriodoAvaliacao(periodoConfig)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err: any) {
      setSaveError(err.response?.data?.detail || 'Erro ao salvar configurações')
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveQRCode() {
    try {
      setSaving(true)
      setSaveError(null)
      await configuracoesApi.atualizarModoQRCode(qrcodeConfig)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err: any) {
      setSaveError(err.response?.data?.detail || 'Erro ao salvar configurações')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="text-center space-y-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
            <p className="text-muted-foreground">Carregando configurações...</p>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Configurações</h1>
          <p className="text-muted-foreground">
            Gerencie as configurações do sistema de pregações
          </p>
        </div>

        {/* Success/Error Messages */}
        {saveSuccess && (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <p className="text-sm font-medium text-green-900">
                  Configurações salvas com sucesso!
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {saveError && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <p className="text-sm font-medium text-red-900">{saveError}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Evaluation Period Configuration */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-primary/10 p-2">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Período de Avaliação</CardTitle>
                <CardDescription>
                  Configure o prazo para avaliação das pregações
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Habilitado Toggle */}
            <div className="flex items-center justify-between p-4 rounded-lg border">
              <div>
                <p className="font-medium">Habilitar Período de Avaliação</p>
                <p className="text-sm text-muted-foreground">
                  Definir um prazo limite para avaliações
                </p>
              </div>
              <Button
                variant={periodoConfig.habilitado ? 'default' : 'outline'}
                onClick={() => setPeriodoConfig({ ...periodoConfig, habilitado: !periodoConfig.habilitado })}
              >
                {periodoConfig.habilitado ? 'Ativado' : 'Desativado'}
              </Button>
            </div>

            {periodoConfig.habilitado && (
              <>
                {/* Dias Antes */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Dias antes da pregação
                  </label>
                  <Input
                    type="number"
                    min="0"
                    max="30"
                    value={periodoConfig.dias_antes_pregacao}
                    onChange={(e) => setPeriodoConfig({
                      ...periodoConfig,
                      dias_antes_pregacao: parseInt(e.target.value) || 0
                    })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Quantos dias antes da pregação as avaliações podem ser enviadas (0 = apenas após a pregação)
                  </p>
                </div>

                {/* Dias Depois */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Dias depois da pregação *
                  </label>
                  <Input
                    type="number"
                    min="1"
                    max="90"
                    value={periodoConfig.dias_depois_pregacao}
                    onChange={(e) => setPeriodoConfig({
                      ...periodoConfig,
                      dias_depois_pregacao: parseInt(e.target.value) || 7
                    })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Quantos dias após a pregação as avaliações podem ser enviadas (padrão: 7 dias)
                  </p>
                </div>

                {/* Preview */}
                <div className="rounded-lg bg-muted p-4 space-y-2">
                  <p className="text-sm font-medium">Resumo da Configuração:</p>
                  <div className="text-sm text-muted-foreground">
                    {periodoConfig.dias_antes_pregacao > 0 ? (
                      <p>• Avaliações podem ser enviadas até {periodoConfig.dias_antes_pregacao} dia(s) antes da pregação</p>
                    ) : (
                      <p>• Avaliações só podem ser enviadas após a pregação</p>
                    )}
                    <p>• Prazo final: {periodoConfig.dias_depois_pregacao} dia(s) após a pregação</p>
                    <p className="font-medium mt-2">
                      Janela total de avaliação: {periodoConfig.dias_antes_pregacao + periodoConfig.dias_depois_pregacao} dia(s)
                    </p>
                  </div>
                </div>
              </>
            )}

            {/* Save Button */}
            <Button
              onClick={handleSavePeriodo}
              disabled={saving}
              className="w-full"
            >
              <Save className="mr-2 h-4 w-4" />
              {saving ? 'Salvando...' : 'Salvar Período de Avaliação'}
            </Button>
          </CardContent>
        </Card>

        {/* QR Code Configuration */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-blue-100 p-2">
                <QrCode className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <CardTitle>Configuração de QR Code</CardTitle>
                <CardDescription>
                  Configure o modo de geração dos QR Codes
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Modo de QR Code */}
            <div className="space-y-3">
              <label className="text-sm font-medium">Modo de Geração</label>

              <div className="space-y-3">
                {/* Opção: Por Culto */}
                <div
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    qrcodeConfig.modo === 'CULTO'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => setQrcodeConfig({ ...qrcodeConfig, modo: 'CULTO' })}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 mt-0.5 flex items-center justify-center ${
                      qrcodeConfig.modo === 'CULTO' ? 'border-primary' : 'border-muted-foreground'
                    }`}>
                      {qrcodeConfig.modo === 'CULTO' && (
                        <div className="w-3 h-3 rounded-full bg-primary" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">Por Culto</p>
                      <p className="text-sm text-muted-foreground">
                        Um QR Code único para cada culto/serviço religioso. Ideal para quando há múltiplos pregadores no mesmo horário.
                      </p>
                      <Badge variant="outline" className="mt-2">Recomendado</Badge>
                    </div>
                  </div>
                </div>

                {/* Opção: Por Pregador */}
                <div
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    qrcodeConfig.modo === 'PREGADOR'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => setQrcodeConfig({ ...qrcodeConfig, modo: 'PREGADOR' })}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 mt-0.5 flex items-center justify-center ${
                      qrcodeConfig.modo === 'PREGADOR' ? 'border-primary' : 'border-muted-foreground'
                    }`}>
                      {qrcodeConfig.modo === 'PREGADOR' && (
                        <div className="w-3 h-3 rounded-full bg-primary" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">Por Pregador</p>
                      <p className="text-sm text-muted-foreground">
                        Um QR Code individual para cada pregador. Útil para acompanhamento personalizado de desempenho.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Mensagem Customizada */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Mensagem Customizada (Opcional)
              </label>
              <Input
                type="text"
                placeholder="Ex: Avalie a pregação de hoje"
                value={qrcodeConfig.mensagem_customizada}
                onChange={(e) => setQrcodeConfig({
                  ...qrcodeConfig,
                  mensagem_customizada: e.target.value
                })}
              />
              <p className="text-xs text-muted-foreground">
                Mensagem que aparecerá junto ao QR Code (deixe em branco para usar a mensagem padrão)
              </p>
            </div>

            {/* Incluir Logo */}
            <div className="flex items-center justify-between p-4 rounded-lg border">
              <div>
                <p className="font-medium">Incluir Logo da Igreja</p>
                <p className="text-sm text-muted-foreground">
                  Adicionar logo/brasão no centro do QR Code
                </p>
              </div>
              <Button
                variant={qrcodeConfig.incluir_logo ? 'default' : 'outline'}
                onClick={() => setQrcodeConfig({
                  ...qrcodeConfig,
                  incluir_logo: !qrcodeConfig.incluir_logo
                })}
              >
                {qrcodeConfig.incluir_logo ? 'Sim' : 'Não'}
              </Button>
            </div>

            {/* Preview Info */}
            <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
              <p className="text-sm font-medium text-blue-900 mb-2">📱 Modo Atual:</p>
              <p className="text-sm text-blue-800">
                {qrcodeConfig.modo === 'CULTO'
                  ? 'Será gerado um QR Code para cada culto/serviço. Os membros escanearão o código e avaliarão automaticamente o pregador daquele culto.'
                  : 'Será gerado um QR Code individual para cada pregador. Os membros escanearão o código do pregador específico para avaliar.'}
              </p>
            </div>

            {/* Save Button */}
            <Button
              onClick={handleSaveQRCode}
              disabled={saving}
              className="w-full"
            >
              <Save className="mr-2 h-4 w-4" />
              {saving ? 'Salvando...' : 'Salvar Configurações de QR Code'}
            </Button>
          </CardContent>
        </Card>

        {/* Additional Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-purple-100 p-2">
                <Settings className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <CardTitle>Configurações Gerais</CardTitle>
                <CardDescription>
                  Outras configurações do sistema
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg border">
              <div>
                <p className="font-medium">Avaliações Anônimas</p>
                <p className="text-sm text-muted-foreground">
                  Permitir que membros avaliem anonimamente
                </p>
              </div>
              <Button variant="default">
                Ativado
              </Button>
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg border">
              <div>
                <p className="font-medium">Notificações por Email</p>
                <p className="text-sm text-muted-foreground">
                  Enviar notificações de novas escalas e avaliações
                </p>
              </div>
              <Button variant="default">
                Ativado
              </Button>
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg border">
              <div>
                <p className="font-medium">Auto-confirmação de Pregações</p>
                <p className="text-sm text-muted-foreground">
                  Pregadores devem confirmar presença nas pregações
                </p>
              </div>
              <Button variant="outline">
                Desativado
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
