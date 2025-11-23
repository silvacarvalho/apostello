'use client'

import { useState, useEffect, useRef } from 'react'
import { Upload, Download, FileSpreadsheet, CheckCircle, AlertCircle, X, FileText, Users } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { importacoesApi } from '@/lib/api'
import { formatDate } from '@/lib/utils'

export default function ImportacaoPage() {
  const [uploading, setUploading] = useState(false)
  const [validating, setValidating] = useState(false)
  const [importacoes, setImportacoes] = useState<any[]>([])
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [validationResult, setValidationResult] = useState<any>(null)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadImportacoes()
  }, [])

  async function loadImportacoes() {
    try {
      const data = await importacoesApi.listar()
      setImportacoes(data)
    } catch (err) {
      console.error('Erro ao carregar importações:', err)
    }
  }

  function handleDrag(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0])
    }
  }

  function handleFileSelect(file: File) {
    const validTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv'
    ]

    if (!validTypes.includes(file.type)) {
      alert('Formato inválido. Use arquivos .xlsx, .xls ou .csv')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('Arquivo muito grande. Tamanho máximo: 10MB')
      return
    }

    setSelectedFile(file)
    setValidationResult(null)
  }

  async function handleValidate() {
    if (!selectedFile) return

    try {
      setValidating(true)
      const result = await importacoesApi.validar(selectedFile)
      setValidationResult(result)
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Erro ao validar arquivo')
    } finally {
      setValidating(false)
    }
  }

  async function handleImport() {
    if (!selectedFile) return

    try {
      setUploading(true)
      await importacoesApi.upload(selectedFile)
      alert('Importação realizada com sucesso!')
      setSelectedFile(null)
      setValidationResult(null)
      loadImportacoes()
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Erro ao importar arquivo')
    } finally {
      setUploading(false)
    }
  }

  async function handleDownloadTemplate(tipo: string) {
    try {
      const blob = await importacoesApi.downloadTemplate(tipo)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `template_${tipo}.xlsx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      alert('Erro ao baixar template')
    }
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Importação de Dados</h1>
          <p className="text-muted-foreground">
            Importe membros, pregadores e temáticas em massa via planilha
          </p>
        </div>

        {/* Templates */}
        <Card>
          <CardHeader>
            <CardTitle>Templates de Importação</CardTitle>
            <CardDescription>
              Baixe os modelos de planilha para importação
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="h-8 w-8 text-green-600" />
                  <div>
                    <p className="font-medium">Membros</p>
                    <p className="text-xs text-muted-foreground">Template para importar membros</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownloadTemplate('membros')}
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="h-8 w-8 text-blue-600" />
                  <div>
                    <p className="font-medium">Pregadores</p>
                    <p className="text-xs text-muted-foreground">Template para importar pregadores</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownloadTemplate('pregadores')}
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="h-8 w-8 text-purple-600" />
                  <div>
                    <p className="font-medium">Temáticas</p>
                    <p className="text-xs text-muted-foreground">Template para importar temáticas</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownloadTemplate('tematicas')}
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Upload Area */}
        <Card>
          <CardHeader>
            <CardTitle>Upload de Arquivo</CardTitle>
            <CardDescription>
              Arraste e solte ou clique para selecionar um arquivo
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className={`relative border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
                dragActive
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".xlsx,.xls,.csv"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    handleFileSelect(e.target.files[0])
                  }
                }}
              />

              {!selectedFile ? (
                <div className="space-y-4">
                  <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <Upload className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <p className="text-lg font-medium mb-1">
                      Arraste seu arquivo aqui
                    </p>
                    <p className="text-sm text-muted-foreground mb-4">
                      ou clique para selecionar
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Formatos aceitos: .xlsx, .xls, .csv (máx. 10MB)
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                    <FileText className="h-8 w-8 text-green-600" />
                  </div>
                  <div>
                    <p className="text-lg font-medium mb-1">{selectedFile.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(selectedFile.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedFile(null)
                      setValidationResult(null)
                    }}
                  >
                    <X className="mr-2 h-4 w-4" />
                    Remover Arquivo
                  </Button>
                </div>
              )}
            </div>

            {selectedFile && !validationResult && (
              <div className="mt-4 flex gap-3">
                <Button
                  onClick={handleValidate}
                  disabled={validating}
                  variant="outline"
                  className="flex-1"
                >
                  {validating ? 'Validando...' : 'Validar Arquivo'}
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={uploading}
                  className="flex-1"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {uploading ? 'Importando...' : 'Importar Diretamente'}
                </Button>
              </div>
            )}

            {validationResult && (
              <div className="mt-6 space-y-4">
                {/* Validation Summary */}
                <div className={`p-4 rounded-lg border-2 ${
                  validationResult.valido
                    ? 'border-green-200 bg-green-50'
                    : 'border-red-200 bg-red-50'
                }`}>
                  <div className="flex items-center gap-3 mb-2">
                    {validationResult.valido ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-red-600" />
                    )}
                    <p className={`font-medium ${
                      validationResult.valido ? 'text-green-900' : 'text-red-900'
                    }`}>
                      {validationResult.valido
                        ? 'Arquivo validado com sucesso!'
                        : 'Foram encontrados erros no arquivo'}
                    </p>
                  </div>
                  <div className="text-sm space-y-1">
                    <p>Total de linhas: {validationResult.total_linhas}</p>
                    <p>Linhas válidas: {validationResult.linhas_validas}</p>
                    {validationResult.erros?.length > 0 && (
                      <p className="text-red-700 font-medium">
                        Erros encontrados: {validationResult.erros.length}
                      </p>
                    )}
                  </div>
                </div>

                {/* Errors List */}
                {validationResult.erros?.length > 0 && (
                  <Card className="border-red-200">
                    <CardHeader>
                      <CardTitle className="text-red-900">Erros Encontrados</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {validationResult.erros.map((erro: any, index: number) => (
                          <div key={index} className="p-3 bg-red-50 rounded text-sm">
                            <p className="font-medium text-red-900">Linha {erro.linha}:</p>
                            <p className="text-red-700">{erro.mensagem}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Import Button */}
                {validationResult.valido && (
                  <Button
                    onClick={handleImport}
                    disabled={uploading}
                    className="w-full"
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    {uploading ? 'Importando...' : `Importar ${validationResult.linhas_validas} Registro(s)`}
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Import History */}
        <Card>
          <CardHeader>
            <CardTitle>Histórico de Importações</CardTitle>
            <CardDescription>
              Últimas importações realizadas
            </CardDescription>
          </CardHeader>
          <CardContent>
            {importacoes.length > 0 ? (
              <div className="space-y-4">
                {importacoes.map((importacao) => (
                  <div
                    key={importacao.id}
                    className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`rounded-full p-2 ${
                        importacao.status === 'SUCESSO'
                          ? 'bg-green-100'
                          : importacao.status === 'ERRO'
                          ? 'bg-red-100'
                          : 'bg-yellow-100'
                      }`}>
                        {importacao.status === 'SUCESSO' ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : importacao.status === 'ERRO' ? (
                          <AlertCircle className="h-5 w-5 text-red-600" />
                        ) : (
                          <Upload className="h-5 w-5 text-yellow-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{importacao.nome_arquivo}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                          <span>{formatDate(importacao.created_at)}</span>
                          <span>•</span>
                          <span>{importacao.total_registros} registros</span>
                          <span>•</span>
                          <span>{importacao.tipo}</span>
                        </div>
                      </div>
                    </div>
                    <Badge
                      variant={
                        importacao.status === 'SUCESSO'
                          ? 'default'
                          : importacao.status === 'ERRO'
                          ? 'destructive'
                          : 'outline'
                      }
                    >
                      {importacao.status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center p-12">
                <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  Nenhuma importação realizada ainda
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
