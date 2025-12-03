import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Interceptor para adicionar token
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
  }
  return config
})

// Interceptor para tratar erros e renovar token
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    // Se erro 401 e não é tentativa de login/refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      // Tentar renovar o token
      if (typeof window !== 'undefined') {
        const refreshToken = localStorage.getItem('refresh_token')
        
        if (refreshToken && !originalRequest.url?.includes('/auth/')) {
          try {
            // Implementar refresh token quando o backend suportar
            // Por enquanto, redireciona para login
            localStorage.removeItem('token')
            localStorage.removeItem('refresh_token')
            localStorage.removeItem('user')
            window.location.href = '/login'
          } catch (refreshError) {
            // Se refresh falhar, redireciona para login
            localStorage.removeItem('token')
            localStorage.removeItem('refresh_token')
            localStorage.removeItem('user')
            window.location.href = '/login'
          }
        } else {
          // Não tem refresh token, redireciona para login
          window.location.href = '/login'
        }
      }
    }
    
    // Melhorar mensagens de erro de rede
    if (!error.response) {
      // Erro de rede (Network Error, timeout, etc)
      if (error.request) {
        error.message = 'Erro de conexão com o servidor. Verifique sua internet ou se o backend está rodando.'
      } else {
        error.message = 'Erro ao fazer a requisição: ' + error.message
      }
    }
    
    return Promise.reject(error)
  }
)

// ============================================================
// AVALIAÇÕES
// ============================================================

export const avaliacoesApi = {
  detectarPregacao: async () => {
    const { data } = await api.get('/avaliacoes/detectar-pregacao')
    return data
  },

  listarDisponiveis: async (dias: number = 7) => {
    const { data } = await api.get(`/avaliacoes/pregacoes-disponiveis?dias=${dias}`)
    return data
  },

  criar: async (avaliacao: any) => {
    const { data } = await api.post('/avaliacoes/', avaliacao)
    return data
  },

  listar: async (pregadorId?: string) => {
    const url = pregadorId ? `/avaliacoes/?pregador_id=${pregadorId}` : '/avaliacoes/'
    const { data } = await api.get(url)
    return data
  },
}

// ============================================================
// QR CODES
// ============================================================

export const qrcodesApi = {
  getUniversalDistrito: async (distritoId: string) => {
    const { data } = await api.get(`/qrcodes/distrito/${distritoId}/universal/base64`)
    return data
  },

  getMeuDistritoUniversal: async () => {
    const { data } = await api.get('/qrcodes/meu-distrito/universal/base64')
    return data
  },

  getPregacao: async (pregacaoId: string) => {
    const { data } = await api.get(`/qrcodes/pregacao/${pregacaoId}/base64`)
    return data
  },

  getEscalaBatch: async (escalaId: string) => {
    const { data } = await api.get(`/qrcodes/escala/${escalaId}/batch`)
    return data
  },
}

// ============================================================
// CONFIGURAÇÕES
// ============================================================

export const configuracoesApi = {
  getPeriodoAvaliacaoAtual: async () => {
    const { data } = await api.get('/configuracoes/periodo-avaliacao/atual')
    return data
  },

  setPeriodoAvaliacaoDistrito: async (config: any) => {
    const { data } = await api.post('/configuracoes/periodo-avaliacao/distrito', config)
    return data
  },

  getQRCodeConfigAtual: async () => {
    const { data } = await api.get('/configuracoes/qrcode/atual')
    return data
  },

  setQRCodeConfigDistrito: async (config: any) => {
    const { data } = await api.post('/configuracoes/qrcode/distrito', config)
    return data
  },
}

// ============================================================
// ESCALAS
// ============================================================

export const escalasApi = {
  listar: async (distritoId?: string) => {
    const params = distritoId ? `?distrito_id=${distritoId}` : ''
    const { data } = await api.get(`/escalas/${params}`)
    return data
  },

  obter: async (id: string) => {
    const { data } = await api.get(`/escalas/${id}`)
    return data
  },

  gerar: async (params: { distrito_id: string; mes_referencia: number; ano_referencia: number }) => {
    const { data } = await api.post('/escalas/gerar', params)
    return data
  },

  aprovar: async (id: string) => {
    const { data } = await api.post(`/escalas/${id}/aprovar`)
    return data
  },

  finalizar: async (id: string) => {
    const { data } = await api.post(`/escalas/${id}/finalizar`)
    return data
  },

  // Edição manual (rascunho)
  adicionarPregacao: async (escalaId: string, pregacao: any) => {
    const { data } = await api.post(`/escalas/${escalaId}/pregacoes`, pregacao)
    return data
  },

  atualizarPregacao: async (escalaId: string, pregacaoId: string, dados: any) => {
    const { data } = await api.put(`/escalas/${escalaId}/pregacoes/${pregacaoId}`, dados)
    return data
  },

  removerPregacao: async (escalaId: string, pregacaoId: string) => {
    await api.delete(`/escalas/${escalaId}/pregacoes/${pregacaoId}`)
  },

  autoatribuir: async (escalaId: string, pregacao: any) => {
    const { data } = await api.post(`/escalas/${escalaId}/autoatribuir`, pregacao)
    return data
  },

  // Calendários
  calendarioIgreja: async (igrejaId: string, mes: number, ano: number) => {
    const { data } = await api.get(`/escalas/calendario/igreja?igreja_id=${igrejaId}&mes=${mes}&ano=${ano}`)
    return data
  },

  calendarioDistrito: async (distritoId: string, mes: number, ano: number) => {
    const { data } = await api.get(`/escalas/calendario/distrito?distrito_id=${distritoId}&mes=${mes}&ano=${ano}`)
    return data
  },

  minhasPregacoes: async (mes?: number, ano?: number) => {
    const params = mes && ano ? `?mes=${mes}&ano=${ano}` : ''
    const { data } = await api.get(`/escalas/minhas${params}`)
    return data
  },
}

