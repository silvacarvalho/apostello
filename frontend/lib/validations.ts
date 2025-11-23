/**
 * Validações avançadas para formulários
 * Sistema de Gestão Apostello
 */

/**
 * Valida CPF brasileiro
 */
export function validarCPF(cpf: string): boolean {
  // Remove caracteres não numéricos
  cpf = cpf.replace(/[^\d]/g, '')

  // Verifica se tem 11 dígitos
  if (cpf.length !== 11) return false

  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1{10}$/.test(cpf)) return false

  // Valida primeiro dígito verificador
  let soma = 0
  for (let i = 0; i < 9; i++) {
    soma += parseInt(cpf.charAt(i)) * (10 - i)
  }
  let resto = (soma * 10) % 11
  if (resto === 10 || resto === 11) resto = 0
  if (resto !== parseInt(cpf.charAt(9))) return false

  // Valida segundo dígito verificador
  soma = 0
  for (let i = 0; i < 10; i++) {
    soma += parseInt(cpf.charAt(i)) * (11 - i)
  }
  resto = (soma * 10) % 11
  if (resto === 10 || resto === 11) resto = 0
  if (resto !== parseInt(cpf.charAt(10))) return false

  return true
}

/**
 * Formata CPF para exibição
 */
export function formatarCPF(cpf: string): string {
  cpf = cpf.replace(/[^\d]/g, '')
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}

/**
 * Valida telefone brasileiro (celular ou fixo)
 */
export function validarTelefone(telefone: string): boolean {
  // Remove caracteres não numéricos
  telefone = telefone.replace(/[^\d]/g, '')

  // Telefone fixo: (XX) XXXX-XXXX = 10 dígitos
  // Celular: (XX) 9XXXX-XXXX = 11 dígitos
  if (telefone.length !== 10 && telefone.length !== 11) return false

  // Verifica se o DDD é válido (11-99)
  const ddd = parseInt(telefone.substring(0, 2))
  if (ddd < 11 || ddd > 99) return false

  // Se for celular, deve começar com 9
  if (telefone.length === 11 && telefone.charAt(2) !== '9') return false

  return true
}

/**
 * Formata telefone para exibição
 */
export function formatarTelefone(telefone: string): string {
  telefone = telefone.replace(/[^\d]/g, '')

  if (telefone.length === 10) {
    return telefone.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
  } else if (telefone.length === 11) {
    return telefone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
  }

  return telefone
}

/**
 * Valida email
 */
export function validarEmail(email: string): boolean {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return regex.test(email)
}

/**
 * Valida URL
 */
export function validarURL(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

/**
 * Valida senha forte
 * Mínimo 8 caracteres, pelo menos uma letra maiúscula, uma minúscula e um número
 */
export function validarSenhaForte(senha: string): { valida: boolean; mensagem: string } {
  if (senha.length < 8) {
    return { valida: false, mensagem: 'A senha deve ter no mínimo 8 caracteres' }
  }

  if (!/[A-Z]/.test(senha)) {
    return { valida: false, mensagem: 'A senha deve conter pelo menos uma letra maiúscula' }
  }

  if (!/[a-z]/.test(senha)) {
    return { valida: false, mensagem: 'A senha deve conter pelo menos uma letra minúscula' }
  }

  if (!/[0-9]/.test(senha)) {
    return { valida: false, mensagem: 'A senha deve conter pelo menos um número' }
  }

  return { valida: true, mensagem: 'Senha válida' }
}

/**
 * Valida data (não pode ser futura para data de nascimento)
 */
export function validarDataNascimento(data: string): boolean {
  const dataNasc = new Date(data)
  const hoje = new Date()

  // Não pode ser futura
  if (dataNasc > hoje) return false

  // Não pode ter mais de 150 anos
  const anoMinimo = hoje.getFullYear() - 150
  if (dataNasc.getFullYear() < anoMinimo) return false

  return true
}

/**
 * Aplica máscara de CPF durante digitação
 */
export function mascaraCPF(value: string): string {
  value = value.replace(/\D/g, '')
  value = value.replace(/(\d{3})(\d)/, '$1.$2')
  value = value.replace(/(\d{3})(\d)/, '$1.$2')
  value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2')
  return value.substring(0, 14)
}

/**
 * Aplica máscara de telefone durante digitação
 */
export function mascaraTelefone(value: string): string {
  value = value.replace(/\D/g, '')

  if (value.length <= 10) {
    value = value.replace(/(\d{2})(\d)/, '($1) $2')
    value = value.replace(/(\d{4})(\d)/, '$1-$2')
  } else {
    value = value.replace(/(\d{2})(\d)/, '($1) $2')
    value = value.replace(/(\d{5})(\d)/, '$1-$2')
  }

  return value.substring(0, 15)
}

/**
 * Valida CEP brasileiro
 */
export function validarCEP(cep: string): boolean {
  cep = cep.replace(/[^\d]/g, '')
  return cep.length === 8
}

/**
 * Formata CEP para exibição
 */
export function formatarCEP(cep: string): string {
  cep = cep.replace(/[^\d]/g, '')
  return cep.replace(/(\d{5})(\d{3})/, '$1-$2')
}

/**
 * Aplica máscara de CEP durante digitação
 */
export function mascaraCEP(value: string): string {
  value = value.replace(/\D/g, '')
  value = value.replace(/(\d{5})(\d)/, '$1-$2')
  return value.substring(0, 9)
}
