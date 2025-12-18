-- ============================================================================
-- SISTEMA DE GERENCIAMENTO DE ESCALAS DE PREGAÇÃO E LOUVOR
-- Scripts SQL de Criação - Ordem de Execução
-- Banco de Dados: PostgreSQL 15+
-- ============================================================================

-- ============================================================================
-- PASSO 1: EXTENSÕES E CONFIGURAÇÕES INICIAIS
-- ============================================================================

-- Ativar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- Para busca textual otimizada

-- Configurar timezone
SET timezone = 'America/Sao_Paulo';

-- ============================================================================
-- PASSO 2: CRIAÇÃO DOS TIPOS ENUM
-- ============================================================================

-- Tipos de usuário
CREATE TYPE tipo_usuario AS ENUM (
    'ADMIN',
    'PASTOR_DISTRITAL',
    'LIDER_DISTRITAL',
    'PREGADOR',
    'CANTOR',
    'MEMBRO'
);

-- Status geral (ativo/inativo)
CREATE TYPE status_geral AS ENUM ('ATIVO', 'INATIVO');

-- Status de aprovação (para auto cadastro)
CREATE TYPE status_aprovacao AS ENUM (
    'PENDENTE_APROVACAO',
    'APROVADO',
    'RECUSADO'
);

-- Dias da semana dos cultos
CREATE TYPE dia_semana AS ENUM ('SABADO', 'DOMINGO', 'QUARTA');

-- Tipo de recorrência de tema
CREATE TYPE tipo_recorrencia_tema AS ENUM (
    'SEMANAL_MES',
    'PERIODO_ESPECIFICO',
    'ANUAL'
);

-- Status de escala
CREATE TYPE status_escala AS ENUM ('RASCUNHO', 'PUBLICADA', 'ARQUIVADA');

-- Status de confirmação
CREATE TYPE status_confirmacao AS ENUM (
    'PENDENTE',
    'CONFIRMADO',
    'NAO_CONFIRMADO'
);

-- Status de realização do culto
CREATE TYPE status_realizacao AS ENUM (
    'PENDENTE',
    'REALIZADO',
    'CANCELADO',
    'FALTA_PREGADOR',
    'FALTA_CANTOR'
);

-- Ações no histórico de item escala
CREATE TYPE acao_item_escala AS ENUM (
    'CRIACAO',
    'EDICAO',
    'TROCA',
    'CANCELAMENTO',
    'SUBSTITUICAO'
);

-- Status de solicitação de troca
CREATE TYPE status_solicitacao_troca AS ENUM (
    'PENDENTE_SUBSTITUTO',
    'PENDENTE_PASTOR',
    'APROVADA',
    'RECUSADA'
);

-- Tipo de avaliado
CREATE TYPE tipo_avaliado AS ENUM ('PREGADOR', 'CANTOR');

-- Motivo de alteração de score
CREATE TYPE motivo_score AS ENUM (
    'AVALIACAO',
    'PENALIDADE',
    'BONUS',
    'AJUSTE_MANUAL'
);

-- Tipo de penalidade
CREATE TYPE tipo_penalidade AS ENUM (
    'FALTA_SEM_AVISO',
    'DESMARCACAO_SEM_TROCA',
    'DESMARCACAO_48H',
    'ATRASO',
    'CUSTOM'
);

-- Tipo de notificação
CREATE TYPE tipo_notificacao AS ENUM (
    'ESCALA_PUBLICADA',
    'LEMBRETE_7D',
    'LEMBRETE_3D',
    'LEMBRETE_24H',
    'CONFIRMACAO',
    'TROCA',
    'AVALIACAO',
    'PENALIDADE',
    'AUTO_CADASTRO_APROVADO',
    'AUTO_CADASTRO_RECUSADO'
);

-- Canal de notificação
CREATE TYPE canal_notificacao AS ENUM ('EMAIL', 'SMS', 'WHATSAPP');

-- Status de envio de notificação
CREATE TYPE status_envio AS ENUM ('ENVIADO', 'FALHA', 'PENDENTE');

-- Tipo de motivo de indisponibilidade
CREATE TYPE motivo_indisponibilidade AS ENUM (
    'FERIAS',
    'VIAGEM',
    'COMPROMISSO',
    'SAUDE',
    'OUTRO'
);

-- Tipo de ação em histórico de troca
CREATE TYPE tipo_acao_troca AS ENUM (
    'SOLICITOU_TROCA',
    'ACEITOU_TROCA',
    'RECUSOU_TROCA',
    'SUBSTITUICAO_EMERGENCIAL'
);

-- ============================================================================
-- PASSO 3: CRIAÇÃO DAS TABELAS PRINCIPAIS (ORDEM HIERÁRQUICA)
-- ============================================================================

