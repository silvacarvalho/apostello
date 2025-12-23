"""
Endpoints de Perfil - Gestão de perfil do usuário logado
"""
from fastapi import APIRouter, Depends, File, UploadFile, status, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from pathlib import Path
import os
import uuid
from datetime import datetime

from app.api.deps import get_db, get_current_user
from app.models.usuario import Usuario
from app.schemas.usuario import UsuarioResponse, PerfilUpdate, PasswordUpdate
from app.schemas.preferencia_notificacao import (
    PreferenciaNotificacaoResponse,
    PreferenciaNotificacaoUpdate
)
from app.services.usuario_service import UsuarioService
from app.services.preferencia_notificacao_service import PreferenciaNotificacaoService
from app.core.config import settings
from app.core.exceptions import BadRequestException
from app.core.security import verify_password, get_password_hash

router = APIRouter()


@router.get("/me", response_model=UsuarioResponse)
def get_perfil(
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retorna dados do perfil do usuário logado.
    """
    service = UsuarioService(db)
    return service.get_by_id(current_user.id)


@router.put("/me", response_model=UsuarioResponse)
def atualizar_perfil(
    data: PerfilUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """
    Atualiza dados do próprio perfil.
    Campos permitidos: nome_completo, telefone, whatsapp, data_nascimento
    """
    service = UsuarioService(db)
    
    # Atualizar apenas campos permitidos
    update_data = data.dict(exclude_unset=True)
    
    # Atualizar usuário
    for field, value in update_data.items():
        setattr(current_user, field, value)
    
    current_user.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(current_user)
    
    return current_user


@router.post("/me/foto", response_model=UsuarioResponse)
async def upload_foto_perfil(
    foto: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """
    Upload de foto de perfil.
    Formatos aceitos: JPG, JPEG, PNG, GIF, WEBP
    Tamanho máximo: 10MB
    """
    # Validar extensão
    file_ext = Path(foto.filename).suffix.lower()
    if file_ext not in settings.ALLOWED_IMAGE_EXTENSIONS:
        raise BadRequestException(
            f"Formato não permitido. Use: {', '.join(settings.ALLOWED_IMAGE_EXTENSIONS)}"
        )
    
    # Validar tamanho
    contents = await foto.read()
    if len(contents) > settings.MAX_UPLOAD_SIZE:
        raise BadRequestException(
            f"Arquivo muito grande. Tamanho máximo: {settings.MAX_UPLOAD_SIZE // (1024 * 1024)}MB"
        )
    
    # Criar diretório se não existir
    upload_dir = Path(settings.FOTO_PERFIL_DIR)
    upload_dir.mkdir(parents=True, exist_ok=True)
    
    # Deletar foto antiga se existir
    if current_user.foto_url:
        old_file = Path(current_user.foto_url)
        if old_file.exists():
            try:
                old_file.unlink()
            except Exception as e:
                print(f"Erro ao deletar foto antiga: {e}")
    
    # Gerar nome único para o arquivo
    unique_filename = f"{current_user.id}_{uuid.uuid4()}{file_ext}"
    file_path = upload_dir / unique_filename
    
    # Salvar arquivo
    with open(file_path, "wb") as f:
        f.write(contents)
    
    # Atualizar URL no banco
    current_user.foto_url = str(file_path)
    current_user.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(current_user)
    
    return current_user


@router.delete("/me/foto", response_model=UsuarioResponse)
def deletar_foto_perfil(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """
    Remove a foto de perfil do usuário logado.
    """
    if not current_user.foto_url:
        raise BadRequestException("Nenhuma foto de perfil cadastrada")
    
    # Deletar arquivo físico
    file_path = Path(current_user.foto_url)
    if file_path.exists():
        try:
            file_path.unlink()
        except Exception as e:
            print(f"Erro ao deletar foto: {e}")
    
    # Remover URL do banco
    current_user.foto_url = None
    current_user.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(current_user)
    
    return current_user


@router.get("/foto/{usuario_id}")
def get_foto_perfil(usuario_id: int, db: Session = Depends(get_db)):
    """
    Retorna a foto de perfil de um usuário.
    """
    service = UsuarioService(db)
    usuario = service.get_by_id(usuario_id)
    
    if not usuario.foto_url:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuário não possui foto de perfil"
        )
    
    file_path = Path(usuario.foto_url)
    if not file_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Arquivo de foto não encontrado"
        )
    
    return FileResponse(file_path)


@router.get("/me/notificacoes", response_model=PreferenciaNotificacaoResponse)
def get_preferencias_notificacao(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """
    Retorna preferências de notificação do usuário logado.
    """
    service = PreferenciaNotificacaoService(db)
    return service.get_preferencia(current_user)


@router.put("/me/notificacoes", response_model=PreferenciaNotificacaoResponse)
def atualizar_preferencias_notificacao(
    data: PreferenciaNotificacaoUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """
    Atualiza preferências de notificação do usuário logado.
    """
    service = PreferenciaNotificacaoService(db)
    return service.update_preferencia(current_user, data)


@router.put("/me/senha", response_model=dict)
def alterar_senha(
    data: PasswordUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """
    Altera a senha do usuário logado.
    Valida a senha atual antes de atualizar.
    """
    # Verificar senha atual
    if not verify_password(data.senha_atual, current_user.senha_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Senha atual incorreta"
        )
    
    # Atualizar senha
    current_user.senha_hash = get_password_hash(data.nova_senha)
    current_user.updated_at = datetime.utcnow()
    db.commit()
    
    return {"message": "Senha alterada com sucesso"}
