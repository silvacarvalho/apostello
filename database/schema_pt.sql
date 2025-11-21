-- ============================================================
-- SISTEMA DE GESTÃO DE ESCALAS DE PREGAÇÃO
-- Igreja Adventista do Sétimo Dia
-- ============================================================
-- Banco de Dados: PostgreSQL 15+
-- Encoding: UTF8
-- Idioma: Português do Brasil
-- ============================================================

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ENUMS (Tipos Enumerados)
-- ============================================================

-- Tipos de perfil de usuário
CREATE TYPE perfil_usuario AS ENUM (
    'membro_associacao',  -- Membro da Associação
    'pastor_distrital',   -- Pastor Distrital
    'pregador',           -- Pregador/Membro
    'avaliador'           -- Membro Avaliador
);

-- Status de aprovação
CREATE TYPE status_aprovacao AS ENUM (
    'pendente',    -- Pendente
    'aprovado',    -- Aprovado
    'rejeitado'    -- Rejeitado
);

-- Status de escala
CREATE TYPE status_escala AS ENUM (
    'rascunho',    -- Rascunho
    'aprovado',    -- Aprovado
    'finalizado'   -- Finalizado
);

-- Status de pregação
CREATE TYPE status_pregacao AS ENUM (
    'agendado',    -- Agendado
    'aceito',      -- Aceito pelo pregador
    'recusado',    -- Recusado pelo pregador
    'realizado',   -- Realizado
    'faltou'       -- Faltou
);

-- Tipo de recorrência de temática
CREATE TYPE tipo_recorrencia AS ENUM (
    'data_especifica',  -- Data específica
    'semanal',          -- Semanal
    'mensal'            -- Mensal
);

-- Tipo de notificação
CREATE TYPE tipo_notificacao AS ENUM (
    'whatsapp',
    'sms',
    'push',
    'email'
);

-- Status de notificação
CREATE TYPE status_notificacao AS ENUM (
    'pendente',
    'enviado',
    'falhou',
    'entregue',
    'lido'
);

-- Dia da semana
CREATE TYPE dia_semana AS ENUM (
    'domingo',
    'segunda',
    'terca',
    'quarta',
    'quinta',
    'sexta',
    'sabado'
);

-- Status de troca de escala
CREATE TYPE status_troca AS ENUM (
    'pendente_solicitante',   -- Aguardando solicitante
    'pendente_destinatario',  -- Aguardando destinatário
    'aceita',                 -- Aceita por ambos
    'rejeitada',              -- Rejeitada
    'cancelada'               -- Cancelada
);

-- ============================================================
-- TABELA: associacoes (Associações)
-- ============================================================
CREATE TABLE associacoes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo SERIAL UNIQUE NOT NULL,

    nome VARCHAR(200) NOT NULL,
    sigla VARCHAR(20),
    endereco TEXT,
    cidade VARCHAR(100),
    estado VARCHAR(50),
    pais VARCHAR(50) DEFAULT 'Brasil',
    telefone VARCHAR(20),
    email VARCHAR(100),
    site VARCHAR(200),
    url_logo VARCHAR(500),

    ativo BOOLEAN DEFAULT true,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    excluido_em TIMESTAMP WITH TIME ZONE
);

COMMENT ON TABLE associacoes IS 'Associações da Igreja Adventista';
COMMENT ON COLUMN associacoes.codigo IS 'Código numérico sequencial para identificação';

-- ============================================================
-- TABELA: distritos (Distritos)
-- ============================================================
CREATE TABLE distritos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo SERIAL UNIQUE NOT NULL,
    associacao_id UUID NOT NULL REFERENCES associacoes(id) ON DELETE CASCADE,

    nome VARCHAR(200) NOT NULL,
    codigo_distrito VARCHAR(50),
    regiao VARCHAR(100),

    ativo BOOLEAN DEFAULT true,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    excluido_em TIMESTAMP WITH TIME ZONE,

    CONSTRAINT fk_distrito_associacao FOREIGN KEY (associacao_id)
        REFERENCES associacoes(id) ON DELETE CASCADE
);

COMMENT ON TABLE distritos IS 'Distritos pertencentes a uma Associação';
COMMENT ON COLUMN distritos.codigo IS 'Código numérico sequencial para identificação';

-- ============================================================
-- TABELA: igrejas (Igrejas)
-- ============================================================
CREATE TABLE igrejas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo SERIAL UNIQUE NOT NULL,
    distrito_id UUID NOT NULL REFERENCES distritos(id) ON DELETE CASCADE,

    nome VARCHAR(200) NOT NULL,
    endereco TEXT,
    cidade VARCHAR(100),
    estado VARCHAR(50),
    cep VARCHAR(20),
    telefone VARCHAR(20),
    email VARCHAR(100),
    capacidade INTEGER,
    tem_som BOOLEAN DEFAULT true,
    tem_projecao BOOLEAN DEFAULT true,
    observacoes TEXT,

    ativo BOOLEAN DEFAULT true,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    excluido_em TIMESTAMP WITH TIME ZONE,

    CONSTRAINT fk_igreja_distrito FOREIGN KEY (distrito_id)
        REFERENCES distritos(id) ON DELETE CASCADE
);

COMMENT ON TABLE igrejas IS 'Igrejas locais pertencentes a um distrito';
COMMENT ON COLUMN igrejas.codigo IS 'Código numérico sequencial para identificação';

