-- ============================================================
-- SISTEMA DE GESTÃO DE ESCALAS DE PREGAÇÃO
-- Igreja Adventista do Sétimo Dia
-- ============================================================
-- Banco de Dados: PostgreSQL 15+
-- Encoding: UTF8
-- ============================================================

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ENUMS (Tipos Enumerados)
-- ============================================================

-- Tipos de perfil de usuário
CREATE TYPE user_role AS ENUM (
    'association_member',  -- Membro da Associação
    'district_pastor',     -- Pastor Distrital
    'preacher',           -- Pregador/Membro
    'evaluator'           -- Membro Avaliador
);

-- Status de aprovação
CREATE TYPE approval_status AS ENUM (
    'pending',    -- Pendente
    'approved',   -- Aprovado
    'rejected'    -- Rejeitado
);

-- Status de escala
CREATE TYPE schedule_status AS ENUM (
    'draft',      -- Rascunho
    'approved',   -- Aprovado
    'finalized'   -- Finalizado
);

-- Status de pregação
CREATE TYPE preaching_status AS ENUM (
    'scheduled',  -- Agendado
    'accepted',   -- Aceito pelo pregador
    'refused',    -- Recusado pelo pregador
    'completed',  -- Realizado
    'missed'      -- Faltou
);

-- Tipo de recorrência de temática
CREATE TYPE theme_recurrence AS ENUM (
    'specific_date',  -- Data específica
    'weekly',         -- Semanal
    'monthly'         -- Mensal
);

-- Tipo de notificação
CREATE TYPE notification_type AS ENUM (
    'whatsapp',
    'sms',
    'push',
    'email'
);

-- Status de notificação
CREATE TYPE notification_status AS ENUM (
    'pending',
    'sent',
    'failed',
    'delivered',
    'read'
);

-- Dia da semana
CREATE TYPE day_of_week AS ENUM (
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday'
);

-- Status de troca de escala
CREATE TYPE swap_status AS ENUM (
    'pending_requester',   -- Aguardando solicitante
    'pending_target',      -- Aguardando destinatário
    'accepted',            -- Aceita por ambos
    'rejected',            -- Rejeitada
    'cancelled'            -- Cancelada
);

-- ============================================================
-- TABELA: associations (Associações)
-- ============================================================
CREATE TABLE associations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    acronym VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(50),
    country VARCHAR(50) DEFAULT 'Brasil',
    phone VARCHAR(20),
    email VARCHAR(100),
    website VARCHAR(200),
    logo_url VARCHAR(500),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

COMMENT ON TABLE associations IS 'Associações da Igreja Adventista';
COMMENT ON COLUMN associations.acronym IS 'Sigla da associação (ex: ASP - Associação São Paulo)';

-- ============================================================
-- TABELA: districts (Distritos)
-- ============================================================
CREATE TABLE districts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    association_id UUID NOT NULL REFERENCES associations(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    code VARCHAR(50),
    region VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,

    CONSTRAINT fk_district_association FOREIGN KEY (association_id)
        REFERENCES associations(id) ON DELETE CASCADE
);

COMMENT ON TABLE districts IS 'Distritos pertencentes a uma Associação';
COMMENT ON COLUMN districts.code IS 'Código único do distrito';

-- ============================================================
-- TABELA: churches (Igrejas)
-- ============================================================
CREATE TABLE churches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    district_id UUID NOT NULL REFERENCES districts(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(50),
    zip_code VARCHAR(20),
    phone VARCHAR(20),
    email VARCHAR(100),
    capacity INTEGER,
    has_sound_system BOOLEAN DEFAULT true,
    has_projection BOOLEAN DEFAULT true,
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,

    CONSTRAINT fk_church_district FOREIGN KEY (district_id)
        REFERENCES districts(id) ON DELETE CASCADE
);

COMMENT ON TABLE churches IS 'Igrejas locais pertencentes a um distrito';
COMMENT ON COLUMN churches.capacity IS 'Capacidade de público da igreja';

