-- ============================================================
-- EXEMPLOS DE QUERIES SQL
-- Sistema de Gestão de Escalas de Pregação - IASD
-- ============================================================

-- ============================================================
-- 1. BUSCAR PREGADORES POR SCORE (para geração de escala)
-- ============================================================

-- Buscar pregadores de um distrito ordenados por score (DESC)
SELECT
    u.id,
    u.full_name,
    u.email,
    u.phone,
    u.whatsapp,
    pp.score_average,
    pp.total_preachings,
    pp.completed_preachings,
    pp.attendance_rate,
    pp.max_preachings_per_month,
    c.name as church_name
FROM users u
INNER JOIN preacher_profiles pp ON pp.user_id = u.id
LEFT JOIN churches c ON c.id = u.church_id
WHERE u.district_id = 'DISTRICT_UUID_HERE'
    AND 'preacher' = ANY(u.roles)
    AND u.is_active = true
    AND pp.is_active = true
    AND u.approval_status = 'approved'
ORDER BY pp.score_average DESC;

-- ============================================================
-- 2. VALIDAR DISPONIBILIDADE DE PREGADOR
-- ============================================================

-- Verificar se pregador está disponível em uma data
SELECT EXISTS (
    -- Verificar indisponibilidade
    SELECT 1 FROM unavailability_periods
    WHERE preacher_id = 'PREACHER_UUID_HERE'
        AND '2025-12-15'::DATE BETWEEN start_date AND end_date
        AND is_active = true
) OR EXISTS (
    -- Verificar conflito de escala (já escalado na mesma data)
    SELECT 1 FROM preaching_schedules
    WHERE preacher_id = 'PREACHER_UUID_HERE'
        AND preaching_date = '2025-12-15'::DATE
        AND status NOT IN ('refused', 'missed')
) as is_unavailable;

-- ============================================================
-- 3. CONTAR PREGAÇÕES DO MÊS POR PREGADOR
-- ============================================================

-- Contar pregações agendadas no mês para validar limite
SELECT COUNT(*)
FROM preaching_schedules ps
INNER JOIN schedules s ON s.id = ps.schedule_id
WHERE ps.preacher_id = 'PREACHER_UUID_HERE'
    AND s.reference_month = 12
    AND s.reference_year = 2025
    AND ps.status NOT IN ('refused', 'missed');

-- ============================================================
-- 4. BUSCAR TEMA SUGESTIVO PARA UMA DATA
-- ============================================================

-- Buscar tema para data específica
SELECT id, title, description, bible_reference
FROM themes
WHERE association_id = 'ASSOCIATION_UUID_HERE'
    AND is_active = true
    AND (
        -- Data específica
        (recurrence_type = 'specific_date' AND specific_date = '2025-12-15') OR

        -- Recorrência semanal (ex: todo sábado)
        (recurrence_type = 'weekly' AND weekly_day_of_week = 'saturday') OR

        -- Recorrência mensal (ex: todo 1º sábado)
        (recurrence_type = 'monthly'
            AND monthly_day_of_week = 'saturday'
            AND EXTRACT(DOW FROM '2025-12-15'::DATE) = 6  -- sábado
            AND CEIL(EXTRACT(DAY FROM '2025-12-15'::DATE) / 7.0)::INT = monthly_week_number)
    )
    AND (valid_from IS NULL OR '2025-12-15' >= valid_from)
    AND (valid_until IS NULL OR '2025-12-15' <= valid_until)
LIMIT 1;

-- ============================================================
-- 5. CRIAR ESCALA MENSAL
-- ============================================================

-- Inserir escala (uma por distrito por mês)
INSERT INTO schedules (
    district_id,
    reference_month,
    reference_year,
    status,
    created_by
) VALUES (
    'DISTRICT_UUID_HERE',
    12,
    2025,
    'draft',
    'USER_UUID_HERE'
) RETURNING id;

-- ============================================================
-- 6. CRIAR PREGAÇÃO NA ESCALA
-- ============================================================