-- ============================================================
-- TABELA: usuarios (Usuários)
-- ============================================================
CREATE TABLE usuarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo SERIAL UNIQUE NOT NULL,

    associacao_id UUID REFERENCES associacoes(id) ON DELETE SET NULL,
    distrito_id UUID REFERENCES distritos(id) ON DELETE SET NULL,
    igreja_id UUID REFERENCES igrejas(id) ON DELETE SET NULL,

    email VARCHAR(150) UNIQUE NOT NULL,
    telefone VARCHAR(20),
    whatsapp VARCHAR(20),
    senha_hash VARCHAR(255) NOT NULL,

    nome_completo VARCHAR(200) NOT NULL,
    cpf VARCHAR(14) UNIQUE,
    data_nascimento DATE,
    genero VARCHAR(20),

    url_foto VARCHAR(500),

    -- Perfis de acesso (usuário pode ter múltiplos perfis)
    perfis perfil_usuario[] NOT NULL DEFAULT ARRAY['pregador']::perfil_usuario[],

    -- Status de aprovação
    status_aprovacao status_aprovacao DEFAULT 'pendente',
    aprovado_por UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    aprovado_em TIMESTAMP WITH TIME ZONE,

    -- Configurações de notificação
    notif_whatsapp BOOLEAN DEFAULT true,
    notif_sms BOOLEAN DEFAULT false,
    notif_push BOOLEAN DEFAULT true,
    notif_email BOOLEAN DEFAULT true,

    -- Controle
    ativo BOOLEAN DEFAULT true,
    ultimo_login_em TIMESTAMP WITH TIME ZONE,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    excluido_em TIMESTAMP WITH TIME ZONE,

    CONSTRAINT fk_usuario_associacao FOREIGN KEY (associacao_id)
        REFERENCES associacoes(id) ON DELETE SET NULL,
    CONSTRAINT fk_usuario_distrito FOREIGN KEY (distrito_id)
        REFERENCES distritos(id) ON DELETE SET NULL,
    CONSTRAINT fk_usuario_igreja FOREIGN KEY (igreja_id)
        REFERENCES igrejas(id) ON DELETE SET NULL,
    CONSTRAINT fk_usuario_aprovado_por FOREIGN KEY (aprovado_por)
        REFERENCES usuarios(id) ON DELETE SET NULL
);

COMMENT ON TABLE usuarios IS 'Usuários do sistema com múltiplos perfis possíveis';
COMMENT ON COLUMN usuarios.codigo IS 'Código numérico sequencial para identificação';
COMMENT ON COLUMN usuarios.perfis IS 'Array de perfis de acesso do usuário';

-- ============================================================
-- TABELA: perfis_pregadores (Perfil de Pregador)
-- ============================================================
CREATE TABLE perfis_pregadores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id UUID UNIQUE NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,

    -- Informações do pregador
    tipo_ordenacao VARCHAR(50), -- Ancião, Pastor, Evangelista, etc
    data_ordenacao DATE,
    anos_experiencia INTEGER,

    -- Score de pregador (0-5)
    score_medio DECIMAL(3,2) DEFAULT 0.00 CHECK (score_medio >= 0 AND score_medio <= 5),
    score_avaliacoes DECIMAL(3,2) DEFAULT 0.00,
    score_frequencia DECIMAL(3,2) DEFAULT 0.00,
    score_pontualidade DECIMAL(3,2) DEFAULT 0.00,

    -- Estatísticas
    total_pregacoes INTEGER DEFAULT 0,
    pregacoes_realizadas INTEGER DEFAULT 0,
    pregacoes_faltou INTEGER DEFAULT 0,
    pregacoes_recusadas INTEGER DEFAULT 0,

    -- Taxas (0-100%)
    taxa_frequencia DECIMAL(5,2) DEFAULT 100.00,
    taxa_pontualidade DECIMAL(5,2) DEFAULT 100.00,

    -- Preferências
    max_pregacoes_mes INTEGER DEFAULT 4,
    horarios_preferidos TEXT[], -- Array de horários preferidos

    -- Observações
    observacoes TEXT,

    ativo BOOLEAN DEFAULT true,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_perfil_pregador_usuario FOREIGN KEY (usuario_id)
        REFERENCES usuarios(id) ON DELETE CASCADE
);

COMMENT ON TABLE perfis_pregadores IS 'Perfil estendido para usuários pregadores';
COMMENT ON COLUMN perfis_pregadores.score_medio IS 'Score médio: (avaliações*0.6 + frequência*0.25 + pontualidade*0.15)';

-- ============================================================
-- TABELA: horarios_cultos (Horários de Culto)
-- ============================================================
CREATE TABLE horarios_cultos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    distrito_id UUID REFERENCES distritos(id) ON DELETE CASCADE,
    igreja_id UUID REFERENCES igrejas(id) ON DELETE CASCADE,

    dia_semana dia_semana NOT NULL,
    horario TIME NOT NULL,
    nome_culto VARCHAR(100), -- Ex: Escola Sabatina, Culto Divino, etc
    duracao_minutos INTEGER DEFAULT 120,
    requer_pregador BOOLEAN DEFAULT true,

    ativo BOOLEAN DEFAULT true,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Um horário pode ser do distrito (aplicado a todas igrejas) ou de igreja específica
    CONSTRAINT chk_horario_escopo CHECK (
        (distrito_id IS NOT NULL AND igreja_id IS NULL) OR
        (distrito_id IS NULL AND igreja_id IS NOT NULL)
    ),

    CONSTRAINT fk_horario_distrito FOREIGN KEY (distrito_id)
        REFERENCES distritos(id) ON DELETE CASCADE,
    CONSTRAINT fk_horario_igreja FOREIGN KEY (igreja_id)
        REFERENCES igrejas(id) ON DELETE CASCADE
);

