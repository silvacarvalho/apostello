import { useState, useMemo } from 'react'

// Hook para paginação
export function usePagination<T>(items: T[], itemsPerPage: number = 10) {
  const [currentPage, setCurrentPage] = useState(1)

  const totalPages = Math.ceil(items.length / itemsPerPage)

  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return items.slice(startIndex, endIndex)
  }, [items, currentPage, itemsPerPage])

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
    }
  }

  const nextPage = () => goToPage(currentPage + 1)
  const prevPage = () => goToPage(currentPage - 1)
  const resetPage = () => setCurrentPage(1)

  return {
    currentPage,
    totalPages,
    paginatedItems,
    goToPage,
    nextPage,
    prevPage,
    resetPage,
    totalItems: items.length
  }
}

// Hook para validação de formulários
export function useFormValidation() {
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateEmail = (email: string): boolean => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return regex.test(email)
  }

  const validatePhone = (phone: string): boolean => {
    const regex = /^\(?[1-9]{2}\)?\s?9?[0-9]{4}-?[0-9]{4}$/
    return regex.test(phone.replace(/\s/g, ''))
  }

  const validateCPF = (cpf: string): boolean => {
    cpf = cpf.replace(/[^\d]/g, '')

    if (cpf.length !== 11) return false
    if (/^(\d)\1{10}$/.test(cpf)) return false

    let sum = 0
    for (let i = 0; i < 9; i++) {
      sum += parseInt(cpf.charAt(i)) * (10 - i)
    }
    let digit = 11 - (sum % 11)
    if (digit >= 10) digit = 0
    if (digit !== parseInt(cpf.charAt(9))) return false

    sum = 0
    for (let i = 0; i < 10; i++) {
      sum += parseInt(cpf.charAt(i)) * (11 - i)
    }
    digit = 11 - (sum % 11)
    if (digit >= 10) digit = 0
    if (digit !== parseInt(cpf.charAt(10))) return false

    return true
  }

  const validatePassword = (password: string): { valid: boolean; message?: string } => {
    if (password.length < 6) {
      return { valid: false, message: 'A senha deve ter no mínimo 6 caracteres' }
    }
    if (!/[A-Z]/.test(password)) {
      return { valid: false, message: 'A senha deve conter ao menos uma letra maiúscula' }
    }
    if (!/[0-9]/.test(password)) {
      return { valid: false, message: 'A senha deve conter ao menos um número' }
    }
    return { valid: true }
  }

  const setError = (field: string, message: string) => {
    setErrors(prev => ({ ...prev, [field]: message }))
  }

  const clearError = (field: string) => {
    setErrors(prev => {
      const newErrors = { ...prev }
      delete newErrors[field]
      return newErrors
    })
  }

  const clearAllErrors = () => {
    setErrors({})
  }

  return {
    errors,
    setError,
    clearError,
    clearAllErrors,
    validateEmail,
    validatePhone,
    validateCPF,
    validatePassword
  }
}

// Hook para debounce (útil para busca)
export function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useState(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  })

  return debouncedValue
}
