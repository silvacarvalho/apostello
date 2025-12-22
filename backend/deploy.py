"""
Script de Deploy - Apostello Backend

Este script automatiza a configuração inicial do banco de dados
em novos ambientes de implantação.

Uso:
    python deploy.py

O script executa:
1. Verifica conexão com o banco de dados
2. Aplica todas as migrações pendentes do Alembic
3. Opcionalmente cria um usuário administrador master
"""
import sys
import os
import subprocess
from pathlib import Path

# Adicionar o diretório atual ao path
sys.path.insert(0, str(Path(__file__).parent))

# Carregar variáveis de ambiente
from dotenv import load_dotenv
load_dotenv()


def print_header(title: str):
    """Imprime um cabeçalho formatado"""
    print("\n" + "=" * 60)
    print(f" {title}")
    print("=" * 60)


def print_success(message: str):
    """Imprime mensagem de sucesso"""
    print(f"✅ {message}")


def print_error(message: str):
    """Imprime mensagem de erro"""
    print(f"❌ {message}")


def print_warning(message: str):
    """Imprime mensagem de aviso"""
    print(f"⚠️  {message}")


def print_info(message: str):
    """Imprime mensagem informativa"""
    print(f"ℹ️  {message}")


def check_database_connection() -> bool:
    """Verifica se é possível conectar ao banco de dados"""
    print_header("Verificando Conexão com o Banco de Dados")
    
    try:
        from sqlalchemy import create_engine, text
        from app.core.config import settings
        
        engine = create_engine(settings.DATABASE_URL)
        
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1"))
            result.fetchone()
        
        print_success("Conexão com o banco de dados estabelecida!")
        print_info(f"Database URL: {settings.DATABASE_URL.split('@')[-1] if '@' in settings.DATABASE_URL else 'localhost'}")
        return True
        
    except Exception as e:
        print_error(f"Falha ao conectar ao banco de dados: {e}")
        print_warning("Verifique se o PostgreSQL está rodando e se a DATABASE_URL está correta no .env")
        return False


def run_migrations() -> bool:
    """Executa as migrações do Alembic"""
    print_header("Executando Migrações do Alembic")
    
    try:
        # Verificar estado atual
        print_info("Verificando estado atual das migrações...")
        result = subprocess.run(
            ["alembic", "current"],
            capture_output=True,
            text=True,
            cwd=Path(__file__).parent
        )
        
        if result.returncode != 0:
            print_warning("Nenhuma migração aplicada ainda (banco novo)")
        else:
            print_info(f"Estado atual: {result.stdout.strip() or 'vazio'}")
        
        # Aplicar migrações
        print_info("Aplicando migrações pendentes...")
        result = subprocess.run(
            ["alembic", "upgrade", "head"],
            capture_output=True,
            text=True,
            cwd=Path(__file__).parent
        )
        
        if result.returncode == 0:
            print_success("Migrações aplicadas com sucesso!")
            if result.stdout:
                print(result.stdout)
            return True
        else:
            print_error("Falha ao aplicar migrações!")
            if result.stderr:
                print(result.stderr)
            return False
            
    except FileNotFoundError:
        print_error("Alembic não encontrado. Verifique se está instalado: pip install alembic")
        return False
    except Exception as e:
        print_error(f"Erro ao executar migrações: {e}")
        return False


def check_admin_user() -> bool:
    """Verifica se existe usuário administrador"""
    try:
        from sqlalchemy.orm import Session
        from app.database import SessionLocal
        from app.models.usuario import Usuario
        from app.models.enums import TipoUsuario
        
        db = SessionLocal()
        try:
            admin = db.query(Usuario).filter(Usuario.tipo == TipoUsuario.ADMIN).first()
            return admin is not None
        finally:
            db.close()
    except Exception:
        return False


def create_admin_user():
    """Cria usuário administrador master"""
    print_header("Configuração do Usuário Administrador")
    
    if check_admin_user():
        print_info("Já existe um usuário administrador no sistema.")
        response = input("Deseja criar outro administrador? [s/N]: ").strip().lower()
        if response != 's':
            print_info("Pulando criação de administrador.")
            return
    
    try:
        from app.scripts.create_master import create_master_user
        
        print_info("Criando usuário administrador master...")
        
        # Solicitar dados
        print("\nPreencha os dados do administrador:")
        nome = input("Nome completo: ").strip() or "Administrador"
        email = input("Email: ").strip()
        cpf = input("CPF (apenas números ou com pontuação): ").strip()
        senha = input("Senha (mín. 6 caracteres): ").strip()
        
        if not email or not cpf or not senha:
            print_error("Email, CPF e senha são obrigatórios!")
            return
        
        if len(senha) < 6:
            print_error("A senha deve ter pelo menos 6 caracteres!")
            return
        
        # Criar usuário
        create_master_user(
            nome_completo=nome,
            email=email,
            cpf=cpf,
            senha=senha
        )
        
        print_success(f"Administrador '{nome}' criado com sucesso!")
        
    except ImportError:
        print_warning("Script de criação de master não encontrado.")
        print_info("Execute manualmente: python -m app.scripts.create_master")
    except Exception as e:
        print_error(f"Erro ao criar administrador: {e}")


def main():
    """Função principal do script de deploy"""
    print_header("🚀 DEPLOY - Sistema Apostello")
    print("Este script configura o banco de dados para um novo ambiente.")
    
    # Verificar se o arquivo .env existe
    env_file = Path(__file__).parent / ".env"
    if not env_file.exists():
        print_error("Arquivo .env não encontrado!")
        print_info("Copie o .env.example para .env e configure as variáveis.")
        sys.exit(1)
    
    # Passo 1: Verificar conexão
    if not check_database_connection():
        print_error("\nDeploy abortado: Não foi possível conectar ao banco de dados.")
        sys.exit(1)
    
    # Passo 2: Executar migrações
    if not run_migrations():
        print_error("\nDeploy abortado: Falha ao aplicar migrações.")
        sys.exit(1)
    
    # Passo 3: Criar usuário admin
    create_admin = input("\nDeseja criar um usuário administrador? [s/N]: ").strip().lower()
    if create_admin == 's':
        create_admin_user()
    
    # Sucesso!
    print_header("✅ Deploy Concluído com Sucesso!")
    print("""
Próximos passos:
1. Configure as variáveis de email no .env (SMTP_*)
2. Inicie o servidor: uvicorn app.main:app --host 0.0.0.0 --port 8000
3. Acesse a documentação: http://localhost:8000/docs

Para popular o banco com dados de teste:
    python popular_banco_dados.py
""")


if __name__ == "__main__":
    main()