COMMENT ON TABLE horarios_cultos IS 'Horários de cultos por distrito ou igreja específica';

-- ============================================================
-- TABELA: tematicas (Temáticas de Pregação)
-- ============================================================
CREATE TABLE tematicas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo SERIAL UNIQUE NOT NULL,
    associacao_id UUID NOT NULL REFERENCES associacoes(id) ON DELETE CASCADE,
    criado_por UUID REFERENCES usuarios(id) ON DELETE SET NULL,

    titulo VARCHAR(300) NOT NULL,
    descricao TEXT,
    referencia_biblica VARCHAR(200),

    -- Recorrência
    tipo_recorrencia tipo_recorrencia NOT NULL,

    -- Para recorrência específica
    data_especifica DATE,

    -- Para recorrência semanal
    dia_semana_semanal dia_semana,

    -- Para recorrência mensal
    numero_semana_mes INTEGER CHECK (numero_semana_mes BETWEEN 1 AND 5), -- 1º, 2º, 3º, 4º, 5º
    dia_semana_mensal dia_semana,

    -- Período de validade
    valido_de DATE,
    valido_ate DATE,

    ativo BOOLEAN DEFAULT true,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_tematica_associacao FOREIGN KEY (associacao_id)
        REFERENCES associacoes(id) ON DELETE CASCADE,
    CONSTRAINT fk_tematica_criado_por FOREIGN KEY (criado_por)
        REFERENCES usuarios(id) ON DELETE SET NULL,

    -- Validações de recorrência
    CONSTRAINT chk_tematica_data_especifica CHECK (
        tipo_recorrencia != 'data_especifica' OR data_especifica IS NOT NULL
    ),
    CONSTRAINT chk_tematica_semanal CHECK (
        tipo_recorrencia != 'semanal' OR dia_semana_semanal IS NOT NULL
    ),
    CONSTRAINT chk_tematica_mensal CHECK (
        tipo_recorrencia != 'mensal' OR
        (numero_semana_mes IS NOT NULL AND dia_semana_mensal IS NOT NULL)
    )
);

COMMENT ON TABLE tematicas IS 'Temáticas sugestivas de pregação cadastradas pela Associação';
COMMENT ON COLUMN tematicas.codigo IS 'Código numérico sequencial para identificação';

-- ============================================================
-- TABELA: escalas (Escalas Mensais)
-- ============================================================
CREATE TABLE escalas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo SERIAL UNIQUE NOT NULL,
    distrito_id UUID NOT NULL REFERENCES distritos(id) ON DELETE CASCADE,

    mes_referencia INTEGER NOT NULL CHECK (mes_referencia BETWEEN 1 AND 12),
    ano_referencia INTEGER NOT NULL CHECK (ano_referencia >= 2024),

    status status_escala DEFAULT 'rascunho',

    criado_por UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    aprovado_por UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    finalizado_por UUID REFERENCES usuarios(id) ON DELETE SET NULL,

    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    aprovado_em TIMESTAMP WITH TIME ZONE,
    finalizado_em TIMESTAMP WITH TIME ZONE,
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    observacoes TEXT,

    CONSTRAINT fk_escala_distrito FOREIGN KEY (distrito_id)
        REFERENCES distritos(id) ON DELETE CASCADE,
    CONSTRAINT fk_escala_criado_por FOREIGN KEY (criado_por)
        REFERENCES usuarios(id) ON DELETE SET NULL,
    CONSTRAINT fk_escala_aprovado_por FOREIGN KEY (aprovado_por)
        REFERENCES usuarios(id) ON DELETE SET NULL,
    CONSTRAINT fk_escala_finalizado_por FOREIGN KEY (finalizado_por)
        REFERENCES usuarios(id) ON DELETE SET NULL,

    -- Uma escala por distrito por mês
    CONSTRAINT uk_escala_distrito_mes UNIQUE (distrito_id, mes_referencia, ano_referencia)
);

COMMENT ON TABLE escalas IS 'Escalas mensais de pregação por distrito';
COMMENT ON COLUMN escalas.codigo IS 'Código numérico sequencial para identificação';