-- ============================================================
-- TABELA: users (Usuários)
-- ============================================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    association_id UUID REFERENCES associations(id) ON DELETE SET NULL,
    district_id UUID REFERENCES districts(id) ON DELETE SET NULL,
    church_id UUID REFERENCES churches(id) ON DELETE SET NULL,

    email VARCHAR(150) UNIQUE NOT NULL,
    phone VARCHAR(20),
    whatsapp VARCHAR(20),
    password_hash VARCHAR(255) NOT NULL,

    full_name VARCHAR(200) NOT NULL,
    cpf VARCHAR(14) UNIQUE,
    birth_date DATE,
    gender VARCHAR(20),

    profile_photo_url VARCHAR(500),

    -- Perfis de acesso (usuário pode ter múltiplos perfis)
    roles user_role[] NOT NULL DEFAULT ARRAY['preacher']::user_role[],

    -- Status de aprovação
    approval_status approval_status DEFAULT 'pending',
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMP WITH TIME ZONE,

    -- Configurações de notificação
    notification_whatsapp BOOLEAN DEFAULT true,
    notification_sms BOOLEAN DEFAULT false,
    notification_push BOOLEAN DEFAULT true,
    notification_email BOOLEAN DEFAULT true,

    -- Controle
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,

    CONSTRAINT fk_user_association FOREIGN KEY (association_id)
        REFERENCES associations(id) ON DELETE SET NULL,
    CONSTRAINT fk_user_district FOREIGN KEY (district_id)
        REFERENCES districts(id) ON DELETE SET NULL,
    CONSTRAINT fk_user_church FOREIGN KEY (church_id)
        REFERENCES churches(id) ON DELETE SET NULL,
    CONSTRAINT fk_user_approved_by FOREIGN KEY (approved_by)
        REFERENCES users(id) ON DELETE SET NULL
);

COMMENT ON TABLE users IS 'Usuários do sistema com múltiplos perfis possíveis';
COMMENT ON COLUMN users.roles IS 'Array de perfis de acesso do usuário';
COMMENT ON COLUMN users.approval_status IS 'Status de aprovação do cadastro';

-- ============================================================
-- TABELA: preacher_profiles (Perfil de Pregador)
-- ============================================================
CREATE TABLE preacher_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Informações do pregador
    ordination_type VARCHAR(50), -- Anciã, Pastor, Evangelista, etc
    ordination_date DATE,
    years_of_experience INTEGER,

    -- Score de pregador (0-5)
    score_average DECIMAL(3,2) DEFAULT 0.00 CHECK (score_average >= 0 AND score_average <= 5),
    score_evaluations DECIMAL(3,2) DEFAULT 0.00,
    score_attendance DECIMAL(3,2) DEFAULT 0.00,
    score_punctuality DECIMAL(3,2) DEFAULT 0.00,

    -- Estatísticas
    total_preachings INTEGER DEFAULT 0,
    completed_preachings INTEGER DEFAULT 0,
    missed_preachings INTEGER DEFAULT 0,
    refused_preachings INTEGER DEFAULT 0,

    -- Taxas (0-100%)
    attendance_rate DECIMAL(5,2) DEFAULT 100.00,
    punctuality_rate DECIMAL(5,2) DEFAULT 100.00,

    -- Preferências
    max_preachings_per_month INTEGER DEFAULT 4,
    preferred_service_times TEXT[], -- Array de horários preferidos

    -- Observações
    notes TEXT,

    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_preacher_user FOREIGN KEY (user_id)
        REFERENCES users(id) ON DELETE CASCADE
);

COMMENT ON TABLE preacher_profiles IS 'Perfil estendido para usuários pregadores';
COMMENT ON COLUMN preacher_profiles.score_average IS 'Score médio calculado: (avaliações*0.6 + frequência*0.25 + pontualidade*0.15)';

-- ============================================================
-- TABELA: worship_times (Horários de Culto)
-- ============================================================
CREATE TABLE worship_times (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    district_id UUID REFERENCES districts(id) ON DELETE CASCADE,
    church_id UUID REFERENCES churches(id) ON DELETE CASCADE,

    day_of_week day_of_week NOT NULL,
    time TIME NOT NULL,
    service_name VARCHAR(100), -- Ex: Escola Sabatina, Culto Divino, etc
    duration_minutes INTEGER DEFAULT 120,
    requires_preacher BOOLEAN DEFAULT true,

    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Um horário pode ser do distrito (aplicado a todas igrejas) ou de igreja específica
    CONSTRAINT chk_worship_time_scope CHECK (
        (district_id IS NOT NULL AND church_id IS NULL) OR
        (district_id IS NULL AND church_id IS NOT NULL)
    ),

    CONSTRAINT fk_worship_district FOREIGN KEY (district_id)
        REFERENCES districts(id) ON DELETE CASCADE,
    CONSTRAINT fk_worship_church FOREIGN KEY (church_id)
        REFERENCES churches(id) ON DELETE CASCADE
);

