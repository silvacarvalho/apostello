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
  listar: async () => {
    const { data } = await api.get('/escalas/')
    return data
  },

  obter: async (id: string) => {
    const { data } = await api.get(`/escalas/${id}`)
    return data
  },

  gerar: async (params: any) => {
    const { data } = await api.post('/escalas/gerar', params)
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