-- ============================================================
-- TABELA: pregacoes (Pregações Individuais)
-- ============================================================
CREATE TABLE pregacoes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo SERIAL UNIQUE NOT NULL,
    escala_id UUID NOT NULL REFERENCES escalas(id) ON DELETE CASCADE,
    igreja_id UUID NOT NULL REFERENCES igrejas(id) ON DELETE CASCADE,
    pregador_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    tematica_id UUID REFERENCES tematicas(id) ON DELETE SET NULL,

    data_pregacao DATE NOT NULL,
    horario_pregacao TIME NOT NULL,
    nome_culto VARCHAR(100),

    status status_pregacao DEFAULT 'agendado',

    -- Resposta do pregador
    aceito_em TIMESTAMP WITH TIME ZONE,
    recusado_em TIMESTAMP WITH TIME ZONE,
    motivo_recusa TEXT,

    -- Confirmação de realização
    realizado_em TIMESTAMP WITH TIME ZONE,
    confirmado_por UUID REFERENCES usuarios(id) ON DELETE SET NULL,

    -- Observações
    observacoes TEXT,
    instrucoes_especiais TEXT,

    -- Controle de troca
    foi_trocado BOOLEAN DEFAULT false,
    pregador_original_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,

    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_pregacao_escala FOREIGN KEY (escala_id)
        REFERENCES escalas(id) ON DELETE CASCADE,
    CONSTRAINT fk_pregacao_igreja FOREIGN KEY (igreja_id)
        REFERENCES igrejas(id) ON DELETE CASCADE,
    CONSTRAINT fk_pregacao_pregador FOREIGN KEY (pregador_id)
        REFERENCES usuarios(id) ON DELETE CASCADE,
    CONSTRAINT fk_pregacao_tematica FOREIGN KEY (tematica_id)
        REFERENCES tematicas(id) ON DELETE SET NULL,
    CONSTRAINT fk_pregacao_confirmado_por FOREIGN KEY (confirmado_por)
        REFERENCES usuarios(id) ON DELETE SET NULL,
    CONSTRAINT fk_pregacao_pregador_original FOREIGN KEY (pregador_original_id)
        REFERENCES usuarios(id) ON DELETE SET NULL
);

COMMENT ON TABLE pregacoes IS 'Pregações individuais dentro de uma escala mensal';
COMMENT ON COLUMN pregacoes.codigo IS 'Código numérico sequencial para identificação';

-- ============================================================
-- TABELA: trocas_escalas (Trocas de Escala)
-- ============================================================
CREATE TABLE trocas_escalas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Pregação do solicitante
    pregacao_solicitante_id UUID NOT NULL REFERENCES pregacoes(id) ON DELETE CASCADE,
    usuario_solicitante_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,

    -- Pregação do destinatário
    pregacao_destinatario_id UUID NOT NULL REFERENCES pregacoes(id) ON DELETE CASCADE,
    usuario_destinatario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,

    status status_troca DEFAULT 'pendente_destinatario',

    -- Justificativa
    motivo_solicitante TEXT,

    -- Respostas
    aceito_solicitante_em TIMESTAMP WITH TIME ZONE,
    aceito_destinatario_em TIMESTAMP WITH TIME ZONE,
    rejeitado_em TIMESTAMP WITH TIME ZONE,
    motivo_rejeicao TEXT,
    rejeitado_por UUID REFERENCES usuarios(id) ON DELETE SET NULL,

    -- Finalização
    concluido_em TIMESTAMP WITH TIME ZONE,

    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_troca_pregacao_solicitante FOREIGN KEY (pregacao_solicitante_id)
        REFERENCES pregacoes(id) ON DELETE CASCADE,
    CONSTRAINT fk_troca_usuario_solicitante FOREIGN KEY (usuario_solicitante_id)
        REFERENCES usuarios(id) ON DELETE CASCADE,
    CONSTRAINT fk_troca_pregacao_destinatario FOREIGN KEY (pregacao_destinatario_id)
        REFERENCES pregacoes(id) ON DELETE CASCADE,
    CONSTRAINT fk_troca_usuario_destinatario FOREIGN KEY (usuario_destinatario_id)
        REFERENCES usuarios(id) ON DELETE CASCADE,
    CONSTRAINT fk_troca_rejeitado_por FOREIGN KEY (rejeitado_por)
        REFERENCES usuarios(id) ON DELETE SET NULL
);

COMMENT ON TABLE trocas_escalas IS 'Solicitações de troca automática entre pregadores';

-- ============================================================
-- TABELA: periodos_indisponibilidade (Períodos de Indisponibilidade)
-- ============================================================
CREATE TABLE periodos_indisponibilidade (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pregador_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,

    data_inicio DATE NOT NULL,
    data_fim DATE NOT NULL,

    motivo TEXT,

    ativo BOOLEAN DEFAULT true,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_indisponibilidade_pregador FOREIGN KEY (pregador_id)
        REFERENCES usuarios(id) ON DELETE CASCADE,
    CONSTRAINT chk_indisponibilidade_datas CHECK (data_fim >= data_inicio)
);

COMMENT ON TABLE periodos_indisponibilidade IS 'Períodos de indisponibilidade dos pregadores';

