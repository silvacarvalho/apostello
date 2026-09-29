#!/usr/bin/env python
"""
Script para resetar a senha de um usuário pelo e-mail.

Uso:
    python reset_senha.py <email> [nova_senha]
    
Se a nova senha não for informada, será gerada uma senha aleatória.

Exemplos:
    python reset_senha.py usuario@exemplo.com
    python reset_senha.py usuario@exemplo.com MinhaNovaSenh@123
"""
import argparse
import secrets
import string
import sys

from app.database import SessionLocal
from app.models.usuario import Usuario
from app.core.security import get_password_hash


def gerar_senha_aleatoria(tamanho: int = 12) -> str:
    """Gera uma senha aleatória segura."""
    caracteres = string.ascii_letters + string.digits + "!@#$%^&*"
    # Garantir que a senha tenha pelo menos uma letra maiúscula, minúscula, número e caractere especial
    senha = [
        secrets.choice(string.ascii_uppercase),
        secrets.choice(string.ascii_lowercase),
        secrets.choice(string.digits),
        secrets.choice("!@#$%^&*"),
    ]
    senha += [secrets.choice(caracteres) for _ in range(tamanho - 4)]
    secrets.SystemRandom().shuffle(senha)
    return ''.join(senha)


def resetar_senha(email: str, nova_senha: str | None = None) -> tuple[bool, str]:
    """
    Reseta a senha de um usuário pelo e-mail.
    
    Args:
        email: E-mail do usuário
        nova_senha: Nova senha (opcional, será gerada se não informada)
    
    Returns:
        Tupla com (sucesso, mensagem)
    """
    db = SessionLocal()
    try:
        # Buscar usuário pelo e-mail
        usuario = db.query(Usuario).filter(Usuario.email == email).first()
        
        if not usuario:
            return False, f"Usuário com e-mail '{email}' não encontrado."
        
        # Gerar senha se não foi informada
        if nova_senha is None:
            nova_senha = gerar_senha_aleatoria()
            senha_gerada = True
        else:
            senha_gerada = False
        
        # Atualizar hash da senha
        usuario.senha_hash = get_password_hash(nova_senha)
        db.commit()
        
        if senha_gerada:
            return True, f"Senha do usuário '{usuario.nome_completo}' ({email}) resetada com sucesso.\nNova senha: {nova_senha}"
        else:
            return True, f"Senha do usuário '{usuario.nome_completo}' ({email}) resetada com sucesso."
    
    except Exception as e:
        db.rollback()
        return False, f"Erro ao resetar senha: {str(e)}"
    
    finally:
        db.close()


def main():
    parser = argparse.ArgumentParser(
        description="Reseta a senha de um usuário pelo e-mail.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Exemplos:
  python reset_senha.py usuario@exemplo.com
  python reset_senha.py usuario@exemplo.com MinhaNovaSenh@123
        """
    )
    parser.add_argument(
        "email",
        help="E-mail do usuário que terá a senha resetada"
    )
    parser.add_argument(
        "nova_senha",
        nargs="?",
        default=None,
        help="Nova senha (opcional - se não informada, será gerada automaticamente)"
    )
    
    args = parser.parse_args()
    
    print(f"\n🔐 Resetando senha do usuário: {args.email}")
    print("-" * 50)
    
    sucesso, mensagem = resetar_senha(args.email, args.nova_senha)
    
    if sucesso:
        print(f"✅ {mensagem}")
        sys.exit(0)
    else:
        print(f"❌ {mensagem}")
        sys.exit(1)


if __name__ == "__main__":
    main()
