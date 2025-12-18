"""
Serviço de Usuário
"""
from typing import List, Optional
from sqlalchemy.orm import Session

from app.core.security import get_password_hash
from app.core.exceptions import (
    NotFoundException, BadRequestException, 
    ConflictException, ForbiddenException
)
from app.repositories.usuario_repository import UsuarioRepository
from app.models.usuario import Usuario, TipoUsuario, StatusGeral, StatusAprovacao
from app.schemas.usuario import UsuarioCreate, UsuarioUpdate, UsuarioResponse


class UsuarioService:
    """Serviço de usuários"""

    def __init__(self, db: Session):
        self.db = db
        self.repository = UsuarioRepository(db)

    def create(self, data: UsuarioCreate, auto_cadastro: bool = False) -> Usuario:
        """Cria novo usuário"""
        # Verificar se email já existe
        if self.repository.get_by_email(data.email):
            raise ConflictException("Email já cadastrado")
        
        # Verificar se CPF já existe
        if self.repository.get_by_cpf(data.cpf):
            raise ConflictException("CPF já cadastrado")
        
        # Preparar dados
        usuario_data = data.model_dump(exclude={"senha"})
        usuario_data["senha_hash"] = get_password_hash(data.senha)
        
        # Se auto cadastro, definir status pendente
        if auto_cadastro:
            usuario_data["status_aprovacao"] = StatusAprovacao.PENDENTE_APROVACAO
            from datetime import datetime, timezone
            usuario_data["data_solicitacao_cadastro"] = datetime.now(timezone.utc)
        
        return self.repository.create(usuario_data)

    def get_by_id(self, usuario_id: int) -> Usuario:
        """Busca usuário por ID"""
        usuario = self.repository.get_by_id(usuario_id)
        if not usuario:
            raise NotFoundException("Usuário", usuario_id)
        return usuario

    def get_by_email(self, email: str) -> Optional[Usuario]:
        """Busca usuário por email"""
        return self.repository.get_by_email(email)

    def list_all(
        self, 
        skip: int = 0, 
        limit: int = 100,
        tipo: Optional[TipoUsuario] = None,
        distrito_id: Optional[int] = None,
        search: Optional[str] = None
    ) -> tuple[List[Usuario], int]:
        """Lista usuários com filtros"""
        if search:
            usuarios = self.repository.search(search, tipo, distrito_id, skip, limit)
            total = len(usuarios)  # Simplificado, ideal seria count separado
        elif tipo:
            usuarios = self.repository.get_by_tipo(tipo, distrito_id, skip, limit)
            total = len(usuarios)
        else:
            usuarios = self.repository.get_all(skip, limit)
            total = self.repository.count()
        
        return usuarios, total

    def list_pregadores(self, distrito_id: int) -> List[Usuario]:
        """Lista pregadores de um distrito"""
        return self.repository.get_pregadores(distrito_id)

    def list_cantores(self, distrito_id: int) -> List[Usuario]:
        """Lista cantores de um distrito"""
        return self.repository.get_cantores(distrito_id)

    def update(
        self, 
        usuario_id: int, 
        data: UsuarioUpdate, 
        current_user: Usuario
    ) -> Usuario:
        """Atualiza usuário"""
        usuario = self.get_by_id(usuario_id)
        
        # Verificar permissão
        if not self._can_update(current_user, usuario):
            raise ForbiddenException("Você não tem permissão para editar este usuário")
        
        update_data = data.model_dump(exclude_unset=True)
        return self.repository.update(usuario_id, update_data)

    def delete(self, usuario_id: int, current_user: Usuario) -> bool:
        """Remove usuário"""
        usuario = self.get_by_id(usuario_id)
        
        # Apenas admin pode deletar
        if not current_user.is_admin:
            raise ForbiddenException("Apenas administradores podem remover usuários")
        
        return self.repository.delete(usuario_id)

    def activate(self, usuario_id: int, current_user: Usuario) -> Usuario:
        """Ativa usuário"""
        if not current_user.is_admin and not current_user.is_pastor:
            raise ForbiddenException("Sem permissão para ativar usuários")
        
        return self.repository.update(usuario_id, {"status": StatusGeral.ATIVO})

    def deactivate(self, usuario_id: int, current_user: Usuario) -> Usuario:
        """Desativa usuário"""
        if not current_user.is_admin and not current_user.is_pastor:
            raise ForbiddenException("Sem permissão para desativar usuários")
        
        return self.repository.update(usuario_id, {"status": StatusGeral.INATIVO})

    def approve(
        self, 
        usuario_id: int, 
        current_user: Usuario,
        aprovar: bool = True,
        motivo: Optional[str] = None
    ) -> Usuario:
        """Aprova ou recusa cadastro"""
        usuario = self.get_by_id(usuario_id)
        
        if not current_user.is_admin and not current_user.is_pastor:
            raise ForbiddenException("Sem permissão para aprovar cadastros")
        
        from datetime import datetime, timezone
        
        if aprovar:
            update_data = {
                "status_aprovacao": StatusAprovacao.APROVADO,
                "data_aprovacao": datetime.now(timezone.utc),
                "aprovado_por_id": current_user.id
            }
        else:
            update_data = {
                "status_aprovacao": StatusAprovacao.RECUSADO,
                "motivo_recusa": motivo,
                "aprovado_por_id": current_user.id
            }
        
        return self.repository.update(usuario_id, update_data)

    def list_pendentes_aprovacao(
        self, 
        distrito_id: Optional[int] = None
    ) -> List[Usuario]:
        """Lista usuários pendentes de aprovação"""
        return self.repository.get_pendentes_aprovacao(distrito_id)

    def _can_update(self, current_user: Usuario, target_user: Usuario) -> bool:
        """Verifica se usuário pode editar outro"""
        # Admin pode tudo
        if current_user.is_admin:
            return True
        
        # Usuário pode editar a si mesmo
        if current_user.id == target_user.id:
            return True
        
        # Pastor pode editar usuários do seu distrito
        if current_user.is_pastor:
            if current_user.distrito_id == target_user.distrito_id:
                return True
        
        return False