COMMENT ON TABLE worship_times IS 'Horários de cultos por distrito ou igreja específica';
COMMENT ON COLUMN worship_times.requires_preacher IS 'Indica se este horário requer um pregador escalado';

-- ============================================================
-- TABELA: themes (Temáticas de Pregação)
-- ============================================================
CREATE TABLE themes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    association_id UUID NOT NULL REFERENCES associations(id) ON DELETE CASCADE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,

    title VARCHAR(300) NOT NULL,
    description TEXT,
    bible_reference VARCHAR(200),

    -- Recorrência
    recurrence_type theme_recurrence NOT NULL,

    -- Para recorrência específica
    specific_date DATE,

    -- Para recorrência semanal
    weekly_day_of_week day_of_week,

    -- Para recorrência mensal
    monthly_week_number INTEGER CHECK (monthly_week_number BETWEEN 1 AND 5), -- 1º, 2º, 3º, 4º, 5º
    monthly_day_of_week day_of_week,

    -- Período de validade
    valid_from DATE,
    valid_until DATE,

    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_theme_association FOREIGN KEY (association_id)
        REFERENCES associations(id) ON DELETE CASCADE,
    CONSTRAINT fk_theme_created_by FOREIGN KEY (created_by)
        REFERENCES users(id) ON DELETE SET NULL,

    -- Validações de recorrência
    CONSTRAINT chk_theme_specific_date CHECK (
        recurrence_type != 'specific_date' OR specific_date IS NOT NULL
    ),
    CONSTRAINT chk_theme_weekly CHECK (
        recurrence_type != 'weekly' OR weekly_day_of_week IS NOT NULL
    ),
    CONSTRAINT chk_theme_monthly CHECK (
        recurrence_type != 'monthly' OR
        (monthly_week_number IS NOT NULL AND monthly_day_of_week IS NOT NULL)
    )
);

COMMENT ON TABLE themes IS 'Temáticas sugestivas de pregação cadastradas pela Associação';
COMMENT ON COLUMN themes.recurrence_type IS 'Tipo de recorrência: data específica, semanal ou mensal';
COMMENT ON COLUMN themes.monthly_week_number IS 'Número da semana do mês (1-5) para recorrência mensal';

-- ============================================================
-- TABELA: schedules (Escalas Mensais)
-- ============================================================
CREATE TABLE schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    district_id UUID NOT NULL REFERENCES districts(id) ON DELETE CASCADE,

    reference_month INTEGER NOT NULL CHECK (reference_month BETWEEN 1 AND 12),
    reference_year INTEGER NOT NULL CHECK (reference_year >= 2024),

    status schedule_status DEFAULT 'draft',

    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    finalized_by UUID REFERENCES users(id) ON DELETE SET NULL,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    approved_at TIMESTAMP WITH TIME ZONE,
    finalized_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    notes TEXT,

    CONSTRAINT fk_schedule_district FOREIGN KEY (district_id)
        REFERENCES districts(id) ON DELETE CASCADE,
    CONSTRAINT fk_schedule_created_by FOREIGN KEY (created_by)
        REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_schedule_approved_by FOREIGN KEY (approved_by)
        REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_schedule_finalized_by FOREIGN KEY (finalized_by)
        REFERENCES users(id) ON DELETE SET NULL,

    -- Uma escala por distrito por mês
    CONSTRAINT uk_schedule_district_month UNIQUE (district_id, reference_month, reference_year)
);

COMMENT ON TABLE schedules IS 'Escalas mensais de pregação por distrito';
COMMENT ON COLUMN schedules.status IS 'Status: draft (rascunho), approved (aprovado), finalized (finalizado)';

