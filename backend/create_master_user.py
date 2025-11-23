"""
Script para criar o primeiro usuário master do sistema.
Este script gera um hash de senha seguro e cria o SQL INSERT necessário.
"""

import sys
from pathlib import Path

# Adiciona o diretório app ao path para importar o módulo de segurança
sys.path.insert(0, str(Path(__file__).parent))

from app.core.security import get_password_hash
import uuid

def create_master_user_sql():
    """
    Gera o SQL para criar o primeiro usuário master do sistema.
    """

    # Credenciais do usuário master
    email = "admin@apostello.com"
    senha = "Admin@123"  # Senha temporária - DEVE SER ALTERADA após primeiro login
    nome_completo = "Administrador Master"
    cpf = "000.000.000-00"  # CPF fictício para admin

    # Gera o hash da senha usando bcrypt
    senha_hash = get_password_hash(senha)

    # Gera um UUID para o usuário
    user_id = str(uuid.uuid4())

    # SQL INSERT
    sql = f"""
-- ============================================================
-- CRIAR PRIMEIRO USUÁRIO MASTER DO SISTEMA
-- ============================================================
-- IMPORTANTE: Altere a senha após o primeiro login!
--
-- Credenciais de acesso:
-- Email: {email}
-- Senha: {senha}
-- ============================================================

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
    '{user_id}'::uuid,
    '{email}',
    '{senha_hash}',
    '{nome_completo}',
    '{cpf}',
    ARRAY['MEMBRO_ASSOCIACAO', 'PASTOR_DISTRITAL', 'PREGADOR', 'AVALIADOR']::perfil_usuario[],
    'aprovado'::status_aprovacao,
    true,
    NOW(),
    NOW()
);

-- Verificar se o usuário foi criado com sucesso
SELECT
    id,
    codigo,
    email,
    nome_completo,
    perfis,
    status_aprovacao,
    ativo
FROM usuarios
WHERE email = '{email}';
"""

    return sql

if __name__ == "__main__":
    print("=" * 70)
    print("CRIAÇÃO DO USUÁRIO MASTER - APOSTELLO")
    print("=" * 70)
    print()

    sql = create_master_user_sql()

    # Salva o SQL em um arquivo
    output_file = Path(__file__).parent / "master_user.sql"
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(sql)

    print(sql)
    print()
    print("=" * 70)
    print(f"✅ SQL salvo em: {output_file}")
    print("=" * 70)
    print()
    print("INSTRUÇÕES:")
    print("1. Execute este arquivo SQL no seu banco de dados PostgreSQL")
    print("2. Faça login com as credenciais mostradas acima")
    print("3. IMPORTANTE: Altere a senha imediatamente após o primeiro login")
    print("4. Caso necessário, vincule o usuário a uma igreja/distrito através do painel")
    print()
    print("Comando para executar o SQL:")
    print(f"  psql -U seu_usuario -d apostello -f {output_file.name}")
    print()
