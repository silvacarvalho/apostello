"""
Rotas para geração de QR Codes de avaliação
"""
import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response, StreamingResponse
from sqlalchemy.orm import Session
import io

from app.core.database import get_db
from app.core.deps import get_current_active_user
from app.core.config import settings
from app.models.usuario import Usuario
from app.models.pregacao import Pregacao
from app.models.configuracao import Configuracao
from app.services.qrcode_service import QRCodeService

router = APIRouter()


def obter_config_qrcode(db: Session, user: Usuario) -> dict:
    """Obtém configuração de QR Code do distrito"""
    config = db.query(Configuracao).filter(
        Configuracao.distrito_id == user.distrito_id,
        Configuracao.chave == "modo_qr_code"
    ).first()

    if config:
        return {
            "modo": config.valor.get('modo', 'unico_por_culto'),
            "incluir_logo": config.valor.get('incluir_logo', True),
            "tamanho": config.valor.get('tamanho', 300)
        }

    # Padrão
    return {
        "modo": "unico_por_culto",
        "incluir_logo": True,
        "tamanho": 300
    }


@router.get("/pregacao/{pregacao_id}", response_class=Response)
def gerar_qrcode_pregacao(
    pregacao_id: str,
    tamanho: Optional[int] = Query(None, ge=100, le=1000, description="Tamanho do QR Code"),
    incluir_logo: Optional[bool] = Query(None, description="Incluir logo no QR Code"),
    current_user: Usuario = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Gera QR Code para avaliação de uma pregação específica

    O QR Code direciona para o formulário de avaliação da pregação
    """
    # Verificar se pregação existe
    pregacao = db.query(Pregacao).filter(
        Pregacao.id == uuid.UUID(pregacao_id)
    ).first()

    if not pregacao:
        raise HTTPException(status_code=404, detail="Pregação não encontrada")

    # Obter configuração
    config = obter_config_qrcode(db, current_user)

    # Usar parâmetros da query se fornecidos, senão usar da config
    tamanho_final = tamanho if tamanho is not None else config['tamanho']
    logo_final = incluir_logo if incluir_logo is not None else config['incluir_logo']

    # Gerar QR Code
    qr_code_bytes = QRCodeService.gerar_qrcode_culto(
        base_url=settings.FRONTEND_URL or "https://app.apostello.com",
        pregacao_id=pregacao_id,
        tamanho=tamanho_final,
        incluir_logo=logo_final,
        logo_path=None  # TODO: Implementar upload de logo por igreja
    )

    return Response(
        content=qr_code_bytes,
        media_type="image/png",
        headers={
            "Content-Disposition": f'inline; filename="qrcode_pregacao_{pregacao_id}.png"'
        }
    )


@router.get("/pregacao/{pregacao_id}/pregador/{pregador_id}", response_class=Response)
def gerar_qrcode_pregador(
    pregacao_id: str,
    pregador_id: str,
    tamanho: Optional[int] = Query(None, ge=100, le=1000),
    incluir_logo: Optional[bool] = Query(None),
    current_user: Usuario = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Gera QR Code para avaliação de um pregador específico

    O QR Code direciona para o formulário de avaliação específico do pregador
    """
    # Verificar se pregação existe e pregador está correto
    pregacao = db.query(Pregacao).filter(
        Pregacao.id == uuid.UUID(pregacao_id)
    ).first()

    if not pregacao:
        raise HTTPException(status_code=404, detail="Pregação não encontrada")

    if str(pregacao.pregador_id) != pregador_id:
        raise HTTPException(
            status_code=400,
            detail="Pregador não corresponde à pregação"
        )

    # Obter configuração
    config = obter_config_qrcode(db, current_user)

    tamanho_final = tamanho if tamanho is not None else config['tamanho']
    logo_final = incluir_logo if incluir_logo is not None else config['incluir_logo']

    # Gerar QR Code
    qr_code_bytes = QRCodeService.gerar_qrcode_pregador(
        base_url=settings.FRONTEND_URL or "https://app.apostello.com",
        pregacao_id=pregacao_id,
        pregador_id=pregador_id,
        tamanho=tamanho_final,
        incluir_logo=logo_final,
        logo_path=None
    )

    return Response(
        content=qr_code_bytes,
        media_type="image/png",
        headers={
            "Content-Disposition": f'inline; filename="qrcode_pregador_{pregador_id}.png"'
        }
    )


@router.get("/pregacao/{pregacao_id}/base64")
def gerar_qrcode_pregacao_base64(
    pregacao_id: str,
    tamanho: Optional[int] = Query(300, ge=100, le=1000),
    incluir_logo: Optional[bool] = Query(True),
    current_user: Usuario = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Gera QR Code em formato base64 para embedding em HTML/Email

    Retorna uma string base64 que pode ser usada diretamente em src de img
    """
    # Verificar se pregação existe
    pregacao = db.query(Pregacao).filter(
        Pregacao.id == uuid.UUID(pregacao_id)
    ).first()

    if not pregacao:
        raise HTTPException(status_code=404, detail="Pregação não encontrada")

    # Obter configuração
    config = obter_config_qrcode(db, current_user)
    tamanho_final = tamanho if tamanho is not None else config['tamanho']
    logo_final = incluir_logo if incluir_logo is not None else config['incluir_logo']

    # Gerar URL
    url = QRCodeService.gerar_url_avaliacao_culto(
        base_url=settings.FRONTEND_URL or "https://app.apostello.com",
        pregacao_id=pregacao_id
    )

    # Gerar QR Code em base64
    qr_code_base64 = QRCodeService.gerar_qrcode_base64(
        url=url,
        tamanho=tamanho_final,
        incluir_logo=logo_final,
        logo_path=None
    )

    return {
        "qrcode_base64": qr_code_base64,
        "url": url,
        "pregacao_id": pregacao_id
    }


@router.get("/escala/{escala_id}/batch")
def gerar_qrcodes_escala(
    escala_id: str,
    current_user: Usuario = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Gera QR Codes para todas as pregações de uma escala

    Retorna um array de objetos com pregacao_id e qrcode_base64
    """
    # Buscar pregações da escala
    pregacoes = db.query(Pregacao).filter(
        Pregacao.escala_id == uuid.UUID(escala_id)
    ).all()

    if not pregacoes:
        raise HTTPException(
            status_code=404,
            detail="Nenhuma pregação encontrada para esta escala"
        )

    # Obter configuração
    config = obter_config_qrcode(db, current_user)
    modo = config['modo']
    tamanho = config['tamanho']
    incluir_logo = config['incluir_logo']

    base_url = settings.FRONTEND_URL or "https://app.apostello.com"

    qrcodes_result = []

    for pregacao in pregacoes:
        if modo == "unico_por_culto":
            # Um QR Code por pregação (culto)
            url = QRCodeService.gerar_url_avaliacao_culto(
                base_url=base_url,
                pregacao_id=str(pregacao.id)
            )
            qr_base64 = QRCodeService.gerar_qrcode_base64(
                url=url,
                tamanho=tamanho,
                incluir_logo=incluir_logo
            )

            qrcodes_result.append({
                "pregacao_id": str(pregacao.id),
                "pregador_id": str(pregacao.pregador_id),
                "data_pregacao": str(pregacao.data_pregacao),
                "horario_pregacao": str(pregacao.horario_pregacao),
                "qrcode_base64": qr_base64,
                "url": url
            })

        elif modo == "por_pregador":
            # Um QR Code por pregador
            url = QRCodeService.gerar_url_avaliacao_pregador(
                base_url=base_url,
                pregacao_id=str(pregacao.id),
                pregador_id=str(pregacao.pregador_id)
            )
            qr_base64 = QRCodeService.gerar_qrcode_base64(
                url=url,
                tamanho=tamanho,
                incluir_logo=incluir_logo
            )

            qrcodes_result.append({
                "pregacao_id": str(pregacao.id),
                "pregador_id": str(pregacao.pregador_id),
                "data_pregacao": str(pregacao.data_pregacao),
                "horario_pregacao": str(pregacao.horario_pregacao),
                "qrcode_base64": qr_base64,
                "url": url
            })

    return {
        "escala_id": escala_id,
        "modo": modo,
        "total_qrcodes": len(qrcodes_result),
        "qrcodes": qrcodes_result
    }


@router.get("/url/pregacao/{pregacao_id}")
def obter_url_avaliacao(
    pregacao_id: str,
    pregador_id: Optional[str] = None,
    current_user: Usuario = Depends(get_current_active_user)
):
    """
    Obtém a URL de avaliação (sem gerar QR Code)

    Útil para compartilhar link direto
    """
    base_url = settings.FRONTEND_URL or "https://app.apostello.com"

    if pregador_id:
        url = QRCodeService.gerar_url_avaliacao_pregador(
            base_url=base_url,
            pregacao_id=pregacao_id,
            pregador_id=pregador_id
        )
    else:
        url = QRCodeService.gerar_url_avaliacao_culto(
            base_url=base_url,
            pregacao_id=pregacao_id
        )

    return {
        "url": url,
        "pregacao_id": pregacao_id,
        "pregador_id": pregador_id
    }