-- Inserir pregação individual
INSERT INTO preaching_schedules (
    schedule_id,
    church_id,
    preacher_id,
    theme_id,
    preaching_date,
    preaching_time,
    service_name,
    status
) VALUES (
    'SCHEDULE_UUID_HERE',
    'CHURCH_UUID_HERE',
    'PREACHER_UUID_HERE',
    'THEME_UUID_HERE',
    '2025-12-15',
    '09:30:00',
    'Culto Divino',
    'scheduled'
);

-- ============================================================
-- 7. FINALIZAR ESCALA E ENVIAR NOTIFICAÇÕES
-- ============================================================

-- Atualizar escala para finalizada
UPDATE schedules
SET status = 'finalized',
    finalized_by = 'USER_UUID_HERE',
    finalized_at = CURRENT_TIMESTAMP
WHERE id = 'SCHEDULE_UUID_HERE';

-- Buscar pregações da escala para enviar notificações
SELECT
    ps.id as preaching_id,
    ps.preaching_date,
    ps.preaching_time,
    ps.service_name,
    u.id as preacher_id,
    u.full_name as preacher_name,
    u.whatsapp,
    u.phone,
    u.notification_whatsapp,
    u.notification_sms,
    u.notification_push,
    c.name as church_name,
    t.title as theme_title,
    t.description as theme_description
FROM preaching_schedules ps
INNER JOIN users u ON u.id = ps.preacher_id
INNER JOIN churches c ON c.id = ps.church_id
LEFT JOIN themes t ON t.id = ps.theme_id
WHERE ps.schedule_id = 'SCHEDULE_UUID_HERE'
    AND ps.status = 'scheduled';

-- ============================================================
-- 8. CRIAR NOTIFICAÇÃO
-- ============================================================

-- Inserir notificação para pregador
INSERT INTO notifications (
    user_id,
    type,
    status,
    title,
    message,
    preaching_schedule_id,
    scheduled_for
) VALUES (
    'USER_UUID_HERE',
    'whatsapp',
    'pending',
    'Nova Pregação Agendada',
    'Você foi escalado para pregar na Igreja Central no dia 15/12/2025 às 09:30. Tema sugestivo: "A Graça de Deus"',
    'PREACHING_SCHEDULE_UUID_HERE',
    CURRENT_TIMESTAMP
);

-- ============================================================
-- 9. PREGADOR ACEITA/RECUSA PREGAÇÃO
-- ============================================================

-- Aceitar pregação
UPDATE preaching_schedules
SET status = 'accepted',
    accepted_at = CURRENT_TIMESTAMP
WHERE id = 'PREACHING_SCHEDULE_UUID_HERE';

-- Recusar pregação (trigger irá reduzir score em 15%)
UPDATE preaching_schedules
SET status = 'refused',
    refused_at = CURRENT_TIMESTAMP,
    refusal_reason = 'Viagem marcada'
WHERE id = 'PREACHING_SCHEDULE_UUID_HERE';

-- ============================================================
-- 10. SOLICITAR TROCA DE PREGAÇÃO
-- ============================================================

-- Inserir solicitação de troca
INSERT INTO schedule_swaps (
    requester_preaching_id,
    requester_user_id,
    target_preaching_id,
    target_user_id,
    status,
    requester_reason
) VALUES (
    'PREACHING_UUID_1',  -- Pregação do solicitante
    'USER_UUID_1',       -- Solicitante
    'PREACHING_UUID_2',  -- Pregação do destinatário
    'USER_UUID_2',       -- Destinatário
    'pending_target',
    'Não poderei comparecer nesta data'
);

-- ============================================================
-- 11. ACEITAR TROCA DE PREGAÇÃO
-- ============================================================

-- Atualizar status da troca
UPDATE schedule_swaps
SET status = 'accepted',
    target_accepted_at = CURRENT_TIMESTAMP,
    completed_at = CURRENT_TIMESTAMP
WHERE id = 'SWAP_UUID_HERE';

