"""
Serviço de Horário de Culto
"""
from typing import List
from sqlalchemy.orm import Session
from uuid import uuid4

from app.core.exceptions import NotFoundException, ForbiddenException
from app.repositories.horario_culto_repository import HorarioCultoRepository
from app.repositories.igreja_repository import IgrejaRepository
from app.repositories.distrito_repository import DistritoRepository
from app.models.usuario import Usuario, TipoUsuario
from app.models.horario_culto import HorarioCulto
from app.schemas.horario_culto import (
    HorarioCultoCreate,
    HorarioCultoCreateLote,
    HorarioCultoUpdate,
    HorarioCultoResponse,
    HorariosPorIgrejaResponse
)


class HorarioCultoService:
    """Serviço de Horário de Culto"""

    def __init__(self, db: Session):
        self.db = db
        self.repository = HorarioCultoRepository(db)
        self.igreja_repository = IgrejaRepository(db)
        self.distrito_repository = DistritoRepository(db)

    def validar_permissao_pastor(self, current_user: Usuario, distrito_id: int) -> None:
        """Valida se o usuário tem permissão de Pastor/Líder do distrito"""
        if current_user.tipo == TipoUsuario.ADMIN:
            return
        
        distrito = self.distrito_repository.get_by_id(distrito_id)
        if not distrito:
            raise NotFoundException("Distrito não encontrado")
        
        if current_user.tipo not in [TipoUsuario.PASTOR_DISTRITAL, TipoUsuario.LIDER_DISTRITAL]:
            raise ForbiddenException("Apenas Pastor ou Líder Distrital podem gerenciar horários")
        
        if current_user.distrito_id != distrito_id:
            raise ForbiddenException("Você não tem permissão para gerenciar horários deste distrito")

    def criar_horario(self, data: HorarioCultoCreate, current_user: Usuario) -> HorarioCultoResponse:
        """Cria um horário de culto para uma igreja"""
        # Valida igreja
        igreja = self.igreja_repository.get_by_id(data.igreja_id)
        if not igreja:
            raise NotFoundException("Igreja não encontrada")
        
        # Valida permissão
        self.validar_permissao_pastor(current_user, igreja.distrito_id)
        
        # Cria horário
        horario = HorarioCulto(
            igreja_id=data.igreja_id,
            dia_semana=data.dia_semana,
            horario=data.horario,
            ativo=True,
            aplicado_em_lote=False
        )
        
        self.db.add(horario)
        self.db.commit()
        self.db.refresh(horario)
        
        return HorarioCultoResponse.from_orm(horario)

    def criar_horarios_lote(
        self,
        data: HorarioCultoCreateLote,
        current_user: Usuario
    ) -> List[HorarioCultoResponse]:
        """Cria horários em lote para todas as igrejas ativas do distrito"""
        # Valida permissão
        self.validar_permissao_pastor(current_user, data.distrito_id)
        
        # Busca todas as igrejas ativas do distrito
        from app.models.enums import StatusGeral
        from app.models.igreja import Igreja
        igrejas = self.db.query(Igreja).filter(
            Igreja.distrito_id == data.distrito_id,
            Igreja.status == StatusGeral.ATIVO
        ).all()
        
        if not igrejas:
            raise NotFoundException("Nenhuma igreja ativa encontrada neste distrito")
        
        # Gera um lote_id único para rastrear
        lote_id = uuid4()
        
        # Cria horários para cada igreja
        horarios_criados = []
        for igreja in igrejas:
            for horario_base in data.horarios:
                horario = HorarioCulto(
                    igreja_id=igreja.id,
                    dia_semana=horario_base.dia_semana,
                    horario=horario_base.horario,
                    ativo=True,  # Sempre ativo por padrão
                    aplicado_em_lote=True,
                    lote_id=lote_id
                )
                self.db.add(horario)
                horarios_criados.append(horario)
        
        self.db.commit()
        
        # Refresh todos os horários
        for horario in horarios_criados:
            self.db.refresh(horario)
        
        return [HorarioCultoResponse.from_orm(h) for h in horarios_criados]

    def atualizar_horario(
        self,
        horario_id: int,
        data: HorarioCultoUpdate,
        current_user: Usuario
    ) -> HorarioCultoResponse:
        """Atualiza um horário de culto"""
        horario = self.repository.get_by_id(horario_id)
        if not horario:
            raise NotFoundException("Horário de culto não encontrado")
        
        # Valida permissão
        igreja = self.igreja_repository.get_by_id(horario.igreja_id)
        self.validar_permissao_pastor(current_user, igreja.distrito_id)
        
        # Atualiza campos
        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(horario, field, value)
        
        self.db.commit()
        self.db.refresh(horario)
        
        return HorarioCultoResponse.from_orm(horario)

    def deletar_horario(self, horario_id: int, current_user: Usuario) -> None:
        """Deleta um horário de culto"""
        horario = self.repository.get_by_id(horario_id)
        if not horario:
            raise NotFoundException("Horário de culto não encontrado")
        
        # Valida permissão
        igreja = self.igreja_repository.get_by_id(horario.igreja_id)
        self.validar_permissao_pastor(current_user, igreja.distrito_id)
        
        self.db.delete(horario)
        self.db.commit()

    def listar_por_igreja(self, igreja_id: int, current_user: Usuario) -> List[HorarioCultoResponse]:
        """Lista horários de uma igreja"""
        igreja = self.igreja_repository.get_by_id(igreja_id)
        if not igreja:
            raise NotFoundException("Igreja não encontrada")
        
        # Valida permissão
        self.validar_permissao_pastor(current_user, igreja.distrito_id)
        
        horarios = self.repository.get_by_igreja(igreja_id)
        return [HorarioCultoResponse.from_orm(h) for h in horarios]

    def listar_por_distrito(
        self,
        distrito_id: int,
        current_user: Usuario
    ) -> List[HorariosPorIgrejaResponse]:
        """Lista todos os horários do distrito agrupados por igreja"""
        # Valida permissão
        self.validar_permissao_pastor(current_user, distrito_id)
        
        # Busca todas as igrejas do distrito
        from app.models.igreja import Igreja
        igrejas = self.db.query(Igreja).filter(Igreja.distrito_id == distrito_id).all()
        
        # Agrupa horários por igreja
        resultado = []
        for igreja in igrejas:
            horarios = self.repository.get_by_igreja(igreja.id)
            if horarios or True:  # Inclui mesmo se não tiver horários
                resultado.append(HorariosPorIgrejaResponse(
                    igreja_id=igreja.id,
                    igreja_nome=igreja.nome,
                    horarios=[HorarioCultoResponse.from_orm(h) for h in horarios]
                ))
        
        return resultado

    def deletar_por_igreja(self, igreja_id: int, current_user: Usuario) -> int:
        """Deleta todos os horários de uma igreja"""
        igreja = self.igreja_repository.get_by_id(igreja_id)
        if not igreja:
            raise NotFoundException("Igreja não encontrada")
        
        # Valida permissão
        self.validar_permissao_pastor(current_user, igreja.distrito_id)
        
        return self.repository.delete_by_igreja(igreja_id)
