"""
Router: Horários de Cultos
Gestão de horários de cultos por distrito ou igreja
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional
from datetime import time

from app.core.database import get_db
from app.core.deps import get_current_active_user, require_perfil
from app.models import HorarioCulto, Usuario, Distrito, Igreja
from app.schemas import (
    HorarioCultoCreate,
    HorarioCultoUpdate,
    HorarioCultoResponse,
    HorarioCultoPadraoRequest
)

router = APIRouter(prefix="/horarios-cultos", tags=["Horários de Cultos"])

# Dependências de autorização
require_pastor_ou_associacao = require_perfil(["pastor_distrital", "membro_associacao"])


@router.get("", response_model=List[HorarioCultoResponse])
def listar_horarios_cultos(
    distrito_id: Optional[str] = None,
    igreja_id: Optional[str] = None,
    dia_semana: Optional[str] = None,
    ativo: Optional[bool] = True,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """Lista horários de cultos com filtros"""
    query = db.query(HorarioCulto)

    if distrito_id:
        query = query.filter(HorarioCulto.distrito_id == distrito_id)

    if igreja_id:
        query = query.filter(HorarioCulto.igreja_id == igreja_id)

    if dia_semana:
        query = query.filter(HorarioCulto.dia_semana == dia_semana)

    if ativo is not None:
        query = query.filter(HorarioCulto.ativo == ativo)

    horarios = query.order_by(
        HorarioCulto.dia_semana,
        HorarioCulto.horario
    ).offset(skip).limit(limit).all()

    return horarios


@router.get("/{horario_id}", response_model=HorarioCultoResponse)
def obter_horario_culto(
    horario_id: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """Obtém horário de culto por ID"""
    horario = db.query(HorarioCulto).filter(HorarioCulto.id == horario_id).first()

    if not horario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Horário de culto não encontrado"
        )

    return horario


@router.post("", response_model=HorarioCultoResponse, status_code=status.HTTP_201_CREATED)
def criar_horario_culto(
    horario_data: HorarioCultoCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_pastor_ou_associacao)
):
    """Cria novo horário de culto"""

    # Validar que distrito_id OU igreja_id foi fornecido (não ambos)
    if not horario_data.distrito_id and not horario_data.igreja_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Informe distrito_id OU igreja_id"
        )

    if horario_data.distrito_id and horario_data.igreja_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Informe apenas distrito_id OU igreja_id, não ambos"
        )

    # Verificar se distrito existe
    if horario_data.distrito_id:
        distrito = db.query(Distrito).filter(Distrito.id == horario_data.distrito_id).first()
        if not distrito:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Distrito não encontrado"
            )

    # Verificar se igreja existe
    if horario_data.igreja_id:
        igreja = db.query(Igreja).filter(Igreja.id == horario_data.igreja_id).first()
        if not igreja:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Igreja não encontrada"
            )

    # Verificar se já existe horário duplicado
    horario_existente = db.query(HorarioCulto).filter(
        or_(
            HorarioCulto.distrito_id == horario_data.distrito_id,
            HorarioCulto.igreja_id == horario_data.igreja_id
        ),
        HorarioCulto.dia_semana == horario_data.dia_semana,
        HorarioCulto.horario == horario_data.horario,
        HorarioCulto.ativo == True
    ).first()

    if horario_existente:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Já existe um horário de culto neste dia e horário"
        )

    # Criar horário
    novo_horario = HorarioCulto(**horario_data.model_dump())
    db.add(novo_horario)
    db.commit()
    db.refresh(novo_horario)

    return novo_horario


@router.put("/{horario_id}", response_model=HorarioCultoResponse)
def atualizar_horario_culto(
    horario_id: str,
    horario_data: HorarioCultoUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_pastor_ou_associacao)
):
    """Atualiza horário de culto"""
    horario = db.query(HorarioCulto).filter(HorarioCulto.id == horario_id).first()

    if not horario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Horário de culto não encontrado"
        )

    # Atualizar apenas campos fornecidos
    update_data = horario_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(horario, field, value)

    db.commit()
    db.refresh(horario)

    return horario


@router.delete("/{horario_id}", status_code=status.HTTP_204_NO_CONTENT)
def deletar_horario_culto(
    horario_id: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_pastor_ou_associacao)
):
    """Deleta horário de culto (soft delete - marca como inativo)"""
    horario = db.query(HorarioCulto).filter(HorarioCulto.id == horario_id).first()

    if not horario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Horário de culto não encontrado"
        )

    # Soft delete
    horario.ativo = False
    db.commit()

    return None


@router.post("/padrao-iasd", response_model=List[HorarioCultoResponse], status_code=status.HTTP_201_CREATED)
def criar_horarios_padrao_iasd(
    request: HorarioCultoPadraoRequest,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_pastor_ou_associacao)
):
    """
    Cria horários padrão da IASD PARA CADA IGREJA do distrito:
    - Sábados às 8:30h (Culto Divino) - PRIORIDADE 1
    - Domingos às 19:30h (Culto Jovem) - PRIORIDADE 2
    - Quartas às 19:30h (Culto de Oração) - PRIORIDADE 3

    Se aplicar_todas_igrejas=True, cria para todas as igrejas do distrito.
    Caso contrário, cria apenas em nível de distrito (aplicável a todas).
    """

    # Verificar se distrito existe
    distrito = db.query(Distrito).filter(Distrito.id == request.distrito_id).first()
    if not distrito:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Distrito não encontrado"
        )

    horarios_criados = []

    # Definir horários padrão IASD com prioridades
    horarios_padrao = [
        {
            "dia_semana": "sabado",
            "horario": time(8, 30),
            "nome_culto": "Culto Divino",
            "duracao_minutos": 120,
            "prioridade": 1  # Maior prioridade
        },
        {
            "dia_semana": "domingo",
            "horario": time(19, 30),
            "nome_culto": "Culto Jovem",
            "duracao_minutos": 90,
            "prioridade": 2  # Segunda prioridade
        },
        {
            "dia_semana": "quarta",
            "horario": time(19, 30),
            "nome_culto": "Culto de Oração",
            "duracao_minutos": 90,
            "prioridade": 3  # Terceira prioridade
        }
    ]

    if request.aplicar_todas_igrejas:
        # Buscar todas as igrejas ativas do distrito
        igrejas = db.query(Igreja).filter(
            Igreja.distrito_id == request.distrito_id,
            Igreja.ativo == True
        ).all()

        if not igrejas:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Nenhuma igreja encontrada no distrito"
            )

        # Criar horários para cada igreja
        for igreja in igrejas:
            for horario_padrao in horarios_padrao:
                # Verificar se já existe
                horario_existente = db.query(HorarioCulto).filter(
                    HorarioCulto.igreja_id == igreja.id,
                    HorarioCulto.dia_semana == horario_padrao["dia_semana"],
                    HorarioCulto.horario == horario_padrao["horario"],
                    HorarioCulto.ativo == True
                ).first()

                if not horario_existente:
                    novo_horario = HorarioCulto(
                        igreja_id=igreja.id,
                        dia_semana=horario_padrao["dia_semana"],
                        horario=horario_padrao["horario"],
                        nome_culto=horario_padrao["nome_culto"],
                        duracao_minutos=horario_padrao["duracao_minutos"],
                        requer_pregador=True,
                        ativo=True
                    )
                    db.add(novo_horario)
                    horarios_criados.append(novo_horario)
    else:
        # Criar em nível de distrito (aplicável a todas igrejas que não tenham horário específico)
        for horario_padrao in horarios_padrao:
            horario_existente = db.query(HorarioCulto).filter(
                HorarioCulto.distrito_id == request.distrito_id,
                HorarioCulto.dia_semana == horario_padrao["dia_semana"],
                HorarioCulto.horario == horario_padrao["horario"],
                HorarioCulto.ativo == True
            ).first()

            if not horario_existente:
                novo_horario = HorarioCulto(
                    distrito_id=request.distrito_id,
                    dia_semana=horario_padrao["dia_semana"],
                    horario=horario_padrao["horario"],
                    nome_culto=horario_padrao["nome_culto"],
                    duracao_minutos=horario_padrao["duracao_minutos"],
                    requer_pregador=True,
                    ativo=True
                )
                db.add(novo_horario)
                horarios_criados.append(novo_horario)

    db.commit()

    # Refresh todos os horários criados
    for horario in horarios_criados:
        db.refresh(horario)

    return horarios_criados