-- Executar troca (swap de pregadores)
WITH swap_data AS (
    SELECT
        requester_preaching_id,
        target_preaching_id,
        requester_user_id,
        target_user_id
    FROM schedule_swaps
    WHERE id = 'SWAP_UUID_HERE'
)
-- Atualizar pregação do solicitante
UPDATE preaching_schedules
SET preacher_id = (SELECT target_user_id FROM swap_data),
    is_swapped = true,
    original_preacher_id = (SELECT requester_user_id FROM swap_data)
WHERE id = (SELECT requester_preaching_id FROM swap_data)

UNION ALL

-- Atualizar pregação do destinatário
UPDATE preaching_schedules
SET preacher_id = (SELECT requester_user_id FROM swap_data),
    is_swapped = true,
    original_preacher_id = (SELECT target_user_id FROM swap_data)
WHERE id = (SELECT target_preaching_id FROM swap_data);

-- ============================================================
-- 12. AVALIAR PREGAÇÃO
-- ============================================================

-- Inserir avaliação (trigger recalcula score automaticamente)
INSERT INTO evaluations (
    preaching_schedule_id,
    preacher_id,
    evaluator_id,
    rating,
    content_quality,
    presentation,
    biblical_foundation,
    engagement,
    comments,
    is_anonymous
) VALUES (
    'PREACHING_SCHEDULE_UUID_HERE',
    'PREACHER_UUID_HERE',
    'EVALUATOR_UUID_HERE',
    4.5,
    5.0,
    4.0,
    5.0,
    4.0,
    'Excelente pregação, muito edificante!',
    false
);

-- ============================================================
-- 13. CALCULAR SCORE MANUALMENTE (teste)
-- ============================================================

-- Calcular score de um pregador
SELECT calculate_preacher_score('PREACHER_UUID_HERE');

-- Verificar score calculado
SELECT
    score_average,
    score_evaluations,
    score_attendance,
    score_punctuality,
    total_preachings,
    completed_preachings,
    attendance_rate,
    punctuality_rate
FROM preacher_profiles
WHERE user_id = 'PREACHER_UUID_HERE';

-- ============================================================
-- 14. BUSCAR PREGAÇÕES FUTURAS (Dashboard)
-- ============================================================

-- Pregações futuras de um pregador
SELECT
    ps.preaching_date,
    ps.preaching_time,
    ps.service_name,
    ps.status,
    c.name as church_name,
    d.name as district_name,
    t.title as theme_title
FROM preaching_schedules ps
INNER JOIN churches c ON c.id = ps.church_id
INNER JOIN districts d ON d.id = c.district_id
LEFT JOIN themes t ON t.id = ps.theme_id
WHERE ps.preacher_id = 'PREACHER_UUID_HERE'
    AND ps.preaching_date >= CURRENT_DATE
ORDER BY ps.preaching_date, ps.preaching_time;

-- ============================================================
-- 15. RELATÓRIO: PREGAÇÕES POR DISTRITO NO MÊS
-- ============================================================

SELECT
    c.name as church_name,
    ps.preaching_date,
    ps.preaching_time,
    u.full_name as preacher_name,
    ps.status,
    t.title as theme_title
FROM preaching_schedules ps
INNER JOIN schedules s ON s.id = ps.schedule_id
INNER JOIN churches c ON c.id = ps.church_id
INNER JOIN users u ON u.id = ps.preacher_id
LEFT JOIN themes t ON t.id = ps.theme_id
WHERE s.district_id = 'DISTRICT_UUID_HERE'
    AND s.reference_month = 12
    AND s.reference_year = 2025
ORDER BY ps.preaching_date, c.name;

-- ============================================================
-- 16. RELATÓRIO: TOP 10 PREGADORES POR SCORE
-- ============================================================

SELECT
    u.full_name,
    c.name as church_name,
    pp.score_average,
    pp.total_preachings,
    pp.completed_preachings,
    pp.attendance_rate,
    pp.punctuality_rate
