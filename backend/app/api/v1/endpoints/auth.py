"""
Endpoints de Autenticação
"""
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.auth_service import AuthService
from app.schemas.auth import (
    Token, LoginRequest, RefreshTokenRequest,
    ForgotPasswordRequest, ForgotPasswordResponse,
    ResetPasswordRequest, ResetPasswordResponse
)
from app.schemas.usuario import UsuarioChangePassword
from app.api.deps import get_current_user
from app.models.usuario import Usuario
from app.core.config import settings


router = APIRouter()


@router.post("/login", response_model=Token)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """
    Login com email e senha.
    Retorna access_token e refresh_token.
    """
    auth_service = AuthService(db)
    return auth_service.authenticate(form_data.username, form_data.password)


@router.post("/login/json", response_model=Token)
def login_json(
    login_data: LoginRequest,
    db: Session = Depends(get_db)
):
    """
    Login com JSON (alternativa ao form).
    """
    auth_service = AuthService(db)
    return auth_service.authenticate(login_data.email, login_data.password)


@router.post("/refresh", response_model=Token)
def refresh_token(
    data: RefreshTokenRequest,
    db: Session = Depends(get_db)
):
    """
    Renova tokens usando refresh_token.
    """
    auth_service = AuthService(db)
    return auth_service.refresh_token(data.refresh_token)


@router.post("/change-password")
def change_password(
    data: UsuarioChangePassword,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Altera senha do usuário logado.
    """
    auth_service = AuthService(db)
    auth_service.change_password(
        current_user.id,
        data.senha_atual,
        data.nova_senha
    )
    return {"message": "Senha alterada com sucesso"}


@router.get("/me")
def get_me(current_user: Usuario = Depends(get_current_user)):
    """
    Retorna dados do usuário logado.
    """
    return {
        "id": current_user.id,
        "nome_completo": current_user.nome_completo,
        "email": current_user.email,
        "tipo": current_user.tipo.value,
        "distrito_id": current_user.distrito_id,
        "igreja_id": current_user.igreja_id,
        "foto_url": current_user.foto_url,
        "score_atual": float(current_user.score_atual) if current_user.score_atual else None
    }


@router.post("/forgot-password", response_model=ForgotPasswordResponse)
async def forgot_password(
    data: ForgotPasswordRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Solicita recuperação de senha.
    Gera um token e envia por email/SMS/WhatsApp conforme preferência.
    Por segurança, sempre retorna sucesso mesmo se o email não existir.
    """
    auth_service = AuthService(db)
    token = auth_service.reset_password(data.email)
    
    if token:
        reset_url = f"{settings.FRONTEND_URL}/auth/reset-password?token={token}"
        
        # Buscar usuário para dados de contato
        from app.repositories.usuario_repository import UsuarioRepository
        from app.services.notificacao_service import NotificacaoService
        from app.services.twilio_service import TwilioService
        
        usuario_repo = UsuarioRepository(db)
        usuario = usuario_repo.get_by_email(data.email)
        
        if usuario:
            notificacao_service = NotificacaoService(db)
            twilio_service = TwilioService(db)
            
            mensagem = f"Você solicitou a recuperação de senha do APOSTello.\n\nClique no link para redefinir sua senha:\n{reset_url}\n\nEste link expira em {settings.PASSWORD_RESET_TOKEN_EXPIRE_HOURS} hora(s).\n\nSe você não solicitou isso, ignore esta mensagem."
            
            # Tentar enviar por email
            if usuario.email and settings.SMTP_USER:
                try:
                    html_body = f"""
                    <h2>Recuperação de Senha - APOSTello</h2>
                    <p>Você solicitou a recuperação de senha.</p>
                    <p><a href="{reset_url}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Redefinir Senha</a></p>
                    <p>Ou copie o link: {reset_url}</p>
                    <p><small>Este link expira em {settings.PASSWORD_RESET_TOKEN_EXPIRE_HOURS} hora(s).</small></p>
                    <p><small>Se você não solicitou isso, ignore esta mensagem.</small></p>
                    """
                    background_tasks.add_task(
                        notificacao_service.send_email,
                        usuario.email,
                        "Recuperação de Senha - APOSTello",
                        html_body
                    )
                except Exception as e:
                    print(f"[PASSWORD RESET] Erro ao agendar email: {e}")
            
            # Tentar enviar por SMS
            if usuario.telefone and twilio_service.is_configured:
                try:
                    sms_msg = f"APOSTello - Recuperação de senha:\n{reset_url}"
                    twilio_service.send_sms(usuario.telefone, sms_msg)
                except Exception as e:
                    print(f"[PASSWORD RESET] Erro SMS: {e}")
            
            # Tentar enviar por WhatsApp
            if usuario.whatsapp and twilio_service.whatsapp_configured:
                try:
                    whatsapp_msg = f"*APOSTello - Recuperação de Senha*\n\nClique no link para redefinir:\n{reset_url}\n\n_Expira em {settings.PASSWORD_RESET_TOKEN_EXPIRE_HOURS}h_"
                    twilio_service.send_whatsapp(usuario.whatsapp, whatsapp_msg)
                except Exception as e:
                    print(f"[PASSWORD RESET] Erro WhatsApp: {e}")
        
        print(f"[PASSWORD RESET] Email: {data.email} | URL: {reset_url}")
    
    return ForgotPasswordResponse(
        message="Se o email estiver cadastrado, você receberá instruções para recuperar sua senha.",
        success=True
    )


@router.post("/reset-password", response_model=ResetPasswordResponse)
def reset_password(
    data: ResetPasswordRequest,
    db: Session = Depends(get_db)
):
    """
    Reseta a senha usando o token de recuperação.
    """
    auth_service = AuthService(db)
    
    try:
        auth_service.reset_password_with_token(data.token, data.nova_senha)
        return ResetPasswordResponse(
            message="Senha alterada com sucesso! Você já pode fazer login.",
            success=True
        )
    except Exception as e:
        return ResetPasswordResponse(
            message="Token inválido ou expirado. Solicite uma nova recuperação de senha.",
            success=False
        )


@router.get("/verify-reset-token")
def verify_reset_token(
    token: str,
    db: Session = Depends(get_db)
):
    """
    Verifica se um token de reset é válido.
    """
    auth_service = AuthService(db)
    usuario = auth_service.verify_reset_token(token)
    
    if not usuario:
        return {"valid": False, "message": "Token inválido ou expirado"}
    
    return {
        "valid": True,
        "email": usuario.email[:3] + "***" + usuario.email[usuario.email.index("@"):]
    }