-- ============================================================
-- TABELA: preaching_schedules (Pregações Individuais)
-- ============================================================
CREATE TABLE preaching_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    schedule_id UUID NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
    church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
    preacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    theme_id UUID REFERENCES themes(id) ON DELETE SET NULL,

    preaching_date DATE NOT NULL,
    preaching_time TIME NOT NULL,
    service_name VARCHAR(100),

    status preaching_status DEFAULT 'scheduled',

    -- Resposta do pregador
    accepted_at TIMESTAMP WITH TIME ZONE,
    refused_at TIMESTAMP WITH TIME ZONE,
    refusal_reason TEXT,

    -- Confirmação de realização
    completed_at TIMESTAMP WITH TIME ZONE,
    completed_by UUID REFERENCES users(id) ON DELETE SET NULL,

    -- Observações
    notes TEXT,
    special_instructions TEXT,

    -- Controle de troca
    is_swapped BOOLEAN DEFAULT false,
    original_preacher_id UUID REFERENCES users(id) ON DELETE SET NULL,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_preaching_schedule FOREIGN KEY (schedule_id)
        REFERENCES schedules(id) ON DELETE CASCADE,
    CONSTRAINT fk_preaching_church FOREIGN KEY (church_id)
        REFERENCES churches(id) ON DELETE CASCADE,
    CONSTRAINT fk_preaching_preacher FOREIGN KEY (preacher_id)
        REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_preaching_theme FOREIGN KEY (theme_id)
        REFERENCES themes(id) ON DELETE SET NULL,
    CONSTRAINT fk_preaching_completed_by FOREIGN KEY (completed_by)
        REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_preaching_original_preacher FOREIGN KEY (original_preacher_id)
        REFERENCES users(id) ON DELETE SET NULL
);

COMMENT ON TABLE preaching_schedules IS 'Pregações individuais dentro de uma escala mensal';
COMMENT ON COLUMN preaching_schedules.is_swapped IS 'Indica se esta pregação foi resultado de uma troca';
COMMENT ON COLUMN preaching_schedules.original_preacher_id IS 'Pregador original antes da troca';

-- ============================================================
-- TABELA: schedule_swaps (Trocas de Escala)
-- ============================================================
CREATE TABLE schedule_swaps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Pregação do solicitante
    requester_preaching_id UUID NOT NULL REFERENCES preaching_schedules(id) ON DELETE CASCADE,
    requester_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Pregação do destinatário
    target_preaching_id UUID NOT NULL REFERENCES preaching_schedules(id) ON DELETE CASCADE,
    target_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    status swap_status DEFAULT 'pending_target',

    -- Justificativa
    requester_reason TEXT,

    -- Respostas
    requester_accepted_at TIMESTAMP WITH TIME ZONE,
    target_accepted_at TIMESTAMP WITH TIME ZONE,
    rejected_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    rejected_by UUID REFERENCES users(id) ON DELETE SET NULL,

    -- Finalização
    completed_at TIMESTAMP WITH TIME ZONE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_swap_requester_preaching FOREIGN KEY (requester_preaching_id)
        REFERENCES preaching_schedules(id) ON DELETE CASCADE,
    CONSTRAINT fk_swap_requester_user FOREIGN KEY (requester_user_id)
        REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_swap_target_preaching FOREIGN KEY (target_preaching_id)
        REFERENCES preaching_schedules(id) ON DELETE CASCADE,
    CONSTRAINT fk_swap_target_user FOREIGN KEY (target_user_id)
        REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_swap_rejected_by FOREIGN KEY (rejected_by)
        REFERENCES users(id) ON DELETE SET NULL
);

COMMENT ON TABLE schedule_swaps IS 'Solicitações de troca automática entre pregadores';
COMMENT ON COLUMN schedule_swaps.status IS 'Status da troca: pending_target, accepted, rejected, cancelled';

-- ============================================================
-- TABELA: unavailability_periods (Períodos de Indisponibilidade)
-- ============================================================
CREATE TABLE unavailability_periods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    preacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    start_date DATE NOT NULL,
    end_date DATE NOT NULL,

    reason TEXT,

    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_unavailability_preacher FOREIGN KEY (preacher_id)
        REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT chk_unavailability_dates CHECK (end_date >= start_date)
);

COMMENT ON TABLE unavailability_periods IS 'Períodos de indisponibilidade dos pregadores';

