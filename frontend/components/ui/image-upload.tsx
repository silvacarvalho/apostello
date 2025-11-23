'use client'

import { useState, useRef } from 'react'
import { Upload, X, Camera } from 'lucide-react'
import { Button } from './button'

interface ImageUploadProps {
  value?: string
  onChange: (file: File | null, preview: string | null) => void
  maxSizeMB?: number
  aspectRatio?: 'square' | 'portrait' | 'landscape'
  label?: string
}

export function ImageUpload({
  value,
  onChange,
  maxSizeMB = 5,
  aspectRatio = 'square',
  label = 'Foto de Perfil'
}: ImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(value || null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const aspectRatioClasses = {
    square: 'aspect-square',
    portrait: 'aspect-[3/4]',
    landscape: 'aspect-[4/3]'
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Validar tipo
    if (!file.type.startsWith('image/')) {
      setError('Por favor, selecione uma imagem válida')
      return
    }

    // Validar tamanho
    const sizeMB = file.size / (1024 * 1024)
    if (sizeMB > maxSizeMB) {
      setError(`A imagem deve ter no máximo ${maxSizeMB}MB`)
      return
    }

    // Criar preview
    const reader = new FileReader()
    reader.onloadend = () => {
      const previewUrl = reader.result as string
      setPreview(previewUrl)
      setError(null)
      onChange(file, previewUrl)
    }
    reader.readAsDataURL(file)
  }

  function handleRemove() {
    setPreview(null)
    setError(null)
    onChange(null, null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  function handleClick() {
    fileInputRef.current?.click()
  }

  return (
    <div className="space-y-2">
      {label && (
        <label className="text-sm font-medium">{label}</label>
      )}

      <div className="flex items-start gap-4">
        {/* Preview */}
        <div
          className={`relative w-32 ${aspectRatioClasses[aspectRatio]} rounded-lg border-2 border-dashed border-muted-foreground/25 overflow-hidden bg-muted/50`}
        >
          {preview ? (
            <>
              <img
                src={preview}
                alt="Preview"
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={handleRemove}
                className="absolute top-2 right-2 rounded-full bg-destructive text-destructive-foreground p-1 hover:bg-destructive/90 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <Camera className="h-8 w-8 mb-2" />
              <p className="text-xs text-center px-2">Sem foto</p>
            </div>
          )}
        </div>

        {/* Upload Button */}
        <div className="flex-1 space-y-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />

          <Button
            type="button"
            variant="outline"
            onClick={handleClick}
            className="w-full"
          >
            <Upload className="mr-2 h-4 w-4" />
            {preview ? 'Alterar Foto' : 'Enviar Foto'}
          </Button>

          <p className="text-xs text-muted-foreground">
            Formatos aceitos: JPG, PNG, GIF
            <br />
            Tamanho máximo: {maxSizeMB}MB
          </p>

          {error && (
            <p className="text-xs text-destructive">{error}</p>
          )}
        </div>
      </div>
    </div>
  )
}