-- ============================================================
-- TABELA: avaliacoes (Avaliações de Pregadores)
-- ============================================================
CREATE TABLE avaliacoes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pregacao_id UUID NOT NULL REFERENCES pregacoes(id) ON DELETE CASCADE,
    pregador_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    avaliador_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,

    -- Avaliação (0-5 estrelas)
    nota DECIMAL(2,1) NOT NULL CHECK (nota >= 0 AND nota <= 5),

    -- Critérios individuais (opcional)
    qualidade_conteudo DECIMAL(2,1) CHECK (qualidade_conteudo >= 0 AND qualidade_conteudo <= 5),
    apresentacao DECIMAL(2,1) CHECK (apresentacao >= 0 AND apresentacao <= 5),
    fundamentacao_biblica DECIMAL(2,1) CHECK (fundamentacao_biblica >= 0 AND fundamentacao_biblica <= 5),
    engajamento DECIMAL(2,1) CHECK (engajamento >= 0 AND engajamento <= 5),

    -- Comentários
    comentarios TEXT,

    anonimo BOOLEAN DEFAULT false,

    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_avaliacao_pregacao FOREIGN KEY (pregacao_id)
        REFERENCES pregacoes(id) ON DELETE CASCADE,
    CONSTRAINT fk_avaliacao_pregador FOREIGN KEY (pregador_id)
        REFERENCES usuarios(id) ON DELETE CASCADE,
    CONSTRAINT fk_avaliacao_avaliador FOREIGN KEY (avaliador_id)
        REFERENCES usuarios(id) ON DELETE CASCADE,

    -- Um avaliador não pode avaliar a mesma pregação duas vezes
    CONSTRAINT uk_avaliacao_pregacao_avaliador UNIQUE (pregacao_id, avaliador_id)
);

COMMENT ON TABLE avaliacoes IS 'Avaliações de pregadores pelos membros';

-- ============================================================
-- TABELA: notificacoes (Notificações)
-- ============================================================
CREATE TABLE notificacoes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,

    tipo tipo_notificacao NOT NULL,
    status status_notificacao DEFAULT 'pendente',

    titulo VARCHAR(200) NOT NULL,
    mensagem TEXT NOT NULL,

    -- Dados específicos por tipo
    id_mensagem_whatsapp VARCHAR(100),
    id_mensagem_sms VARCHAR(100),
    id_mensagem_push VARCHAR(100),
    id_mensagem_email VARCHAR(100),

    -- Relacionamentos
    pregacao_id UUID REFERENCES pregacoes(id) ON DELETE SET NULL,
    troca_id UUID REFERENCES trocas_escalas(id) ON DELETE SET NULL,

    -- Controle de envio
    agendado_para TIMESTAMP WITH TIME ZONE,
    enviado_em TIMESTAMP WITH TIME ZONE,
    entregue_em TIMESTAMP WITH TIME ZONE,
    lido_em TIMESTAMP WITH TIME ZONE,
    falhou_em TIMESTAMP WITH TIME ZONE,
    motivo_falha TEXT,

    tentativas INTEGER DEFAULT 0,
    max_tentativas INTEGER DEFAULT 3,

    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_notificacao_usuario FOREIGN KEY (usuario_id)
        REFERENCES usuarios(id) ON DELETE CASCADE,
    CONSTRAINT fk_notificacao_pregacao FOREIGN KEY (pregacao_id)
        REFERENCES pregacoes(id) ON DELETE SET NULL,
    CONSTRAINT fk_notificacao_troca FOREIGN KEY (troca_id)
        REFERENCES trocas_escalas(id) ON DELETE SET NULL
);

COMMENT ON TABLE notificacoes IS 'Sistema de notificações WhatsApp/SMS/Push/Email';

-- ============================================================
-- TABELA: configuracoes (Configurações)
-- ============================================================
CREATE TABLE configuracoes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Escopo da configuração
    associacao_id UUID REFERENCES associacoes(id) ON DELETE CASCADE,
    distrito_id UUID REFERENCES distritos(id) ON DELETE CASCADE,
    igreja_id UUID REFERENCES igrejas(id) ON DELETE CASCADE,
    usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,

    chave VARCHAR(100) NOT NULL,
    valor JSONB NOT NULL,

    descricao TEXT,

    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Uma configuração por escopo e chave
    CONSTRAINT uk_configuracao_escopo_chave UNIQUE NULLS NOT DISTINCT (
        associacao_id, distrito_id, igreja_id, usuario_id, chave
    ),

    CONSTRAINT fk_configuracao_associacao FOREIGN KEY (associacao_id)
        REFERENCES associacoes(id) ON DELETE CASCADE,
    CONSTRAINT fk_configuracao_distrito FOREIGN KEY (distrito_id)
        REFERENCES distritos(id) ON DELETE CASCADE,
    CONSTRAINT fk_configuracao_igreja FOREIGN KEY (igreja_id)
        REFERENCES igrejas(id) ON DELETE CASCADE,
    CONSTRAINT fk_configuracao_usuario FOREIGN KEY (usuario_id)
        REFERENCES usuarios(id) ON DELETE CASCADE
);

COMMENT ON TABLE configuracoes IS 'Configurações flexíveis por associação/distrito/igreja/usuário';

-- ============================================================
-- TABELA: logs_auditoria (Logs de Auditoria)
-- ============================================================
CREATE TABLE logs_auditoria (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,

    acao VARCHAR(100) NOT NULL,
    tipo_entidade VARCHAR(100) NOT NULL,
    entidade_id UUID,

    valores_antigos JSONB,
    valores_novos JSONB,

    endereco_ip INET,
    user_agent TEXT,

    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_auditoria_usuario FOREIGN KEY (usuario_id)
        REFERENCES usuarios(id) ON DELETE SET NULL
);

COMMENT ON TABLE logs_auditoria IS 'Logs de auditoria de todas as ações importantes';