-- ============================================================
-- TABELA: evaluations (Avaliações de Pregadores)
-- ============================================================
CREATE TABLE evaluations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    preaching_schedule_id UUID NOT NULL REFERENCES preaching_schedules(id) ON DELETE CASCADE,
    preacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    evaluator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Avaliação (0-5 estrelas)
    rating DECIMAL(2,1) NOT NULL CHECK (rating >= 0 AND rating <= 5),

    -- Critérios individuais (opcional)
    content_quality DECIMAL(2,1) CHECK (content_quality >= 0 AND content_quality <= 5),
    presentation DECIMAL(2,1) CHECK (presentation >= 0 AND presentation <= 5),
    biblical_foundation DECIMAL(2,1) CHECK (biblical_foundation >= 0 AND biblical_foundation <= 5),
    engagement DECIMAL(2,1) CHECK (engagement >= 0 AND engagement <= 5),

    -- Comentários
    comments TEXT,

    is_anonymous BOOLEAN DEFAULT false,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_evaluation_preaching FOREIGN KEY (preaching_schedule_id)
        REFERENCES preaching_schedules(id) ON DELETE CASCADE,
    CONSTRAINT fk_evaluation_preacher FOREIGN KEY (preacher_id)
        REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_evaluation_evaluator FOREIGN KEY (evaluator_id)
        REFERENCES users(id) ON DELETE CASCADE,

    -- Um avaliador não pode avaliar a mesma pregação duas vezes
    CONSTRAINT uk_evaluation_preaching_evaluator UNIQUE (preaching_schedule_id, evaluator_id)
);

COMMENT ON TABLE evaluations IS 'Avaliações de pregadores pelos membros';
COMMENT ON COLUMN evaluations.rating IS 'Nota geral de 0 a 5 estrelas';

-- ============================================================
-- TABELA: notifications (Notificações)
-- ============================================================
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    type notification_type NOT NULL,
    status notification_status DEFAULT 'pending',

    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,

    -- Dados específicos por tipo
    whatsapp_message_id VARCHAR(100),
    sms_message_id VARCHAR(100),
    push_message_id VARCHAR(100),
    email_message_id VARCHAR(100),

    -- Relacionamentos
    preaching_schedule_id UUID REFERENCES preaching_schedules(id) ON DELETE SET NULL,
    schedule_swap_id UUID REFERENCES schedule_swaps(id) ON DELETE SET NULL,

    -- Controle de envio
    scheduled_for TIMESTAMP WITH TIME ZONE,
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    read_at TIMESTAMP WITH TIME ZONE,
    failed_at TIMESTAMP WITH TIME ZONE,
    failure_reason TEXT,

    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_notification_user FOREIGN KEY (user_id)
        REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_notification_preaching FOREIGN KEY (preaching_schedule_id)
        REFERENCES preaching_schedules(id) ON DELETE SET NULL,
    CONSTRAINT fk_notification_swap FOREIGN KEY (schedule_swap_id)
        REFERENCES schedule_swaps(id) ON DELETE SET NULL
);

COMMENT ON TABLE notifications IS 'Sistema de notificações WhatsApp/SMS/Push/Email';
COMMENT ON COLUMN notifications.scheduled_for IS 'Data/hora agendada para envio (para lembretes)';

-- ============================================================
-- TABELA: settings (Configurações)
-- ============================================================
CREATE TABLE settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Escopo da configuração
    association_id UUID REFERENCES associations(id) ON DELETE CASCADE,
    district_id UUID REFERENCES districts(id) ON DELETE CASCADE,
    church_id UUID REFERENCES churches(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,

    setting_key VARCHAR(100) NOT NULL,
    setting_value JSONB NOT NULL,

    description TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Uma configuração por escopo e chave
    CONSTRAINT uk_setting_scope_key UNIQUE NULLS NOT DISTINCT (
        association_id, district_id, church_id, user_id, setting_key
    ),

    CONSTRAINT fk_setting_association FOREIGN KEY (association_id)
        REFERENCES associations(id) ON DELETE CASCADE,
    CONSTRAINT fk_setting_district FOREIGN KEY (district_id)
        REFERENCES districts(id) ON DELETE CASCADE,
    CONSTRAINT fk_setting_church FOREIGN KEY (church_id)
        REFERENCES churches(id) ON DELETE CASCADE,
    CONSTRAINT fk_setting_user FOREIGN KEY (user_id)
        REFERENCES users(id) ON DELETE CASCADE
);