-- ============================================================================
-- 3.1 ORGANIZACAO (raiz da hierarquia)
-- ============================================================================
CREATE TABLE organizacao (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    cnpj VARCHAR(18) UNIQUE,
    logo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_organizacao_cnpj ON organizacao(cnpj);

COMMENT ON TABLE organizacao IS 'Organização religiosa principal (nível mais alto da hierarquia)';
COMMENT ON COLUMN organizacao.cnpj IS 'CNPJ no formato XX.XXX.XXX/XXXX-XX';

-- ============================================================================
-- 3.2 DISTRITO
-- ============================================================================
CREATE TABLE distrito (
    id SERIAL PRIMARY KEY,
    organizacao_id INTEGER NOT NULL,
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    pastor_distrital_id INTEGER,
    lider_distrital_id INTEGER,
    
    -- Configurações
    config_recorrencia_maxima INTEGER DEFAULT 3 CHECK (config_recorrencia_maxima > 0),
    config_intervalo_minimo INTEGER DEFAULT 7 CHECK (config_intervalo_minimo >= 0),
    config_usa_preferencia BOOLEAN DEFAULT FALSE,
    config_exige_confirmacao BOOLEAN DEFAULT TRUE,
    config_prazo_confirmacao_horas INTEGER DEFAULT 48 CHECK (config_prazo_confirmacao_horas > 0),
    config_exige_aprovacao_troca BOOLEAN DEFAULT TRUE,
    config_prazo_avaliacao_dias INTEGER DEFAULT 7 CHECK (config_prazo_avaliacao_dias BETWEEN 1 AND 30),
    
    status status_geral DEFAULT 'ATIVO',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_distrito_organizacao FOREIGN KEY (organizacao_id) 
        REFERENCES organizacao(id) ON DELETE CASCADE,
    
    -- Constraints serão adicionadas após criação da tabela usuario
    CONSTRAINT check_lider_diferente_pastor CHECK (
        lider_distrital_id IS NULL OR 
        lider_distrital_id != pastor_distrital_id
    )
);

CREATE INDEX idx_distrito_organizacao ON distrito(organizacao_id);
CREATE INDEX idx_distrito_status ON distrito(status);

COMMENT ON TABLE distrito IS 'Distrito da organização, gerenciado por um Pastor Distrital';
COMMENT ON COLUMN distrito.config_recorrencia_maxima IS 'Quantidade máxima de pregações/louvor por pessoa no mês';
COMMENT ON COLUMN distrito.config_intervalo_minimo IS 'Dias mínimos entre participações da mesma pessoa';
COMMENT ON COLUMN distrito.config_prazo_avaliacao_dias IS 'Prazo em dias para membros avaliarem após o culto';

-- ============================================================================
-- 3.3 IGREJA
-- ============================================================================
CREATE TABLE igreja (
    id SERIAL PRIMARY KEY,
    distrito_id INTEGER NOT NULL,
    nome VARCHAR(255) NOT NULL,
    endereco_completo TEXT,
    telefone VARCHAR(20),
    email VARCHAR(255),
    status status_geral DEFAULT 'ATIVO',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_igreja_distrito FOREIGN KEY (distrito_id) 
        REFERENCES distrito(id) ON DELETE CASCADE
);

CREATE INDEX idx_igreja_distrito ON igreja(distrito_id);
CREATE INDEX idx_igreja_status ON igreja(status);
CREATE INDEX idx_igreja_nome_trgm ON igreja USING gin(nome gin_trgm_ops);

COMMENT ON TABLE igreja IS 'Igreja dentro de um distrito';

-- ============================================================================
-- 3.4 HORARIO_CULTO
-- ============================================================================
CREATE TABLE horario_culto (
    id SERIAL PRIMARY KEY,
    igreja_id INTEGER NOT NULL,
    dia_semana dia_semana NOT NULL,
    horario TIME NOT NULL,
    ativo BOOLEAN DEFAULT TRUE,
    aplicado_em_lote BOOLEAN DEFAULT FALSE,
    lote_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_horario_igreja FOREIGN KEY (igreja_id) 
        REFERENCES igreja(id) ON DELETE CASCADE,
    CONSTRAINT unique_igreja_dia_horario UNIQUE (igreja_id, dia_semana, horario)
);

CREATE INDEX idx_horario_igreja ON horario_culto(igreja_id);
CREATE INDEX idx_horario_dia ON horario_culto(dia_semana);
CREATE INDEX idx_horario_lote ON horario_culto(lote_id) WHERE lote_id IS NOT NULL;

COMMENT ON TABLE horario_culto IS 'Horários de cultos configurados por igreja';
COMMENT ON COLUMN horario_culto.aplicado_em_lote IS 'Indica se foi aplicado em lote para múltiplas igrejas';

-- ============================================================================
-- 3.5 USUARIO (tabela polimórfica)
-- ============================================================================
CREATE TABLE usuario (
    id SERIAL PRIMARY KEY,
    nome_completo VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    senha_hash VARCHAR(255) NOT NULL,
    cpf VARCHAR(14) UNIQUE NOT NULL,
    telefone VARCHAR(20),
    whatsapp VARCHAR(20),
    data_nascimento DATE,
    foto_url TEXT,
    tipo tipo_usuario NOT NULL,
    
    -- Relacionamentos
    distrito_id INTEGER,
    igreja_id INTEGER,
    
    -- Dados específicos Pregador/Cantor
    score_atual NUMERIC(5,2) DEFAULT 70.00 CHECK (score_atual BETWEEN 0 AND 100),
    contador_mes_atual INTEGER DEFAULT 0 CHECK (contador_mes_atual >= 0),
    contador_total_participacoes INTEGER DEFAULT 0 CHECK (contador_total_participacoes >= 0),
    contador_faltas INTEGER DEFAULT 0 CHECK (contador_faltas >= 0),
    contador_desmarcacoes INTEGER DEFAULT 0 CHECK (contador_desmarcacoes >= 0),
    
    -- Status e aprovação
    status status_geral DEFAULT 'ATIVO',
    status_aprovacao status_aprovacao DEFAULT 'APROVADO',
    data_solicitacao_cadastro TIMESTAMP WITH TIME ZONE,
    data_aprovacao TIMESTAMP WITH TIME ZONE,
    aprovado_por_id INTEGER,
    motivo_recusa TEXT,
    
    -- Auditoria
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ultimo_login TIMESTAMP WITH TIME ZONE,
    
    -- Foreign Keys
    CONSTRAINT fk_usuario_distrito FOREIGN KEY (distrito_id) 
        REFERENCES distrito(id) ON DELETE SET NULL,
    CONSTRAINT fk_usuario_igreja FOREIGN KEY (igreja_id) 
        REFERENCES igreja(id) ON DELETE SET NULL,
    CONSTRAINT fk_usuario_aprovado_por FOREIGN KEY (aprovado_por_id) 
        REFERENCES usuario(id) ON DELETE SET NULL,
    
    -- Constraints de negócio
    CONSTRAINT check_membro_tem_igreja CHECK (
        tipo != 'MEMBRO' OR igreja_id IS NOT NULL
    ),
    CONSTRAINT check_pregador_cantor_tem_distrito CHECK (
        tipo NOT IN ('PREGADOR', 'CANTOR') OR distrito_id IS NOT NULL
    ),
    CONSTRAINT check_pastor_lider_tem_distrito CHECK (
        tipo NOT IN ('PASTOR_DISTRITAL', 'LIDER_DISTRITAL') OR distrito_id IS NOT NULL
    )
);

CREATE INDEX idx_usuario_email ON usuario(email);
CREATE INDEX idx_usuario_cpf ON usuario(cpf);
CREATE INDEX idx_usuario_tipo ON usuario(tipo);
CREATE INDEX idx_usuario_distrito ON usuario(distrito_id);
CREATE INDEX idx_usuario_igreja ON usuario(igreja_id);
CREATE INDEX idx_usuario_status ON usuario(status);
CREATE INDEX idx_usuario_status_aprovacao ON usuario(status_aprovacao);
CREATE INDEX idx_usuario_score ON usuario(score_atual) WHERE tipo IN ('PREGADOR', 'CANTOR');
CREATE INDEX idx_usuario_nome_trgm ON usuario USING gin(nome_completo gin_trgm_ops);

COMMENT ON TABLE usuario IS 'Tabela polimórfica para todos os tipos de usuários';
COMMENT ON COLUMN usuario.tipo IS 'ADMIN, PASTOR_DISTRITAL, LIDER_DISTRITAL, PREGADOR, CANTOR, MEMBRO';
COMMENT ON COLUMN usuario.senha_hash IS 'Senha criptografada com bcrypt (salt rounds: 12)';
COMMENT ON COLUMN usuario.score_atual IS 'Score de 0 a 100 (apenas para pregadores/cantores)';

-- ============================================================================
-- 3.6 Adicionar Foreign Keys em DISTRITO (após criação de USUARIO)
-- ============================================================================
ALTER TABLE distrito 
    ADD CONSTRAINT fk_distrito_pastor FOREIGN KEY (pastor_distrital_id) 
        REFERENCES usuario(id) ON DELETE SET NULL;

ALTER TABLE distrito 
    ADD CONSTRAINT fk_distrito_lider FOREIGN KEY (lider_distrital_id) 
        REFERENCES usuario(id) ON DELETE SET NULL;

CREATE INDEX idx_distrito_pastor ON distrito(pastor_distrital_id);
CREATE INDEX idx_distrito_lider ON distrito(lider_distrital_id);

-- ============================================================================
-- 3.7 PREFERENCIA_IGREJA
-- ============================================================================
CREATE TABLE preferencia_igreja (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL,
    igreja_id INTEGER NOT NULL,
    ordem INTEGER NOT NULL CHECK (ordem BETWEEN 1 AND 3),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_preferencia_usuario FOREIGN KEY (usuario_id) 
        REFERENCES usuario(id) ON DELETE CASCADE,
    CONSTRAINT fk_preferencia_igreja FOREIGN KEY (igreja_id) 
        REFERENCES igreja(id) ON DELETE CASCADE,
    CONSTRAINT unique_usuario_igreja UNIQUE (usuario_id, igreja_id),
    CONSTRAINT unique_usuario_ordem UNIQUE (usuario_id, ordem)
);

CREATE INDEX idx_preferencia_usuario ON preferencia_igreja(usuario_id);
CREATE INDEX idx_preferencia_igreja ON preferencia_igreja(igreja_id);

COMMENT ON TABLE preferencia_igreja IS 'Preferências de igreja de pregadores/cantores (até 3)';

-- ============================================================================
-- 3.8 INDISPONIBILIDADE
-- ============================================================================
CREATE TABLE indisponibilidade (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL,
    data_inicio DATE NOT NULL,
    data_fim DATE NOT NULL,
    motivo_tipo motivo_indisponibilidade NOT NULL,
    motivo_descricao TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_indisponibilidade_usuario FOREIGN KEY (usuario_id) 
        REFERENCES usuario(id) ON DELETE CASCADE,
    CONSTRAINT check_data_fim_maior CHECK (data_fim >= data_inicio)
);

CREATE INDEX idx_indisponibilidade_usuario ON indisponibilidade(usuario_id);
CREATE INDEX idx_indisponibilidade_datas ON indisponibilidade(data_inicio, data_fim);

COMMENT ON TABLE indisponibilidade IS 'Períodos de indisponibilidade de pregadores/cantores';

-- ============================================================================
-- 3.9 BLOQUEIO_TEMPORARIO
-- ============================================================================
CREATE TABLE bloqueio_temporario (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL,
    pastor_id INTEGER NOT NULL,
    data_inicio DATE NOT NULL,
    data_fim DATE NOT NULL,
    motivo TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_bloqueio_usuario FOREIGN KEY (usuario_id) 
        REFERENCES usuario(id) ON DELETE CASCADE,
    CONSTRAINT fk_bloqueio_pastor FOREIGN KEY (pastor_id) 
        REFERENCES usuario(id) ON DELETE CASCADE,
    CONSTRAINT check_data_fim_maior CHECK (data_fim >= data_inicio),
    CONSTRAINT check_pastor_diferente_usuario CHECK (pastor_id != usuario_id)
);

CREATE INDEX idx_bloqueio_usuario ON bloqueio_temporario(usuario_id);
CREATE INDEX idx_bloqueio_datas ON bloqueio_temporario(data_inicio, data_fim);
CREATE INDEX idx_bloqueio_ativo ON bloqueio_temporario(usuario_id, data_fim, data_inicio);

COMMENT ON TABLE bloqueio_temporario IS 'Bloqueios temporários aplicados pelo Pastor (confidencial)';

-- ============================================================================
-- 3.10 TEMA
-- ============================================================================
CREATE TABLE tema (
    id SERIAL PRIMARY KEY,
    organizacao_id INTEGER NOT NULL,
    titulo VARCHAR(255) NOT NULL,
    descricao TEXT,
    tipo_recorrencia tipo_recorrencia_tema NOT NULL,
    config_recorrencia JSONB NOT NULL,
    ano_aplicacao INTEGER,
    status status_geral DEFAULT 'ATIVO',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_tema_organizacao FOREIGN KEY (organizacao_id) 
        REFERENCES organizacao(id) ON DELETE CASCADE
);

CREATE INDEX idx_tema_organizacao ON tema(organizacao_id);
CREATE INDEX idx_tema_tipo_recorrencia ON tema(tipo_recorrencia);
CREATE INDEX idx_tema_status ON tema(status);
CREATE INDEX idx_tema_config ON tema USING gin(config_recorrencia);

COMMENT ON TABLE tema IS 'Temas de cultos com recorrência automática';
COMMENT ON COLUMN tema.config_recorrencia IS 'JSON: {"tipo": "semanal_mes", "semana": 2, "dia": "SABADO"}';

-- ============================================================================
-- 3.11 ESCALA
-- ============================================================================
CREATE TABLE escala (
    id SERIAL PRIMARY KEY,
    distrito_id INTEGER NOT NULL,
    mes INTEGER NOT NULL CHECK (mes BETWEEN 1 AND 12),
    ano INTEGER NOT NULL CHECK (ano >= 2024),
    status status_escala DEFAULT 'RASCUNHO',
    data_publicacao TIMESTAMP WITH TIME ZONE,
    pastor_id INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_escala_distrito FOREIGN KEY (distrito_id) 
        REFERENCES distrito(id) ON DELETE CASCADE,
    CONSTRAINT fk_escala_pastor FOREIGN KEY (pastor_id) 
        REFERENCES usuario(id) ON DELETE RESTRICT,
    CONSTRAINT unique_distrito_mes_ano UNIQUE (distrito_id, mes, ano)
);

CREATE INDEX idx_escala_distrito ON escala(distrito_id);
CREATE INDEX idx_escala_mes_ano ON escala(mes, ano);
CREATE INDEX idx_escala_status ON escala(status);
CREATE INDEX idx_escala_pastor ON escala(pastor_id);

COMMENT ON TABLE escala IS 'Escala mensal de pregação/louvor de um distrito';

-- ============================================================================
-- 3.12 ITEM_ESCALA
-- ============================================================================
CREATE TABLE item_escala (
    id SERIAL PRIMARY KEY,
    escala_id INTEGER NOT NULL,
    igreja_id INTEGER NOT NULL,
    data_culto DATE NOT NULL,
    horario TIME NOT NULL,
    
    -- Escalados
    pregador_id INTEGER,
    cantor_id INTEGER,
    
    -- Tema
    tema_id INTEGER,
    tema_customizado TEXT,
    
    -- Confirmações
    status_confirmacao_pregador status_confirmacao DEFAULT 'PENDENTE',
    status_confirmacao_cantor status_confirmacao DEFAULT 'PENDENTE',
    data_confirmacao_pregador TIMESTAMP WITH TIME ZONE,
    data_confirmacao_cantor TIMESTAMP WITH TIME ZONE,
    
    -- Realização
    status_realizacao status_realizacao DEFAULT 'PENDENTE',
    observacoes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_item_escala FOREIGN KEY (escala_id) 
        REFERENCES escala(id) ON DELETE CASCADE,
    CONSTRAINT fk_item_igreja FOREIGN KEY (igreja_id) 
        REFERENCES igreja(id) ON DELETE CASCADE,
    CONSTRAINT fk_item_pregador FOREIGN KEY (pregador_id) 
        REFERENCES usuario(id) ON DELETE SET NULL,
    CONSTRAINT fk_item_cantor FOREIGN KEY (cantor_id) 
        REFERENCES usuario(id) ON DELETE SET NULL,
    CONSTRAINT fk_item_tema FOREIGN KEY (tema_id) 
        REFERENCES tema(id) ON DELETE SET NULL,
    CONSTRAINT check_pelo_menos_tema CHECK (
        tema_id IS NOT NULL OR tema_customizado IS NOT NULL
    )
);

CREATE INDEX idx_item_escala_escala ON item_escala(escala_id);
CREATE INDEX idx_item_escala_igreja ON item_escala(igreja_id);
CREATE INDEX idx_item_escala_data ON item_escala(data_culto);
CREATE INDEX idx_item_escala_pregador ON item_escala(pregador_id);
CREATE INDEX idx_item_escala_cantor ON item_escala(cantor_id);
CREATE INDEX idx_item_escala_status_realizacao ON item_escala(status_realizacao);
CREATE INDEX idx_item_escala_confirmacao_pregador ON item_escala(status_confirmacao_pregador) 
    WHERE pregador_id IS NOT NULL;
CREATE INDEX idx_item_escala_confirmacao_cantor ON item_escala(status_confirmacao_cantor) 
    WHERE cantor_id IS NOT NULL;
CREATE INDEX idx_item_escala_distrito_periodo ON item_escala(igreja_id, data_culto) 
    INCLUDE (pregador_id, cantor_id, status_realizacao);

COMMENT ON TABLE item_escala IS 'Cada item individual da escala (um culto específico)';

-- ============================================================================
-- 3.13 HISTORICO_ITEM_ESCALA
-- ============================================================================
CREATE TABLE historico_item_escala (
    id SERIAL PRIMARY KEY,
    item_escala_id INTEGER NOT NULL,
    usuario_id INTEGER NOT NULL,
    acao acao_item_escala NOT NULL,
    descricao TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_historico_item FOREIGN KEY (item_escala_id) 
        REFERENCES item_escala(id) ON DELETE CASCADE,
    CONSTRAINT fk_historico_usuario FOREIGN KEY (usuario_id) 
        REFERENCES usuario(id) ON DELETE CASCADE
);

CREATE INDEX idx_historico_item ON historico_item_escala(item_escala_id);
CREATE INDEX idx_historico_usuario ON historico_item_escala(usuario_id);
CREATE INDEX idx_historico_data ON historico_item_escala(created_at);

COMMENT ON TABLE historico_item_escala IS 'Histórico de alterações em itens da escala';

-- ============================================================================
-- 3.14 SOLICITACAO_TROCA
-- ============================================================================
CREATE TABLE solicitacao_troca (
    id SERIAL PRIMARY KEY,
    item_escala_id INTEGER NOT NULL,
    tipo tipo_avaliado NOT NULL,
    solicitante_id INTEGER NOT NULL,
    substituto_id INTEGER NOT NULL,
    motivo TEXT NOT NULL,
    status status_solicitacao_troca DEFAULT 'PENDENTE_SUBSTITUTO',
    data_resposta_substituto TIMESTAMP WITH TIME ZONE,
    data_resposta_pastor TIMESTAMP WITH TIME ZONE,
    pastor_id INTEGER,
    observacao_pastor TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_solicitacao_item FOREIGN KEY (item_escala_id) 
        REFERENCES item_escala(id) ON DELETE CASCADE,
    CONSTRAINT fk_solicitacao_solicitante FOREIGN KEY (solicitante_id) 
        REFERENCES usuario(id) ON DELETE CASCADE,
    CONSTRAINT fk_solicitacao_substituto FOREIGN KEY (substituto_id) 
        REFERENCES usuario(id) ON DELETE CASCADE,
    CONSTRAINT fk_solicitacao_pastor FOREIGN KEY (pastor_id) 
        REFERENCES usuario(id) ON DELETE SET NULL,
    CONSTRAINT check_solicitante_diferente_substituto CHECK (solicitante_id != substituto_id)
);

CREATE INDEX idx_solicitacao_item ON solicitacao_troca(item_escala_id);
CREATE INDEX idx_solicitacao_solicitante ON solicitacao_troca(solicitante_id);
CREATE INDEX idx_solicitacao_substituto ON solicitacao_troca(substituto_id);
CREATE INDEX idx_solicitacao_status ON solicitacao_troca(status);

COMMENT ON TABLE solicitacao_troca IS 'Solicitações de troca de escala entre pregadores/cantores';

-- ============================================================================
-- 3.15 AVALIACAO
-- ============================================================================
CREATE TABLE avaliacao (
    id SERIAL PRIMARY KEY,
    item_escala_id INTEGER NOT NULL,
    avaliado_id INTEGER NOT NULL,
    avaliador_id INTEGER NOT NULL,
    tipo tipo_avaliado NOT NULL,
    
    -- Critérios (1-5 estrelas)
    criterio_1 INTEGER NOT NULL CHECK (criterio_1 BETWEEN 1 AND 5),
    criterio_2 INTEGER NOT NULL CHECK (criterio_2 BETWEEN 1 AND 5),
    criterio_3 INTEGER NOT NULL CHECK (criterio_3 BETWEEN 1 AND 5),
    criterio_4 INTEGER NOT NULL CHECK (criterio_4 BETWEEN 1 AND 5),
    criterio_5 INTEGER NOT NULL CHECK (criterio_5 BETWEEN 1 AND 5),
    
    comentario TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_avaliacao_item FOREIGN KEY (item_escala_id) 
        REFERENCES item_escala(id) ON DELETE CASCADE,
    CONSTRAINT fk_avaliacao_avaliado FOREIGN KEY (avaliado_id) 
        REFERENCES usuario(id) ON DELETE CASCADE,
    CONSTRAINT fk_avaliacao_avaliador FOREIGN KEY (avaliador_id) 
        REFERENCES usuario(id) ON DELETE CASCADE,
    CONSTRAINT unique_avaliacao UNIQUE (item_escala_id, avaliado_id, avaliador_id),
    CONSTRAINT check_nao_autoavaliacao CHECK (avaliado_id != avaliador_id)
);

CREATE INDEX idx_avaliacao_item ON avaliacao(item_escala_id);
CREATE INDEX idx_avaliacao_avaliado ON avaliacao(avaliado_id);
CREATE INDEX idx_avaliacao_avaliador ON avaliacao(avaliador_id);
CREATE INDEX idx_avaliacao_tipo ON avaliacao(tipo);

COMMENT ON TABLE avaliacao IS 'Avaliações de pregadores/cantores pelos membros';
COMMENT ON COLUMN avaliacao.criterio_1 IS 'PREGADOR: Conteúdo Bíblico | CANTOR: Técnica Vocal';
COMMENT ON COLUMN avaliacao.criterio_2 IS 'PREGADOR: Comunicação | CANTOR: Interpretação';
COMMENT ON COLUMN avaliacao.criterio_3 IS 'PREGADOR: Tempo | CANTOR: Ministração';
COMMENT ON COLUMN avaliacao.criterio_4 IS 'PREGADOR: Impacto Espiritual | CANTOR: Apresentação';
COMMENT ON COLUMN avaliacao.criterio_5 IS 'Avaliação Geral (1-5 estrelas)';

-- ============================================================================
-- 3.16 HISTORICO_SCORE
-- ============================================================================
CREATE TABLE historico_score (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL,
    score_anterior NUMERIC(5,2) NOT NULL,
    score_novo NUMERIC(5,2) NOT NULL,
    delta NUMERIC(5,2) NOT NULL,
    motivo_tipo motivo_score NOT NULL,
    referencia_id INTEGER, -- ID genérico (avaliacao_id, penalidade_id, etc)
    descricao TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_historico_score_usuario FOREIGN KEY (usuario_id) 
        REFERENCES usuario(id) ON DELETE CASCADE
);

CREATE INDEX idx_historico_score_usuario ON historico_score(usuario_id);
CREATE INDEX idx_historico_score_data ON historico_score(created_at);
CREATE INDEX idx_historico_score_motivo ON historico_score(motivo_tipo);
CREATE INDEX idx_historico_score_recente ON historico_score(usuario_id, created_at DESC) 
    INCLUDE (score_novo, delta);

COMMENT ON TABLE historico_score IS 'Histórico completo de alterações de score';

-- ============================================================================
-- 3.17 PENALIDADE
-- ============================================================================
CREATE TABLE penalidade (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL,
    pastor_id INTEGER NOT NULL,
    tipo tipo_penalidade NOT NULL,
    valor_subtracao NUMERIC(5,2) NOT NULL CHECK (valor_subtracao > 0),
    motivo TEXT NOT NULL,
    data_aplicacao DATE NOT NULL DEFAULT CURRENT_DATE,
    data_validade DATE,
    item_escala_id INTEGER,
    ativa BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_penalidade_usuario FOREIGN KEY (usuario_id) 
        REFERENCES usuario(id) ON DELETE CASCADE,
    CONSTRAINT fk_penalidade_pastor FOREIGN KEY (pastor_id) 
        REFERENCES usuario(id) ON DELETE CASCADE,
    CONSTRAINT fk_penalidade_item FOREIGN KEY (item_escala_id) 
        REFERENCES item_escala(id) ON DELETE SET NULL
);

CREATE INDEX idx_penalidade_usuario ON penalidade(usuario_id);
CREATE INDEX idx_penalidade_pastor ON penalidade(pastor_id);
CREATE INDEX idx_penalidade_ativa ON penalidade(usuario_id, ativa) WHERE ativa = TRUE;
CREATE INDEX idx_penalidade_item ON penalidade(item_escala_id);

COMMENT ON TABLE penalidade IS 'Penalidades aplicadas a pregadores/cantores';
COMMENT ON COLUMN penalidade.ativa IS 'Se a penalidade ainda está ativa (pode expirar)';

-- ============================================================================
-- 3.18 HISTORICO_TROCA_ESCALA (NOVO)
-- ============================================================================
CREATE TABLE historico_troca_escala (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL,
    item_escala_original_id INTEGER,
    item_escala_novo_id INTEGER,
    tipo_acao tipo_acao_troca NOT NULL,
    outro_usuario_id INTEGER,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    motivo TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_historico_troca_usuario FOREIGN KEY (usuario_id) 
        REFERENCES usuario(id) ON DELETE CASCADE,
    CONSTRAINT fk_historico_troca_original FOREIGN KEY (item_escala_original_id) 
        REFERENCES item_escala(id) ON DELETE SET NULL,
    CONSTRAINT fk_historico_troca_novo FOREIGN KEY (item_escala_novo_id) 
        REFERENCES item_escala(id) ON DELETE SET NULL,
    CONSTRAINT fk_historico_troca_outro FOREIGN KEY (outro_usuario_id) 
        REFERENCES usuario(id) ON DELETE CASCADE
);

CREATE INDEX idx_historico_troca_usuario ON historico_troca_escala(usuario_id);
CREATE INDEX idx_historico_troca_outro_usuario ON historico_troca_escala(outro_usuario_id);
CREATE INDEX idx_historico_troca_data ON historico_troca_escala(timestamp);
CREATE INDEX idx_historico_troca_tipo ON historico_troca_escala(tipo_acao);

COMMENT ON TABLE historico_troca_escala IS 'Histórico completo de trocas de escala';

-- ============================================================================
-- 3.19 HISTORICO_SUBSTITUICAO_EMERGENCIAL (NOVO)
-- ============================================================================
CREATE TABLE historico_substituicao_emergencial (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL,
    item_escala_id INTEGER NOT NULL,
    usuario_substituido_id INTEGER NOT NULL,
    igreja_id INTEGER NOT NULL,
    data_culto DATE NOT NULL,
    horario_aceitacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    motivo_emergencia TEXT NOT NULL,
    pontos_ganhos NUMERIC(5,2) DEFAULT 5.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_subst_emerg_usuario FOREIGN KEY (usuario_id) 
        REFERENCES usuario(id) ON DELETE CASCADE,
    CONSTRAINT fk_subst_emerg_item FOREIGN KEY (item_escala_id) 
        REFERENCES item_escala(id) ON DELETE CASCADE,
    CONSTRAINT fk_subst_emerg_substituido FOREIGN KEY (usuario_substituido_id) 
        REFERENCES usuario(id) ON DELETE CASCADE,
    CONSTRAINT fk_subst_emerg_igreja FOREIGN KEY (igreja_id) 
        REFERENCES igreja(id) ON DELETE CASCADE
);

CREATE INDEX idx_subst_emerg_usuario ON historico_substituicao_emergencial(usuario_id);
CREATE INDEX idx_subst_emerg_substituido ON historico_substituicao_emergencial(usuario_substituido_id);
CREATE INDEX idx_subst_emerg_item ON historico_substituicao_emergencial(item_escala_id);
CREATE INDEX idx_subst_emerg_data ON historico_substituicao_emergencial(data_culto);

COMMENT ON TABLE historico_substituicao_emergencial IS 'Histórico de substituições emergenciais (<48h) para bônus de +5 pontos';

-- ============================================================================
-- 3.20 NOTIFICACAO
-- ============================================================================
CREATE TABLE notificacao (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL,
    tipo tipo_notificacao NOT NULL,
    titulo VARCHAR(255) NOT NULL,
    mensagem TEXT NOT NULL,
    link TEXT,
    lida BOOLEAN DEFAULT FALSE,
    
    -- Status de envio por canal
    enviada_email BOOLEAN DEFAULT FALSE,
    enviada_sms BOOLEAN DEFAULT FALSE,
    enviada_whatsapp BOOLEAN DEFAULT FALSE,
    
    data_envio_email TIMESTAMP WITH TIME ZONE,
    data_envio_sms TIMESTAMP WITH TIME ZONE,
    data_envio_whatsapp TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_notificacao_usuario FOREIGN KEY (usuario_id) 
        REFERENCES usuario(id) ON DELETE CASCADE
);

CREATE INDEX idx_notificacao_usuario ON notificacao(usuario_id);
CREATE INDEX idx_notificacao_tipo ON notificacao(tipo);
CREATE INDEX idx_notificacao_lida ON notificacao(usuario_id, lida) WHERE lida = FALSE;
CREATE INDEX idx_notificacao_data ON notificacao(created_at);

COMMENT ON TABLE notificacao IS 'Notificações enviadas aos usuários (inbox interno)';

-- ============================================================================
-- 3.21 LOG_NOTIFICACAO
-- ============================================================================
CREATE TABLE log_notificacao (
    id SERIAL PRIMARY KEY,
    notificacao_id INTEGER NOT NULL,
    canal canal_notificacao NOT NULL,
    status status_envio NOT NULL,
    erro_mensagem TEXT,
    tentativas INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_log_notificacao FOREIGN KEY (notificacao_id) 
        REFERENCES notificacao(id) ON DELETE CASCADE
);

CREATE INDEX idx_log_notificacao ON log_notificacao(notificacao_id);
CREATE INDEX idx_log_canal ON log_notificacao(canal);
CREATE INDEX idx_log_status ON log_notificacao(status);

COMMENT ON TABLE log_notificacao IS 'Log de tentativas de envio de notificações';

-- ============================================================================
-- PASSO 4: TRIGGERS PARA UPDATED_AT
-- ============================================================================

-- Função genérica para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_updated_at_column() IS 'Atualiza automaticamente o campo updated_at';

-- Aplicar trigger em todas as tabelas com updated_at
CREATE TRIGGER update_organizacao_updated_at BEFORE UPDATE ON organizacao
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_distrito_updated_at BEFORE UPDATE ON distrito
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_igreja_updated_at BEFORE UPDATE ON igreja
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_usuario_updated_at BEFORE UPDATE ON usuario
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tema_updated_at BEFORE UPDATE ON tema
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_escala_updated_at BEFORE UPDATE ON escala
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_item_escala_updated_at BEFORE UPDATE ON item_escala
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_solicitacao_troca_updated_at BEFORE UPDATE ON solicitacao_troca
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_avaliacao_updated_at BEFORE UPDATE ON avaliacao
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- PASSO 5: FUNÇÕES E TRIGGERS DE NEGÓCIO
-- ============================================================================

-- ============================================================================
-- 5.1 FUNÇÃO: Recalcular Score após Avaliação
-- ============================================================================
CREATE OR REPLACE FUNCTION recalcular_score_apos_avaliacao()
RETURNS TRIGGER AS $$
DECLARE
    v_media_avaliacoes NUMERIC(5,2);
    v_score_base NUMERIC(5,2);
    v_total_penalidades NUMERIC(5,2);
    v_score_novo NUMERIC(5,2);
    v_score_anterior NUMERIC(5,2);
BEGIN
    -- Buscar score atual
    SELECT score_atual INTO v_score_anterior
    FROM usuario
    WHERE id = NEW.avaliado_id;
    
    -- Calcular média de todas as avaliações
    SELECT AVG((criterio_1 + criterio_2 + criterio_3 + criterio_4 + criterio_5) / 5.0)
    INTO v_media_avaliacoes
    FROM avaliacao
    WHERE avaliado_id = NEW.avaliado_id;
    
    -- Score base = média × 20
    v_score_base := v_media_avaliacoes * 20;
    
    -- Somar penalidades ativas
    SELECT COALESCE(SUM(valor_subtracao), 0)
    INTO v_total_penalidades
    FROM penalidade
    WHERE usuario_id = NEW.avaliado_id 
      AND ativa = TRUE
      AND (data_validade IS NULL OR data_validade >= CURRENT_DATE);
    
    -- Score final
    v_score_novo := GREATEST(0, LEAST(100, v_score_base - v_total_penalidades));
    
    -- Atualizar score do usuário
    UPDATE usuario
    SET score_atual = v_score_novo
    WHERE id = NEW.avaliado_id;
    
    -- Registrar no histórico
    INSERT INTO historico_score (
        usuario_id, score_anterior, score_novo, delta,
        motivo_tipo, referencia_id, descricao
    ) VALUES (
        NEW.avaliado_id, v_score_anterior, v_score_novo, v_score_novo - v_score_anterior,
        'AVALIACAO', NEW.id,
        'Score recalculado após avaliação'
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_recalcular_score_avaliacao
AFTER INSERT ON avaliacao
FOR EACH ROW EXECUTE FUNCTION recalcular_score_apos_avaliacao();

-- ============================================================================
-- 5.2 FUNÇÃO: Aplicar Penalidade e Recalcular Score
-- ============================================================================
CREATE OR REPLACE FUNCTION aplicar_penalidade()
RETURNS TRIGGER AS $$
DECLARE
    v_score_anterior NUMERIC(5,2);
    v_score_novo NUMERIC(5,2);
BEGIN
    -- Buscar score atual
    SELECT score_atual INTO v_score_anterior
    FROM usuario
    WHERE id = NEW.usuario_id;
    
    -- Calcular novo score
    v_score_novo := GREATEST(0, v_score_anterior - NEW.valor_subtracao);
    
    -- Atualizar score
    UPDATE usuario
    SET score_atual = v_score_novo
    WHERE id = NEW.usuario_id;
    
    -- Registrar no histórico
    INSERT INTO historico_score (
        usuario_id, score_anterior, score_novo, delta,
        motivo_tipo, referencia_id, descricao
    ) VALUES (
        NEW.usuario_id, v_score_anterior, v_score_novo, v_score_novo - v_score_anterior,
        'PENALIDADE', NEW.id,
        CONCAT('Penalidade aplicada: ', NEW.tipo::TEXT)
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_aplicar_penalidade
AFTER INSERT ON penalidade
FOR EACH ROW EXECUTE FUNCTION aplicar_penalidade();

-- ============================================================================
-- 5.3 FUNÇÃO: Registrar Histórico de Troca
-- ============================================================================
CREATE OR REPLACE FUNCTION registrar_historico_troca()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'APROVADA' AND OLD.status != 'APROVADA' THEN
        -- Registrar para o solicitante
        INSERT INTO historico_troca_escala (
            usuario_id, item_escala_original_id, item_escala_novo_id,
            tipo_acao, outro_usuario_id, motivo
        ) VALUES (
            NEW.solicitante_id, NEW.item_escala_id, NULL,
            'SOLICITOU_TROCA', NEW.substituto_id, NEW.motivo
        );
        
        -- Registrar para o substituto
        INSERT INTO historico_troca_escala (
            usuario_id, item_escala_original_id, item_escala_novo_id,
            tipo_acao, outro_usuario_id, motivo
        ) VALUES (
            NEW.substituto_id, NULL, NEW.item_escala_id,
            'ACEITOU_TROCA', NEW.solicitante_id, NEW.motivo
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_registrar_historico_troca
AFTER UPDATE ON solicitacao_troca
FOR EACH ROW EXECUTE FUNCTION registrar_historico_troca();

-- ============================================================================
-- 5.4 FUNÇÃO: Incrementar Contador de Participações
-- ============================================================================
CREATE OR REPLACE FUNCTION incrementar_contador_participacoes()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status_realizacao = 'REALIZADO' AND OLD.status_realizacao != 'REALIZADO' THEN
        -- Incrementar contador do pregador
        IF NEW.pregador_id IS NOT NULL THEN
            UPDATE usuario
            SET contador_mes_atual = contador_mes_atual + 1,
                contador_total_participacoes = contador_total_participacoes + 1
            WHERE id = NEW.pregador_id;
        END IF;
        
        -- Incrementar contador do cantor
        IF NEW.cantor_id IS NOT NULL THEN
            UPDATE usuario
            SET contador_mes_atual = contador_mes_atual + 1,
                contador_total_participacoes = contador_total_participacoes + 1
            WHERE id = NEW.cantor_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_incrementar_contador
AFTER UPDATE ON item_escala
FOR EACH ROW EXECUTE FUNCTION incrementar_contador_participacoes();

-- ============================================================================
-- 5.5 FUNÇÃO: Resetar Contador Mensal (executar via CRON)
-- ============================================================================
CREATE OR REPLACE FUNCTION resetar_contador_mensal()
RETURNS void AS $$
BEGIN
    UPDATE usuario
    SET contador_mes_atual = 0
    WHERE tipo IN ('PREGADOR', 'CANTOR');
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION resetar_contador_mensal() IS 'Reseta contador mensal (agendar para 1º dia de cada mês às 00:00)';

-- ============================================================================
-- PASSO 6: VIEWS ÚTEIS
-- ============================================================================

-- ============================================================================
-- 6.1 VIEW: Ranking de Pregadores por Distrito
-- ============================================================================
CREATE OR REPLACE VIEW vw_ranking_pregadores AS
SELECT 
    u.id,
    u.nome_completo,
    u.distrito_id,
    d.nome AS distrito_nome,
    u.score_atual,
    u.contador_total_participacoes,
    ROUND(AVG((a.criterio_1 + a.criterio_2 + a.criterio_3 + a.criterio_4 + a.criterio_5) / 5.0), 2) AS media_avaliacoes,
    COUNT(DISTINCT a.id) AS total_avaliacoes,
    ROW_NUMBER() OVER (PARTITION BY u.distrito_id ORDER BY u.score_atual DESC) AS ranking_distrito,
    ROW_NUMBER() OVER (ORDER BY u.score_atual DESC) AS ranking_geral
FROM usuario u
INNER JOIN distrito d ON u.distrito_id = d.id
LEFT JOIN avaliacao a ON a.avaliado_id = u.id AND a.tipo = 'PREGADOR'
WHERE u.tipo = 'PREGADOR' AND u.status = 'ATIVO'
GROUP BY u.id, u.nome_completo, u.distrito_id, d.nome, u.score_atual, u.contador_total_participacoes;

COMMENT ON VIEW vw_ranking_pregadores IS 'Ranking de pregadores por distrito e geral';

-- ============================================================================
-- 6.2 VIEW: Ranking de Cantores por Distrito
-- ============================================================================
CREATE OR REPLACE VIEW vw_ranking_cantores AS
SELECT 
    u.id,
    u.nome_completo,
    u.distrito_id,
    d.nome AS distrito_nome,
    u.score_atual,
    u.contador_total_participacoes,
    ROUND(AVG((a.criterio_1 + a.criterio_2 + a.criterio_3 + a.criterio_4 + a.criterio_5) / 5.0), 2) AS media_avaliacoes,
    COUNT(DISTINCT a.id) AS total_avaliacoes,
    ROW_NUMBER() OVER (PARTITION BY u.distrito_id ORDER BY u.score_atual DESC) AS ranking_distrito,
    ROW_NUMBER() OVER (ORDER BY u.score_atual DESC) AS ranking_geral
FROM usuario u
INNER JOIN distrito d ON u.distrito_id = d.id
LEFT JOIN avaliacao a ON a.avaliado_id = u.id AND a.tipo = 'CANTOR'
WHERE u.tipo = 'CANTOR' AND u.status = 'ATIVO'
GROUP BY u.id, u.nome_completo, u.distrito_id, d.nome, u.score_atual, u.contador_total_participacoes;

COMMENT ON VIEW vw_ranking_cantores IS 'Ranking de cantores por distrito e geral';

-- ============================================================================
-- 6.3 VIEW: Escala com Detalhes Completos
-- ============================================================================
CREATE OR REPLACE VIEW vw_escala_detalhada AS
SELECT 
    ie.id,
    ie.escala_id,
    e.mes,
    e.ano,
    e.status AS status_escala,
    ie.data_culto,
    ie.horario,
    ig.id AS igreja_id,
    ig.nome AS igreja_nome,
    d.id AS distrito_id,
    d.nome AS distrito_nome,
    up.id AS pregador_id,
    up.nome_completo AS pregador_nome,
    up.score_atual AS pregador_score,
    up.telefone AS pregador_telefone,
    uc.id AS cantor_id,
    uc.nome_completo AS cantor_nome,
    uc.score_atual AS cantor_score,
    uc.telefone AS cantor_telefone,
    t.titulo AS tema_titulo,
    ie.tema_customizado,
    ie.status_confirmacao_pregador,
    ie.status_confirmacao_cantor,
    ie.status_realizacao,
    ie.observacoes
FROM item_escala ie
INNER JOIN escala e ON ie.escala_id = e.id
INNER JOIN igreja ig ON ie.igreja_id = ig.id
INNER JOIN distrito d ON ig.distrito_id = d.id
LEFT JOIN usuario up ON ie.pregador_id = up.id
LEFT JOIN usuario uc ON ie.cantor_id = uc.id
LEFT JOIN tema t ON ie.tema_id = t.id;

COMMENT ON VIEW vw_escala_detalhada IS 'Visão completa da escala com todos os detalhes';

-- ============================================================================
-- 6.4 VIEW: Estatísticas por Distrito
-- ============================================================================
CREATE OR REPLACE VIEW vw_estatisticas_distrito AS
SELECT 
    d.id AS distrito_id,
    d.nome AS distrito_nome,
    COUNT(DISTINCT i.id) AS total_igrejas,
    COUNT(DISTINCT CASE WHEN u.tipo = 'PREGADOR' THEN u.id END) AS total_pregadores,
    COUNT(DISTINCT CASE WHEN u.tipo = 'CANTOR' THEN u.id END) AS total_cantores,
    COUNT(DISTINCT CASE WHEN u.tipo = 'MEMBRO' THEN u.id END) AS total_membros,
    ROUND(AVG(CASE WHEN u.tipo = 'PREGADOR' THEN u.score_atual END), 2) AS score_medio_pregadores,
    ROUND(AVG(CASE WHEN u.tipo = 'CANTOR' THEN u.score_atual END), 2) AS score_medio_cantores
FROM distrito d
LEFT JOIN igreja i ON i.distrito_id = d.id AND i.status = 'ATIVO'
LEFT JOIN usuario u ON u.distrito_id = d.id AND u.status = 'ATIVO'
WHERE d.status = 'ATIVO'
GROUP BY d.id, d.nome;

COMMENT ON VIEW vw_estatisticas_distrito IS 'Estatísticas consolidadas por distrito';

-- ============================================================================
-- PASSO 7: DADOS DE EXEMPLO (SEEDS)
-- ============================================================================

-- ============================================================================
-- 7.1 SEED: Organização
-- ============================================================================
INSERT INTO organizacao (nome, cnpj) VALUES
('Igreja Batista Nacional', '12.345.678/0001-90');

-- ============================================================================
-- 7.2 SEED: Distritos
-- ============================================================================
INSERT INTO distrito (organizacao_id, nome, descricao) VALUES
(1, 'Distrito Sul', 'Regiões do sul da cidade'),
(1, 'Distrito Norte', 'Regiões do norte da cidade');

-- ============================================================================
-- 7.3 SEED: Usuários (Senha: "senha123" - bcrypt hash)
-- ============================================================================
-- Hash bcrypt de "senha123": $2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY7C6gXzJT7UX0K

-- Administrador
INSERT INTO usuario (nome_completo, email, senha_hash, cpf, tipo, status_aprovacao) VALUES
('Admin Sistema', 'admin@sistema.com', 
 '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY7C6gXzJT7UX0K', 
 '111.111.111-11', 'ADMIN', 'APROVADO');

-- Pastor Distrital Sul
INSERT INTO usuario (nome_completo, email, senha_hash, cpf, tipo, distrito_id, status_aprovacao) VALUES
('Pastor João Silva', 'pastor.joao@igreja.com', 
 '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY7C6gXzJT7UX0K', 
 '222.222.222-22', 'PASTOR_DISTRITAL', 1, 'APROVADO');

-- Atualizar distrito com pastor
UPDATE distrito SET pastor_distrital_id = 2 WHERE id = 1;

-- ============================================================================
-- 7.4 SEED: Temas Comuns
-- ============================================================================
INSERT INTO tema (organizacao_id, titulo, descricao, tipo_recorrencia, config_recorrencia) VALUES
(1, 'Mordomia Cristã', 
 'Responsabilidade financeira e administração dos recursos', 
 'SEMANAL_MES', '{"tipo": "semanal_mes", "semana": 2, "dia": "SABADO"}'),
 
(1, 'Lar e Família', 
 'Fortalecimento dos laços familiares', 
 'SEMANAL_MES', '{"tipo": "semanal_mes", "semana": 4, "dia": "QUARTA"}');

-- ============================================================================
-- PASSO 8: SCRIPTS DE MANUTENÇÃO
-- ============================================================================

-- ============================================================================
-- 8.1 MANUTENÇÃO: Limpar notificações antigas (>90 dias)
-- ============================================================================
CREATE OR REPLACE FUNCTION limpar_notificacoes_antigas()
RETURNS INTEGER AS $$
DECLARE
    v_deletadas INTEGER;
BEGIN
    DELETE FROM notificacao
    WHERE created_at < CURRENT_DATE - INTERVAL '90 days'
      AND lida = TRUE;
    
    GET DIAGNOSTICS v_deletadas = ROW_COUNT;
    RETURN v_deletadas;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION limpar_notificacoes_antigas() IS 'Limpa notificações lidas com mais de 90 dias';

-- ============================================================================
-- 8.2 MANUTENÇÃO: Arquivar escalas antigas (>12 meses)
-- ============================================================================
CREATE OR REPLACE FUNCTION arquivar_escalas_antigas()
RETURNS INTEGER AS $$
DECLARE
    v_arquivadas INTEGER;
BEGIN
    UPDATE escala
    SET status = 'ARQUIVADA'
    WHERE status = 'PUBLICADA'
      AND (ano < EXTRACT(YEAR FROM CURRENT_DATE) 
           OR (ano = EXTRACT(YEAR FROM CURRENT_DATE) 
               AND mes < EXTRACT(MONTH FROM CURRENT_DATE) - 12));
    
    GET DIAGNOSTICS v_arquivadas = ROW_COUNT;
    RETURN v_arquivadas;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION arquivar_escalas_antigas() IS 'Arquiva escalas publicadas com mais de 12 meses';

-- ============================================================================
-- 8.3 MANUTENÇÃO: Desativar penalidades vencidas
-- ============================================================================
CREATE OR REPLACE FUNCTION desativar_penalidades_vencidas()
RETURNS INTEGER AS $$
DECLARE
    v_desativadas INTEGER;
BEGIN
    UPDATE penalidade
    SET ativa = FALSE
    WHERE ativa = TRUE
      AND data_validade IS NOT NULL
      AND data_validade < CURRENT_DATE;
    
    GET DIAGNOSTICS v_desativadas = ROW_COUNT;
    RETURN v_desativadas;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION desativar_penalidades_vencidas() IS 'Desativa penalidades que já expiraram';

-- ============================================================================
-- FIM DOS SCRIPTS SQL
-- ============================================================================

-- Para executar testes e verificações:
-- SELECT * FROM organizacao;
-- SELECT * FROM distrito;
-- SELECT * FROM usuario WHERE tipo = 'ADMIN';
-- SELECT * FROM vw_ranking_pregadores LIMIT 10;
-- SELECT * FROM vw_estatisticas_distrito;