-- ============================================================
-- TABELA: logs_importacao (Logs de Importação)
-- ============================================================
CREATE TABLE logs_importacao (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,

    tipo_importacao VARCHAR(50) NOT NULL, -- membros, distritos, tematicas, etc
    nome_arquivo VARCHAR(255),
    tamanho_arquivo INTEGER,

    total_linhas INTEGER,
    linhas_sucesso INTEGER,
    linhas_erro INTEGER,

    erros JSONB,

    status VARCHAR(50) DEFAULT 'processando',

    iniciado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    concluido_em TIMESTAMP WITH TIME ZONE,

    CONSTRAINT fk_importacao_usuario FOREIGN KEY (usuario_id)
        REFERENCES usuarios(id) ON DELETE SET NULL
);

COMMENT ON TABLE logs_importacao IS 'Logs de importações via Excel/CSV';

-- ============================================================
-- ÍNDICES PARA PERFORMANCE
-- ============================================================

-- Usuarios
CREATE INDEX idx_usuarios_email ON usuarios(email);
CREATE INDEX idx_usuarios_cpf ON usuarios(cpf);
CREATE INDEX idx_usuarios_codigo ON usuarios(codigo);
CREATE INDEX idx_usuarios_distrito_id ON usuarios(distrito_id);
CREATE INDEX idx_usuarios_igreja_id ON usuarios(igreja_id);
CREATE INDEX idx_usuarios_associacao_id ON usuarios(associacao_id);
CREATE INDEX idx_usuarios_perfis ON usuarios USING GIN(perfis);
CREATE INDEX idx_usuarios_status_aprovacao ON usuarios(status_aprovacao);
CREATE INDEX idx_usuarios_ativo ON usuarios(ativo) WHERE ativo = true;

-- Perfis Pregadores
CREATE INDEX idx_perfil_pregador_usuario_id ON perfis_pregadores(usuario_id);
CREATE INDEX idx_perfil_pregador_score ON perfis_pregadores(score_medio DESC);
CREATE INDEX idx_perfil_pregador_ativo ON perfis_pregadores(ativo) WHERE ativo = true;

-- Igrejas
CREATE INDEX idx_igrejas_codigo ON igrejas(codigo);
CREATE INDEX idx_igrejas_distrito_id ON igrejas(distrito_id);
CREATE INDEX idx_igrejas_ativo ON igrejas(ativo) WHERE ativo = true;

-- Distritos
CREATE INDEX idx_distritos_codigo ON distritos(codigo);
CREATE INDEX idx_distritos_associacao_id ON distritos(associacao_id);
CREATE INDEX idx_distritos_ativo ON distritos(ativo) WHERE ativo = true;

-- Associacoes
CREATE INDEX idx_associacoes_codigo ON associacoes(codigo);
CREATE INDEX idx_associacoes_ativo ON associacoes(ativo) WHERE ativo = true;

-- Escalas
CREATE INDEX idx_escalas_codigo ON escalas(codigo);
CREATE INDEX idx_escalas_distrito_id ON escalas(distrito_id);
CREATE INDEX idx_escalas_referencia ON escalas(ano_referencia DESC, mes_referencia DESC);
CREATE INDEX idx_escalas_status ON escalas(status);

-- Pregacoes
CREATE INDEX idx_pregacoes_codigo ON pregacoes(codigo);
CREATE INDEX idx_pregacoes_escala_id ON pregacoes(escala_id);
CREATE INDEX idx_pregacoes_igreja_id ON pregacoes(igreja_id);
CREATE INDEX idx_pregacoes_pregador_id ON pregacoes(pregador_id);
CREATE INDEX idx_pregacoes_data ON pregacoes(data_pregacao);
CREATE INDEX idx_pregacoes_status ON pregacoes(status);
CREATE INDEX idx_pregacoes_data_pregador ON pregacoes(data_pregacao, pregador_id);

-- Tematicas
CREATE INDEX idx_tematicas_codigo ON tematicas(codigo);
CREATE INDEX idx_tematicas_associacao_id ON tematicas(associacao_id);
CREATE INDEX idx_tematicas_recorrencia ON tematicas(tipo_recorrencia);
CREATE INDEX idx_tematicas_ativo ON tematicas(ativo) WHERE ativo = true;
CREATE INDEX idx_tematicas_data_especifica ON tematicas(data_especifica) WHERE data_especifica IS NOT NULL;

-- Avaliacoes
CREATE INDEX idx_avaliacoes_pregador_id ON avaliacoes(pregador_id);
CREATE INDEX idx_avaliacoes_pregacao_id ON avaliacoes(pregacao_id);
CREATE INDEX idx_avaliacoes_nota ON avaliacoes(nota);

-- Notificacoes
CREATE INDEX idx_notificacoes_usuario_id ON notificacoes(usuario_id);
CREATE INDEX idx_notificacoes_status ON notificacoes(status);
CREATE INDEX idx_notificacoes_agendado ON notificacoes(agendado_para) WHERE agendado_para IS NOT NULL;
CREATE INDEX idx_notificacoes_tipo ON notificacoes(tipo);

-- Periodos Indisponibilidade
CREATE INDEX idx_indisponibilidade_pregador_id ON periodos_indisponibilidade(pregador_id);
CREATE INDEX idx_indisponibilidade_datas ON periodos_indisponibilidade(data_inicio, data_fim);
CREATE INDEX idx_indisponibilidade_ativo ON periodos_indisponibilidade(ativo) WHERE ativo = true;

