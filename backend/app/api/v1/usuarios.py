"""Router: Usuários"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from app.core.database import get_db
from app.core.deps import require_pastor_distrital, get_current_active_user
from app.core.security import get_password_hash
from app.models import Usuario, Igreja
from app.models.usuario import PerfilUsuario, StatusAprovacao
from app.schemas.usuario import UsuarioCreate, UsuarioUpdate, UsuarioResponse

router = APIRouter()

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
            pastor_existente = db.query(Usuario).filter(
                Usuario.distrito_id == data.distrito_id,
                Usuario.perfis.contains([PerfilUsuario.PASTOR_DISTRITAL]),
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
    if str(usuario.id) != str(current_user.id) and not current_user.tem_perfil(PerfilUsuario.MEMBRO_ASSOCIACAO):
        raise HTTPException(status_code=403, detail="Sem permissão para atualizar este usuário")
    
    # Atualizar campos
    for key, value in data.dict(exclude_unset=True).items():
        # Converter strings vazias em None para campos opcionais
        if isinstance(value, str) and value == "" and key in ['genero', 'telefone', 'whatsapp', 'cpf', 'url_foto']:
            value = None
        setattr(usuario, key, value)
    
    db.commit()
    db.refresh(usuario)
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
