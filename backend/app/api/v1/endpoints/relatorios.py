"""
Endpoints de Relatórios PDF/Excel
"""
from fastapi import APIRouter, Depends, Query, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from datetime import date, datetime
from typing import Optional

from app.database import get_db
from app.models.usuario import Usuario
from app.models.enums import TipoUsuario
from app.api.deps import get_current_user, require_pastor
from app.services.relatorio_service import RelatorioService


router = APIRouter()


# ==================== ESCALA ====================

@router.get("/escala/{escala_id}/pdf")
def exportar_escala_pdf(
    escala_id: int,
    igreja_id: Optional[int] = Query(None, description="ID da igreja para filtrar (opcional)"),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """
    Exporta a escala mensal em PDF.
    Se igreja_id for informado, gera PDF apenas com os cultos dessa igreja.
    """
    service = RelatorioService(db)
    
    try:
        buffer = service.gerar_escala_pdf(escala_id, igreja_id)
        
        filename = f"escala_{escala_id}"
        if igreja_id:
            filename += f"_igreja_{igreja_id}"
        filename += ".pdf"
        
        return StreamingResponse(
            buffer,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename={filename}"
            }
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao gerar PDF: {str(e)}")


@router.get("/escala/{escala_id}/excel")
def exportar_escala_excel(
    escala_id: int,
    igreja_id: Optional[int] = Query(None, description="ID da igreja para filtrar (opcional)"),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """
    Exporta a escala mensal em Excel.
    Se igreja_id for informado, gera Excel apenas com os cultos dessa igreja.
    """
    service = RelatorioService(db)
    
    try:
        buffer = service.gerar_escala_excel(escala_id, igreja_id)
        
        filename = f"escala_{escala_id}"
        if igreja_id:
            filename += f"_igreja_{igreja_id}"
        filename += ".xlsx"
        
        return StreamingResponse(
            buffer,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={
                "Content-Disposition": f"attachment; filename={filename}"
            }
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao gerar Excel: {str(e)}")


# ==================== PARTICIPAÇÕES ====================

@router.get("/participacoes/pdf")
def exportar_participacoes_pdf(
    distrito_id: int = Query(..., description="ID do distrito"),
    data_inicio: date = Query(..., description="Data inicial do período"),
    data_fim: date = Query(..., description="Data final do período"),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_pastor)
):
    """
    Exporta relatório de participações em PDF.
    Apenas pastores e administradores.
    """
    # Verificar permissão
    if current_user.tipo not in [TipoUsuario.ADMIN, TipoUsuario.ASSOCIACAO]:
        if current_user.distrito_id != distrito_id:
            raise HTTPException(status_code=403, detail="Sem permissão para este distrito")
    
    service = RelatorioService(db)
    
    try:
        buffer = service.gerar_participacoes_pdf(distrito_id, data_inicio, data_fim)
        
        filename = f"participacoes_{data_inicio.strftime('%Y%m%d')}_{data_fim.strftime('%Y%m%d')}.pdf"
        
        return StreamingResponse(
            buffer,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename={filename}"
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao gerar PDF: {str(e)}")


@router.get("/participacoes/excel")
def exportar_participacoes_excel(
    distrito_id: int = Query(..., description="ID do distrito"),
    data_inicio: date = Query(..., description="Data inicial do período"),
    data_fim: date = Query(..., description="Data final do período"),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_pastor)
):
    """
    Exporta relatório de participações em Excel.
    Apenas pastores e administradores.
    """
    # Verificar permissão
    if current_user.tipo not in [TipoUsuario.ADMIN, TipoUsuario.ASSOCIACAO]:
        if current_user.distrito_id != distrito_id:
            raise HTTPException(status_code=403, detail="Sem permissão para este distrito")
    
    service = RelatorioService(db)
    
    try:
        buffer = service.gerar_participacoes_excel(distrito_id, data_inicio, data_fim)
        
        filename = f"participacoes_{data_inicio.strftime('%Y%m%d')}_{data_fim.strftime('%Y%m%d')}.xlsx"
        
        return StreamingResponse(
            buffer,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={
                "Content-Disposition": f"attachment; filename={filename}"
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao gerar Excel: {str(e)}")


# ==================== AVALIAÇÕES ====================

@router.get("/avaliacoes/pdf")
def exportar_avaliacoes_pdf(
    distrito_id: int = Query(..., description="ID do distrito"),
    data_inicio: date = Query(..., description="Data inicial do período"),
    data_fim: date = Query(..., description="Data final do período"),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_pastor)
):
    """
    Exporta relatório de avaliações em PDF.
    Apenas pastores e administradores.
    """
    # Verificar permissão
    if current_user.tipo not in [TipoUsuario.ADMIN, TipoUsuario.ASSOCIACAO]:
        if current_user.distrito_id != distrito_id:
            raise HTTPException(status_code=403, detail="Sem permissão para este distrito")
    
    service = RelatorioService(db)
    
    try:
        buffer = service.gerar_avaliacoes_pdf(distrito_id, data_inicio, data_fim)
        
        filename = f"avaliacoes_{data_inicio.strftime('%Y%m%d')}_{data_fim.strftime('%Y%m%d')}.pdf"
        
        return StreamingResponse(
            buffer,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename={filename}"
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao gerar PDF: {str(e)}")


@router.get("/avaliacoes/excel")
def exportar_avaliacoes_excel(
    distrito_id: int = Query(..., description="ID do distrito"),
    data_inicio: date = Query(..., description="Data inicial do período"),
    data_fim: date = Query(..., description="Data final do período"),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_pastor)
):
    """
    Exporta relatório de avaliações em Excel.
    Apenas pastores e administradores.
    """
    # Verificar permissão
    if current_user.tipo not in [TipoUsuario.ADMIN, TipoUsuario.ASSOCIACAO]:
        if current_user.distrito_id != distrito_id:
            raise HTTPException(status_code=403, detail="Sem permissão para este distrito")
    
    service = RelatorioService(db)
    
    try:
        buffer = service.gerar_avaliacoes_excel(distrito_id, data_inicio, data_fim)
        
        filename = f"avaliacoes_{data_inicio.strftime('%Y%m%d')}_{data_fim.strftime('%Y%m%d')}.xlsx"
        
        return StreamingResponse(
            buffer,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={
                "Content-Disposition": f"attachment; filename={filename}"
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao gerar Excel: {str(e)}")
