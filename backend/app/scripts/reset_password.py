"""
Script para resetar a senha de um usuário.
Executar: python -m app.scripts.reset_password <email>

Exemplo:
    python -m app.scripts.reset_password admin@sistema.com
"""
import sys
import os

# Adicionar o diretório raiz ao path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models.usuario import Usuario
from app.core.security import get_password_hash


# Senha padrão para reset
DEFAULT_PASSWORD = "Master123"


def reset_password(email: str, new_password: str = DEFAULT_PASSWORD):
    """Reseta a senha de um usuário pelo email"""
    db: Session = SessionLocal()
    
    try:
        # Buscar usuário pelo email
        usuario = db.query(Usuario).filter(Usuario.email == email).first()
        
        if not usuario:
            print(f"\n❌ Usuário não encontrado: {email}")
            print("   Verifique se o email está correto.")
            return False
        
        # Atualizar a senha
        usuario.senha_hash = get_password_hash(new_password)
        db.commit()
        
        print("\n" + "=" * 50)
        print("✅ SENHA RESETADA COM SUCESSO!")
        print("=" * 50)
        print(f"\n📧 Email:      {usuario.email}")
        print(f"👤 Nome:       {usuario.nome_completo}")
        print(f"🔑 Nova Senha: {new_password}")
        print(f"👥 Tipo:       {usuario.tipo.value}")
        print("\n⚠️  IMPORTANTE: Altere a senha após o primeiro login!")
        print("=" * 50 + "\n")
        
        return True
        
    except Exception as e:
        db.rollback()
        print(f"\n❌ Erro ao resetar senha: {e}")
        raise
    finally:
        db.close()


def show_usage():
    """Mostra como usar o script"""
    print("\n" + "=" * 50)
    print("SCRIPT DE RESET DE SENHA")
    print("=" * 50)
    print("\nUso:")
    print("  python -m app.scripts.reset_password <email>")
    print("\nExemplos:")
    print("  python -m app.scripts.reset_password admin@sistema.com")
    print("  python -m app.scripts.reset_password usuario@email.com")
    print(f"\nA senha será resetada para: {DEFAULT_PASSWORD}")
    print("=" * 50 + "\n")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        show_usage()
        sys.exit(1)
    
    email = sys.argv[1]
    
    print(f"\n🔐 Resetando senha do usuário: {email}\n")
    reset_password(email)
