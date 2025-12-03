"""Router: Usuários"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from pydantic import BaseModel
from app.core.database import get_db
from app.core.deps import require_pastor_distrital, get_current_active_user
from app.core.security import get_password_hash, verify_password
from app.models import Usuario, Igreja, PerfilPregador
from app.models.usuario import PerfilUsuario, StatusAprovacao
from app.schemas.usuario import UsuarioCreate, UsuarioUpdate, UsuarioResponse

router = APIRouter()


class AlterarSenhaRequest(BaseModel):
    senha_atual: str
    senha_nova: str

@router.get("/", response_model=List[UsuarioResponse])
def listar_usuarios(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: Usuario = Depends(get_current_active_user)):
    # Filtrar usuários baseado no distrito/igreja do usuário logado
    query = db.query(Usuario).filter(Usuario.ativo == True)
    
    # Prioridade 1: Filtrar por distrito_id direto
    if current_user.distrito_id:
        # Usuários do mesmo distrito OU usuários de igrejas deste distrito
        query = query.outerjoin(Igreja, Usuario.igreja_id == Igreja.id).filter(
            (Usuario.distrito_id == current_user.distrito_id) | 
            (Igreja.distrito_id == current_user.distrito_id)
        )
    # Prioridade 2: Se tem igreja_id, filtrar pela igreja e seu distrito
    elif current_user.igreja_id:
        igreja = db.query(Igreja).filter(Igreja.id == current_user.igreja_id).first()
        if igreja and igreja.distrito_id:
            query = query.outerjoin(Igreja, Usuario.igreja_id == Igreja.id).filter(
                (Usuario.distrito_id == igreja.distrito_id) | 
                (Igreja.distrito_id == igreja.distrito_id)
            )
    # Prioridade 3: Filtrar apenas por associação (último recurso)
    elif current_user.associacao_id:
        query = query.filter(Usuario.associacao_id == current_user.associacao_id)
    
    usuarios = query.offset(skip).limit(limit).all()
    return usuarios

@router.post("/", response_model=UsuarioResponse, status_code=status.HTTP_201_CREATED)
def criar_usuario(data: UsuarioCreate, db: Session = Depends(get_db), current_user: Usuario = Depends(require_pastor_distrital)):
    # Verificar se email já existe
    existing = db.query(Usuario).filter(Usuario.email == data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email já cadastrado")
    
    # Converter perfis de string para enum
    perfis_enum = []
    for perfil_str in data.perfis:
        try:
            perfis_enum.append(PerfilUsuario(perfil_str.lower()))
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Perfil inválido: {perfil_str}")
    
    # REGRA 1: Validar perfil PASTOR_DISTRITAL
    if PerfilUsuario.PASTOR_DISTRITAL in perfis_enum:
        # Apenas MEMBRO_ASSOCIACAO pode criar PASTOR_DISTRITAL
        if not current_user.tem_perfil(PerfilUsuario.MEMBRO_ASSOCIACAO):
            raise HTTPException(
                status_code=403, 
                detail="Apenas Membros da Associação podem criar Pastores Distritais"
            )
        
        # Verificar se já existe pastor no distrito
        if data.distrito_id:
            from sqlalchemy import text
            pastor_existente = db.query(Usuario).filter(
                Usuario.distrito_id == data.distrito_id,
                text("'pastor_distrital' = ANY(perfis)"),
                Usuario.ativo == True
            ).first()
            
            if pastor_existente:
                raise HTTPException(
                    status_code=400,
                    detail=f"Já existe um Pastor Distrital neste distrito: {pastor_existente.nome_completo}"
                )
    
    # REGRA 2: Validar perfil MEMBRO_ASSOCIACAO
    if PerfilUsuario.MEMBRO_ASSOCIACAO in perfis_enum:
        # Apenas outro MEMBRO_ASSOCIACAO pode criar
        if not current_user.tem_perfil(PerfilUsuario.MEMBRO_ASSOCIACAO):
            raise HTTPException(
                status_code=403,
                detail="Apenas Membros da Associação podem criar outros Membros da Associação"
            )
        
        # Deve ser da mesma associação
        if data.associacao_id and data.associacao_id != current_user.associacao_id:
            raise HTTPException(
                status_code=403,
                detail="Você só pode criar Membros da Associação na sua própria associação"
            )
    
    # Criar usuário
    usuario = Usuario(
        email=data.email,
        nome_completo=data.nome_completo,
        telefone=data.telefone,
        whatsapp=data.whatsapp,
        cpf=data.cpf,
        data_nascimento=data.data_nascimento,
        genero=data.genero,
        url_foto=data.url_foto,
        senha_hash=get_password_hash(data.senha),
        distrito_id=data.distrito_id,
        igreja_id=data.igreja_id,
        associacao_id=current_user.associacao_id,
        perfis=perfis_enum,
        status_aprovacao=StatusAprovacao.APROVADO,
        aprovado_por=current_user.id,
        ativo=True
    )
    
    db.add(usuario)
    db.commit()
    db.refresh(usuario)
    
    # Criar PerfilPregador se o usuário tem perfil de pregador
    if PerfilUsuario.PREGADOR in perfis_enum:
        perfil_pregador = db.query(PerfilPregador).filter(PerfilPregador.usuario_id == usuario.id).first()
        if not perfil_pregador:
            perfil_pregador = PerfilPregador(
                usuario_id=usuario.id,
                ativo=True
            )
            db.add(perfil_pregador)
            db.commit()
    
    return usuario


@router.put("/{usuario_id}/senha")
def alterar_senha(usuario_id: str, data: AlterarSenhaRequest, db: Session = Depends(get_db), current_user: Usuario = Depends(get_current_active_user)):
    """Alterar a senha do usuário"""
    usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    # Verificar se é o próprio usuário
    if str(usuario.id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Você só pode alterar sua própria senha")
    
    # Verificar senha atual
    if not verify_password(data.senha_atual, usuario.senha_hash):
        raise HTTPException(status_code=400, detail="Senha atual incorreta")
    
    # Validar nova senha
    if len(data.senha_nova) < 8:
        raise HTTPException(status_code=400, detail="A nova senha deve ter pelo menos 8 caracteres")
    
    # Atualizar senha
    usuario.senha_hash = get_password_hash(data.senha_nova)
    db.commit()
    
    return {"message": "Senha alterada com sucesso"}


@router.post("/{usuario_id}/aprovar", response_model=UsuarioResponse)
def aprovar_usuario(usuario_id: str, db: Session = Depends(get_db), current_user: Usuario = Depends(require_pastor_distrital)):
    usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    usuario.status_aprovacao = StatusAprovacao.APROVADO
    usuario.aprovado_por = current_user.id
    from datetime import datetime
    usuario.aprovado_em = datetime.utcnow()
    db.commit()
    db.refresh(usuario)
    return usuario


@router.get("/{usuario_id}", response_model=UsuarioResponse)
def obter_usuario(usuario_id: str, db: Session = Depends(get_db), current_user: Usuario = Depends(get_current_active_user)):
    usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    return usuario


@router.put("/{usuario_id}", response_model=UsuarioResponse)
def atualizar_usuario(usuario_id: str, data: UsuarioUpdate, db: Session = Depends(get_db), current_user: Usuario = Depends(get_current_active_user)):
    usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    # Verificar permissão
    # Pode editar: o próprio usuário, pastor distrital ou líder distrital
    pode_editar = (
        str(usuario.id) == str(current_user.id) or
        current_user.tem_perfil(PerfilUsuario.PASTOR_DISTRITAL) or
        current_user.tem_perfil(PerfilUsuario.LIDER_DISTRITAL)
    )
    
    if not pode_editar:
        raise HTTPException(status_code=403, detail="Sem permissão para atualizar este usuário")
    
    # Atualizar campos
    perfis_atualizados = False
    perfis_antigos = usuario.perfis.copy() if hasattr(usuario, 'perfis') else []
    
    for key, value in data.dict(exclude_unset=True).items():
        # Converter strings vazias em None para campos opcionais
        if isinstance(value, str) and value == "" and key in ['genero', 'telefone', 'whatsapp', 'cpf', 'url_foto']:
            value = None
        
        # Converter perfis de string para enum
        if key == 'perfis' and value is not None:
            perfis_atualizados = True
            perfis_enum = []
            for perfil_str in value:
                try:
                    perfis_enum.append(PerfilUsuario(perfil_str.lower()))
                except ValueError:
                    raise HTTPException(status_code=400, detail=f"Perfil inválido: {perfil_str}")
            value = perfis_enum
        
        setattr(usuario, key, value)
    
    db.commit()
    db.refresh(usuario)
    
    # Gerenciar PerfilPregador baseado nos perfis
    if perfis_atualizados:
        perfil_pregador = db.query(PerfilPregador).filter(PerfilPregador.usuario_id == usuario.id).first()
        
        # Se o usuário TEM o perfil de pregador agora
        if PerfilUsuario.PREGADOR in usuario.perfis:
            if not perfil_pregador:
                # Criar novo PerfilPregador
                perfil_pregador = PerfilPregador(
                    usuario_id=usuario.id,
                    ativo=True
                )
                db.add(perfil_pregador)
                db.commit()
            elif not perfil_pregador.ativo:
                # Reativar PerfilPregador existente
                perfil_pregador.ativo = True
                db.commit()
        
        # Se o usuário PERDEU o perfil de pregador
        elif PerfilUsuario.PREGADOR in perfis_antigos and PerfilUsuario.PREGADOR not in usuario.perfis:
            if perfil_pregador and perfil_pregador.ativo:
                # Marcar como inativo (mantém histórico)
                perfil_pregador.ativo = False
                db.commit()
    
    return usuario

@router.post("/{usuario_id}/aprovar", response_model=UsuarioResponse)
def aprovar_usuario(usuario_id: str, db: Session = Depends(get_db), current_user: Usuario = Depends(require_pastor_distrital)):
    usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    usuario.status_aprovacao = StatusAprovacao.APROVADO
    usuario.aprovado_por = current_user.id
    from datetime import datetime
    usuario.aprovado_em = datetime.utcnow()
    db.commit()
    db.refresh(usuario)
    return usuario