-- Trocas Escalas
CREATE INDEX idx_trocas_usuario_solicitante ON trocas_escalas(usuario_solicitante_id);
CREATE INDEX idx_trocas_usuario_destinatario ON trocas_escalas(usuario_destinatario_id);
CREATE INDEX idx_trocas_status ON trocas_escalas(status);

-- Logs Auditoria
CREATE INDEX idx_auditoria_usuario_id ON logs_auditoria(usuario_id);
CREATE INDEX idx_auditoria_entidade ON logs_auditoria(tipo_entidade, entidade_id);
CREATE INDEX idx_auditoria_criado_em ON logs_auditoria(criado_em DESC);

-- Horarios Cultos
CREATE INDEX idx_horarios_distrito_id ON horarios_cultos(distrito_id);
CREATE INDEX idx_horarios_igreja_id ON horarios_cultos(igreja_id);
CREATE INDEX idx_horarios_dia ON horarios_cultos(dia_semana);

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Função para atualizar atualizado_em automaticamente
CREATE OR REPLACE FUNCTION atualizar_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.atualizado_em = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger em todas as tabelas relevantes
CREATE TRIGGER trigger_atualizar_associacoes BEFORE UPDATE ON associacoes
    FOR EACH ROW EXECUTE FUNCTION atualizar_timestamp();

CREATE TRIGGER trigger_atualizar_distritos BEFORE UPDATE ON distritos
    FOR EACH ROW EXECUTE FUNCTION atualizar_timestamp();

CREATE TRIGGER trigger_atualizar_igrejas BEFORE UPDATE ON igrejas
    FOR EACH ROW EXECUTE FUNCTION atualizar_timestamp();

CREATE TRIGGER trigger_atualizar_usuarios BEFORE UPDATE ON usuarios
    FOR EACH ROW EXECUTE FUNCTION atualizar_timestamp();

CREATE TRIGGER trigger_atualizar_perfis_pregadores BEFORE UPDATE ON perfis_pregadores
    FOR EACH ROW EXECUTE FUNCTION atualizar_timestamp();

CREATE TRIGGER trigger_atualizar_escalas BEFORE UPDATE ON escalas
    FOR EACH ROW EXECUTE FUNCTION atualizar_timestamp();

CREATE TRIGGER trigger_atualizar_pregacoes BEFORE UPDATE ON pregacoes
    FOR EACH ROW EXECUTE FUNCTION atualizar_timestamp();

CREATE TRIGGER trigger_atualizar_tematicas BEFORE UPDATE ON tematicas
    FOR EACH ROW EXECUTE FUNCTION atualizar_timestamp();

CREATE TRIGGER trigger_atualizar_avaliacoes BEFORE UPDATE ON avaliacoes
    FOR EACH ROW EXECUTE FUNCTION atualizar_timestamp();

CREATE TRIGGER trigger_atualizar_notificacoes BEFORE UPDATE ON notificacoes
    FOR EACH ROW EXECUTE FUNCTION atualizar_timestamp();

CREATE TRIGGER trigger_atualizar_configuracoes BEFORE UPDATE ON configuracoes
    FOR EACH ROW EXECUTE FUNCTION atualizar_timestamp();

-- ============================================================
-- FUNÇÃO: Calcular Score do Pregador
-- ============================================================
CREATE OR REPLACE FUNCTION calcular_score_pregador(p_pregador_id UUID)
RETURNS DECIMAL(3,2) AS $$
DECLARE
    v_media_nota DECIMAL(3,2);
    v_taxa_frequencia DECIMAL(5,2);
    v_taxa_pontualidade DECIMAL(5,2);
    v_score_final DECIMAL(3,2);
BEGIN
    -- Buscar dados do pregador
    SELECT
        COALESCE(AVG(a.nota), 0),
        COALESCE(pp.taxa_frequencia, 100),
        COALESCE(pp.taxa_pontualidade, 100)
    INTO v_media_nota, v_taxa_frequencia, v_taxa_pontualidade
    FROM perfis_pregadores pp
    LEFT JOIN avaliacoes a ON a.pregador_id = pp.usuario_id
    WHERE pp.usuario_id = p_pregador_id
    GROUP BY pp.taxa_frequencia, pp.taxa_pontualidade;

    -- Calcular score final
    -- SCORE = (Média_Avaliações × 0.6) + (Taxa_Frequência × 0.25) + (Taxa_Pontualidade × 0.15)
    v_score_final := (v_media_nota * 0.6) +
                     ((v_taxa_frequencia / 100 * 5) * 0.25) +
                     ((v_taxa_pontualidade / 100 * 5) * 0.15);

    -- Atualizar perfil do pregador
    UPDATE perfis_pregadores
    SET score_medio = v_score_final,
        score_avaliacoes = v_media_nota,
        score_frequencia = (v_taxa_frequencia / 100 * 5),
        score_pontualidade = (v_taxa_pontualidade / 100 * 5)
    WHERE usuario_id = p_pregador_id;

    RETURN v_score_final;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calcular_score_pregador IS 'Calcula e atualiza o score de um pregador';

-- ============================================================
-- FUNÇÃO: Atualizar Estatísticas do Pregador
-- ============================================================
CREATE OR REPLACE FUNCTION atualizar_estatisticas_pregador(p_pregador_id UUID)
RETURNS VOID AS $$
DECLARE
    v_total INTEGER;
    v_realizadas INTEGER;
    v_faltou INTEGER;
    v_recusadas INTEGER;
    v_taxa_frequencia DECIMAL(5,2);