COMMENT ON TABLE settings IS 'Configurações flexíveis por associação/distrito/igreja/usuário';
COMMENT ON COLUMN settings.setting_value IS 'Valor em formato JSON para flexibilidade';

-- ============================================================
-- TABELA: audit_logs (Logs de Auditoria)
-- ============================================================
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,

    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID,

    old_values JSONB,
    new_values JSONB,

    ip_address INET,
    user_agent TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_audit_user FOREIGN KEY (user_id)
        REFERENCES users(id) ON DELETE SET NULL
);

COMMENT ON TABLE audit_logs IS 'Logs de auditoria de todas as ações importantes';

-- ============================================================
-- TABELA: import_logs (Logs de Importação)
-- ============================================================
CREATE TABLE import_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,

    import_type VARCHAR(50) NOT NULL, -- members, districts, themes, etc
    file_name VARCHAR(255),
    file_size INTEGER,

    total_rows INTEGER,
    successful_rows INTEGER,
    failed_rows INTEGER,

    errors JSONB,

    status VARCHAR(50) DEFAULT 'processing',

    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,

    CONSTRAINT fk_import_user FOREIGN KEY (user_id)
        REFERENCES users(id) ON DELETE SET NULL
);

COMMENT ON TABLE import_logs IS 'Logs de importações via Excel/CSV';

-- ============================================================
-- ÍNDICES PARA PERFORMANCE
-- ============================================================

-- Users
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_cpf ON users(cpf);
CREATE INDEX idx_users_district_id ON users(district_id);
CREATE INDEX idx_users_church_id ON users(church_id);
CREATE INDEX idx_users_association_id ON users(association_id);
CREATE INDEX idx_users_roles ON users USING GIN(roles);
CREATE INDEX idx_users_approval_status ON users(approval_status);
CREATE INDEX idx_users_active ON users(is_active) WHERE is_active = true;

-- Preacher Profiles
CREATE INDEX idx_preacher_user_id ON preacher_profiles(user_id);
CREATE INDEX idx_preacher_score ON preacher_profiles(score_average DESC);
CREATE INDEX idx_preacher_active ON preacher_profiles(is_active) WHERE is_active = true;

-- Churches
CREATE INDEX idx_churches_district_id ON churches(district_id);
CREATE INDEX idx_churches_active ON churches(is_active) WHERE is_active = true;

-- Districts
CREATE INDEX idx_districts_association_id ON districts(association_id);
CREATE INDEX idx_districts_active ON districts(is_active) WHERE is_active = true;

-- Schedules
CREATE INDEX idx_schedules_district_id ON schedules(district_id);
CREATE INDEX idx_schedules_reference ON schedules(reference_year DESC, reference_month DESC);
CREATE INDEX idx_schedules_status ON schedules(status);

-- Preaching Schedules
CREATE INDEX idx_preaching_schedule_id ON preaching_schedules(schedule_id);
CREATE INDEX idx_preaching_church_id ON preaching_schedules(church_id);
CREATE INDEX idx_preaching_preacher_id ON preaching_schedules(preacher_id);
CREATE INDEX idx_preaching_date ON preaching_schedules(preaching_date);
CREATE INDEX idx_preaching_status ON preaching_schedules(status);
CREATE INDEX idx_preaching_date_preacher ON preaching_schedules(preaching_date, preacher_id);

-- Themes
CREATE INDEX idx_themes_association_id ON themes(association_id);
CREATE INDEX idx_themes_recurrence ON themes(recurrence_type);
CREATE INDEX idx_themes_active ON themes(is_active) WHERE is_active = true;
CREATE INDEX idx_themes_specific_date ON themes(specific_date) WHERE specific_date IS NOT NULL;

-- Evaluations
CREATE INDEX idx_evaluations_preacher_id ON evaluations(preacher_id);
CREATE INDEX idx_evaluations_preaching_id ON evaluations(preaching_schedule_id);
CREATE INDEX idx_evaluations_rating ON evaluations(rating);

-- Notifications
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_notifications_scheduled ON notifications(scheduled_for) WHERE scheduled_for IS NOT NULL;
CREATE INDEX idx_notifications_type ON notifications(type);