FROM preacher_profiles pp
INNER JOIN users u ON u.id = pp.user_id
LEFT JOIN churches c ON c.id = u.church_id
WHERE u.district_id = 'DISTRICT_UUID_HERE'
    AND u.is_active = true
    AND pp.is_active = true
ORDER BY pp.score_average DESC
LIMIT 10;

-- ============================================================
-- 17. RELATÓRIO: AVALIAÇÕES DE UM PREGADOR
-- ============================================================

SELECT
    e.rating,
    e.content_quality,
    e.presentation,
    e.biblical_foundation,
    e.engagement,
    e.comments,
    e.created_at,
    ps.preaching_date,
    c.name as church_name,
    CASE WHEN e.is_anonymous THEN 'Anônimo' ELSE u_eval.full_name END as evaluator_name
FROM evaluations e
INNER JOIN preaching_schedules ps ON ps.id = e.preaching_schedule_id
INNER JOIN churches c ON c.id = ps.church_id
LEFT JOIN users u_eval ON u_eval.id = e.evaluator_id
WHERE e.preacher_id = 'PREACHER_UUID_HERE'
ORDER BY e.created_at DESC;

-- ============================================================
-- 18. BUSCAR HORÁRIOS DE CULTO DE UMA IGREJA
-- ============================================================

-- Buscar horários específicos da igreja
SELECT
    day_of_week,
    time,
    service_name,
    duration_minutes,
    requires_preacher
FROM worship_times
WHERE church_id = 'CHURCH_UUID_HERE'
    AND is_active = true

UNION

-- Buscar horários padrão do distrito (se não tiver específico)
SELECT
    day_of_week,
    time,
    service_name,
    duration_minutes,
    requires_preacher
FROM worship_times wt
INNER JOIN churches c ON c.district_id = wt.district_id
WHERE c.id = 'CHURCH_UUID_HERE'
    AND wt.is_active = true
    AND NOT EXISTS (
        -- Só usa horário do distrito se não tiver específico da igreja
        SELECT 1 FROM worship_times
        WHERE church_id = 'CHURCH_UUID_HERE'
            AND day_of_week = wt.day_of_week
    )
ORDER BY day_of_week, time;

-- ============================================================
-- 19. REGISTRAR INDISPONIBILIDADE
-- ============================================================

-- Inserir período de indisponibilidade
INSERT INTO unavailability_periods (
    preacher_id,
    start_date,
    end_date,
    reason
) VALUES (
    'PREACHER_UUID_HERE',
    '2025-12-20',
    '2025-12-27',
    'Férias'
);

-- ============================================================
-- 20. AUDITORIA: REGISTRAR AÇÃO
-- ============================================================

-- Inserir log de auditoria
INSERT INTO audit_logs (
    user_id,
    action,
    entity_type,
    entity_id,
    old_values,
    new_values,
    ip_address,
    user_agent
) VALUES (
    'USER_UUID_HERE',
    'UPDATE',
    'preaching_schedules',
    'PREACHING_UUID_HERE',
    '{"status": "scheduled"}'::jsonb,
    '{"status": "accepted"}'::jsonb,
    '192.168.1.1',
    'Mozilla/5.0...'
);

-- ============================================================
-- 21. ESTATÍSTICAS: DASHBOARD DA ASSOCIAÇÃO
-- ============================================================

-- Resumo geral da associação
SELECT
    COUNT(DISTINCT d.id) as total_districts,
    COUNT(DISTINCT c.id) as total_churches,
    COUNT(DISTINCT CASE WHEN 'preacher' = ANY(u.roles) THEN u.id END) as total_preachers,
    COUNT(DISTINCT ps.id) as total_preachings_this_month,
    AVG(pp.score_average) as avg_score
