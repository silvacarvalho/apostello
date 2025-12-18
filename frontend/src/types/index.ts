// Tipos do sistema Apostello

// Enums
export type TipoUsuario =
  | "ADMIN"
  | "PASTOR_DISTRITAL"
  | "LIDER_DISTRITAL"
  | "PREGADOR"
  | "CANTOR"
  | "MEMBRO";

export type StatusGeral = "ATIVO" | "INATIVO";

export type StatusEscala = "RASCUNHO" | "PUBLICADA" | "ARQUIVADA";

export type StatusItemEscala =
  | "AGENDADO"
  | "CONFIRMADO"
  | "RECUSADO"
  | "SUBSTITUIDO"
  | "REALIZADO"
  | "CANCELADO";

export type DiaSemana = 0 | 1 | 2 | 3 | 4 | 5 | 6;

// Entities
export interface Usuario {
  id: number;
  nome_completo: string;
  email: string;
  cpf?: string;
  telefone?: string;
  foto_url?: string;
  tipo: TipoUsuario;
  status: StatusGeral;
  score_atual: number;
  organizacao_id?: number;
  distrito_id?: number;
  igreja_id?: number;
  criado_em: string;
  atualizado_em: string;
}

export interface Organizacao {
  id: number;
  nome: string;
  cnpj?: string;
  telefone?: string;
  email?: string;
  endereco?: string;
  logo_url?: string;
  ativo: boolean;
}

export interface Distrito {
  id: number;
  nome: string;
  organizacao_id: number;
  pastor_id?: number;
  lider_id?: number;
  ativo: boolean;
}

export interface Igreja {
  id: number;
  nome: string;
  distrito_id: number;
  endereco?: string;
  telefone?: string;
  capacidade?: number;
  ativo: boolean;
  horarios?: HorarioCulto[];
}

export interface HorarioCulto {
  id: number;
  igreja_id: number;
  dia_semana: DiaSemana;
  horario: string;
  ativo: boolean;
}

export interface Escala {
  id: number;
  titulo: string;
  distrito_id: number;
  data_inicio: string;
  data_fim: string;
  status: StatusEscala;
  criado_por_id: number;
  publicado_em?: string;
  observacoes?: string;
  itens?: ItemEscala[];
}

export interface ItemEscala {
  id: number;
  escala_id: number;
  igreja_id: number;
  data: string;
  horario: string;
  pregador_id?: number;
  cantor_id?: number;
  tema_id?: number;
  status: StatusItemEscala;
  confirmado_pregador: boolean;
  confirmado_cantor: boolean;
  observacoes?: string;
  
  // Relations
  igreja?: Igreja;
  pregador?: Usuario;
  cantor?: Usuario;
  tema?: Tema;
}

export interface Tema {
  id: number;
  titulo: string;
  descricao?: string;
  pregador_id: number;
  ativo: boolean;
}

export interface Avaliacao {
  id: number;
  item_escala_id: number;
  avaliador_id: number;
  avaliado_id: number;
  nota: number;
  comentario?: string;
  criado_em: string;
}

export interface Notificacao {
  id: number;
  usuario_id: number;
  tipo: string;
  titulo: string;
  mensagem: string;
  lida: boolean;
  criado_em: string;
}

// API Responses
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

// Form Types
export interface LoginForm {
  email: string;
  password: string;
}

export interface RegisterForm {
  nome_completo: string;
  email: string;
  cpf: string;
  telefone: string;
  tipo: "PREGADOR" | "CANTOR";
  senha: string;
}

export interface EscalaGenerateForm {
  titulo: string;
  distrito_id: number;
  data_inicio: string;
  data_fim: string;
  incluir_pregadores: boolean;
  incluir_cantores: boolean;
}

export interface AvaliacaoForm {
  item_escala_id: number;
  nota: number;
  comentario?: string;
}