-- Unavailability Periods
CREATE INDEX idx_unavailability_preacher_id ON unavailability_periods(preacher_id);
CREATE INDEX idx_unavailability_dates ON unavailability_periods(start_date, end_date);
CREATE INDEX idx_unavailability_active ON unavailability_periods(is_active) WHERE is_active = true;

-- Schedule Swaps
CREATE INDEX idx_swaps_requester_user ON schedule_swaps(requester_user_id);
CREATE INDEX idx_swaps_target_user ON schedule_swaps(target_user_id);
CREATE INDEX idx_swaps_status ON schedule_swaps(status);

-- Audit Logs
CREATE INDEX idx_audit_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_created_at ON audit_logs(created_at DESC);

-- Worship Times
CREATE INDEX idx_worship_district_id ON worship_times(district_id);
CREATE INDEX idx_worship_church_id ON worship_times(church_id);
CREATE INDEX idx_worship_day ON worship_times(day_of_week);

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger em todas as tabelas relevantes
CREATE TRIGGER update_associations_updated_at BEFORE UPDATE ON associations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_districts_updated_at BEFORE UPDATE ON districts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_churches_updated_at BEFORE UPDATE ON churches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_preacher_profiles_updated_at BEFORE UPDATE ON preacher_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_schedules_updated_at BEFORE UPDATE ON schedules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_preaching_schedules_updated_at BEFORE UPDATE ON preaching_schedules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_themes_updated_at BEFORE UPDATE ON themes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_evaluations_updated_at BEFORE UPDATE ON evaluations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notifications_updated_at BEFORE UPDATE ON notifications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- FUNÇÃO: Calcular Score do Pregador
-- ============================================================
CREATE OR REPLACE FUNCTION calculate_preacher_score(p_preacher_id UUID)
RETURNS DECIMAL(3,2) AS $$
DECLARE
    v_avg_rating DECIMAL(3,2);
    v_attendance_rate DECIMAL(5,2);
    v_punctuality_rate DECIMAL(5,2);
    v_final_score DECIMAL(3,2);
BEGIN
    -- Buscar dados do pregador
    SELECT
        COALESCE(AVG(e.rating), 0),
        COALESCE(pp.attendance_rate, 100),
        COALESCE(pp.punctuality_rate, 100)
    INTO v_avg_rating, v_attendance_rate, v_punctuality_rate
    FROM preacher_profiles pp
    LEFT JOIN evaluations e ON e.preacher_id = pp.user_id
    WHERE pp.user_id = p_preacher_id
    GROUP BY pp.attendance_rate, pp.punctuality_rate;

    -- Calcular score final
    -- SCORE = (Média_Avaliações × 0.6) + (Taxa_Frequência × 0.25) + (Taxa_Pontualidade × 0.15)
    v_final_score := (v_avg_rating * 0.6) +
                     ((v_attendance_rate / 100 * 5) * 0.25) +
                     ((v_punctuality_rate / 100 * 5) * 0.15);

    -- Atualizar perfil do pregador
    UPDATE preacher_profiles
    SET score_average = v_final_score,
        score_evaluations = v_avg_rating,
        score_attendance = (v_attendance_rate / 100 * 5),
        score_punctuality = (v_punctuality_rate / 100 * 5)
    WHERE user_id = p_preacher_id;

    RETURN v_final_score;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_preacher_score IS 'Calcula e atualiza o score de um pregador';

-- ============================================================
-- FUNÇÃO: Atualizar Estatísticas do Pregador
-- ============================================================
CREATE OR REPLACE FUNCTION update_preacher_statistics(p_preacher_id UUID)
RETURNS VOID AS $$
DECLARE
    v_total INTEGER;
    v_completed INTEGER;
    v_missed INTEGER;
    v_refused INTEGER;
    v_attendance_rate DECIMAL(5,2);
