'use client'

import { useEffect, useState } from 'react'
import { QrCode, Download, Printer } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { qrcodesApi } from '@/lib/api'

export default function QRCodePage() {
  const [loading, setLoading] = useState(true)
  const [qrData, setQrData] = useState<any>(null)

  useEffect(() => {
    loadQRCode()
  }, [])

  async function loadQRCode() {
    try {
      setLoading(true)
      const data = await qrcodesApi.getMeuDistritoUniversal()
      setQrData(data)
    } catch (err) {
      console.error('Erro ao carregar QR Code:', err)
    } finally {
      setLoading(false)
    }
  }

  function handleDownload() {
    if (!qrData) return

    const link = document.createElement('a')
    link.href = qrData.qrcode_base64
    link.download = `qrcode-universal-${qrData.distrito_nome}.png`
    link.click()
  }

  function handlePrint() {
    const printWindow = window.open('', '_blank')
    if (!printWindow || !qrData) return

    printWindow.document.write(`
      <html>
        <head>
          <title>QR Code Universal - ${qrData.distrito_nome}</title>
          <style>
            body {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              font-family: Arial, sans-serif;
            }
            .container {
              text-align: center;
              padding: 40px;
            }
            h1 {
              color: #3B82F6;
              margin-bottom: 10px;
            }
            h2 {
              color: #666;
              font-weight: normal;
              margin-bottom: 30px;
            }
            img {
              max-width: 400px;
              margin: 20px 0;
            }
            .instructions {
              max-width: 600px;
              margin: 30px auto;
              text-align: left;
              line-height: 1.6;
            }
            @media print {
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Apostello - Sistema de Avaliações</h1>
            <h2>${qrData.distrito_nome}</h2>
            <img src="${qrData.qrcode_base64}" alt="QR Code Universal" />
            <div class="instructions">
              <h3>Como usar:</h3>
              <ol>
                <li>Após o culto, escaneie este QR Code com seu celular</li>
                <li>O sistema detectará automaticamente a pregação da sua igreja</li>
                <li>Preencha o formulário de avaliação</li>
                <li>Envie sua avaliação</li>
              </ol>
              <p><strong>Observação:</strong> Este é um QR Code universal que funciona para todas as igrejas do distrito.</p>
            </div>
          </div>
        </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.print()
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">QR Code Universal</h1>
          <p className="text-muted-foreground">
            Gere e baixe o QR Code universal para avaliação de pregações
          </p>
        </div>

        {/* QR Code Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              QR Code Universal do Distrito
            </CardTitle>
            <CardDescription>
              Um único QR Code para todas as igrejas do seu distrito
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center p-12">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            ) : qrData ? (
              <div className="space-y-6">
                {/* QR Code Display */}
                <div className="flex justify-center">
                  <div className="rounded-lg border-4 border-primary/20 p-4 bg-white">
                    <img
                      src={qrData.qrcode_base64}
                      alt="QR Code Universal"
                      className="w-64 h-64"
                    />
                  </div>
                </div>

                {/* Info */}
                <div className="rounded-lg bg-muted p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Distrito:</span>
                    <span className="text-sm">{qrData.distrito_nome}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Tipo:</span>
                    <span className="text-sm capitalize">{qrData.tipo}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">URL:</span>
                    <code className="text-xs bg-background px-2 py-1 rounded">
                      {qrData.url}
                    </code>
                  </div>
                </div>

                {/* Description */}
                <div className="rounded-lg border p-4 space-y-2">
                  <h4 className="font-semibold">Como funciona?</h4>
                  <p className="text-sm text-muted-foreground">
                    {qrData.descricao}
                  </p>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside mt-2">
                    <li>O QR Code é universal para todo o distrito</li>
                    <li>Detecta automaticamente a igreja do membro</li>
                    <li>Identifica a pregação mais recente</li>
                    <li>Pode ser impresso uma vez e usado indefinidamente</li>
                  </ul>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <Button onClick={handleDownload} className="flex-1">
                    <Download className="mr-2 h-4 w-4" />
                    Baixar PNG
                  </Button>
                  <Button onClick={handlePrint} variant="outline" className="flex-1">
                    <Printer className="mr-2 h-4 w-4" />
                    Imprimir
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center p-12">
                <p className="text-muted-foreground">Erro ao carregar QR Code</p>
                <Button onClick={loadQRCode} className="mt-4">
                  Tentar Novamente
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Instruções */}
        <Card>
          <CardHeader>
            <CardTitle>Instruções de Uso</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <h4 className="font-semibold">1. Imprimir o QR Code</h4>
                <p className="text-sm text-muted-foreground">
                  Clique em "Imprimir" e distribua cópias para todas as igrejas do distrito
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold">2. Fixar nas Igrejas</h4>
                <p className="text-sm text-muted-foreground">
                  Coloque o QR Code em um local visível, próximo à saída da igreja
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold">3. Orientar os Membros</h4>
                <p className="text-sm text-muted-foreground">
                  Incentive os membros a escanearem o QR Code após cada culto
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold">4. Acompanhar Avaliações</h4>
                <p className="text-sm text-muted-foreground">
                  Monitore as avaliações recebidas através do dashboard
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