BEGIN
    -- Contar pregações
    SELECT
        COUNT(*),
        COUNT(*) FILTER (WHERE status = 'realizado'),
        COUNT(*) FILTER (WHERE status = 'faltou'),
        COUNT(*) FILTER (WHERE status = 'recusado')
    INTO v_total, v_realizadas, v_faltou, v_recusadas
    FROM pregacoes
    WHERE pregador_id = p_pregador_id;

    -- Calcular taxa de frequência
    IF v_total > 0 THEN
        v_taxa_frequencia := (v_realizadas::DECIMAL / v_total::DECIMAL) * 100;
    ELSE
        v_taxa_frequencia := 100;
    END IF;

    -- Atualizar perfil
    UPDATE perfis_pregadores
    SET total_pregacoes = v_total,
        pregacoes_realizadas = v_realizadas,
        pregacoes_faltou = v_faltou,
        pregacoes_recusadas = v_recusadas,
        taxa_frequencia = v_taxa_frequencia
    WHERE usuario_id = p_pregador_id;

    -- Recalcular score
    PERFORM calcular_score_pregador(p_pregador_id);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION atualizar_estatisticas_pregador IS 'Atualiza estatísticas e recalcula score do pregador';

-- ============================================================
-- TRIGGER: Atualizar Score Quando Recusar Pregação
-- ============================================================
CREATE OR REPLACE FUNCTION handle_recusa_pregacao()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'recusado' AND OLD.status != 'recusado' THEN
        -- Reduzir score em 15%
        UPDATE perfis_pregadores
        SET score_medio = score_medio - (score_medio * 0.15)
        WHERE usuario_id = NEW.pregador_id;

        -- Atualizar estatísticas
        PERFORM atualizar_estatisticas_pregador(NEW.pregador_id);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_recusa_pregacao
    AFTER UPDATE ON pregacoes
    FOR EACH ROW
    WHEN (NEW.status = 'recusado')
    EXECUTE FUNCTION handle_recusa_pregacao();

-- ============================================================
-- TRIGGER: Recalcular Score Após Avaliação
-- ============================================================
CREATE OR REPLACE FUNCTION handle_mudanca_avaliacao()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM calcular_score_pregador(NEW.pregador_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_avaliacao_insert
    AFTER INSERT ON avaliacoes
    FOR EACH ROW
    EXECUTE FUNCTION handle_mudanca_avaliacao();

CREATE TRIGGER trigger_avaliacao_update
    AFTER UPDATE ON avaliacoes
    FOR EACH ROW
    EXECUTE FUNCTION handle_mudanca_avaliacao();

-- ============================================================
-- VIEWS ÚTEIS
-- ============================================================

-- View: Pregadores com Score e Estatísticas
CREATE OR REPLACE VIEW vw_pregadores_completo AS
SELECT
    u.id,
    u.codigo,
    u.nome_completo,
    u.email,
    u.telefone,
    u.whatsapp,
    u.igreja_id,
    i.nome as nome_igreja,
    u.distrito_id,
    d.nome as nome_distrito,
    pp.score_medio,
    pp.score_avaliacoes,
    pp.score_frequencia,
    pp.score_pontualidade,
    pp.total_pregacoes,
    pp.pregacoes_realizadas,
    pp.pregacoes_faltou,
    pp.pregacoes_recusadas,
    pp.taxa_frequencia,
    pp.taxa_pontualidade,
    pp.tipo_ordenacao,
    pp.max_pregacoes_mes,
    u.ativo
FROM usuarios u
INNER JOIN perfis_pregadores pp ON pp.usuario_id = u.id
LEFT JOIN igrejas i ON i.id = u.igreja_id
LEFT JOIN distritos d ON d.id = u.distrito_id
WHERE 'pregador' = ANY(u.perfis);

COMMENT ON VIEW vw_pregadores_completo IS 'View completa de pregadores com scores e estatísticas';

-- View: Pregações Futuras
CREATE OR REPLACE VIEW vw_pregacoes_futuras AS
SELECT
    p.id,
    p.codigo,
    p.data_pregacao,
    p.horario_pregacao,
    p.nome_culto,
    p.status,
    u.nome_completo as nome_pregador,
    u.telefone as telefone_pregador,
    u.whatsapp as whatsapp_pregador,
    i.nome as nome_igreja,
    d.nome as nome_distrito,
    t.titulo as titulo_tematica,
    t.descricao as descricao_tematica
FROM pregacoes p
INNER JOIN usuarios u ON u.id = p.pregador_id
INNER JOIN igrejas i ON i.id = p.igreja_id
INNER JOIN distritos d ON d.id = i.distrito_id
LEFT JOIN tematicas t ON t.id = p.tematica_id
WHERE p.data_pregacao >= CURRENT_DATE
ORDER BY p.data_pregacao, p.horario_pregacao;

COMMENT ON VIEW vw_pregacoes_futuras IS 'Pregações futuras com informações completas';

-- ============================================================
-- DADOS INICIAIS (SEEDS)
-- ============================================================

-- Inserir Associação Padrão
INSERT INTO associacoes (id, codigo, nome, sigla, pais, ativo)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    1,
    'Associação Exemplo',
    'AE',
    'Brasil',
    true
);

-- ============================================================
-- FIM DO SCHEMA
-- ============================================================