BEGIN
    -- Contar pregações
    SELECT
        COUNT(*),
        COUNT(*) FILTER (WHERE status = 'completed'),
        COUNT(*) FILTER (WHERE status = 'missed'),
        COUNT(*) FILTER (WHERE status = 'refused')
    INTO v_total, v_completed, v_missed, v_refused
    FROM preaching_schedules
    WHERE preacher_id = p_preacher_id;

    -- Calcular taxa de frequência
    IF v_total > 0 THEN
        v_attendance_rate := (v_completed::DECIMAL / v_total::DECIMAL) * 100;
    ELSE
        v_attendance_rate := 100;
    END IF;

    -- Atualizar perfil
    UPDATE preacher_profiles
    SET total_preachings = v_total,
        completed_preachings = v_completed,
        missed_preachings = v_missed,
        refused_preachings = v_refused,
        attendance_rate = v_attendance_rate
    WHERE user_id = p_preacher_id;

    -- Recalcular score
    PERFORM calculate_preacher_score(p_preacher_id);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_preacher_statistics IS 'Atualiza estatísticas e recalcula score do pregador';

-- ============================================================
-- TRIGGER: Atualizar Score Quando Recusar Pregação
-- ============================================================
CREATE OR REPLACE FUNCTION handle_preaching_refusal()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'refused' AND OLD.status != 'refused' THEN
        -- Reduzir score em 15%
        UPDATE preacher_profiles
        SET score_average = score_average - (score_average * 0.15)
        WHERE user_id = NEW.preacher_id;

        -- Atualizar estatísticas
        PERFORM update_preacher_statistics(NEW.preacher_id);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_preaching_refusal
    AFTER UPDATE ON preaching_schedules
    FOR EACH ROW
    WHEN (NEW.status = 'refused')
    EXECUTE FUNCTION handle_preaching_refusal();

-- ============================================================
-- TRIGGER: Recalcular Score Após Avaliação
-- ============================================================
CREATE OR REPLACE FUNCTION handle_evaluation_change()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM calculate_preacher_score(NEW.preacher_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_evaluation_insert
    AFTER INSERT ON evaluations
    FOR EACH ROW
    EXECUTE FUNCTION handle_evaluation_change();

CREATE TRIGGER trigger_evaluation_update
    AFTER UPDATE ON evaluations
    FOR EACH ROW
    EXECUTE FUNCTION handle_evaluation_change();

-- ============================================================
-- VIEWS ÚTEIS
-- ============================================================

-- View: Pregadores com Score e Estatísticas
CREATE OR REPLACE VIEW vw_preachers_full AS
SELECT
    u.id,
    u.full_name,
    u.email,
    u.phone,
    u.whatsapp,
    u.church_id,
    c.name as church_name,
    u.district_id,
    d.name as district_name,
    pp.score_average,
    pp.score_evaluations,
    pp.score_attendance,
    pp.score_punctuality,
    pp.total_preachings,
    pp.completed_preachings,
    pp.missed_preachings,
    pp.refused_preachings,
    pp.attendance_rate,
    pp.punctuality_rate,
    pp.ordination_type,
    pp.max_preachings_per_month,
    u.is_active
FROM users u
INNER JOIN preacher_profiles pp ON pp.user_id = u.id
LEFT JOIN churches c ON c.id = u.church_id
LEFT JOIN districts d ON d.id = u.district_id
WHERE 'preacher' = ANY(u.roles);

COMMENT ON VIEW vw_preachers_full IS 'View completa de pregadores com scores e estatísticas';

-- View: Pregações Futuras
CREATE OR REPLACE VIEW vw_upcoming_preachings AS
SELECT
    ps.id,
    ps.preaching_date,
    ps.preaching_time,
    ps.service_name,
    ps.status,
    u.full_name as preacher_name,
    u.phone as preacher_phone,
    u.whatsapp as preacher_whatsapp,
    c.name as church_name,
    d.name as district_name,
    t.title as theme_title,
    t.description as theme_description
FROM preaching_schedules ps
INNER JOIN users u ON u.id = ps.preacher_id
INNER JOIN churches c ON c.id = ps.church_id
INNER JOIN districts d ON d.id = c.district_id
LEFT JOIN themes t ON t.id = ps.theme_id
WHERE ps.preaching_date >= CURRENT_DATE
ORDER BY ps.preaching_date, ps.preaching_time;

COMMENT ON VIEW vw_upcoming_preachings IS 'Pregações futuras com informações completas';

-- ============================================================
-- DADOS INICIAIS (SEEDS)
-- ============================================================

-- Inserir Associação Padrão
INSERT INTO associations (id, name, acronym, country, is_active)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Associação Exemplo',
    'AE',
    'Brasil',
    true
);

-- ============================================================
-- FIM DO SCHEMA
-- ============================================================
