"""
Script para criar o usuário master do sistema.
Executar: python -m app.scripts.create_master
"""
import sys
import os

# Adicionar o diretório raiz ao path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from sqlalchemy.orm import Session
from app.database import SessionLocal, engine
from app.models.base import Base
from app.models.usuario import Usuario, TipoUsuario, StatusGeral, StatusAprovacao
from app.models.organizacao import Organizacao
from app.models.distrito import Distrito
from app.core.security import get_password_hash


def create_master_user():
    """Cria o usuário master se não existir"""
    db: Session = SessionLocal()
    
    try:
        # Verificar se já existe um admin
        existing_admin = db.query(Usuario).filter(
            Usuario.tipo == TipoUsuario.ADMIN
        ).first()
        
        if existing_admin:
            print(f"⚠️  Já existe um usuário administrador:")
            print(f"   📧 Email: {existing_admin.email}")
            print(f"   👤 Nome: {existing_admin.nome_completo}")
            print(f"   🆔 ID: {existing_admin.id}")
            print(f"   📅 Criado em: {existing_admin.created_at}")
            print("\n   Para criar outro, remova o existente primeiro.")
            return False
        
        # Verificar se existe organização, senão criar
        organizacao = db.query(Organizacao).first()
        if not organizacao:
            print("📦 Criando organização inicial...")
            organizacao = Organizacao(
                nome="Apostello - Organização Principal",
                cnpj=None
            )
            db.add(organizacao)
            db.commit()
            db.refresh(organizacao)
            print(f"   ✅ Organização criada: {organizacao.nome} (ID: {organizacao.id})")
        
        # Verificar se existe distrito, senão criar (para referência futura)
        distrito = db.query(Distrito).first()
        if not distrito:
            print("🏛️  Criando distrito inicial...")
            distrito = Distrito(
                organizacao_id=organizacao.id,
                nome="Distrito Central",
                descricao="Distrito principal do sistema",
                status=StatusGeral.ATIVO
            )
            db.add(distrito)
            db.commit()
            db.refresh(distrito)
            print(f"✅ Distrito criado: {distrito.nome} (ID: {distrito.id})")
        
        # Dados do usuário master
        master_email = "master@iasd.com"
        master_password = "Master123"
        master_cpf = "00000000000"
        
        print("\n👤 Criando usuário master...")
        
        master_user = Usuario(
            nome_completo="Administrador Master",
            email=master_email,
            senha_hash=get_password_hash(master_password),
            cpf=master_cpf,
            telefone="00000000000",
            tipo=TipoUsuario.ADMIN,
            status=StatusGeral.ATIVO,
            status_aprovacao=StatusAprovacao.APROVADO,
            distrito_id=None,  # Admin não precisa de distrito
            igreja_id=None
        )
        
        db.add(master_user)
        db.commit()
        db.refresh(master_user)
        
        print("\n" + "=" * 50)
        print("✅ USUÁRIO MASTER CRIADO COM SUCESSO!")
        print("=" * 50)
        print(f"\n📧 Email:    {master_email}")
        print(f"🔑 Senha:    {master_password}")
        print(f"👤 Tipo:     {master_user.tipo.value}")
        print(f"🆔 ID:       {master_user.id}")
        print("\n⚠️  IMPORTANTE: Altere a senha após o primeiro login!")
        print("=" * 50 + "\n")
        
        return True
        
    except Exception as e:
        db.rollback()
        print(f"\n❌ Erro ao criar usuário master: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    print("\n🚀 Inicializando criação do usuário master...\n")
    create_master_user()
