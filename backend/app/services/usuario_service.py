"""
Serviço de Usuário
"""
from typing import List, Optional
from datetime import datetime, timezone
from sqlalchemy.orm import Session

from app.core.security import get_password_hash
from app.core.exceptions import (
    NotFoundException, BadRequestException, 
    ConflictException, ForbiddenException
)
from app.repositories.usuario_repository import UsuarioRepository
from app.repositories.igreja_repository import IgrejaRepository
from app.models.usuario import Usuario, TipoUsuario, StatusGeral, StatusAprovacao
from app.schemas.usuario import UsuarioCreate, UsuarioUpdate, UsuarioResponse, MembroAutoCadastroCreate


class UsuarioService:
    """Serviço de usuários"""

    def __init__(self, db: Session):
        self.db = db
        self.repository = UsuarioRepository(db)
        self.igreja_repository = IgrejaRepository(db)

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
        
        # Definir valores padrão para pode_pregar e pode_cantar baseado no tipo
        # se não foram explicitamente fornecidos
        if "pode_pregar" not in usuario_data or usuario_data["pode_pregar"] is None:
            # PREGADOR e PASTOR_DISTRITAL podem pregar por padrão
            usuario_data["pode_pregar"] = data.tipo in [TipoUsuario.PREGADOR, TipoUsuario.PASTOR_DISTRITAL]
        
        if "pode_cantar" not in usuario_data or usuario_data["pode_cantar"] is None:
            # Apenas CANTOR pode cantar por padrão
            usuario_data["pode_cantar"] = data.tipo == TipoUsuario.CANTOR
        
        # Se auto cadastro, definir status pendente
        if auto_cadastro:
            usuario_data["status_aprovacao"] = StatusAprovacao.PENDENTE_APROVACAO
            from datetime import datetime, timezone
            usuario_data["data_solicitacao_cadastro"] = datetime.now(timezone.utc)
        
        return self.repository.create(usuario_data)

    def create_membro_auto_cadastro(self, data: MembroAutoCadastroCreate) -> Usuario:
        """Cria auto-cadastro de membro"""
        # Verificar se email já existe
        if self.repository.get_by_email(data.email):
            raise ConflictException("Email já cadastrado")
        
        # Verificar se CPF já existe
        if self.repository.get_by_cpf(data.cpf):
            raise ConflictException("CPF já cadastrado")
        
        # Verificar se igreja existe e obter distrito
        igreja = self.igreja_repository.get_by_id(data.igreja_id)
        if not igreja:
            raise NotFoundException("Igreja", data.igreja_id)
        
        # Preparar dados do usuário
        from datetime import datetime, timezone
        usuario_data = {
            "nome_completo": data.nome_completo,
            "email": data.email,
            "cpf": data.cpf,
            "telefone": data.telefone,
            "data_nascimento": data.data_nascimento,
            "foto_url": data.foto_url,
            "tipo": TipoUsuario.MEMBRO,
            "igreja_id": data.igreja_id,
            "distrito_id": igreja.distrito_id,  # Distrito vem da igreja
            "senha_hash": get_password_hash(data.senha),
            "pode_pregar": False,
            "pode_cantar": False,
            "status_aprovacao": StatusAprovacao.PENDENTE_APROVACAO,
            "data_solicitacao_cadastro": datetime.now(timezone.utc)
        }
        
        usuario = self.repository.create(usuario_data)
        
        # Criar notificação para o pastor do distrito
        self._notify_pastor_new_signup(usuario, igreja)
        
        return usuario

    def _notify_pastor_new_signup(self, usuario: Usuario, igreja):
        """Cria notificação para pastor sobre novo cadastro"""
        from app.models.notificacao import Notificacao, TipoNotificacao
        
        # Buscar pastor do distrito
        pastor = self.repository.get_pastor_by_distrito(usuario.distrito_id)
        if not pastor:
            return  # Não há pastor para notificar
        
        titulo = "Novo cadastro pendente"
        mensagem = f"Novo cadastro de membro aguardando aprovação: {usuario.nome_completo} para a igreja {igreja.nome}"
        
        notificacao = Notificacao(
            usuario_id=pastor.id,
            tipo=TipoNotificacao.AUTO_CADASTRO_PENDENTE,
            titulo=titulo,
            mensagem=mensagem,
            link=f"/usuarios/pendentes",
            lida=False
        )
        
        self.db.add(notificacao)
        self.db.commit()

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
        motivo: Optional[str] = None,
        nova_igreja_id: Optional[int] = None
    ) -> Usuario:
        """Aprova ou recusa cadastro, com opção de alterar igreja"""
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
            
            # Se pastor optou por alterar a igreja
            if nova_igreja_id and nova_igreja_id != usuario.igreja_id:
                # Validar que a nova igreja pertence ao distrito
                nova_igreja = self.igreja_repository.get_by_id(nova_igreja_id)
                if not nova_igreja:
                    raise NotFoundException("Igreja", nova_igreja_id)
                
                if nova_igreja.distrito_id != usuario.distrito_id:
                    raise BadRequestException("Igreja não pertence ao distrito do usuário")
                
                update_data["igreja_id"] = nova_igreja_id
            
            # Notificar membro sobre aprovação
            self._notify_member_approved(usuario, update_data.get("igreja_id"))
        else:
            update_data = {
                "status_aprovacao": StatusAprovacao.RECUSADO,
                "status": StatusGeral.INATIVO,
                "data_aprovacao": datetime.now(timezone.utc),
                "motivo_recusa": motivo,
                "aprovado_por_id": current_user.id
            }
            
            # Notificar membro sobre recusa
            self._notify_member_rejected(usuario, motivo)
        
        return self.repository.update(usuario_id, update_data)

    def reaprove(
        self, 
        usuario_id: int, 
        current_user: Usuario,
        nova_igreja_id: Optional[int] = None
    ) -> Usuario:
        """
        Reaprova um usuário que foi recusado anteriormente.
        Altera status para ATIVO, status_aprovacao para APROVADO e atualiza data_aprovacao.
        """
        usuario = self.repository.get_by_id(usuario_id)
        if not usuario:
            raise NotFoundException("Usuário", usuario_id)
        
        # Verificar se usuário está realmente recusado
        if usuario.status_aprovacao != StatusAprovacao.RECUSADO:
            raise BadRequestException("Apenas usuários recusados podem ser reaprovados")
        
        # Verificar permissão (admin ou pastor do distrito)
        if not current_user.is_admin:
            if not current_user.is_pastor or current_user.distrito_id != usuario.distrito_id:
                raise ForbiddenException("Sem permissão para reaprovar este usuário")
        
        update_data = {
            "status": StatusGeral.ATIVO,
            "status_aprovacao": StatusAprovacao.APROVADO,
            "data_aprovacao": datetime.now(timezone.utc),
            "aprovado_por_id": current_user.id,
            "motivo_recusa": None  # Limpa o motivo de recusa
        }
        
        # Se pastor optou por alterar a igreja
        if nova_igreja_id and nova_igreja_id != usuario.igreja_id:
            # Validar que a nova igreja pertence ao distrito
            nova_igreja = self.igreja_repository.get_by_id(nova_igreja_id)
            if not nova_igreja:
                raise NotFoundException("Igreja", nova_igreja_id)
            
            if nova_igreja.distrito_id != usuario.distrito_id:
                raise BadRequestException("Igreja não pertence ao distrito do usuário")
            
            update_data["igreja_id"] = nova_igreja_id
        
        # Atualizar usuário
        usuario_atualizado = self.repository.update(usuario_id, update_data)
        
        # Notificar membro sobre aprovação
        self._notify_member_approved(usuario_atualizado, update_data.get("igreja_id"))
        
        return usuario_atualizado

    def _notify_member_approved(self, usuario: Usuario, nova_igreja_id: Optional[int] = None):
        """Cria notificação para membro sobre aprovação"""
        from app.models.notificacao import Notificacao, TipoNotificacao
        
        igreja_nome = ""
        if nova_igreja_id and nova_igreja_id != usuario.igreja_id:
            igreja = self.igreja_repository.get_by_id(nova_igreja_id)
            igreja_nome = f" na igreja {igreja.nome}" if igreja else ""
        
        titulo = "Cadastro aprovado"
        mensagem = f"Seu cadastro foi aprovado{igreja_nome}! Você já pode acessar o sistema."
        
        notificacao = Notificacao(
            usuario_id=usuario.id,
            tipo=TipoNotificacao.AUTO_CADASTRO_APROVADO,
            titulo=titulo,
            mensagem=mensagem,
            lida=False
        )
        
        self.db.add(notificacao)
        self.db.commit()

    def _notify_member_rejected(self, usuario: Usuario, motivo: Optional[str] = None):
        """Cria notificação para membro sobre recusa"""
        from app.models.notificacao import Notificacao, TipoNotificacao
        
        titulo = "Cadastro recusado"
        mensagem = "Seu cadastro foi recusado."
        if motivo:
            mensagem += f" Motivo: {motivo}"
        
        notificacao = Notificacao(
            usuario_id=usuario.id,
            tipo=TipoNotificacao.AUTO_CADASTRO_RECUSADO,
            titulo=titulo,
            mensagem=mensagem,
            lida=False
        )
        
        self.db.add(notificacao)
        self.db.commit()

    def list_pendentes_aprovacao(
        self, 
        distrito_id: Optional[int] = None
    ) -> List[Usuario]:
        """Lista usuários pendentes de aprovação"""
        return self.repository.get_pendentes_aprovacao(distrito_id)

    def list_aprovados(
        self, 
        distrito_id: Optional[int] = None
    ) -> List[Usuario]:
        """Lista usuários aprovados"""
        return self.repository.get_aprovados(distrito_id)

    def list_recusados(
        self, 
        distrito_id: Optional[int] = None
    ) -> List[Usuario]:
        """Lista usuários recusados"""
        return self.repository.get_recusados(distrito_id)

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
