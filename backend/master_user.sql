-- ============================================================
-- CRIAR PRIMEIRO USUÁRIO MASTER DO SISTEMA APOSTELLO
-- ============================================================
--
-- CREDENCIAIS DE ACESSO:
-- Email: admin@apostello.com
-- Senha: Admin@123
--
-- IMPORTANTE: Altere a senha após o primeiro login!
-- ============================================================

-- Gerar UUID para o usuário (PostgreSQL irá gerar automaticamente)
-- O hash abaixo foi gerado com bcrypt para a senha: Admin@123

INSERT INTO usuarios (
    id,
    email,
    senha_hash,
    nome_completo,
    cpf,
    perfis,
    status_aprovacao,
    ativo,
    data_criacao,
    data_atualizacao
) VALUES (
    gen_random_uuid(),
    'admin@apostello.com',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5ygOGdUvfkWiu',  -- Senha: Admin@123
    'Administrador Master',
    '000.000.000-00',
    ARRAY['MEMBRO_ASSOCIACAO', 'PASTOR_DISTRITAL', 'PREGADOR', 'AVALIADOR']::perfil_usuario[],
    'aprovado'::status_aprovacao,
    true,
    NOW(),
    NOW()
)
ON CONFLICT (email) DO NOTHING;

-- ============================================================
-- VERIFICAR SE O USUÁRIO FOI CRIADO COM SUCESSO
-- ============================================================

SELECT
    id,
    codigo,
    email,
    nome_completo,
    perfis,
    status_aprovacao,
    ativo,
    data_criacao
FROM usuarios
WHERE email = 'admin@apostello.com';

-- ============================================================
-- INSTRUÇÕES DE USO:
-- ============================================================
--
-- 1. Execute este arquivo SQL no PostgreSQL:
--    psql -U postgres -d apostello -f master_user.sql
--
-- 2. Ou copie e cole os comandos INSERT e SELECT acima no pgAdmin
--
-- 3. Faça login no sistema com:
--    Email: admin@apostello.com
--    Senha: Admin@123
--
-- 4. IMPORTANTE: Altere a senha imediatamente após o primeiro acesso!
--
-- 5. Se necessário, vincule o usuário a uma igreja/distrito através do painel
--
-- ============================================================
-- COMO ALTERAR A SENHA (se necessário):
-- ============================================================
--
-- Se você quiser usar uma senha diferente, siga estes passos:
--
-- 1. No backend, instale as dependências:
--    cd backend
--    pip install passlib[bcrypt]
--
-- 2. Execute este comando Python para gerar um novo hash:
--    python3 -c "from passlib.context import CryptContext; pwd_context = CryptContext(schemes=['bcrypt'], deprecated='auto'); print(pwd_context.hash('SuaSenhaAqui'))"
--
-- 3. Copie o hash gerado e substitua no campo senha_hash acima
--
-- ============================================================
-- ALTERNATIVA: CRIAR USUÁRIO VIA CÓDIGO PYTHON
-- ============================================================
--
-- Se preferir, você pode criar o usuário através do código Python:
--
-- from app.core.security import get_password_hash
-- from app.models import Usuario
-- from app.core.database import get_db
--
-- # Criar usuário master
-- usuario = Usuario(
--     email="admin@apostello.com",
--     senha_hash=get_password_hash("Admin@123"),
--     nome_completo="Administrador Master",
--     cpf="000.000.000-00",
--     perfis=["MEMBRO_ASSOCIACAO", "PASTOR_DISTRITAL", "PREGADOR", "AVALIADOR"],
--     status_aprovacao="aprovado",
--     ativo=True
-- )
-- db.add(usuario)
-- db.commit()
--
-- ============================================================