// ============================================================
// PREGAÇÕES
// ============================================================

export const pregacoesApi = {
  listar: async (escalaId?: string, pregadorId?: string) => {
    const params = new URLSearchParams()
    if (escalaId) params.append('escala_id', escalaId)
    if (pregadorId) params.append('pregador_id', pregadorId)
    const queryString = params.toString() ? `?${params.toString()}` : ''
    const { data } = await api.get(`/pregacoes/${queryString}`)
    return data
  },

  obter: async (id: string) => {
    const { data } = await api.get(`/pregacoes/${id}`)
    return data
  },

  responder: async (id: string, aceitar: boolean, motivoRecusa?: string) => {
    const { data } = await api.post(`/pregacoes/${id}/responder`, {
      aceitar,
      motivo_recusa: motivoRecusa
    })
    return data
  },

  atualizar: async (id: string, dados: any) => {
    const { data } = await api.put(`/pregacoes/${id}`, dados)
    return data
  },

  aceitarSugestao: async (id: string) => {
    const { data } = await api.post(`/pregacoes/${id}/aceitar-sugestao`)
    return data
  },

  atribuirPregador: async (id: string, pregadorId: string) => {
    const { data } = await api.post(`/pregacoes/${id}/atribuir-pregador`, {
      pregador_id: pregadorId
    })
    return data
  },
}

// ============================================================
// HORÁRIOS DE CULTOS
// ============================================================

export const horariosCultosApi = {
  listar: async (distritoId?: string, igrejaId?: string) => {
    const params = new URLSearchParams()
    if (distritoId) params.append('distrito_id', distritoId)
    if (igrejaId) params.append('igreja_id', igrejaId)
    const queryString = params.toString() ? `?${params.toString()}` : ''
    const { data } = await api.get(`/horarios-cultos${queryString}`)
    return data
  },

  criar: async (dados: any) => {
    const { data } = await api.post('/horarios-cultos', dados)
    return data
  },

  atualizar: async (id: string, dados: any) => {
    const { data } = await api.put(`/horarios-cultos/${id}`, dados)
    return data
  },

  deletar: async (id: string) => {
    await api.delete(`/horarios-cultos/${id}`)
  },

  criarPadraoIASD: async (distritoId: string, aplicarTodasIgrejas: boolean = false) => {
    const { data } = await api.post('/horarios-cultos/padrao-iasd', {
      distrito_id: distritoId,
      aplicar_todas_igrejas: aplicarTodasIgrejas
    })
    return data
  },
}

// ============================================================
// DISTRITOS
// ============================================================

export const distritosApi = {
  listar: async () => {
    const { data } = await api.get('/distritos/')
    return data
  },

  obter: async (id: string) => {
    const { data } = await api.get(`/distritos/${id}`)
    return data
  },
}

// ============================================================
// IGREJAS
// ============================================================

export const igrejasApi = {
  listar: async (distritoId?: string) => {
    const params = distritoId ? `?distrito_id=${distritoId}` : ''
    const { data } = await api.get(`/igrejas/${params}`)
    return data
  },

  obter: async (id: string) => {
    const { data } = await api.get(`/igrejas/${id}`)
    return data
  },
}

// ============================================================
// PREGADORES
// ============================================================

export const pregadoresApi = {
  listar: async () => {
    const { data } = await api.get('/pregadores/')
    return data
  },

  obter: async (id: string) => {
    const { data } = await api.get(`/pregadores/${id}`)
    return data
  },

  ranking: async () => {
    const { data } = await api.get('/pregadores/ranking')
    return data
  },
}

// ============================================================
// IMPORTAÇÕES
// ============================================================

export const importacoesApi = {
  upload: async (file: File, tipo: string, validarApenas: boolean = false) => {
    const formData = new FormData()
    formData.append('arquivo', file)

    const { data } = await api.post(
      `/importacoes/upload?tipo_importacao=${tipo}&validar_apenas=${validarApenas}`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    )
    return data
  },

  listar: async () => {
    const { data } = await api.get('/importacoes/')
    return data
  },

  downloadTemplate: async (tipo: string) => {
    const response = await api.get(`/importacoes/templates/${tipo}`, {
      responseType: 'blob',
    })
    return response.data
  },
}

export default api
