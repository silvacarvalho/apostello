'use client'

import { Input } from './input'
import { mascaraCPF, mascaraTelefone, mascaraCEP } from '@/lib/validations'
import { ChangeEvent } from 'react'

interface MaskedInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  mask: 'cpf' | 'telefone' | 'cep'
  value?: string
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void
}

export function MaskedInput({ mask, value = '', onChange, ...props }: MaskedInputProps) {
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    let maskedValue = e.target.value

    switch (mask) {
      case 'cpf':
        maskedValue = mascaraCPF(e.target.value)
        break
      case 'telefone':
        maskedValue = mascaraTelefone(e.target.value)
        break
      case 'cep':
        maskedValue = mascaraCEP(e.target.value)
        break
    }

    // Cria um novo evento com o valor mascarado
    const newEvent = {
      ...e,
      target: {
        ...e.target,
        value: maskedValue
      }
    } as ChangeEvent<HTMLInputElement>

    onChange?.(newEvent)
  }

  return (
    <Input
      {...props}
      value={value}
      onChange={handleChange}
    />
  )
}
