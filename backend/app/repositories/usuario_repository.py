"""
Repository de Usuário
"""
from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_

from app.repositories.base import BaseRepository
from app.models.usuario import Usuario, TipoUsuario, StatusGeral, StatusAprovacao


class UsuarioRepository(BaseRepository[Usuario]):
    """Repository para operações de Usuário"""

    def __init__(self, db: Session):
        super().__init__(Usuario, db)

    def get_by_email(self, email: str) -> Optional[Usuario]:
        """Busca usuário por email"""
        return self.db.query(Usuario).filter(Usuario.email == email).first()

    def get_by_cpf(self, cpf: str) -> Optional[Usuario]:
        """Busca usuário por CPF"""
        return self.db.query(Usuario).filter(Usuario.cpf == cpf).first()

    def get_by_tipo(
        self, 
        tipo: TipoUsuario, 
        distrito_id: Optional[int] = None,
        skip: int = 0, 
        limit: int = 100
    ) -> List[Usuario]:
        """Lista usuários por tipo"""
        query = self.db.query(Usuario).filter(
            Usuario.tipo == tipo,
            Usuario.status == StatusGeral.ATIVO,
            Usuario.status_aprovacao == StatusAprovacao.APROVADO
        )
        
        if distrito_id:
            query = query.filter(Usuario.distrito_id == distrito_id)
        
        return query.order_by(Usuario.score_atual.desc()).offset(skip).limit(limit).all()

    def get_pregadores(self, distrito_id: int) -> List[Usuario]:
        """Lista pregadores ativos de um distrito"""
        return self.get_by_tipo(TipoUsuario.PREGADOR, distrito_id)

    def get_cantores(self, distrito_id: int) -> List[Usuario]:
        """Lista cantores ativos de um distrito"""
        return self.get_by_tipo(TipoUsuario.CANTOR, distrito_id)

    def get_by_distrito(self, distrito_id: int) -> List[Usuario]:
        """Lista todos os usuários de um distrito"""
        return self.db.query(Usuario).filter(
            Usuario.distrito_id == distrito_id,
            Usuario.status == StatusGeral.ATIVO
        ).all()

    def get_by_igreja(self, igreja_id: int) -> List[Usuario]:
        """Lista membros de uma igreja"""
        return self.db.query(Usuario).filter(
            Usuario.igreja_id == igreja_id,
            Usuario.status == StatusGeral.ATIVO
        ).all()

    def get_pendentes_aprovacao(self, distrito_id: Optional[int] = None) -> List[Usuario]:
        """Lista usuários pendentes de aprovação"""
        query = self.db.query(Usuario).filter(
            Usuario.status_aprovacao == StatusAprovacao.PENDENTE_APROVACAO
        )
        
        if distrito_id:
            query = query.filter(Usuario.distrito_id == distrito_id)
        
        return query.order_by(Usuario.data_solicitacao_cadastro).all()

    def search(
        self, 
        search_term: str, 
        tipo: Optional[TipoUsuario] = None,
        distrito_id: Optional[int] = None,
        skip: int = 0, 
        limit: int = 100
    ) -> List[Usuario]:
        """Busca usuários por nome ou email"""
        query = self.db.query(Usuario).filter(
            or_(
                Usuario.nome_completo.ilike(f"%{search_term}%"),
                Usuario.email.ilike(f"%{search_term}%")
            )
        )
        
        if tipo:
            query = query.filter(Usuario.tipo == tipo)
        
        if distrito_id:
            query = query.filter(Usuario.distrito_id == distrito_id)
        
        return query.offset(skip).limit(limit).all()

    def update_score(self, usuario_id: int, novo_score: float) -> Optional[Usuario]:
        """Atualiza score do usuário"""
        usuario = self.get_by_id(usuario_id)
        if usuario:
            # Garante que score está entre 0 e 100
            usuario.score_atual = max(0, min(100, novo_score))
            self.db.commit()
            self.db.refresh(usuario)
        return usuario

    def increment_participacao(self, usuario_id: int) -> Optional[Usuario]:
        """Incrementa contadores de participação"""
        usuario = self.get_by_id(usuario_id)
        if usuario:
            usuario.contador_mes_atual += 1
            usuario.contador_total_participacoes += 1
            self.db.commit()
            self.db.refresh(usuario)
        return usuario

    def increment_falta(self, usuario_id: int) -> Optional[Usuario]:
        """Incrementa contador de faltas"""
        usuario = self.get_by_id(usuario_id)
        if usuario:
            usuario.contador_faltas += 1
            self.db.commit()
            self.db.refresh(usuario)
        return usuario

    def reset_contador_mensal(self) -> int:
        """Reseta contador mensal de todos os usuários (executar todo dia 1)"""
        count = self.db.query(Usuario).filter(
            Usuario.tipo.in_([TipoUsuario.PREGADOR, TipoUsuario.CANTOR])
        ).update({Usuario.contador_mes_atual: 0})
        self.db.commit()
        return count

    def update_ultimo_login(self, usuario_id: int) -> Optional[Usuario]:
        """Atualiza data do último login"""
        from datetime import datetime, timezone
        usuario = self.get_by_id(usuario_id)
        if usuario:
            usuario.ultimo_login = datetime.now(timezone.utc)
            self.db.commit()
            self.db.refresh(usuario)
        return usuario