FROM associations a
LEFT JOIN districts d ON d.association_id = a.id AND d.is_active = true
LEFT JOIN churches c ON c.district_id = d.id AND c.is_active = true
LEFT JOIN users u ON u.district_id = d.id AND u.is_active = true
LEFT JOIN preacher_profiles pp ON pp.user_id = u.id AND pp.is_active = true
LEFT JOIN preaching_schedules ps ON ps.preacher_id = u.id
    AND ps.preaching_date >= date_trunc('month', CURRENT_DATE)
    AND ps.preaching_date < date_trunc('month', CURRENT_DATE) + INTERVAL '1 month'
WHERE a.id = 'ASSOCIATION_UUID_HERE';

-- ============================================================
-- 22. NOTIFICAÇÕES PENDENTES PARA ENVIO
-- ============================================================

-- Buscar notificações que devem ser enviadas
SELECT
    n.id,
    n.user_id,
    n.type,
    n.title,
    n.message,
    u.whatsapp,
    u.phone,
    u.email
FROM notifications n
INNER JOIN users u ON u.id = n.user_id
WHERE n.status = 'pending'
    AND (n.scheduled_for IS NULL OR n.scheduled_for <= CURRENT_TIMESTAMP)
    AND n.retry_count < n.max_retries
ORDER BY n.scheduled_for NULLS FIRST, n.created_at
LIMIT 100;

-- ============================================================
-- 23. LEMBRETES AUTOMÁTICOS (7 dias, 3 dias, 24h antes)
-- ============================================================

-- Buscar pregações que precisam de lembretes
SELECT
    ps.id as preaching_id,
    ps.preaching_date,
    ps.preaching_time,
    u.id as user_id,
    u.full_name,
    u.whatsapp,
    c.name as church_name,
    t.title as theme_title,
    EXTRACT(EPOCH FROM (ps.preaching_date + ps.preaching_time - CURRENT_TIMESTAMP)) / 86400 as days_until
FROM preaching_schedules ps
INNER JOIN users u ON u.id = ps.preacher_id
INNER JOIN churches c ON c.id = ps.church_id
LEFT JOIN themes t ON t.id = ps.theme_id
WHERE ps.status IN ('scheduled', 'accepted')
    AND ps.preaching_date + ps.preaching_time > CURRENT_TIMESTAMP
    AND (
        -- 7 dias antes
        ps.preaching_date = CURRENT_DATE + INTERVAL '7 days' OR
        -- 3 dias antes
        ps.preaching_date = CURRENT_DATE + INTERVAL '3 days' OR
        -- 24 horas antes
        ps.preaching_date + ps.preaching_time <= CURRENT_TIMESTAMP + INTERVAL '24 hours'
    )
    AND NOT EXISTS (
        -- Verificar se já foi enviado lembrete
        SELECT 1 FROM notifications
        WHERE preaching_schedule_id = ps.id
            AND status IN ('sent', 'delivered')
            AND created_at > CURRENT_TIMESTAMP - INTERVAL '12 hours'
    );

-- ============================================================
-- 24. EXPORTAR ESCALA PARA PDF (dados)
-- ============================================================

-- Buscar dados completos de uma escala para geração de PDF
SELECT
    d.name as district_name,
    s.reference_month,
    s.reference_year,
    json_agg(
        json_build_object(
            'church_name', c.name,
            'preaching_date', ps.preaching_date,
            'preaching_time', ps.preaching_time,
            'service_name', ps.service_name,
            'preacher_name', u.full_name,
            'preacher_phone', u.phone,
            'theme_title', t.title,
            'theme_description', t.description
        ) ORDER BY ps.preaching_date, c.name
    ) as preachings
FROM schedules s
INNER JOIN districts d ON d.id = s.district_id
INNER JOIN preaching_schedules ps ON ps.schedule_id = s.id
INNER JOIN churches c ON c.id = ps.church_id
INNER JOIN users u ON u.id = ps.preacher_id
LEFT JOIN themes t ON t.id = ps.theme_id
WHERE s.id = 'SCHEDULE_UUID_HERE'
GROUP BY d.name, s.reference_month, s.reference_year;

-- ============================================================
-- FIM DOS EXEMPLOS
-- ============================================================
