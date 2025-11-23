"""
Script para criar o primeiro usuário master do sistema Apostello
Este script cria o usuário diretamente no banco de dados usando SQLAlchemy
"""

import asyncio
from sqlalchemy import select
from app.core.database import get_db, async_session
from app.models import Usuario
from app.core.security import get_password_hash

async def criar_usuario_master():
    """
    Cria o usuário master com todos os perfis e permissões.
    """

    # Credenciais do usuário master
    email = "admin@apostello.com"
    senha = "Admin@123"  # IMPORTANTE: Alterar após primeiro login

    print("=" * 70)
    print("CRIAÇÃO DO USUÁRIO MASTER - APOSTELLO")
    print("=" * 70)
    print()

    async with async_session() as db:
        try:
            # Verificar se já existe um usuário com este email
            result = await db.execute(
                select(Usuario).where(Usuario.email == email)
            )
            usuario_existente = result.scalar_one_or_none()

            if usuario_existente:
                print(f"⚠️  ATENÇÃO: Já existe um usuário com o email '{email}'")
                print()
                print("Dados do usuário existente:")
                print(f"  ID: {usuario_existente.id}")
                print(f"  Código: {usuario_existente.codigo}")
                print(f"  Nome: {usuario_existente.nome_completo}")
                print(f"  Email: {usuario_existente.email}")
                print(f"  Perfis: {usuario_existente.perfis}")
                print(f"  Status: {usuario_existente.status_aprovacao}")
                print(f"  Ativo: {usuario_existente.ativo}")
                print()
                print("O usuário NÃO foi criado novamente.")
                return

            # Criar novo usuário master
            usuario_master = Usuario(
                email=email,
                senha_hash=get_password_hash(senha),
                nome_completo="Administrador Master",
                cpf="000.000.000-00",
                perfis=["MEMBRO_ASSOCIACAO", "PASTOR_DISTRITAL", "PREGADOR", "AVALIADOR"],
                status_aprovacao="aprovado",
                ativo=True
            )

            db.add(usuario_master)
            await db.commit()
            await db.refresh(usuario_master)

            print("✅ USUÁRIO MASTER CRIADO COM SUCESSO!")
            print()
            print("Credenciais de acesso:")
            print(f"  Email: {email}")
            print(f"  Senha: {senha}")
            print()
            print("Dados do usuário:")
            print(f"  ID: {usuario_master.id}")
            print(f"  Código: {usuario_master.codigo}")
            print(f"  Nome: {usuario_master.nome_completo}")
            print(f"  Perfis: {usuario_master.perfis}")
            print(f"  Status: {usuario_master.status_aprovacao}")
            print()
            print("⚠️  IMPORTANTE: Altere a senha após o primeiro login!")
            print()

        except Exception as e:
            print(f"❌ ERRO ao criar usuário: {str(e)}")
            await db.rollback()
            raise

    print("=" * 70)

def main():
    """
    Função principal que executa o script.
    """
    asyncio.run(criar_usuario_master())

if __name__ == "__main__":
    main()
