"""
Script para criar o primeiro usuário master do sistema Apostello
Este script cria o usuário diretamente no banco de dados usando SQLAlchemy
"""

from app.core.database import SessionLocal
from app.models.usuario import Usuario, PerfilUsuario, StatusAprovacao
from app.core.security import get_password_hash

def criar_usuario_master():
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

    db = SessionLocal()
    try:
        # Verificar se já existe um usuário com este email
        usuario_existente = db.query(Usuario).filter(Usuario.email == email).first()

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
            perfis=[
                PerfilUsuario.MEMBRO_ASSOCIACAO,
                PerfilUsuario.PASTOR_DISTRITAL,
                PerfilUsuario.PREGADOR,
                PerfilUsuario.AVALIADOR
            ],
            status_aprovacao=StatusAprovacao.APROVADO,
            ativo=True
        )

        db.add(usuario_master)
        db.commit()
        db.refresh(usuario_master)

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
        db.rollback()
        raise
    finally:
        db.close()

    print("=" * 70)

if __name__ == "__main__":
    criar_usuario_master()
